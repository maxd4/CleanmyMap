-- SPOGOMI team join requests: a published team may receive an authenticated
-- request without exposing roster data or creating a participant.

create table public.spogomi_team_join_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_id uuid not null,
  requester_clerk_id text not null check (length(btrim(requester_clerk_id)) > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  matched_participant_id uuid,
  verification_note text
    check (verification_note is null or length(btrim(verification_note)) between 10 and 1200),
  resolution_note text
    check (resolution_note is null or length(btrim(resolution_note)) <= 1200),
  decided_by_clerk_id text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id),
  foreign key (team_id, event_id)
    references public.spogomi_teams(id, event_id)
    on delete restrict,
  foreign key (matched_participant_id, event_id)
    references public.spogomi_participants(id, event_id)
    on delete restrict,
  check (
    (status = 'pending' and matched_participant_id is null and decided_at is null and decided_by_clerk_id is null)
    or (status = 'approved' and matched_participant_id is not null and decided_at is not null and decided_by_clerk_id is not null and verification_note is not null)
    or (status in ('rejected', 'cancelled') and matched_participant_id is null and decided_at is not null and decided_by_clerk_id is not null)
  ),
  check (decided_by_clerk_id is null or length(btrim(decided_by_clerk_id)) > 0)
);

create unique index spogomi_team_join_pending_requester_unique
  on public.spogomi_team_join_requests(event_id, requester_clerk_id)
  where status = 'pending';

create unique index spogomi_team_join_approved_requester_unique
  on public.spogomi_team_join_requests(event_id, requester_clerk_id)
  where status = 'approved';

create index spogomi_team_join_requests_event_status_idx
  on public.spogomi_team_join_requests(event_id, status, created_at desc);

create index spogomi_team_join_requests_team_idx
  on public.spogomi_team_join_requests(event_id, team_id, created_at desc);

create table public.spogomi_team_join_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.spogomi_team_join_requests(id) on delete cascade,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  actor_kind text not null check (actor_kind in ('requester', 'admin', 'system')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (request_id, event_id)
    references public.spogomi_team_join_requests(id, event_id)
    on delete cascade
);

create index spogomi_team_join_request_events_request_idx
  on public.spogomi_team_join_request_events(request_id, created_at desc);

alter table public.spogomi_identity_link_events
  drop constraint if exists spogomi_identity_link_events_event_type_check;
alter table public.spogomi_identity_link_events
  add constraint spogomi_identity_link_events_event_type_check
  check (event_type in ('code_issued', 'code_redeemed', 'code_rejected', 'admin_approved'));
alter table public.spogomi_identity_link_events
  drop constraint if exists spogomi_identity_link_events_actor_kind_check;
alter table public.spogomi_identity_link_events
  add constraint spogomi_identity_link_events_actor_kind_check
  check (actor_kind in ('organizer', 'participant', 'admin', 'system'));

create or replace function public.create_spogomi_team_join_request(
  p_event_id uuid,
  p_team_id uuid,
  p_requester_clerk_id text
)
returns table (request_id uuid, request_status text, request_team_id uuid)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_existing public.spogomi_team_join_requests%rowtype;
  v_request_id uuid;
begin
  -- PUBLIC_AUTHN: the route authenticates the Clerk account before calling.
  -- PUBLIC_SCOPE: only a published event and an existing team are accepted.
  -- IDEMPOTENCY: one pending request per account and event under an advisory lock.
  -- SIDE_EFFECTS: this function inserts only a request and its history row.
  if length(btrim(coalesce(p_requester_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_team_join_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_event_id, p_team_id, btrim(p_requester_clerk_id)), 0));

  if not exists (
    select 1 from public.spogomi_events event
     where event.id = p_event_id
       and event.public_visibility = 'published'
       and event.state <> 'cancelled'
  ) or not exists (
    select 1 from public.spogomi_teams team
     where team.id = p_team_id and team.event_id = p_event_id
  ) then
    raise exception using errcode = 'P0002', message = 'spogomi_team_join_unavailable';
  end if;

  select * into v_existing
    from public.spogomi_team_join_requests request
   where request.event_id = p_event_id
     and request.requester_clerk_id = btrim(p_requester_clerk_id)
     and request.status in ('pending', 'approved')
   order by request.created_at desc
   limit 1
   for update;
  if found then
    if v_existing.status = 'pending' and v_existing.team_id is distinct from p_team_id then
      raise exception using errcode = '23505', message = 'spogomi_team_join_request_already_pending';
    end if;
    return query select v_existing.id, v_existing.status, v_existing.team_id;
    return;
  end if;

  if exists (
    select 1 from public.spogomi_participants participant
     where participant.event_id = p_event_id
       and participant.clerk_id = btrim(p_requester_clerk_id)
       and participant.account_link_status = 'verified'
  ) then
    raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
  end if;

  insert into public.spogomi_team_join_requests (
    event_id, team_id, requester_clerk_id
  ) values (
    p_event_id, p_team_id, btrim(p_requester_clerk_id)
  ) returning id into v_request_id;

  insert into public.spogomi_team_join_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_request_id, p_event_id, 'pending', 'requester', btrim(p_requester_clerk_id), '{}'::jsonb
  );

  return query select v_request_id, 'pending'::text, p_team_id;
end;
$$;

create or replace function public.transition_spogomi_team_join_request(
  p_request_id uuid,
  p_event_id uuid,
  p_target_status text,
  p_actor_kind text,
  p_actor_clerk_id text,
  p_actor_role text,
  p_matched_participant_id uuid,
  p_verification_note text,
  p_resolution_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_request public.spogomi_team_join_requests%rowtype;
  v_participant public.spogomi_participants%rowtype;
begin
  -- AUTHZ: requester cancellation or active admin/max decision only.
  -- ATOMICITY: request, identity link and both audit histories commit together.
  -- INTEGRITY: the selected participant must already belong to this exact team.
  -- IDEMPOTENCY: repeating the same final status returns the current request.
  if p_target_status not in ('approved', 'rejected', 'cancelled')
     or p_actor_kind not in ('requester', 'admin')
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_team_join_transition';
  end if;

  select * into v_request
    from public.spogomi_team_join_requests request
   where request.id = p_request_id and request.event_id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_team_join_unavailable';
  end if;
  if v_request.status = p_target_status then
    return to_jsonb(v_request);
  end if;
  if v_request.status <> 'pending' then
    raise exception using errcode = '40001', message = 'spogomi_team_join_already_resolved';
  end if;

  if p_target_status = 'cancelled' then
    if p_actor_kind <> 'requester' or p_actor_clerk_id <> v_request.requester_clerk_id then
      raise exception using errcode = '42501', message = 'spogomi_team_join_requester_required';
    end if;
  elsif p_actor_kind <> 'admin'
     or p_actor_role not in ('admin', 'max')
     or p_matched_participant_id is null
     or length(btrim(coalesce(p_verification_note, ''))) < 10 then
    raise exception using errcode = '42501', message = 'spogomi_team_join_admin_verification_required';
  end if;

  if p_target_status = 'approved' then
    select * into v_participant
      from public.spogomi_participants participant
     where participant.id = p_matched_participant_id
       and participant.event_id = p_event_id
       and participant.team_id = v_request.team_id
       and participant.registration_status = 'registered'
       and participant.account_link_status <> 'verified'
     for update;
    if not found then
      raise exception using errcode = '42501', message = 'spogomi_team_join_participant_mismatch';
    end if;
    if exists (
      select 1 from public.spogomi_participants participant
       where participant.event_id = p_event_id
         and participant.clerk_id = v_request.requester_clerk_id
         and participant.account_link_status = 'verified'
    ) then
      raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
    end if;

    update public.spogomi_participants
       set account_link_status = 'verified',
           clerk_id = v_request.requester_clerk_id,
           identity_link_code_hash = null,
           identity_link_code_expires_at = null,
           identity_link_code_revoked_at = now(),
           updated_at = now()
     where id = v_participant.id and event_id = p_event_id;

    insert into public.spogomi_identity_link_events (
      event_id, participant_id, event_type, actor_kind, actor_clerk_id, outcome, reason
    ) values (
      p_event_id, v_participant.id, 'admin_approved', 'admin', p_actor_clerk_id, 'success', 'team_join_request_verified'
    );
  end if;

  update public.spogomi_team_join_requests
     set status = p_target_status,
         matched_participant_id = case when p_target_status = 'approved' then p_matched_participant_id else null end,
         verification_note = case when p_target_status = 'approved' then btrim(p_verification_note) else null end,
         resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), ''),
         decided_by_clerk_id = btrim(p_actor_clerk_id),
         decided_at = now(),
         updated_at = now()
   where id = p_request_id
   returning * into v_request;

  insert into public.spogomi_team_join_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_request.id, v_request.event_id, v_request.status, p_actor_kind, btrim(p_actor_clerk_id),
    jsonb_build_object('matched_participant_id', v_request.matched_participant_id, 'has_verification_note', v_request.verification_note is not null)
  );

  return to_jsonb(v_request);
end;
$$;

revoke all on table public.spogomi_team_join_requests from public, anon, authenticated;
revoke all on table public.spogomi_team_join_request_events from public, anon, authenticated;
grant all on table public.spogomi_team_join_requests to service_role;
grant all on table public.spogomi_team_join_request_events to service_role;

alter table public.spogomi_team_join_requests enable row level security;
alter table public.spogomi_team_join_request_events enable row level security;

create policy spogomi_team_join_requests_service_only
  on public.spogomi_team_join_requests for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_team_join_request_events_service_only
  on public.spogomi_team_join_request_events for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create trigger spogomi_team_join_requests_set_updated_at
before update on public.spogomi_team_join_requests
for each row execute function public.set_updated_at();

revoke all on function public.create_spogomi_team_join_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.transition_spogomi_team_join_request(uuid, uuid, text, text, text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_team_join_request(uuid, uuid, text) to service_role;
grant execute on function public.transition_spogomi_team_join_request(uuid, uuid, text, text, text, text, uuid, text, text) to service_role;
