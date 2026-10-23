-- OPTIONAL, simpler layout: ONE table for every Help Center filter.
-- Run in Supabase Dashboard > SQL Editor. Safe to re-run.
--
-- The app detects this table automatically: if `public.help_places` answers,
-- the Help Center reads its pins from here instead of the per-filter tables in
-- help_places.sql. `category` holds the filter id used by the app:
--
--   seven_eleven, convenience, supermarket, market, pharmacy, bigasan, water,
--   lpg, bakery, hardware, laundry, police, fire, hospital, clinic, evacuation,
--   barangay, school, church, court, wifi, food, salon, dental, vet, gym, gas,
--   vulcanizing, terminal, parking, atm, bank, pawnshop, remittance
--
-- Only active rows are publicly readable; the browser never writes.

create table if not exists public.help_places (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category <> ''),
  name text not null check (length(trim(name)) > 0),
  latitude double precision not null check (latitude between 4 and 22),
  longitude double precision not null check (longitude between 116 and 128),
  address text,
  hours text,
  phone text,
  note text,
  approx boolean not null default false,
  replaces_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists help_places_category_idx
  on public.help_places (category) where is_active;

alter table public.help_places enable row level security;
revoke all on public.help_places from anon, authenticated;
grant select on public.help_places to anon, authenticated;

drop policy if exists "public read active" on public.help_places;
create policy "public read active" on public.help_places
  for select to anon, authenticated using (is_active);

-- Example rows (edit or delete them in Table Editor):
-- insert into public.help_places (category, name, latitude, longitude, address)
-- values
--   ('school',  'Kasiglahan Village National High School', 14.7495, 121.1416, 'Kasiglahan Village, Brgy. San Jose'),
--   ('police',  'Barangay San Jose Police Outpost',        14.7455, 121.1368, 'Kasiglahan Village 1K2, Brgy. San Jose'),
--   ('pharmacy','Mercury Drug - Kasiglahan',               14.7462, 121.1351, 'Kasiglahan Village 1K1, Brgy. San Jose');
