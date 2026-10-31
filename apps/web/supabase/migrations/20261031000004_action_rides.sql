-- PURPOSE: store private, action-scoped carpool offers and requests.
-- CALLER: only authorized server services use the tables and helper functions.
-- AUTHORIZATION_BOUNDARY: RLS and grants deny direct anon/authenticated SQL;
-- HTTP handlers must authenticate Clerk users, verify confirmed registration,
-- and enforce action ownership/capabilities before calling service SQL.
-- PRIVACY: origin_zone_name is a canonical territory label validated by the
-- server owner; no exact address, coordinate, phone, email or plate column is
-- permitted. Notes/messages remain private and are never public projections.
-- CAPACITY_OWNER: action_ride_capacity is the only seats calculation. The
-- accepted-request trigger locks the ride row before re-reading that owner,
-- so a future 6E2 acceptance cannot make capacity negative under retry or
-- concurrent requests.
-- FAILURE_BEHAVIOR: invalid bounds, lifecycle values, duplicate active
-- requests, ineligible actions/members and over-capacity acceptance raise a
-- constraint or explicit exception; no partial request is retained.
-- SEARCH_PATH: every function fixes search_path to public, pg_catalog.
-- FORWARD_ONLY: this migration is append-only.

create table if not exists public.action_rides (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  driver_user_id text not null,
  origin_zone_name text not null,
  departure_at timestamptz not null,
  seats_total smallint not null default 1,
  note text null,
  status text not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint action_rides_driver_user_id_nonempty
    check (nullif(btrim(driver_user_id), '') is not null),
  constraint action_rides_origin_zone_name_nonempty
    check (char_length(btrim(origin_zone_name)) between 1 and 120),
  constraint action_rides_seats_total_check
    check (seats_total between 1 and 8),
  constraint action_rides_note_length
    check (char_length(coalesce(note, '')) <= 200),
  constraint action_rides_status_check
    check (status in ('open', 'closed', 'cancelled'))
);

create table if not exists public.action_ride_requests (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.action_rides(id) on delete cascade,
  passenger_user_id text not null,
  seats_requested smallint not null default 1,
  message text null,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz null,
  constraint action_ride_requests_passenger_user_id_nonempty
    check (nullif(btrim(passenger_user_id), '') is not null),
  constraint action_ride_requests_seats_requested_check
    check (seats_requested between 1 and 4),
  constraint action_ride_requests_message_length
    check (char_length(coalesce(message, '')) <= 200),
  constraint action_ride_requests_status_check
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  constraint action_ride_requests_resolution_consistency
    check (
      (status = 'pending' and resolved_at is null)
      or (status <> 'pending' and resolved_at is not null)
    )
);

create index if not exists action_rides_action_id_idx
  on public.action_rides (action_id, status, departure_at);
create index if not exists action_rides_driver_user_id_idx
  on public.action_rides (driver_user_id, status, departure_at);
create index if not exists action_ride_requests_ride_id_idx
  on public.action_ride_requests (ride_id, status, created_at);
create index if not exists action_ride_requests_passenger_user_id_idx
  on public.action_ride_requests (passenger_user_id, status, created_at);
create unique index if not exists action_ride_requests_active_passenger_ride_idx
  on public.action_ride_requests (ride_id, passenger_user_id)
  where status in ('pending', 'accepted');

alter table public.action_rides enable row level security;
alter table public.action_ride_requests enable row level security;

drop policy if exists action_rides_service_only on public.action_rides;
create policy action_rides_service_only
on public.action_rides
for all
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

drop policy if exists action_ride_requests_service_only on public.action_ride_requests;
create policy action_ride_requests_service_only
on public.action_ride_requests
for all
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

revoke all privileges on table public.action_rides
  from public, anon, authenticated;
grant select, insert, update, delete on table public.action_rides
  to service_role;
revoke all privileges on table public.action_ride_requests
  from public, anon, authenticated;
grant select, insert, update, delete on table public.action_ride_requests
  to service_role;

create or replace function public.update_action_rides_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists action_rides_updated_at on public.action_rides;
create trigger action_rides_updated_at
before update on public.action_rides
for each row execute function public.update_action_rides_updated_at();

drop trigger if exists action_ride_requests_updated_at on public.action_ride_requests;
create trigger action_ride_requests_updated_at
before update on public.action_ride_requests
for each row execute function public.update_action_rides_updated_at();

-- The only capacity calculation used by reads and future reservation writes.
create or replace function public.action_ride_capacity(p_ride_id uuid)
returns table (
  ride_id uuid,
  seats_total smallint,
  seats_reserved integer,
  seats_available integer
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    r.id,
    r.seats_total,
    coalesce(sum(rr.seats_requested) filter (where rr.status = 'accepted'), 0)::integer,
    (r.seats_total - coalesce(sum(rr.seats_requested) filter (where rr.status = 'accepted'), 0))::integer
  from public.action_rides r
  left join public.action_ride_requests rr on rr.ride_id = r.id
  where r.id = p_ride_id
  group by r.id, r.seats_total;
$$;

-- Confirmed future registration and the public future-action contract are
-- separate checks from HTTP AuthN; the caller still supplies the Clerk ID
-- obtained from the validated session.
create or replace function public.is_action_ride_eligible_member(
  p_action_id uuid,
  p_user_id text
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    and nullif(btrim(p_user_id), '') is not null
    and exists (
      select 1
      from public.actions a
      join public.action_registrations ar on ar.action_id = a.id
      where a.id = p_action_id
        and ar.user_id = btrim(p_user_id)
        and ar.registration_status = 'confirmed'
        and public.is_public_future_pre_action(
          a.action_phase,
          a.published_at,
          a.moderation_visibility,
          a.status,
          a.action_date,
          a.event_start_time
        )
        and coalesce(a.access_mode, 'public') = 'public'
        and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    );
$$;

-- A ride is accepted only when its local Paris departure is on the action
-- date and before the declared action start. Missing action start time is
-- deliberately fail-closed because temporal coherence cannot be proven.
create or replace function public.is_action_ride_departure_eligible(
  p_action_id uuid,
  p_departure_at timestamptz
)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    and p_departure_at > now()
    and exists (
      select 1
      from public.actions a
      where a.id = p_action_id
        and a.event_start_time is not null
        and public.is_public_future_pre_action(
          a.action_phase,
          a.published_at,
          a.moderation_visibility,
          a.status,
          a.action_date,
          a.event_start_time
        )
        and coalesce(a.access_mode, 'public') = 'public'
        and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
        and (p_departure_at at time zone 'Europe/Paris')::date = a.action_date
        and (p_departure_at at time zone 'Europe/Paris')::time < a.event_start_time
    );
$$;

create or replace function public.enforce_action_ride_request_capacity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_capacity record;
begin
  if new.status = 'accepted' then
    -- Serialize acceptance and reread the canonical capacity owner after the
    -- ride row lock. The future 6E2 service can therefore update the request
    -- normally without duplicating an aggregate or trusting a client count.
    perform 1
    from public.action_rides
    where id = new.ride_id
    for update;

    select * into v_capacity
    from public.action_ride_capacity(new.ride_id);
    if v_capacity.ride_id is null then
      raise exception 'Ride not found';
    end if;
    if v_capacity.seats_reserved > v_capacity.seats_total then
      raise exception 'Ride capacity exceeded';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists action_ride_requests_capacity on public.action_ride_requests;
create trigger action_ride_requests_capacity
after insert or update of ride_id, seats_requested, status on public.action_ride_requests
for each row execute function public.enforce_action_ride_request_capacity();

create or replace function public.enforce_action_ride_eligibility()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_ride public.action_rides%rowtype;
begin
  if tg_table_name = 'action_rides' then
    if not public.is_action_ride_eligible_member(new.action_id, new.driver_user_id) then
      raise exception 'Driver is not eligible for this action';
    end if;
    if not public.is_action_ride_departure_eligible(new.action_id, new.departure_at) then
      raise exception 'Ride departure is not coherent with the action';
    end if;
    return new;
  end if;

  select * into v_ride
  from public.action_rides
  where id = new.ride_id;
  if not found then
    raise exception 'Ride not found';
  end if;
  if new.status in ('pending', 'accepted') then
    if v_ride.status <> 'open' then
      raise exception 'Ride is not open';
    end if;
    if new.passenger_user_id = v_ride.driver_user_id then
      raise exception 'Driver cannot request their own ride';
    end if;
    if not public.is_action_ride_eligible_member(v_ride.action_id, new.passenger_user_id) then
      raise exception 'Passenger is not eligible for this action';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists action_rides_eligibility on public.action_rides;
create trigger action_rides_eligibility
after insert or update of action_id, driver_user_id, departure_at on public.action_rides
for each row execute function public.enforce_action_ride_eligibility();

drop trigger if exists action_ride_requests_eligibility on public.action_ride_requests;
create trigger action_ride_requests_eligibility
after insert or update of ride_id, passenger_user_id, status on public.action_ride_requests
for each row execute function public.enforce_action_ride_eligibility();

create or replace function public.enforce_action_ride_total_capacity()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_reserved integer;
begin
  if new.seats_total < old.seats_total then
    select coalesce(sum(seats_requested) filter (where status = 'accepted'), 0)::integer
      into v_reserved
    from public.action_ride_requests
    where ride_id = new.id;
    if v_reserved > new.seats_total then
      raise exception 'Ride capacity cannot be lower than accepted seats';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists action_rides_total_capacity on public.action_rides;
create trigger action_rides_total_capacity
before update of seats_total on public.action_rides
for each row execute function public.enforce_action_ride_total_capacity();

revoke all on function public.update_action_rides_updated_at() from public, anon, authenticated;
revoke all on function public.action_ride_capacity(uuid) from public, anon, authenticated;
revoke all on function public.is_action_ride_eligible_member(uuid, text) from public, anon, authenticated;
revoke all on function public.is_action_ride_departure_eligible(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.enforce_action_ride_request_capacity() from public, anon, authenticated;
revoke all on function public.enforce_action_ride_total_capacity() from public, anon, authenticated;
revoke all on function public.enforce_action_ride_eligibility() from public, anon, authenticated;
grant execute on function public.action_ride_capacity(uuid) to service_role;
grant execute on function public.is_action_ride_eligible_member(uuid, text) to service_role;
grant execute on function public.is_action_ride_departure_eligible(uuid, timestamptz) to service_role;
