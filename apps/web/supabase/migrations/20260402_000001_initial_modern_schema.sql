-- CleanMyMap modern stack baseline schema
-- Run with Supabase SQL editor or migration engine.

create extension if not exists pgcrypto;

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_clerk_id text not null,
  actor_name text,
  action_date date not null,
  location_label text not null,
  latitude double precision,
  longitude double precision,
  waste_kg numeric(10,2) not null default 0,
  cigarette_butts integer not null default 0,
  volunteers_count integer not null default 1,
  duration_minutes integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text
);

create index if not exists idx_actions_action_date on public.actions(action_date desc);
create index if not exists idx_actions_status on public.actions(status);
create index if not exists idx_actions_created_by on public.actions(created_by_clerk_id);

create table if not exists public.spots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by_clerk_id text not null,
  label text not null,
  waste_type text,
  latitude double precision,
  longitude double precision,
  status text not null default 'new' check (status in ('new', 'validated', 'cleaned')),
  notes text
);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organizer_clerk_id text not null,
  title text not null,
  event_date date not null,
  location_label text not null,
  description text
);

create table if not exists public.event_rsvps (
  event_id uuid not null references public.community_events(id) on delete cascade,
  participant_clerk_id text not null,
  status text not null check (status in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (event_id, participant_clerk_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_clerk_id text not null,
  period_label text not null,
  file_path text not null,
  file_kind text not null check (file_kind in ('pdf', 'csv'))
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_actions_updated_at on public.actions;
create trigger trg_actions_updated_at
before update on public.actions
for each row execute procedure public.set_updated_at();

alter table public.actions enable row level security;
alter table public.spots enable row level security;
alter table public.community_events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.reports enable row level security;

-- Baseline policies (can be tightened in phase-2)
drop policy if exists actions_select_all on public.actions;
create policy actions_select_all on public.actions for select using (true);

drop policy if exists actions_insert_authenticated on public.actions;
create policy actions_insert_authenticated on public.actions
for insert
with check (auth.role() = 'authenticated');

drop policy if exists actions_update_owner_or_service on public.actions;
create policy actions_update_owner_or_service on public.actions
for update
using (
  auth.role() = 'service_role'
  or created_by_clerk_id = coalesce(auth.jwt() ->> 'sub', '')
);

-- Read policy for MVP on remaining tables
drop policy if exists spots_select_all on public.spots;
create policy spots_select_all on public.spots for select using (true);

drop policy if exists community_events_select_all on public.community_events;
create policy community_events_select_all on public.community_events for select using (true);

drop policy if exists event_rsvps_select_all on public.event_rsvps;
create policy event_rsvps_select_all on public.event_rsvps for select using (true);

drop policy if exists reports_select_owner on public.reports;
create policy reports_select_owner on public.reports
for select
using (
  auth.role() = 'service_role'
  or owner_clerk_id = coalesce(auth.jwt() ->> 'sub', '')
);
