-- Shared, realtime website visit counter (project: hazardsync-map-data).
-- Safe to re-run. Starts at exactly 5,000 and only ever increases.
--
-- The publishable/anon key used by the browser is public by design: it can read
-- the counter and call the RPC, but row writes are blocked by RLS.

create table if not exists public.site_visits (
  id smallint primary key default 1 check (id = 1),
  total bigint not null default 5000 check (total >= 0),
  updated_at timestamptz not null default now()
);

insert into public.site_visits (id, total)
values (1, 5000)
on conflict (id) do nothing;

alter table public.site_visits enable row level security;
alter table public.site_visits replica identity full;

drop policy if exists "site_visits_public_read" on public.site_visits;
create policy "site_visits_public_read"
  on public.site_visits for select
  using (true);

-- Ledger of counted page loads so a retried request cannot double-count.
create table if not exists public.site_visit_events (
  load_id uuid primary key,
  counted_at timestamptz not null default now()
);
create index if not exists site_visit_events_counted_at_idx
  on public.site_visit_events (counted_at);
alter table public.site_visit_events enable row level security;
-- No policies: visitors can neither read nor write this table directly.

create or replace function public.increment_site_visit(p_load_id uuid default null)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted boolean := true;
  current_total bigint;
begin
  if p_load_id is not null then
    insert into public.site_visit_events (load_id)
    values (p_load_id)
    on conflict (load_id) do nothing;

    inserted := found;
    if not inserted then
      select total into current_total from public.site_visits where id = 1;
      return coalesce(current_total, 0);
    end if;
  end if;

  update public.site_visits
     set total = total + 1,
         updated_at = now()
   where id = 1
  returning total into current_total;

  if current_total is null then
    insert into public.site_visits (id, total)
    values (1, 5001)
    on conflict (id) do update
       set total = public.site_visits.total + 1,
           updated_at = now()
    returning total into current_total;
  end if;

  if random() < 0.01 then
    delete from public.site_visit_events where counted_at < now() - interval '30 days';
  end if;

  return current_total;
end;
$$;

revoke all on function public.increment_site_visit(uuid) from public;
grant execute on function public.increment_site_visit(uuid) to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.site_visits;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;
