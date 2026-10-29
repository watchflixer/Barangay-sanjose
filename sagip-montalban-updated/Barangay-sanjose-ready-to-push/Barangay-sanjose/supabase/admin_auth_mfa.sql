-- Supabase Auth + MFA for the admin workspace.
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.
--
-- What this adds
-- --------------
-- * `admin_users`   — the allow-list. A Supabase Auth account is an admin only
--                     when its email is listed here. Deleting a row revokes
--                     access immediately, without touching the auth user.
-- * `admin_settings` — switches: legacy shared password on/off, MFA required.
-- * `admin_audit`    — per-admin attribution for every report change.
-- * `is_admin()`     — the authoritative check used by every admin RPC.
-- * `assert_admin()` — redefined: a valid Supabase Auth JWT (with MFA when
--                     enrolled) wins, and the legacy shared password is only
--                     accepted while `legacy_password_enabled` is true.
--
-- Why MFA is checked here and not in the browser
-- ----------------------------------------------
-- A client can always skip a screen. `aal` comes from the signed JWT that
-- Supabase Auth issues, so requiring `aal2` here means a stolen password alone
-- cannot touch the data — an authenticator code is also required.

-- ---------------------------------------------------------------- allow-list
create table if not exists public.admin_users (
  email text primary key check (email = lower(trim(email)) and position('@' in email) > 1),
  display_name text,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

-- -------------------------------------------------------------- settings row
create table if not exists public.admin_settings (
  id smallint primary key default 1 check (id = 1),
  -- While true, the old shared password still works. Turn it off once the
  -- Supabase Auth account has signed in successfully at least once.
  legacy_password_enabled boolean not null default true,
  -- While true, an admin who has enrolled a TOTP factor must present it (aal2).
  require_mfa boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.admin_settings (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------- audit history
create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_email text,
  action text not null,
  report_id text,
  details jsonb
);
create index if not exists admin_audit_at_idx on public.admin_audit (at desc);

alter table public.admin_users enable row level security;
alter table public.admin_settings enable row level security;
alter table public.admin_audit enable row level security;
-- No policies: these tables are reachable only through the functions below.

-- ------------------------------------------------------------- who is calling

-- The email of the signed-in Supabase Auth user, or null for an anonymous call.
create or replace function public.current_admin_email()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
$$;

-- true when this user has a verified TOTP factor, so aal2 can be demanded.
create or replace function public.admin_has_mfa()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from auth.mfa_factors f
    where f.user_id = auth.uid()
      and f.status::text = 'verified'
      and f.factor_type::text = 'totp'
  );
$$;

-- The one authoritative gate. Returns false instead of raising, so it can be
-- used by both assert_admin() and RLS policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with caller as (
    select
      auth.uid() as user_id,
      public.current_admin_email() as email,
      coalesce(auth.jwt() ->> 'aal', 'aal1') as aal
  ), settings as (
    select require_mfa from public.admin_settings where id = 1
  )
  select exists (
    select 1
    from caller c
    join public.admin_users u on u.email = c.email and u.is_active
    cross join settings s
    where c.user_id is not null
      -- When the admin enrolled an authenticator, the token must be aal2.
      and (not s.require_mfa or not public.admin_has_mfa() or c.aal = 'aal2')
  );
$$;

-- ------------------------------------------------------------- the gate itself
create or replace function public.assert_admin(p_password text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  legacy_enabled boolean;
  signed_in boolean := auth.uid() is not null;
begin
  -- 1. Supabase Auth path (preferred).
  if public.is_admin() then
    return;
  end if;

  -- 2. A signed-in user who is not on the allow-list is rejected outright.
  --    Never fall through to the shared password: that would let a stolen
  --    password bypass MFA for an account that has it enrolled.
  if signed_in then
    if public.admin_has_mfa() then
      raise exception 'MFA verification is required' using errcode = '28000';
    end if;
    raise exception 'This account is not on the admin allow-list' using errcode = '28000';
  end if;

  -- 3. Legacy shared password, only while it is explicitly enabled.
  select coalesce(legacy_password_enabled, true) into legacy_enabled
  from public.admin_settings where id = 1;

  if coalesce(legacy_enabled, true)
     and p_password is not null
     and exists (
       select 1 from public.app_secrets
       where id = 'admin'
         and secret_hash <> encode(sha256(convert_to('admin','UTF8')),'hex')
         and secret_hash = encode(sha256(convert_to(p_password,'UTF8')),'hex')
     ) then
    return;
  end if;

  raise exception 'Invalid admin password' using errcode = '28000';
end;
$$;

-- ------------------------------------------------------- client-facing probes

/** True when at least one Supabase Auth admin exists, so the app can pick a flow. */
create or replace function public.admin_auth_available()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admin_users where is_active);
$$;

/** Who is signed in, and whether their second factor is satisfied. */
create or replace function public.admin_me()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'email', public.current_admin_email(),
    'role', (select role from public.admin_users where email = public.current_admin_email() and is_active),
    'authenticated', public.is_admin(),
    'mfa_enrolled', public.admin_has_mfa(),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'legacy_password_enabled', coalesce((select legacy_password_enabled from public.admin_settings where id = 1), true)
  );
$$;

-- ------------------------------------------------------------ audit triggers
create or replace function public.log_admin_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_id text;
begin
  target_id := coalesce(new.id::text, old.id::text);
  insert into public.admin_audit (admin_email, action, report_id, details)
  values (
    public.current_admin_email(),
    lower(tg_op || ' ' || tg_table_name),
    target_id,
    case
      when tg_op = 'DELETE' then null
      when tg_table_name = 'hazard_reports' then jsonb_build_object(
        'status', new.status, 'review_status', new.review_status,
        'deleted', new.deleted_at is not null
      )
      else jsonb_build_object('status', new.status)
    end
  );
  return null;
end;
$$;

drop trigger if exists hazard_reports_audit on public.hazard_reports;
create trigger hazard_reports_audit
  after insert or update on public.hazard_reports
  for each row execute function public.log_admin_action();

drop trigger if exists resolve_flags_audit on public.resolve_flags;
create trigger resolve_flags_audit
  after insert or update on public.resolve_flags
  for each row execute function public.log_admin_action();

-- --------------------------------------------------------------- permissions
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.admin_has_mfa() from public, anon, authenticated;
revoke all on function public.current_admin_email() from public, anon, authenticated;
revoke all on function public.log_admin_action() from public, anon, authenticated;

-- The app needs these two probes; they expose no data.
grant execute on function public.admin_auth_available() to anon, authenticated;
grant execute on function public.admin_me() to anon, authenticated;

-- `assert_admin` is only called from other security-definer functions.
revoke all on function public.assert_admin(text) from public, anon, authenticated;

-- Canonical admin email, lowercase; the allow-list compares on this form.
-- Insert the address of the Supabase Auth user you create in the dashboard:
--   insert into public.admin_users (email, display_name)
--   values ('idamgo549@gmail.com', 'Barangay Admin')
--   on conflict (email) do update set is_active = true;
