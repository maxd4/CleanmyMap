-- PURPOSE: persist private, non-sporting offers of help for a published future edition.
-- CALLER: server API routes authenticated with Clerk; only service_role executes the RPCs.
-- AUTHORIZATION_BOUNDARY: requester owns its proposal; the event creator or action organizer reviews it.
-- IDEMPOTENCY: client_request_id replays the same proposal; an advisory lock serializes one account/event.
-- ATOMICITY: proposal and append-only history are written in the same transaction.
-- FAILURE_BEHAVIOR: invalid, unavailable, stale and unauthorized operations raise SQLSTATE without partial writes.
-- SEARCH_PATH: fixed to pg_catalog, public; GRANTS: service_role only; RLS remains enabled.

create table public.spogomi_volunteer_help_proposals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  requester_clerk_id text not null check (length(btrim(requester_clerk_id)) > 0),
  client_request_id text not null check (length(btrim(client_request_id)) between 16 and 160),
  contact_first_name text not null check (length(btrim(contact_first_name)) between 1 and 80),
  contact_last_name text not null check (length(btrim(contact_last_name)) between 1 and 80),
  contact_email text check (contact_email is null or length(btrim(contact_email)) between 3 and 254),
  contact_phone text check (contact_phone is null or length(btrim(contact_phone)) between 7 and 40),
  help_type text not null check (length(btrim(help_type)) between 1 and 120),
  motivation text not null check (length(btrim(motivation)) between 10 and 4000),
  useful_skills text not null check (length(btrim(useful_skills)) between 1 and 2000),
  cleanwalk_experience text not null default '' check (length(cleanwalk_experience) <= 3000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  decision_note text check (decision_note is null or length(btrim(decision_note)) <= 1200),
  decided_by_clerk_id text,
  decided_at timestamptz,
  retention_until timestamptz not null default (now() + interval '24 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id),
  unique (event_id, requester_clerk_id, client_request_id),
  check (nullif(btrim(contact_email), '') is not null or nullif(btrim(contact_phone), '') is not null),
  check (
    (status = 'pending' and decided_at is null and decided_by_clerk_id is null)
    or (status in ('accepted', 'rejected', 'withdrawn') and decided_at is not null and decided_by_clerk_id is not null)
  )
);

create unique index spogomi_volunteer_help_active_unique
  on public.spogomi_volunteer_help_proposals(event_id, requester_clerk_id)
  where status in ('pending', 'accepted');

create index spogomi_volunteer_help_event_status_idx
  on public.spogomi_volunteer_help_proposals(event_id, status, created_at desc);

create table public.spogomi_volunteer_help_proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.spogomi_volunteer_help_proposals(id) on delete cascade,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected', 'withdrawn')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (proposal_id, event_id)
    references public.spogomi_volunteer_help_proposals(id, event_id)
    on delete cascade
);

create index spogomi_volunteer_help_proposal_events_proposal_idx
  on public.spogomi_volunteer_help_proposal_events(proposal_id, created_at desc);

create or replace function public.create_spogomi_volunteer_help_proposal(
  p_event_id uuid,
  p_requester_clerk_id text,
  p_client_request_id text,
  p_contact_first_name text,
  p_contact_last_name text,
  p_contact_email text,
  p_contact_phone text,
  p_help_type text,
  p_motivation text,
  p_useful_skills text,
  p_cleanwalk_experience text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_proposal public.spogomi_volunteer_help_proposals%rowtype;
  v_requester text := btrim(coalesce(p_requester_clerk_id, ''));
  v_client_request_id text := btrim(coalesce(p_client_request_id, ''));
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_volunteer_help_service_only';
  end if;
  if length(v_requester) = 0 or length(v_client_request_id) not between 16 and 160 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_volunteer_help_proposal';
  end if;
  if nullif(btrim(coalesce(p_contact_email, '')), '') is null
     and nullif(btrim(coalesce(p_contact_phone, '')), '') is null then
    raise exception using errcode = '22023', message = 'spogomi_volunteer_help_contact_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s', p_event_id, v_requester), 0));

  if not exists (
    select 1 from public.spogomi_events event
    where event.id = p_event_id
      and event.public_visibility = 'published'
      and event.state not in ('cancelled', 'archived')
      and event.starts_at > now()
  ) then
    raise exception using errcode = 'P0002', message = 'spogomi_volunteer_help_unavailable';
  end if;

  select * into v_proposal
  from public.spogomi_volunteer_help_proposals proposal
  where proposal.event_id = p_event_id
    and proposal.requester_clerk_id = v_requester
    and proposal.client_request_id = v_client_request_id
  for update;
  if found then
    return to_jsonb(v_proposal);
  end if;

  if exists (
    select 1 from public.spogomi_volunteer_help_proposals proposal
    where proposal.event_id = p_event_id
      and proposal.requester_clerk_id = v_requester
      and proposal.status in ('pending', 'accepted')
  ) then
    raise exception using errcode = '23505', message = 'spogomi_volunteer_help_active_conflict';
  end if;

  insert into public.spogomi_volunteer_help_proposals (
    event_id, requester_clerk_id, client_request_id,
    contact_first_name, contact_last_name, contact_email, contact_phone,
    help_type, motivation, useful_skills, cleanwalk_experience
  ) values (
    p_event_id, v_requester, v_client_request_id,
    btrim(p_contact_first_name), btrim(p_contact_last_name), nullif(btrim(coalesce(p_contact_email, '')), ''), nullif(btrim(coalesce(p_contact_phone, '')), ''),
    btrim(p_help_type), btrim(p_motivation), btrim(p_useful_skills), btrim(coalesce(p_cleanwalk_experience, ''))
  ) returning * into v_proposal;

  insert into public.spogomi_volunteer_help_proposal_events (proposal_id, event_id, status, actor_clerk_id)
  values (v_proposal.id, v_proposal.event_id, v_proposal.status, v_requester);

  return to_jsonb(v_proposal);
end;
$$;

create or replace function public.transition_spogomi_volunteer_help_proposal(
  p_proposal_id uuid,
  p_event_id uuid,
  p_target_status text,
  p_actor_clerk_id text,
  p_decision_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_proposal public.spogomi_volunteer_help_proposals%rowtype;
  v_event public.spogomi_events%rowtype;
  v_actor text := btrim(coalesce(p_actor_clerk_id, ''));
  v_is_organizer boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_volunteer_help_service_only';
  end if;
  if p_target_status not in ('accepted', 'rejected', 'withdrawn') or length(v_actor) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_volunteer_help_transition';
  end if;

  select * into v_proposal
  from public.spogomi_volunteer_help_proposals proposal
  where proposal.id = p_proposal_id and proposal.event_id = p_event_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_volunteer_help_unavailable';
  end if;
  if v_proposal.status = p_target_status then
    return to_jsonb(v_proposal);
  end if;
  if v_proposal.status <> 'pending' then
    raise exception using errcode = '40001', message = 'spogomi_volunteer_help_already_resolved';
  end if;

  if p_target_status = 'withdrawn' then
    if v_actor <> v_proposal.requester_clerk_id then
      raise exception using errcode = '42501', message = 'spogomi_volunteer_help_requester_required';
    end if;
  else
    select event.* into v_event from public.spogomi_events event where event.id = p_event_id;
    select v_event.created_by_clerk_id = v_actor or exists (
      select 1 from public.action_organizers organizer
      where organizer.action_id = v_event.action_id
        and organizer.organizer_clerk_id = v_actor
    ) into v_is_organizer;
    if not coalesce(v_is_organizer, false) then
      raise exception using errcode = '42501', message = 'spogomi_volunteer_help_organizer_required';
    end if;
  end if;

  update public.spogomi_volunteer_help_proposals
  set status = p_target_status,
      decision_note = nullif(btrim(coalesce(p_decision_note, '')), ''),
      decided_by_clerk_id = v_actor,
      decided_at = now(),
      retention_until = now() + interval '24 months',
      updated_at = now()
  where id = v_proposal.id
  returning * into v_proposal;

  insert into public.spogomi_volunteer_help_proposal_events (proposal_id, event_id, status, actor_clerk_id, details)
  values (v_proposal.id, v_proposal.event_id, v_proposal.status, v_actor, jsonb_build_object('has_decision_note', v_proposal.decision_note is not null));

  return to_jsonb(v_proposal);
end;
$$;

revoke all on table public.spogomi_volunteer_help_proposals from public, anon, authenticated;
revoke all on table public.spogomi_volunteer_help_proposal_events from public, anon, authenticated;
grant all on table public.spogomi_volunteer_help_proposals to service_role;
grant all on table public.spogomi_volunteer_help_proposal_events to service_role;

alter table public.spogomi_volunteer_help_proposals enable row level security;
alter table public.spogomi_volunteer_help_proposal_events enable row level security;

create policy spogomi_volunteer_help_proposals_service_only
  on public.spogomi_volunteer_help_proposals for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_volunteer_help_proposal_events_service_only
  on public.spogomi_volunteer_help_proposal_events for all
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create trigger spogomi_volunteer_help_proposals_set_updated_at
before update on public.spogomi_volunteer_help_proposals
for each row execute function public.set_updated_at();

revoke all on function public.create_spogomi_volunteer_help_proposal(uuid, text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.transition_spogomi_volunteer_help_proposal(uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_volunteer_help_proposal(uuid, text, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.transition_spogomi_volunteer_help_proposal(uuid, uuid, text, text, text) to service_role;
