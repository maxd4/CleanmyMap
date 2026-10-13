-- SPOGOMI lot 11: ticket-level roster identity and safe team proposals.
-- Production ticket values are never part of the repository; synthetic fixtures
-- remain the only versioned import input.

alter table public.spogomi_events
  add column if not exists composition_revision bigint not null default 0
    check (composition_revision >= 0);

alter table public.spogomi_participants
  add column if not exists source_system text not null default 'manual_roster'
    check (source_system in ('manual_roster', 'cachan_ticketing')),
  add column if not exists order_reference text,
  add column if not exists ticket_status text,
  add column if not exists ticket_deleted boolean not null default false,
  add column if not exists identity_status text not null default 'unknown'
    check (identity_status in ('unknown', 'identified'));

drop index if exists public.spogomi_participants_event_external_reference_unique;
create unique index spogomi_participants_event_external_reference_unique
  on public.spogomi_participants(event_id, external_reference);

-- The foundation migration keys participants by id alone. The scoped history
-- foreign key below also carries event_id, so PostgreSQL needs this matching
-- unique key before the dependent table is created.
create unique index if not exists spogomi_participants_id_event_unique
  on public.spogomi_participants(id, event_id);

create table if not exists public.spogomi_roster_import_changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  roster_import_id uuid not null,
  participant_id uuid not null,
  change_kind text not null check (change_kind in ('ticket_status_changed', 'ticket_cancelled', 'ticket_reactivated', 'ticket_order_changed', 'ticket_identity_changed')),
  previous_snapshot jsonb not null default '{}'::jsonb,
  current_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (roster_import_id, event_id)
    references public.spogomi_roster_imports(id, event_id) on delete restrict,
  foreign key (participant_id, event_id)
    references public.spogomi_participants(id, event_id) on delete restrict,
  unique (roster_import_id, participant_id, change_kind)
);

create index if not exists spogomi_roster_import_changes_event_idx
  on public.spogomi_roster_import_changes(event_id, created_at desc);

create table if not exists public.spogomi_team_composition_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  revision bigint not null,
  actor_clerk_id text not null,
  assignments jsonb not null,
  created_at timestamptz not null default now(),
  unique (event_id, revision)
);

create or replace function public.bump_spogomi_composition_revision()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  update public.spogomi_events
     set composition_revision = composition_revision + 1
   where id = coalesce(new.event_id, old.event_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_participants_bump_composition_revision on public.spogomi_participants;
create trigger spogomi_participants_bump_composition_revision
after insert or update or delete on public.spogomi_participants
for each row execute function public.bump_spogomi_composition_revision();

drop trigger if exists spogomi_teams_bump_composition_revision on public.spogomi_teams;
create trigger spogomi_teams_bump_composition_revision
after insert or update or delete on public.spogomi_teams
for each row execute function public.bump_spogomi_composition_revision();

create or replace function public.spogomi_confirm_team_composition(
  p_event_id uuid,
  p_expected_revision bigint,
  p_assignments jsonb,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_assignment_count integer;
  v_registered_count integer;
  v_min_members integer;
  v_max_members integer;
  v_changed_count integer;
  v_revision bigint;
begin
  -- PURPOSE: atomically confirm one organizer's explicit team proposal.
  -- CALLER: server-only service_role route after Clerk organizer authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; the route owns AuthN/AuthZ.
  -- IDEMPOTENCY: unchanged assignments return already_processed without a new history row.
  -- ATOMICITY: event lock, team reuse/creation, participant moves and history append share one transaction.
  -- FAILURE_BEHAVIOR: stale revisions, invalid sizes and locked teams fail closed.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: execute is revoked from public roles and granted only to service_role below.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI composition confirmation requires the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  if jsonb_typeof(p_assignments) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Team assignments must be a JSON array';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition changed since preview';
  end if;
  if v_event.state = 'composition_locked' then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI composition is locked';
  end if;
  if exists (
    select 1 from public.spogomi_teams
     where event_id = p_event_id and composition_state in ('locked', 'verified')
  ) then
    raise exception using errcode = 'serialization_failure', message = 'A SPOGOMI team already has a locked history';
  end if;

  select count(*) into v_assignment_count from jsonb_array_elements(p_assignments) item;
  select count(*) into v_registered_count
    from public.spogomi_participants
   where event_id = p_event_id and registration_status = 'registered';
  if v_assignment_count <> v_registered_count then
    raise exception using errcode = 'check_violation', message = 'Every registered ticket must appear exactly once in the proposal';
  end if;
  if exists (
    select 1 from (
      select nullif(item ->> 'participantId', '')::uuid as participant_id
        from jsonb_array_elements(p_assignments) item
    ) assignments
    group by participant_id
    having count(*) <> 1 or participant_id is null
  ) then
    raise exception using errcode = 'check_violation', message = 'A team proposal contains duplicate or invalid participants';
  end if;
  if exists (
    select 1
      from public.spogomi_participants participant
     where participant.event_id = p_event_id
       and participant.registration_status = 'registered'
       and not exists (
         select 1 from jsonb_array_elements(p_assignments) item
          where (item ->> 'participantId')::uuid = participant.id
       )
  ) then
    raise exception using errcode = 'check_violation', message = 'A registered ticket is missing from the proposal';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_assignments) item
     where item ->> 'teamNumber' is not null
       and ((item ->> 'teamNumber')::integer < 1)
  ) then
    raise exception using errcode = 'check_violation', message = 'A proposed team number is invalid';
  end if;

  if v_event.mode = 'world_cup' and exists (
    select item ->> 'teamNumber'
      from jsonb_array_elements(p_assignments) item
     where item ->> 'teamNumber' is not null
     group by item ->> 'teamNumber'
    having count(*) <> 3
  ) then
    raise exception using errcode = 'check_violation', message = 'World Cup teams require exactly three members';
  end if;
  if v_event.mode = 'casual' then
    v_min_members := nullif(v_event.team_size_config -> 'casual' ->> 'minMembers', '')::integer;
    v_max_members := nullif(v_event.team_size_config -> 'casual' ->> 'maxMembers', '')::integer;
    if exists (
      select 1 from (
        select (item ->> 'teamNumber')::integer as team_number, count(*) as member_count
          from jsonb_array_elements(p_assignments) item
         where item ->> 'teamNumber' is not null
         group by (item ->> 'teamNumber')::integer
      ) team_sizes
      where (v_min_members is not null and member_count < v_min_members)
         or (v_max_members is not null and member_count > v_max_members)
    ) then
      raise exception using errcode = 'check_violation', message = 'A Casual team is outside the event bounds';
    end if;
  end if;

  insert into public.spogomi_teams(event_id, team_number, public_name, composition_state)
  select p_event_id, team_number, 'Équipe ' || team_number::text, 'draft'
    from (
      select distinct (item ->> 'teamNumber')::integer as team_number
        from jsonb_array_elements(p_assignments) item
       where item ->> 'teamNumber' is not null
    ) proposed
  on conflict (event_id, team_number) do nothing;

  with assignments as (
    select nullif(item ->> 'participantId', '')::uuid as participant_id,
           nullif(item ->> 'teamNumber', '')::integer as team_number
      from jsonb_array_elements(p_assignments) item
  )
  update public.spogomi_participants participant
     set team_id = team.id
    from assignments
    left join public.spogomi_teams team
      on team.event_id = p_event_id and team.team_number = assignments.team_number
   where participant.id = assignments.participant_id
     and participant.event_id = p_event_id
     and participant.team_id is distinct from team.id;
  get diagnostics v_changed_count = row_count;

  if v_changed_count = 0 then
    select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
    return jsonb_build_object('already_processed', true, 'compositionRevision', v_revision);
  end if;
  select composition_revision into v_revision from public.spogomi_events where id = p_event_id;
  insert into public.spogomi_team_composition_history(event_id, revision, actor_clerk_id, assignments)
  values (p_event_id, v_revision, p_actor_clerk_id, p_assignments)
  on conflict (event_id, revision) do nothing;
  return jsonb_build_object('already_processed', false, 'compositionRevision', v_revision, 'changedParticipants', v_changed_count);
end;
$$;

alter table public.spogomi_roster_import_changes enable row level security;
alter table public.spogomi_team_composition_history enable row level security;
revoke all on table public.spogomi_roster_import_changes from public, anon, authenticated;
revoke all on table public.spogomi_team_composition_history from public, anon, authenticated;
grant all on table public.spogomi_roster_import_changes to service_role;
grant all on table public.spogomi_team_composition_history to service_role;
revoke all on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_confirm_team_composition(uuid, bigint, jsonb, text) to service_role;

comment on column public.spogomi_participants.external_reference is
  'Stable private external place reference when source_system is cachan_ticketing; never a buyer-name deduplication key.';
comment on column public.spogomi_participants.order_reference is
  'Private ticket order grouping reference; it is not an identity assertion.';
comment on column public.spogomi_events.composition_revision is
  'Optimistic-concurrency revision for previewed and explicitly confirmed team composition.';
