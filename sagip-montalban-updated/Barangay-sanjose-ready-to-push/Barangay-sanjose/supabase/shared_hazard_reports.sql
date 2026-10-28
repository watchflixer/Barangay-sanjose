-- Shared hazard reports for Barangay San Jose.
-- Everything the admin changes here is visible to every visitor: the public
-- feed is read through public_feed(), and admin writes go through RPCs that
-- require the admin password. Tables have RLS enabled with no policies, so the
-- anon key cannot read or write rows directly.
-- Safe to re-run.

create table if not exists public.hazard_reports (
  id text primary key,
  type text not null check (type in ('fire','flood','power','streetlight','water','road')),
  title text not null,
  street_name text not null,
  sitio text not null,
  lat double precision not null,
  lng double precision not null,
  status text not null default 'active' check (status in ('active','monitoring','resolved')),
  severity text not null default 'high' check (severity in ('critical','high','moderate','low')),
  description text not null,
  reported_by text not null,
  contact_number text,
  reporter_email text,
  photo_url text,
  affected_households text,
  evacuation_center text,
  time_reported text not null default 'Just now',
  reported_at timestamptz,
  last_updated timestamptz default now(),
  updates_count integer default 1,
  show_reporter boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending','accepted','declined')),
  decline_reason text,
  reviewed_at timestamptz,
  deleted_at timestamptz,
  source text not null default 'community' check (source in ('community','admin')),
  submitter_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hazard_reports_submitter_idx on public.hazard_reports (submitter_hash, created_at desc);
create index if not exists hazard_reports_public_idx
  on public.hazard_reports (review_status, deleted_at, created_at desc);

create table if not exists public.report_events (
  id uuid primary key default gen_random_uuid(),
  report_id text references public.hazard_reports(id) on delete cascade,
  title text not null,
  action text not null,
  actor text not null check (actor in ('admin','reporter','public')),
  created_at timestamptz not null default now()
);
create index if not exists report_events_report_idx on public.report_events (report_id, created_at desc);

create table if not exists public.resolve_flags (
  id uuid primary key default gen_random_uuid(),
  report_id text references public.hazard_reports(id) on delete cascade,
  note text,
  status text not null default 'pending' check (status in ('pending','accepted','ignored')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create unique index if not exists resolve_flags_one_pending
  on public.resolve_flags (report_id) where status = 'pending';

create table if not exists public.feed_settings (
  id smallint primary key default 1 check (id = 1),
  hidden_types text[] not null default '{}',
  updated_at timestamptz not null default now()
);
insert into public.feed_settings (id, hidden_types) values (1, '{}') on conflict (id) do nothing;

create table if not exists public.app_secrets (
  id text primary key,
  secret_hash text not null
);
-- No default password: set a unique secret in the database before using admin.
-- See the deployment guide for setup and existing-installation instructions.

alter table public.hazard_reports enable row level security;
alter table public.report_events enable row level security;
alter table public.resolve_flags enable row level security;
alter table public.feed_settings enable row level security;
alter table public.app_secrets enable row level security;
-- No policies on purpose: reads and writes only happen through the functions below.

create or replace function public.assert_admin(p_password text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_password is null or not exists (
    select 1 from public.app_secrets
    where id = 'admin'
      and secret_hash <> encode(sha256(convert_to('admin','UTF8')),'hex')
      and secret_hash = encode(sha256(convert_to(p_password,'UTF8')),'hex')
  ) then
    raise exception 'Invalid admin password' using errcode = '28000';
  end if;
end;
$$;

create or replace function public.report_payload_error(
  p jsonb,
  p_require_photo boolean,
  p_require_contact boolean default true
)
returns text
language plpgsql
immutable
as $$
declare
  digits text;
  email text;
begin
  if coalesce(p->>'type','') not in ('fire','flood','power','streetlight','water','road') then return 'Choose a valid hazard type.'; end if;
  if coalesce(p->>'severity','') not in ('critical','high','moderate','low') then return 'Choose a valid severity.'; end if;
  if coalesce(p->>'status','') not in ('active','monitoring','resolved') then return 'Choose a valid status.'; end if;
  if length(btrim(coalesce(p->>'title',''))) < 3 or length(p->>'title') > 200 then return 'Enter a concise incident title.'; end if;
  if length(btrim(coalesce(p->>'street_name',''))) < 2 or length(p->>'street_name') > 200 then return 'Enter the street or landmark.'; end if;
  if length(btrim(coalesce(p->>'sitio',''))) < 2 or length(p->>'sitio') > 120 then return 'Enter the sitio or area.'; end if;
  if length(btrim(coalesce(p->>'description',''))) < 5 or length(p->>'description') > 5000 then return 'Describe the incident in a few words.'; end if;
  if coalesce(p->>'lat','') = '' or coalesce(p->>'lng','') = '' then return 'A map pin is required.'; end if;
  if (p->>'lat')::double precision not between 4 and 22 or (p->>'lng')::double precision not between 115 and 128 then
    return 'The map pin is outside the Philippines.';
  end if;
  if length(btrim(coalesce(p->>'reported_by',''))) < 2 or length(p->>'reported_by') > 120 then return 'Enter your full name.'; end if;

  digits := regexp_replace(coalesce(p->>'contact_number',''), '[^0-9+]', '', 'g');
  email := lower(btrim(coalesce(p->>'reporter_email','')));
  if p_require_contact then
    if digits !~ '^(\+63|0)9[0-9]{9}$' then return 'Enter a valid Philippine cellphone number (e.g. 09171234567).'; end if;
    if email !~ '^[a-z0-9._%+-]+@(gmail|googlemail)\.com$' then return 'Use your Google account (Gmail) address.'; end if;
  else
    if digits <> '' and digits !~ '^(\+63|0)9[0-9]{9}$' then return 'Enter a valid Philippine cellphone number (e.g. 09171234567).'; end if;
    if email <> '' and email !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' then return 'Enter a valid email address.'; end if;
  end if;
  if p_require_photo and coalesce(p->>'photo_url','') = '' then return 'A photo of the hazard is required.'; end if;
  if coalesce(p->>'photo_url','') <> '' and p->>'photo_url' !~ '^(https?://|data:image/)' then return 'The photo must be an uploaded image.'; end if;
  return null;
exception
  when invalid_text_representation or numeric_value_out_of_range then return 'Enter valid coordinates.';
end;
$$;

create or replace function public.public_feed()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with settings as (
  select coalesce(hidden_types, '{}') as hidden from public.feed_settings where id = 1
), visible as (
  select r.*
  from public.hazard_reports r, settings s
  where r.review_status = 'accepted'
    and r.deleted_at is null
    and not (r.type = any (s.hidden))
)
select jsonb_build_object(
  'hidden_types', coalesce((select hidden from settings), '{}'::text[]),
  'reports', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'type', r.type, 'title', r.title, 'street_name', r.street_name, 'sitio', r.sitio,
      'lat', r.lat, 'lng', r.lng, 'status', r.status, 'severity', r.severity,
      'description', r.description,
      'reported_by', case when r.show_reporter then r.reported_by else 'Anonymous reporter' end,
      'photo_url', r.photo_url, 'affected_households', r.affected_households,
      'evacuation_center', r.evacuation_center, 'time_reported', r.time_reported,
      'reported_at', r.reported_at, 'last_updated', r.last_updated,
      'updates_count', r.updates_count, 'show_reporter', r.show_reporter, 'source', r.source,
      'pending_resolve_flags', (
        select count(*) from public.resolve_flags f where f.report_id = r.id and f.status = 'pending'
      )
    ) order by r.created_at desc)
    from visible r
  ), '[]'::jsonb)
);
$$;

create or replace function public.submit_report(payload jsonb, p_load_id text default null)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  problem text;
  new_id text := 'hz-' || gen_random_uuid()::text;
  ip_hash text;
  recent integer;
begin
  problem := public.report_payload_error(payload, true, true);
  if problem is not null then raise exception '%', problem using errcode = '22023'; end if;

  begin
    ip_hash := md5(coalesce((current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for'), 'local'));
  exception when others then
    ip_hash := 'local';
  end;

  select count(*) into recent from public.hazard_reports
   where submitter_hash = ip_hash and created_at > now() - interval '1 hour';
  if recent >= 10 then
    raise exception 'Too many reports from this connection. Please try again later.' using errcode = '22023';
  end if;

  insert into public.hazard_reports (
    id, type, title, street_name, sitio, lat, lng, status, severity, description,
    reported_by, contact_number, reporter_email, photo_url, affected_households, evacuation_center,
    time_reported, reported_at, last_updated, updates_count, show_reporter,
    review_status, source, submitter_hash
  ) values (
    new_id, payload->>'type', btrim(payload->>'title'), btrim(payload->>'street_name'), btrim(payload->>'sitio'),
    (payload->>'lat')::double precision, (payload->>'lng')::double precision,
    payload->>'status', payload->>'severity', btrim(payload->>'description'),
    btrim(payload->>'reported_by'), btrim(payload->>'contact_number'), lower(btrim(payload->>'reporter_email')),
    payload->>'photo_url', nullif(btrim(coalesce(payload->>'affected_households','')), ''),
    nullif(btrim(coalesce(payload->>'evacuation_center','')), ''),
    'Just now', now(), now(), 1, false, 'pending', 'community', ip_hash
  );

  insert into public.report_events (report_id, title, action, actor)
  values (new_id, btrim(payload->>'title'), 'Hazard report submitted', 'reporter');

  return new_id;
end;
$$;

create or replace function public.flag_resolved(
  p_report_id text,
  p_note text default null,
  p_flag_id uuid default gen_random_uuid()
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.hazard_reports;
begin
  select * into target from public.hazard_reports where id = p_report_id;
  if target.id is null or target.deleted_at is not null or target.review_status <> 'accepted' then
    raise exception 'This incident is not available for a resolve request.' using errcode = '22023';
  end if;
  if target.status = 'resolved' then
    raise exception 'This incident is already resolved.' using errcode = '22023';
  end if;
  insert into public.resolve_flags (id, report_id, note)
  values (coalesce(p_flag_id, gen_random_uuid()), p_report_id, nullif(btrim(coalesce(p_note,'')), ''))
  on conflict (report_id) where status = 'pending' do nothing;
  if found then
    insert into public.report_events (report_id, title, action, actor)
    values (target.id, target.title, 'Resident flagged as resolved (awaiting admin)', 'public');
  end if;
  return p_report_id;
end;
$$;

create or replace function public.admin_bundle(p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin(p_password);
  return jsonb_build_object(
    'hidden_types', coalesce((select hidden_types from public.feed_settings where id = 1), '{}'::text[]),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'type', r.type, 'title', r.title, 'street_name', r.street_name, 'sitio', r.sitio,
        'lat', r.lat, 'lng', r.lng, 'status', r.status, 'severity', r.severity,
        'description', r.description, 'reported_by', r.reported_by,
        'contact_number', r.contact_number, 'reporter_email', r.reporter_email,
        'photo_url', r.photo_url, 'affected_households', r.affected_households,
        'evacuation_center', r.evacuation_center, 'time_reported', r.time_reported,
        'reported_at', r.reported_at, 'last_updated', r.last_updated, 'updates_count', r.updates_count,
        'show_reporter', r.show_reporter, 'review_status', r.review_status,
        'decline_reason', r.decline_reason, 'reviewed_at', r.reviewed_at, 'deleted_at', r.deleted_at,
        'source', r.source, 'created_at', r.created_at,
        'pending_resolve_flags', (
          select count(*) from public.resolve_flags f where f.report_id = r.id and f.status = 'pending'
        )
      ) order by r.created_at desc)
      from public.hazard_reports r
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id, 'reportId', e.report_id, 'title', e.title,
        'action', e.action, 'actor', e.actor, 'at', e.created_at
      ) order by e.created_at desc)
      from (select * from public.report_events order by created_at desc limit 500) e
    ), '[]'::jsonb),
    'flags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'reportId', f.report_id,
        'title', r.title, 'note', f.note, 'status', f.status,
        'createdAt', f.created_at, 'reviewedAt', f.reviewed_at
      ) order by (f.status = 'pending') desc, f.created_at desc)
      from public.resolve_flags f
      join public.hazard_reports r on r.id = f.report_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_change(p_password text, p_id text, p_change jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.hazard_reports;
  kind text := p_change->>'type';
  action_text text;
begin
  perform public.assert_admin(p_password);
  select * into target from public.hazard_reports where id = p_id;
  if target.id is null then raise exception 'Incident not found' using errcode = '22023'; end if;
  if target.deleted_at is not null and kind <> 'restore' then
    raise exception 'Restore this incident before changing it.' using errcode = '22023';
  end if;

  if kind = 'status' then
    if coalesce(p_change->>'value','') not in ('active','monitoring','resolved') then raise exception 'Invalid status'; end if;
    if target.status = p_change->>'value' then return; end if;
    action_text := 'Status: ' || target.status || ' → ' || (p_change->>'value');
    update public.hazard_reports set status = p_change->>'value', updated_at = now() where id = p_id;
  elsif kind = 'visibility' then
    if (p_change->>'value')::boolean = target.show_reporter then return; end if;
    action_text := case when (p_change->>'value')::boolean then 'Reporter name made public' else 'Reporter name hidden' end;
    update public.hazard_reports set show_reporter = (p_change->>'value')::boolean, updated_at = now() where id = p_id;
  elsif kind = 'delete' then
    action_text := 'Removed from website (archived)';
    update public.hazard_reports set deleted_at = now(), updated_at = now() where id = p_id;
  elsif kind = 'restore' then
    if target.deleted_at is null then return; end if;
    action_text := 'Restored to website';
    update public.hazard_reports set deleted_at = null, updated_at = now() where id = p_id;
  elsif kind = 'review' then
    if coalesce(p_change->>'value','') not in ('accepted','declined') then raise exception 'Invalid review decision'; end if;
    if target.review_status = p_change->>'value' then return; end if;
    if p_change->>'value' = 'accepted' then
      action_text := 'Report accepted and published';
      update public.hazard_reports
         set review_status = 'accepted', reviewed_at = now(), decline_reason = null, updated_at = now()
       where id = p_id;
    else
      action_text := 'Report declined' ||
        case when nullif(btrim(coalesce(p_change->>'reason','')), '') is null then ''
             else ': ' || left(btrim(p_change->>'reason'), 500) end;
      update public.hazard_reports
         set review_status = 'declined', reviewed_at = now(),
             decline_reason = nullif(left(btrim(coalesce(p_change->>'reason','')), 500), ''),
             updated_at = now()
       where id = p_id;
    end if;
  else
    raise exception 'Unknown change type' using errcode = '22023';
  end if;

  insert into public.report_events (report_id, title, action, actor)
  values (target.id, target.title, action_text, 'admin');
end;
$$;

create or replace function public.admin_create(p_password text, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  problem text;
  new_id text := 'hz-' || gen_random_uuid()::text;
  created public.hazard_reports;
begin
  perform public.assert_admin(p_password);
  problem := public.report_payload_error(payload, false, false);
  if problem is not null then raise exception '%', problem using errcode = '22023'; end if;

  insert into public.hazard_reports (
    id, type, title, street_name, sitio, lat, lng, status, severity, description,
    reported_by, contact_number, reporter_email, photo_url, affected_households, evacuation_center,
    time_reported, reported_at, last_updated, updates_count, show_reporter,
    review_status, reviewed_at, source
  ) values (
    new_id, payload->>'type', btrim(payload->>'title'), btrim(payload->>'street_name'), btrim(payload->>'sitio'),
    (payload->>'lat')::double precision, (payload->>'lng')::double precision,
    payload->>'status', payload->>'severity', btrim(payload->>'description'),
    btrim(payload->>'reported_by'), nullif(btrim(coalesce(payload->>'contact_number','')), ''),
    nullif(lower(btrim(coalesce(payload->>'reporter_email',''))), ''),
    nullif(payload->>'photo_url',''), nullif(btrim(coalesce(payload->>'affected_households','')), ''),
    nullif(btrim(coalesce(payload->>'evacuation_center','')), ''),
    'Just now', now(), now(), 1, false, 'accepted', now(), 'admin'
  ) returning * into created;

  insert into public.report_events (report_id, title, action, actor)
  values (new_id, created.title, 'Admin incident created and published', 'admin');

  return jsonb_build_object('id', created.id, 'created_at', created.created_at);
end;
$$;

create or replace function public.admin_set_hidden_types(p_password text, p_types text[])
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  cleaned text[];
begin
  perform public.assert_admin(p_password);
  select coalesce(array_agg(distinct t), '{}')
    into cleaned
    from unnest(coalesce(p_types, '{}')) t
   where t in ('fire','flood','power','streetlight','water','road');
  update public.feed_settings set hidden_types = cleaned, updated_at = now() where id = 1;
  insert into public.report_events (report_id, title, action, actor)
  values (null, 'Incident feed', 
    case when cardinality(cleaned) = 0 then 'All hazard categories shown in public feeds'
         else 'Hidden from public feeds: ' || array_to_string(cleaned, ', ') end, 'admin');
  return cleaned;
end;
$$;

create or replace function public.admin_review_flag(p_password text, p_flag_id uuid, p_decision text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  flag public.resolve_flags;
  target public.hazard_reports;
begin
  perform public.assert_admin(p_password);
  if p_decision not in ('accepted','ignored') then raise exception 'Invalid decision'; end if;
  select * into flag from public.resolve_flags where id = p_flag_id;
  if flag.id is null then raise exception 'Resolve request not found'; end if;
  if flag.status <> 'pending' then raise exception 'This request was already handled'; end if;
  select * into target from public.hazard_reports where id = flag.report_id;

  update public.resolve_flags set status = p_decision, reviewed_at = now() where id = p_flag_id;

  if p_decision = 'accepted' then
    update public.hazard_reports set status = 'resolved', updated_at = now() where id = flag.report_id;
    insert into public.report_events (report_id, title, action, actor)
    values (flag.report_id, target.title, 'Resolved after resident request', 'admin');
  else
    insert into public.report_events (report_id, title, action, actor)
    values (flag.report_id, target.title, 'Resolve request ignored', 'admin');
  end if;

  return flag.report_id;
end;
$$;

revoke all on function public.assert_admin(text) from public;
revoke all on function public.public_feed() from public;
revoke all on function public.submit_report(jsonb, text) from public;
revoke all on function public.flag_resolved(text, text, uuid) from public;
revoke all on function public.admin_bundle(text) from public;
revoke all on function public.admin_change(text, text, jsonb) from public;
revoke all on function public.admin_create(text, jsonb) from public;
revoke all on function public.admin_set_hidden_types(text, text[]) from public;
revoke all on function public.admin_review_flag(text, uuid, text) from public;

grant execute on function public.public_feed() to anon, authenticated;
grant execute on function public.submit_report(jsonb, text) to anon, authenticated;
grant execute on function public.flag_resolved(text, text, uuid) to anon, authenticated;
grant execute on function public.admin_bundle(text) to anon, authenticated;
grant execute on function public.admin_change(text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_create(text, jsonb) to anon, authenticated;
grant execute on function public.admin_set_hidden_types(text, text[]) to anon, authenticated;
grant execute on function public.admin_review_flag(text, uuid, text) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.hazard_reports;
exception when duplicate_object then null; when undefined_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.resolve_flags;
exception when duplicate_object then null; when undefined_object then null;
end;
$$;
do $$
begin
  alter publication supabase_realtime add table public.feed_settings;
exception when duplicate_object then null; when undefined_object then null;
end;
$$;

-- Admin sign-in check used by the dashboard login form.
create or replace function public.admin_login(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_admin(p_password);
  return true;
end;
$$;
revoke all on function public.admin_login(text) from public;
grant execute on function public.admin_login(text) to anon, authenticated;

grant execute on function public.report_payload_error(jsonb, boolean, boolean) to anon, authenticated;
