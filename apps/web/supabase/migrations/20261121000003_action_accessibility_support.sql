-- PURPOSE: keep functional accommodation requests private and expire them after the action lifecycle.
-- CALLER: authenticated participant and action-management routes through service_role only.
-- AUTHORIZATION_BOUNDARY: routes verify confirmed registration for participants and canonical organizer ownership for follow-up.
-- IDEMPOTENCY: one request per action and participant; updates replace the selected functional needs.
-- ATOMICITY: a request and its consented check-in fields are one row; a CHECK constraint forbids check-ins without consent.
-- FAILURE_BEHAVIOR: invalid needs and non-consented follow-up mutations are rejected by database constraints.
-- SEARCH_PATH: trigger function pins search_path; no SECURITY DEFINER function is introduced.
-- GRANTS: browser roles have no table privileges; only service_role can access this private data.

create table if not exists public.action_accessibility_support_requests (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  requester_user_id text not null,
  requested_needs text[] not null,
  day_tracking_consent boolean not null default false,
  arrival_status text,
  contact_status text,
  departure_status text,
  retention_expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint action_accessibility_support_requester_check
    check (nullif(btrim(requester_user_id), '') is not null),
  constraint action_accessibility_support_needs_check
    check (
      cardinality(requested_needs) between 1 and 9
      and requested_needs <@ array[
        'step_free_route', 'shorter_route', 'rest_breaks', 'adapted_equipment',
        'simplified_information', 'written_instructions', 'oral_instructions',
        'human_support', 'personal_companion'
      ]::text[]
    ),
  constraint action_accessibility_support_checkin_status_check
    check (
      (arrival_status is null or arrival_status in ('completed', 'not_applicable'))
      and (contact_status is null or contact_status in ('completed', 'not_applicable'))
      and (departure_status is null or departure_status in ('completed', 'not_applicable'))
    ),
  constraint action_accessibility_support_checkin_consent_check
    check (
      day_tracking_consent
      or (arrival_status is null and contact_status is null and departure_status is null)
    ),
  constraint action_accessibility_support_retention_check
    check (retention_expires_at > created_at),
  constraint action_accessibility_support_action_requester_key
    unique (action_id, requester_user_id)
);

create index if not exists action_accessibility_support_action_retention_idx
  on public.action_accessibility_support_requests (action_id, retention_expires_at, created_at);

alter table public.action_accessibility_support_requests enable row level security;

drop policy if exists action_accessibility_support_service_only
  on public.action_accessibility_support_requests;
create policy action_accessibility_support_service_only
  on public.action_accessibility_support_requests
  for all to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

revoke all on table public.action_accessibility_support_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.action_accessibility_support_requests to service_role;

create or replace function public.set_action_accessibility_support_retention()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  action_date date;
begin
  select a.action_date into action_date
  from public.actions a
  where a.id = new.action_id;

  if action_date is null then
    raise exception 'action_accessibility_support_action_not_found' using errcode = '23503';
  end if;

  new.retention_expires_at := ((action_date + 90)::timestamp at time zone 'UTC');
  return new;
end;
$$;

revoke all on function public.set_action_accessibility_support_retention() from public, anon, authenticated;
grant execute on function public.set_action_accessibility_support_retention() to service_role;

drop trigger if exists action_accessibility_support_retention
  on public.action_accessibility_support_requests;
create trigger action_accessibility_support_retention
  before insert on public.action_accessibility_support_requests
  for each row execute function public.set_action_accessibility_support_retention();

drop trigger if exists action_accessibility_support_updated_at
  on public.action_accessibility_support_requests;
create trigger action_accessibility_support_updated_at
  before update on public.action_accessibility_support_requests
  for each row execute function public.set_updated_at();

create or replace function public.purge_expired_action_accessibility_support_requests(
  p_as_of timestamptz default now(),
  p_dry_run boolean default true,
  p_batch_size integer default 100
)
returns table (scanned_count integer, deleted_count integer)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_scanned integer := 0;
  v_deleted integer := 0;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'action_accessibility_support_server_only' using errcode = '42501';
  end if;

  if p_as_of is null or p_batch_size not between 1 and 500 then
    raise exception 'action_accessibility_support_invalid_purge_parameters' using errcode = '22023';
  end if;

  if p_dry_run then
    select count(*)::integer into v_scanned
    from (
      select id
      from public.action_accessibility_support_requests
      where retention_expires_at <= p_as_of
      order by retention_expires_at, id
      limit p_batch_size
    ) expired;
  else
    with expired as (
      select id
      from public.action_accessibility_support_requests
      where retention_expires_at <= p_as_of
      order by retention_expires_at, id
      limit p_batch_size
      for update skip locked
    ), deleted as (
      delete from public.action_accessibility_support_requests request
      using expired
      where request.id = expired.id
      returning request.id
    )
    select count(*)::integer into v_deleted from deleted;
    v_scanned := v_deleted;
  end if;

  return query select v_scanned, v_deleted;
end;
$$;

revoke all on function public.purge_expired_action_accessibility_support_requests(timestamptz, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_action_accessibility_support_requests(timestamptz, boolean, integer)
  to service_role;

comment on table public.action_accessibility_support_requests is
  'Private functional accommodation requests; no diagnoses, medical evidence or public projections. Expires no later than 90 days after the action date.';

commit;
