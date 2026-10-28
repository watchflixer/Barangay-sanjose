-- HazardSync admin operations. Run in the Supabase SQL Editor as project owner.
-- Safe to re-run; existing records are not replaced. Use ONLY the public anon
-- key in the browser. No service-role key is ever needed in Vite.

create extension if not exists pgcrypto;

create table if not exists public.hazardsync_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.hazardsync_admins enable row level security;
revoke all on public.hazardsync_admins from anon, authenticated;
grant select on public.hazardsync_admins to authenticated;
drop policy if exists "admins can see own membership" on public.hazardsync_admins;
create policy "admins can see own membership" on public.hazardsync_admins
  for select to authenticated using (user_id = auth.uid());

create or replace function public.is_hazardsync_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from public.hazardsync_admins where user_id = auth.uid()); $$;
revoke all on function public.is_hazardsync_admin() from public;
grant execute on function public.is_hazardsync_admin() to authenticated;

create table if not exists public.hazard_reports (
  id text primary key,
  data jsonb not null,
  visibility text not null default 'pending' check (visibility in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hazard_reports_visibility_idx on public.hazard_reports (visibility);
alter table public.hazard_reports enable row level security;
revoke all on public.hazard_reports from anon, authenticated;
grant select, insert, update, delete on public.hazard_reports to authenticated;
drop policy if exists "admin manages hazards" on public.hazard_reports;
create policy "admin manages hazards" on public.hazard_reports for all to authenticated
  using (public.is_hazardsync_admin()) with check (public.is_hazardsync_admin());

-- A deliberately limited public view: pending/hidden rows and contact details
-- never reach public clients. This view is owner-executed specifically so it
-- can expose only this projection while the underlying table remains private.
create or replace view public.published_hazards with (security_barrier = true) as
  select id, data - 'reporterEmail' - 'contactNumber' as data, created_at, updated_at
  from public.hazard_reports where visibility = 'published';
revoke all on public.published_hazards from public, anon, authenticated;
grant select on public.published_hazards to anon, authenticated;

-- Public submissions can only create a pending report. The caller cannot set
-- visibility or status and cannot read any report back through this function.
create or replace function public.submit_community_hazard(payload jsonb)
returns void language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  lat double precision;
  lng double precision;
  photo text := coalesce(payload->>'photoUrl', '');
  kind text := coalesce(payload->>'type', '');
  severity text := coalesce(payload->>'severity', '');
begin
  if jsonb_typeof(payload) <> 'object'
    or kind not in ('fire', 'flood', 'power', 'streetlight', 'water', 'road')
    or severity not in ('critical', 'high', 'moderate', 'low')
    or length(trim(coalesce(payload->>'title', ''))) not between 1 and 140
    or length(trim(coalesce(payload->>'streetName', ''))) not between 1 and 200
    or length(trim(coalesce(payload->>'sitio', ''))) not between 1 and 200
    or length(trim(coalesce(payload->>'reportedBy', ''))) not between 1 and 160
    or length(trim(coalesce(payload->>'reporterEmail', ''))) not between 3 and 254
    or length(trim(coalesce(payload->>'contactNumber', ''))) not between 1 and 80
    or length(coalesce(payload->>'description', '')) > 3000
    or jsonb_typeof(payload->'coordinates') <> 'array'
    or jsonb_array_length(payload->'coordinates') <> 2
    or jsonb_typeof(payload->'coordinates'->0) <> 'number'
    or jsonb_typeof(payload->'coordinates'->1) <> 'number'
    or length(photo) not between 1 and 1500000
    or photo !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$'
  then raise exception 'Invalid report'; end if;
  lat := (payload->'coordinates'->>0)::double precision;
  lng := (payload->'coordinates'->>1)::double precision;
  if lat not between 4 and 22 or lng not between 116 and 128 then
    raise exception 'Coordinates outside the Philippines';
  end if;
  -- Light abuse guard: identical headline + street within five minutes is a
  -- double-submit, not a new incident.
  if exists (
    select 1 from public.hazard_reports
    where created_at > now() - interval '5 minutes'
      and data->>'title' = trim(payload->>'title')
      and data->>'streetName' = trim(payload->>'streetName')
  ) then raise exception 'This report was already submitted. Please wait a few minutes.'; end if;
  insert into public.hazard_reports (id, visibility, data)
  values (gen_random_uuid()::text, 'pending', jsonb_build_object(
    'type', kind, 'title', trim(payload->>'title'),
    'streetName', trim(payload->>'streetName'), 'sitio', trim(payload->>'sitio'),
    'coordinates', jsonb_build_array(lat, lng), 'status', 'active', 'severity', severity,
    'description', coalesce(payload->>'description', ''), 'reportedBy', trim(payload->>'reportedBy'),
    'reporterEmail', trim(payload->>'reporterEmail'), 'contactNumber', trim(payload->>'contactNumber'),
    'photoUrl', photo, 'source', 'community', 'updatesCount', 0
  ));
end; $$;
revoke all on function public.submit_community_hazard(jsonb) from public;
grant execute on function public.submit_community_hazard(jsonb) to anon, authenticated;

-- Audit trail shown in the admin History screen. Admin-only; the public site
-- never reads it. Entries survive deletion of the incident itself.
create table if not exists public.admin_activity (
  id text primary key,
  actor text not null,
  action text not null,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index if not exists admin_activity_created_idx on public.admin_activity (created_at desc);
alter table public.admin_activity enable row level security;
revoke all on public.admin_activity from anon, authenticated;
grant select, insert on public.admin_activity to authenticated;
drop policy if exists "admin reads activity" on public.admin_activity;
create policy "admin reads activity" on public.admin_activity for select to authenticated
  using (public.is_hazardsync_admin());
drop policy if exists "admin writes activity" on public.admin_activity;
create policy "admin writes activity" on public.admin_activity for insert to authenticated
  with check (public.is_hazardsync_admin());

create table if not exists public.site_content (
  key text primary key check (key in ('map_settings', 'evacuation_centers', 'emergency_contacts', 'broadcast_url')),
  value jsonb not null
);
alter table public.site_content enable row level security;
revoke all on public.site_content from anon, authenticated;
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;
drop policy if exists "public reads site content" on public.site_content;
create policy "public reads site content" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "admin manages site content" on public.site_content;
create policy "admin manages site content" on public.site_content for all to authenticated
  using (public.is_hazardsync_admin()) with check (public.is_hazardsync_admin());
insert into public.site_content (key, value) values
  ('map_settings', '{"types":{"flood":true,"fire":true,"power":true,"streetlight":true,"water":true,"road":true},"showResolved":true,"showPagasa":true}'::jsonb),
  ('evacuation_centers', '[]'::jsonb),
  ('emergency_contacts', '[]'::jsonb),
  ('broadcast_url', '""'::jsonb)
on conflict (key) do nothing;

-- The admin UI manages the preferred single-table Help Center layout.
-- If using legacy per-category tables, migrate them first; creating this table
-- makes the public Help Center select it instead of those legacy tables.
create table if not exists public.help_places (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category <> ''),
  name text not null check (length(trim(name)) > 0),
  latitude double precision not null check (latitude between 4 and 22),
  longitude double precision not null check (longitude between 116 and 128),
  address text, hours text, phone text, note text,
  approx boolean not null default false,
  replaces_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists help_places_category_idx on public.help_places (category) where is_active;
alter table public.help_places enable row level security;
revoke all on public.help_places from anon, authenticated;
grant select on public.help_places to anon, authenticated;
grant insert, update, delete on public.help_places to authenticated;
drop policy if exists "public read active" on public.help_places;
create policy "public read active" on public.help_places for select to anon, authenticated using (is_active);
drop policy if exists "admin manages help places" on public.help_places;
create policy "admin manages help places" on public.help_places for all to authenticated
  using (public.is_hazardsync_admin()) with check (public.is_hazardsync_admin());

-- After creating a user in Supabase Authentication, grant that user access:
-- insert into public.hazardsync_admins (user_id)
-- select id from auth.users where email = 'YOUR_ADMIN_EMAIL' on conflict do nothing;
