-- PURPOSE: persist private action buddy availability, requests and proposals
-- while keeping the active match canonical on action_buddy_requests.
-- CALLER: authenticated action routes after Clerk AuthN/AuthZ; all table writes
-- and the acceptance RPC are server-only through service_role.
-- AUTHORIZATION_BOUNDARY: browser roles have no table or RPC privileges; the
-- HTTP layer resolves the Clerk identity and actor ownership before service use.
-- IDEMPOTENCY: partial unique indexes prevent duplicate active requests and
-- pending proposals; accept replay returns already_matched for the same pair.
-- ATOMICITY: accept_action_buddy_proposal locks action, request, proposal,
-- registrations and the mentor/action resource before changing all states.
-- FAILURE_BEHAVIOR: business conflicts raise explicit action_buddy_conflict
-- errors and roll back every mutation; request cancellation withdraws pending
-- proposals in the same transaction through its trigger.
-- SEARCH_PATH: all trigger/RPC functions pin search_path explicitly.
-- GRANTS: only service_role can read or mutate these tables or execute the RPC.

create table if not exists public.action_buddy_availability (
  action_id uuid not null references public.actions(id) on delete cascade,
  mentor_user_id text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint action_buddy_availability_pk primary key (action_id, mentor_user_id),
  constraint action_buddy_availability_mentor_check
    check (nullif(btrim(mentor_user_id), '') is not null)
);

create index if not exists action_buddy_availability_mentor_idx
  on public.action_buddy_availability (mentor_user_id, action_id);

create table if not exists public.action_buddy_requests (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  requester_user_id text not null,
  status text not null default 'open',
  matched_mentor_user_id text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  matched_at timestamptz,
  constraint action_buddy_requests_requester_check
    check (nullif(btrim(requester_user_id), '') is not null),
  constraint action_buddy_requests_status_check
    check (status in ('open', 'matched', 'cancelled')),
  constraint action_buddy_requests_matched_mentor_check
    check (matched_mentor_user_id is null or btrim(matched_mentor_user_id) <> btrim(requester_user_id)),
  constraint action_buddy_requests_state_check
    check (
      (status = 'open' and matched_mentor_user_id is null and matched_at is null)
      or (status = 'matched' and matched_mentor_user_id is not null and matched_at is not null)
      or (status = 'cancelled')
    )
);

create index if not exists action_buddy_requests_action_status_idx
  on public.action_buddy_requests (action_id, status, created_at, id);

create index if not exists action_buddy_requests_requester_idx
  on public.action_buddy_requests (requester_user_id, action_id, created_at desc);

create unique index if not exists action_buddy_requests_active_requester_key
  on public.action_buddy_requests (action_id, requester_user_id)
  where status in ('open', 'matched');

create unique index if not exists action_buddy_requests_active_mentor_key
  on public.action_buddy_requests (action_id, matched_mentor_user_id)
  where status = 'matched' and matched_mentor_user_id is not null;

create table if not exists public.action_buddy_proposals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.action_buddy_requests(id) on delete cascade,
  mentor_user_id text not null,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc'::text, now()),
  resolved_at timestamptz,
  constraint action_buddy_proposals_mentor_check
    check (nullif(btrim(mentor_user_id), '') is not null),
  constraint action_buddy_proposals_status_check
    check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  constraint action_buddy_proposals_resolution_check
    check (
      (status = 'pending' and resolved_at is null)
      or (status in ('accepted', 'declined', 'withdrawn') and resolved_at is not null)
    )
);

create index if not exists action_buddy_proposals_request_status_idx
  on public.action_buddy_proposals (request_id, status, created_at, id);

create index if not exists action_buddy_proposals_mentor_status_idx
  on public.action_buddy_proposals (mentor_user_id, status, created_at desc);

create unique index if not exists action_buddy_proposals_pending_mentor_request_key
  on public.action_buddy_proposals (request_id, mentor_user_id)
  where status = 'pending';

alter table public.action_buddy_availability enable row level security;
alter table public.action_buddy_requests enable row level security;
alter table public.action_buddy_proposals enable row level security;

drop policy if exists action_buddy_availability_service_only on public.action_buddy_availability;
create policy action_buddy_availability_service_only
on public.action_buddy_availability
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

drop policy if exists action_buddy_requests_service_only on public.action_buddy_requests;
create policy action_buddy_requests_service_only
on public.action_buddy_requests
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

drop policy if exists action_buddy_proposals_service_only on public.action_buddy_proposals;
create policy action_buddy_proposals_service_only
on public.action_buddy_proposals
for all to service_role
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

revoke all on table public.action_buddy_availability from public, anon, authenticated;
revoke all on table public.action_buddy_requests from public, anon, authenticated;
revoke all on table public.action_buddy_proposals from public, anon, authenticated;
grant select, insert, update, delete on table public.action_buddy_availability to service_role;
grant select, insert, update, delete on table public.action_buddy_requests to service_role;
grant select, insert, update, delete on table public.action_buddy_proposals to service_role;

drop trigger if exists action_buddy_availability_updated_at on public.action_buddy_availability;
create trigger action_buddy_availability_updated_at
before update on public.action_buddy_availability
for each row execute function public.set_updated_at();

drop trigger if exists action_buddy_requests_updated_at on public.action_buddy_requests;
create trigger action_buddy_requests_updated_at
before update on public.action_buddy_requests
for each row execute function public.set_updated_at();

create or replace function public.withdraw_action_buddy_proposals_on_request_cancel()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from new.status then
    update public.action_buddy_proposals
    set status = 'withdrawn', resolved_at = coalesce(resolved_at, now())
    where request_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

revoke all on function public.withdraw_action_buddy_proposals_on_request_cancel() from public, anon, authenticated;
grant execute on function public.withdraw_action_buddy_proposals_on_request_cancel() to service_role;

drop trigger if exists action_buddy_request_cancel_withdrawals on public.action_buddy_requests;
create trigger action_buddy_request_cancel_withdrawals
after update of status on public.action_buddy_requests
for each row execute function public.withdraw_action_buddy_proposals_on_request_cancel();

create or replace function public.enforce_action_buddy_proposal_request_open()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_request_status text;
begin
  if new.status = 'pending' then
    select status into v_request_status
    from public.action_buddy_requests
    where id = new.request_id
    for update;

    if not found then
      raise exception 'action_buddy_request_not_found' using errcode = 'P0002';
    end if;
    if v_request_status <> 'open' then
      raise exception 'action_buddy_conflict_request_not_open' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_action_buddy_proposal_request_open() from public, anon, authenticated;
grant execute on function public.enforce_action_buddy_proposal_request_open() to service_role;

drop trigger if exists action_buddy_proposal_request_open on public.action_buddy_proposals;
create trigger action_buddy_proposal_request_open
before insert or update of request_id, status on public.action_buddy_proposals
for each row execute function public.enforce_action_buddy_proposal_request_open();

create or replace function public.accept_action_buddy_proposal(p_proposal_id uuid)
returns table (
  status text,
  request_id uuid,
  proposal_id uuid,
  mentor_user_id text,
  matched_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_request public.action_buddy_requests%rowtype;
  v_proposal public.action_buddy_proposals%rowtype;
  v_probe record;
  v_registration record;
  v_requester_confirmed boolean := false;
  v_mentor_confirmed boolean := false;
  v_existing_request_id uuid;
  v_matched_at timestamptz := now();
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'action_buddy_server_only' using errcode = '42501';
  end if;

  select p.id, p.request_id, p.mentor_user_id, r.action_id
  into v_probe
  from public.action_buddy_proposals p
  join public.action_buddy_requests r on r.id = p.request_id
  where p.id = p_proposal_id;

  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  -- Serialize every acceptance competing for the same action/mentor before
  -- taking the canonical action/request/proposal row locks.
  perform pg_advisory_xact_lock(
    hashtextextended(format('action-buddy:%s:%s', v_probe.action_id, v_probe.mentor_user_id), 0)
  );

  select * into v_action
  from public.actions
  where id = v_probe.action_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  select * into v_request
  from public.action_buddy_requests
  where id = v_probe.request_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  select * into v_proposal
  from public.action_buddy_proposals
  where id = p_proposal_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  if v_proposal.status = 'accepted'
     and v_request.status = 'matched'
     and v_request.matched_mentor_user_id = v_proposal.mentor_user_id then
    return query select 'already_matched'::text, v_request.id, v_proposal.id, v_proposal.mentor_user_id, v_request.matched_at;
    return;
  end if;

  if v_proposal.status <> 'pending' then
    raise exception 'action_buddy_conflict_proposal_not_pending' using errcode = 'P0001';
  end if;
  if v_request.status <> 'open' then
    raise exception 'action_buddy_conflict_request_not_open' using errcode = 'P0001';
  end if;
  if v_request.requester_user_id = v_proposal.mentor_user_id then
    raise exception 'action_buddy_conflict_self_match' using errcode = 'P0001';
  end if;
  if coalesce(v_action.access_mode, 'public') = 'invite_link'
     or not public.is_public_future_pre_action_reviewed(
       coalesce(v_action.action_phase, 'post_action_complete'),
       v_action.published_at,
       coalesce(v_action.moderation_visibility, 'visible'),
       v_action.status,
       coalesce(v_action.review_state, 'not_required'),
       v_action.action_date,
       v_action.event_start_time
     ) then
    raise exception 'action_buddy_conflict_action_not_eligible' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.action_buddy_availability a
    where a.action_id = v_action.id and a.mentor_user_id = v_proposal.mentor_user_id
    for update
  ) then
    raise exception 'action_buddy_conflict_mentor_unavailable' using errcode = 'P0001';
  end if;

  for v_registration in
    select ar.user_id, ar.registration_status
    from public.action_registrations ar
    where ar.action_id = v_action.id
      and ar.user_id in (v_request.requester_user_id, v_proposal.mentor_user_id)
    order by ar.user_id
    for update
  loop
    if v_registration.user_id = v_request.requester_user_id
       and v_registration.registration_status = 'confirmed' then
      v_requester_confirmed := true;
    end if;
    if v_registration.user_id = v_proposal.mentor_user_id
       and v_registration.registration_status = 'confirmed' then
      v_mentor_confirmed := true;
    end if;
  end loop;

  if not v_requester_confirmed or not v_mentor_confirmed then
    raise exception 'action_buddy_conflict_registration_not_confirmed' using errcode = 'P0001';
  end if;

  select id into v_existing_request_id
  from public.action_buddy_requests
  where action_id = v_action.id
    and status = 'matched'
    and matched_mentor_user_id = v_proposal.mentor_user_id
    and id <> v_request.id
  order by id
  for update;

  if found then
    raise exception 'action_buddy_conflict_mentor_already_matched' using errcode = 'P0001';
  end if;

  update public.action_buddy_proposals
  set status = 'declined', resolved_at = v_matched_at
  where request_id = v_request.id
    and status = 'pending'
    and id <> v_proposal.id;

  update public.action_buddy_requests
  set status = 'matched',
      matched_mentor_user_id = v_proposal.mentor_user_id,
      matched_at = v_matched_at
  where id = v_request.id;

  update public.action_buddy_proposals
  set status = 'accepted', resolved_at = v_matched_at
  where id = v_proposal.id;

  return query select 'matched'::text, v_request.id, v_proposal.id, v_proposal.mentor_user_id, v_matched_at;
exception
  when unique_violation then
    raise exception 'action_buddy_conflict_unique_matching' using errcode = 'P0001';
end;
$$;

revoke all on function public.accept_action_buddy_proposal(uuid) from public, anon, authenticated;
grant execute on function public.accept_action_buddy_proposal(uuid) to service_role;
