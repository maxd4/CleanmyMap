-- SPOGOMI identity assistance: an authenticated account may ask an authorized
-- organizer to perform an out-of-band verification before issuing the existing
-- individual identity-link code.

create table public.spogomi_identity_assistance_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  requester_clerk_id text not null check (length(btrim(requester_clerk_id)) > 0),
  provided_context text not null default '' check (length(provided_context) <= 1200),
  status text not null default 'pending' check (status in ('pending', 'treated', 'rejected', 'cancelled')),
  matched_participant_id uuid,
  verification_note text check (verification_note is null or length(btrim(verification_note)) between 10 and 1200),
  resolution_note text check (resolution_note is null or length(btrim(resolution_note)) <= 1200),
  handled_by_clerk_id text,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id),
  foreign key (matched_participant_id, event_id)
    references public.spogomi_participants(id, event_id)
    on delete restrict,
  check (
    (status = 'pending' and matched_participant_id is null and handled_at is null)
    or (status = 'treated' and matched_participant_id is not null and handled_at is not null and verification_note is not null)
    or (status in ('rejected', 'cancelled') and matched_participant_id is null and handled_at is not null)
  ),
  check (handled_by_clerk_id is null or length(btrim(handled_by_clerk_id)) > 0)
);

create unique index spogomi_identity_assistance_pending_unique
  on public.spogomi_identity_assistance_requests(event_id, requester_clerk_id)
  where status = 'pending';

create index spogomi_identity_assistance_event_status_idx
  on public.spogomi_identity_assistance_requests(event_id, status, created_at desc);

create table public.spogomi_identity_assistance_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.spogomi_identity_assistance_requests(id) on delete cascade,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  status text not null check (status in ('pending', 'treated', 'rejected', 'cancelled')),
  actor_kind text not null check (actor_kind in ('requester', 'organizer', 'system')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (request_id, event_id)
    references public.spogomi_identity_assistance_requests(id, event_id)
    on delete cascade
);

create index spogomi_identity_assistance_request_events_request_idx
  on public.spogomi_identity_assistance_request_events(request_id, created_at desc);

create table public.spogomi_identity_assistance_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_by_clerk_id text not null check (length(btrim(issued_by_clerk_id)) > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index spogomi_identity_assistance_invitations_event_idx
  on public.spogomi_identity_assistance_invitations(event_id, expires_at)
  where revoked_at is null;

create or replace function public.create_spogomi_identity_assistance_request(
  p_event_id uuid,
  p_requester_clerk_id text,
  p_provided_context text,
  p_invitation_token_hash text
)
returns table (request_id uuid, request_status text)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_existing public.spogomi_identity_assistance_requests%rowtype;
  v_request_id uuid;
begin
  -- PURPOSE: create or resume one bounded assistance request without linking an identity.
  -- CALLER: authenticated server route after Clerk AuthN and rate limiting.
  -- AUTHORIZATION_BOUNDARY: service_role only; published events or a valid organizer invitation.
  -- IDEMPOTENCY: event_id + requester_clerk_id has one pending request under an advisory lock.
  -- ATOMICITY: request and initial history row commit together.
  -- FAILURE_BEHAVIOR: inaccessible/private events fail closed without participant disclosure.
  -- SEARCH_PATH: explicitly pg_catalog, public; persistent objects are qualified.
  -- GRANTS: service_role only.
  if length(btrim(coalesce(p_requester_clerk_id, ''))) = 0
     or length(coalesce(p_provided_context, '')) > 1200 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_identity_assistance_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s', p_event_id, btrim(p_requester_clerk_id)), 0));
  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_identity_assistance_unavailable';
  end if;

  if v_event.state = 'cancelled' then
    raise exception using errcode = 'P0002', message = 'spogomi_identity_assistance_unavailable';
  end if;
  if v_event.public_visibility <> 'published' then
    if p_invitation_token_hash is null or p_invitation_token_hash !~ '^[0-9a-f]{64}$' or not exists (
      select 1 from public.spogomi_identity_assistance_invitations invitation
       where invitation.event_id = p_event_id
         and invitation.token_hash = p_invitation_token_hash
         and invitation.revoked_at is null
         and invitation.expires_at > now()
    ) then
      raise exception using errcode = 'P0002', message = 'spogomi_identity_assistance_unavailable';
    end if;
    update public.spogomi_identity_assistance_invitations
       set last_used_at = now()
     where event_id = p_event_id and token_hash = p_invitation_token_hash;
  end if;

  select * into v_existing
    from public.spogomi_identity_assistance_requests request
   where request.event_id = p_event_id
     and request.requester_clerk_id = btrim(p_requester_clerk_id)
     and request.status = 'pending'
   for update;
  if found then
    return query select v_existing.id, v_existing.status;
    return;
  end if;

  insert into public.spogomi_identity_assistance_requests (
    event_id, requester_clerk_id, provided_context
  ) values (
    p_event_id, btrim(p_requester_clerk_id), btrim(coalesce(p_provided_context, ''))
  ) returning id into v_request_id;

  insert into public.spogomi_identity_assistance_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_request_id, p_event_id, 'pending', 'requester', btrim(p_requester_clerk_id), '{}'::jsonb
  );

  return query select v_request_id, 'pending'::text;
end;
$$;

create or replace function public.transition_spogomi_identity_assistance_request(
  p_request_id uuid,
  p_event_id uuid,
  p_target_status text,
  p_actor_kind text,
  p_actor_clerk_id text,
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
  v_request public.spogomi_identity_assistance_requests%rowtype;
begin
  -- PURPOSE: record a manual organizer decision or requester cancellation.
  -- CALLER: server route after explicit event-scoped AuthZ; no identity is linked here.
  -- AUTHORIZATION_BOUNDARY: service_role only; organizer/requester ownership is checked by the route.
  -- IDEMPOTENCY: a repeated target status returns the current request without a second history row.
  -- ATOMICITY: request transition and history row commit together.
  -- FAILURE_BEHAVIOR: stale, cross-event, invalid or incomplete decisions abort atomically.
  -- SEARCH_PATH: explicitly pg_catalog, public; persistent objects are qualified.
  -- GRANTS: service_role only.
  if p_target_status not in ('treated', 'rejected', 'cancelled')
     or p_actor_kind not in ('requester', 'organizer')
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_identity_assistance_transition';
  end if;

  select * into v_request
    from public.spogomi_identity_assistance_requests request
   where request.id = p_request_id and request.event_id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_identity_assistance_unavailable';
  end if;
  if v_request.status = p_target_status then
    return to_jsonb(v_request);
  end if;
  if v_request.status <> 'pending' then
    raise exception using errcode = '40001', message = 'spogomi_identity_assistance_already_resolved';
  end if;
  if p_target_status = 'treated' then
    if p_actor_kind <> 'organizer'
       or p_matched_participant_id is null
       or length(btrim(coalesce(p_verification_note, ''))) < 10
       or not exists (
         select 1 from public.spogomi_participants participant
          where participant.id = p_matched_participant_id
            and participant.event_id = p_event_id
            and participant.registration_status = 'registered'
            and participant.account_link_status <> 'verified'
       ) then
      raise exception using errcode = '42501', message = 'independent_spogomi_identity_verification_required';
    end if;
  elsif p_target_status = 'rejected' and p_actor_kind <> 'organizer' then
    raise exception using errcode = '42501', message = 'spogomi_identity_assistance_organizer_required';
  elsif p_target_status = 'cancelled' and p_actor_kind <> 'requester' then
    raise exception using errcode = '42501', message = 'spogomi_identity_assistance_requester_required';
  end if;

  update public.spogomi_identity_assistance_requests
     set status = p_target_status,
         matched_participant_id = case when p_target_status = 'treated' then p_matched_participant_id else null end,
         verification_note = case when p_target_status = 'treated' then btrim(p_verification_note) else null end,
         resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), ''),
         handled_by_clerk_id = btrim(p_actor_clerk_id),
         handled_at = now(),
         updated_at = now()
   where id = p_request_id
   returning * into v_request;

  insert into public.spogomi_identity_assistance_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_request.id, v_request.event_id, v_request.status, p_actor_kind, btrim(p_actor_clerk_id),
    jsonb_build_object('matched_participant_id', v_request.matched_participant_id, 'has_verification_note', v_request.verification_note is not null)
  );

  return to_jsonb(v_request);
end;
$$;

create or replace function public.issue_spogomi_identity_assistance_invitation(
  p_event_id uuid,
  p_token_hash text,
  p_issued_by_clerk_id text,
  p_expires_at timestamptz
)
returns table (invitation_id uuid, expires_at timestamptz)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
begin
  -- PURPOSE: issue a short-lived opaque proof for an organizer-provided private-event link.
  -- CALLER: organizer-only server route; this proof grants no identity or roster access.
  -- AUTHORIZATION_BOUNDARY: service_role only; event AuthZ remains in the route.
  -- IDEMPOTENCY: every issued token is unique; revocation is explicit by token hash.
  -- ATOMICITY: token creation is one row or no effect.
  -- FAILURE_BEHAVIOR: invalid event, token or expiry aborts without disclosure.
  -- SEARCH_PATH: explicitly pg_catalog, public; persistent objects are qualified.
  -- GRANTS: service_role only.
  if p_token_hash !~ '^[0-9a-f]{64}$'
     or length(btrim(coalesce(p_issued_by_clerk_id, ''))) = 0
     or p_expires_at <= now()
     or not exists (select 1 from public.spogomi_events where id = p_event_id) then
    raise exception using errcode = '22023', message = 'invalid_spogomi_identity_assistance_invitation';
  end if;
  insert into public.spogomi_identity_assistance_invitations (
    event_id, token_hash, issued_by_clerk_id, expires_at
  ) values (p_event_id, p_token_hash, btrim(p_issued_by_clerk_id), p_expires_at)
  returning id into v_id;
  return query select v_id, p_expires_at;
end;
$$;

revoke all on table public.spogomi_identity_assistance_requests from public, anon, authenticated;
revoke all on table public.spogomi_identity_assistance_request_events from public, anon, authenticated;
revoke all on table public.spogomi_identity_assistance_invitations from public, anon, authenticated;
grant all on table public.spogomi_identity_assistance_requests to service_role;
grant all on table public.spogomi_identity_assistance_request_events to service_role;
grant all on table public.spogomi_identity_assistance_invitations to service_role;

alter table public.spogomi_identity_assistance_requests enable row level security;
alter table public.spogomi_identity_assistance_request_events enable row level security;
alter table public.spogomi_identity_assistance_invitations enable row level security;

create policy spogomi_identity_assistance_requests_service_only
  on public.spogomi_identity_assistance_requests for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_identity_assistance_request_events_service_only
  on public.spogomi_identity_assistance_request_events for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_identity_assistance_invitations_service_only
  on public.spogomi_identity_assistance_invitations for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create trigger spogomi_identity_assistance_requests_set_updated_at
before update on public.spogomi_identity_assistance_requests
for each row execute function public.set_updated_at();

revoke all on function public.create_spogomi_identity_assistance_request(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.transition_spogomi_identity_assistance_request(uuid, uuid, text, text, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.issue_spogomi_identity_assistance_invitation(uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_spogomi_identity_assistance_request(uuid, text, text, text) to service_role;
grant execute on function public.transition_spogomi_identity_assistance_request(uuid, uuid, text, text, text, uuid, text, text) to service_role;
grant execute on function public.issue_spogomi_identity_assistance_invitation(uuid, text, text, timestamptz) to service_role;
