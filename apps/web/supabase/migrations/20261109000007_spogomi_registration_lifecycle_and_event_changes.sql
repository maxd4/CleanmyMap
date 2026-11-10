-- SPOGOMI: make the admission lifecycle and participant-facing edition changes
-- explicit without creating a second registration store.
--
-- The admission request remains the sole self-service entry point. Imported
-- rosters and invitations keep their existing owners and are not rewritten by
-- this migration.

alter table public.spogomi_events
  add column if not exists registration_contract_revision bigint not null default 0;

create table if not exists public.spogomi_event_change_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  revision bigint not null check (revision > 0),
  changed_fields text[] not null check (cardinality(changed_fields) > 0),
  previous_snapshot jsonb not null,
  current_snapshot jsonb not null,
  requires_confirmation boolean not null default false,
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  created_at timestamptz not null default now(),
  unique (event_id, revision),
  unique (id, event_id)
);

create index if not exists spogomi_event_change_history_event_idx
  on public.spogomi_event_change_history(event_id, revision desc);

create table if not exists public.spogomi_event_change_acknowledgements (
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  change_id uuid not null references public.spogomi_event_change_history(id) on delete cascade,
  clerk_id text not null check (length(btrim(clerk_id)) > 0),
  acknowledged_at timestamptz not null default now(),
  primary key (change_id, clerk_id),
  foreign key (change_id, event_id)
    references public.spogomi_event_change_history(id, event_id)
    on delete cascade
);

alter table public.spogomi_event_change_history enable row level security;
alter table public.spogomi_event_change_acknowledgements enable row level security;
revoke all on table public.spogomi_event_change_history from public, anon, authenticated;
revoke all on table public.spogomi_event_change_acknowledgements from public, anon, authenticated;
grant all on table public.spogomi_event_change_history to service_role;
grant all on table public.spogomi_event_change_acknowledgements to service_role;

create unique index if not exists app_notifications_spogomi_event_change_unique_idx
  on public.app_notifications (user_id, (payload ->> 'eventKey'))
  where type = 'system'
    and payload ->> 'subtype' = 'spogomi_event_change'
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.spogomi_event_change_actor()
returns text
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select coalesce(
    nullif(btrim(current_setting('spogomi.change_actor', true)), ''),
    nullif(btrim(current_setting('request.jwt.claim.sub', true)), ''),
    'system'
  )
$$;

create or replace function public.spogomi_event_snapshot(p_event public.spogomi_events)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'name', p_event.name,
    'locationLabel', p_event.location_label,
    'startsAt', p_event.starts_at,
    'endsAt', p_event.ends_at,
    'mode', p_event.mode,
    'regulationVersion', p_event.regulation_version,
    'regulationStatus', p_event.regulation_status,
    'regulationSourceReference', p_event.regulation_source_reference,
    'regulationConfig', p_event.regulation_config,
    'teamSizeConfig', p_event.team_size_config,
    'publicVisibility', p_event.public_visibility
  )
$$;

create or replace function public.track_spogomi_event_change_before()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.location_label is distinct from new.location_label
     or old.starts_at is distinct from new.starts_at
     or old.ends_at is distinct from new.ends_at
     or old.mode is distinct from new.mode
     or old.regulation_version is distinct from new.regulation_version
     or old.regulation_status is distinct from new.regulation_status
     or old.regulation_source_reference is distinct from new.regulation_source_reference
     or old.regulation_config is distinct from new.regulation_config
     or old.team_size_config is distinct from new.team_size_config then
    new.registration_contract_revision := coalesce(old.registration_contract_revision, 0) + 1;
  end if;
  return new;
end;
$$;

create or replace function public.track_spogomi_event_change_after()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_changed_fields text[];
begin
  v_changed_fields := array_remove(array[
    case when old.location_label is distinct from new.location_label then 'location' end,
    case when old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at then 'schedule' end,
    case when old.mode is distinct from new.mode or old.team_size_config is distinct from new.team_size_config then 'rules' end,
    case when old.regulation_version is distinct from new.regulation_version
              or old.regulation_status is distinct from new.regulation_status
              or old.regulation_source_reference is distinct from new.regulation_source_reference
              or old.regulation_config is distinct from new.regulation_config then 'eligibility' end
  ], null);
  if cardinality(v_changed_fields) is null or cardinality(v_changed_fields) = 0 then
    return new;
  end if;

  insert into public.spogomi_event_change_history (
    event_id, revision, changed_fields, previous_snapshot, current_snapshot,
    requires_confirmation, actor_clerk_id
  ) values (
    new.id,
    new.registration_contract_revision,
    v_changed_fields,
    public.spogomi_event_snapshot(old),
    public.spogomi_event_snapshot(new),
    v_changed_fields && array['location', 'schedule', 'rules', 'eligibility'],
    public.spogomi_event_change_actor()
  );
  return new;
end;
$$;

create or replace function public.track_spogomi_division_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
begin
  if old.division_type is not distinct from new.division_type
     and old.regulation_version is not distinct from new.regulation_version
     and old.regulation_status is not distinct from new.regulation_status
     and old.regulation_source_reference is not distinct from new.regulation_source_reference
     and old.regulation_config is not distinct from new.regulation_config
     and old.team_size_config is not distinct from new.team_size_config then
    return new;
  end if;

  update public.spogomi_events
     set registration_contract_revision = coalesce(registration_contract_revision, 0) + 1,
         updated_at = now()
   where id = new.event_id
   returning * into v_event;
  if not found then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event not found for division change';
  end if;

  insert into public.spogomi_event_change_history (
    event_id, revision, changed_fields, previous_snapshot, current_snapshot,
    requires_confirmation, actor_clerk_id
  ) values (
    new.event_id,
    v_event.registration_contract_revision,
    array['eligibility']::text[],
    jsonb_build_object('event', public.spogomi_event_snapshot(v_event), 'division', to_jsonb(old)),
    jsonb_build_object('event', public.spogomi_event_snapshot(v_event), 'division', to_jsonb(new)),
    true,
    public.spogomi_event_change_actor()
  );
  return new;
end;
$$;

drop trigger if exists spogomi_event_change_before on public.spogomi_events;
create trigger spogomi_event_change_before
before update on public.spogomi_events
for each row execute function public.track_spogomi_event_change_before();

drop trigger if exists spogomi_event_change_after on public.spogomi_events;
create trigger spogomi_event_change_after
after update on public.spogomi_events
for each row execute function public.track_spogomi_event_change_after();

drop trigger if exists spogomi_division_change_after on public.spogomi_divisions;
create trigger spogomi_division_change_after
after update of division_type, regulation_version, regulation_status,
  regulation_source_reference, regulation_config, team_size_config
on public.spogomi_divisions
for each row execute function public.track_spogomi_division_change();

create or replace function public.emit_spogomi_event_change_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SPOGOMI event change notifications require the server role';
  end if;
  select * into v_event from public.spogomi_events where id = new.event_id;
  if not found then return new; end if;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select recipients.user_id,
         'system',
         'Mise à jour d’une édition SPOGOMI',
         format('Les informations de « %s » ont changé : %s. Consultez la fiche avant votre prochaine démarche.', v_event.name, array_to_string(new.changed_fields, ', ')),
         jsonb_build_object(
           'eventType', 'system',
           'subtype', 'spogomi_event_change',
           'eventId', new.event_id,
           'changeId', new.id,
           'revision', new.revision,
           'changedFields', to_jsonb(new.changed_fields),
           'requiresConfirmation', new.requires_confirmation,
           'eventKey', 'spogomi_event_change:' || new.id::text,
           'href', case when nullif(btrim(v_event.event_slug), '') is null then '/spogomi' else '/spogomi/' || v_event.event_slug end
         )
    from (
      select distinct participant.clerk_id as user_id
        from public.spogomi_participants participant
       where participant.event_id = new.event_id
         and participant.registration_status = 'registered'
         and participant.account_link_status = 'verified'
         and nullif(btrim(participant.clerk_id), '') is not null
      union
      select distinct request.requester_clerk_id
        from public.spogomi_team_join_requests request
       where request.event_id = new.event_id
         and request.status in ('pending', 'approved')
         and nullif(btrim(request.requester_clerk_id), '') is not null
    ) recipients
   where coalesce((select preferences.informational_enabled from public.notification_preferences preferences where preferences.user_id = recipients.user_id), true)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.emit_spogomi_event_change_notifications() from public, anon, authenticated;
grant execute on function public.emit_spogomi_event_change_notifications() to service_role;

drop trigger if exists spogomi_event_change_notification on public.spogomi_event_change_history;
create trigger spogomi_event_change_notification
after insert on public.spogomi_event_change_history
for each row execute function public.emit_spogomi_event_change_notifications();

create or replace function public.acknowledge_spogomi_event_change(
  p_event_id uuid,
  p_change_id uuid,
  p_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI change acknowledgement requires the server role';
  end if;
  if not exists (
    select 1 from public.spogomi_event_change_history change
     where change.id = p_change_id and change.event_id = p_event_id
  ) then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event change not found';
  end if;
  if not exists (
    select 1 from public.spogomi_participants participant
     where participant.event_id = p_event_id
       and participant.clerk_id = btrim(p_clerk_id)
       and participant.account_link_status = 'verified'
       and participant.registration_status = 'registered'
    union
    select 1 from public.spogomi_team_join_requests request
     where request.event_id = p_event_id
       and request.requester_clerk_id = btrim(p_clerk_id)
       and request.status in ('pending', 'approved')
  ) then
    raise exception using errcode = '42501', message = 'SPOGOMI event change acknowledgement is not allowed';
  end if;
  insert into public.spogomi_event_change_acknowledgements(event_id, change_id, clerk_id)
  values (p_event_id, p_change_id, btrim(p_clerk_id))
  on conflict (change_id, clerk_id) do update set acknowledged_at = now();
  return jsonb_build_object('eventId', p_event_id, 'changeId', p_change_id, 'acknowledged', true);
end;
$$;

revoke all on function public.acknowledge_spogomi_event_change(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.acknowledge_spogomi_event_change(uuid, uuid, text) to service_role;

create or replace function public.spogomi_admission_transition_allowed(
  p_current_status text,
  p_target_status text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select p_current_status = p_target_status
      or (p_current_status = 'pending' and p_target_status in ('approved', 'rejected', 'cancelled'))
$$;

create or replace function public.guard_spogomi_admission_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if not public.spogomi_admission_transition_allowed(old.status, new.status) then
    raise exception using errcode = '40001', message = 'spogomi_admission_transition_not_allowed';
  end if;
  if new.status = 'approved' and new.request_kind in ('registration', 'team_join')
     and not exists (
       select 1 from public.spogomi_participants participant
        where participant.id = new.matched_participant_id
          and participant.event_id = new.event_id
          and participant.clerk_id = new.requester_clerk_id
          and participant.account_link_status = 'verified'
          and participant.registration_status = 'registered'
     ) then
    raise exception using errcode = '42501', message = 'spogomi_admission_approval_requires_verified_participant';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_admission_transition_guard on public.spogomi_team_join_requests;
create trigger spogomi_admission_transition_guard
before update of status, matched_participant_id on public.spogomi_team_join_requests
for each row execute function public.guard_spogomi_admission_transition();

create table if not exists public.spogomi_participant_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  participant_id uuid not null references public.spogomi_participants(id) on delete cascade,
  from_status text not null check (from_status in ('registered', 'withdrawn')),
  to_status text not null check (to_status in ('registered', 'withdrawn')),
  actor_kind text not null check (actor_kind in ('participant', 'admin', 'system')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text,
  created_at timestamptz not null default now(),
  check (from_status <> to_status)
);

create index if not exists spogomi_participant_lifecycle_event_idx
  on public.spogomi_participant_lifecycle_events(event_id, participant_id, created_at desc);
alter table public.spogomi_participant_lifecycle_events enable row level security;
revoke all on table public.spogomi_participant_lifecycle_events from public, anon, authenticated;
grant all on table public.spogomi_participant_lifecycle_events to service_role;

create or replace function public.withdraw_spogomi_participant(
  p_event_id uuid,
  p_participant_id uuid,
  p_actor_kind text,
  p_actor_clerk_id text,
  p_actor_role text,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_participant public.spogomi_participants%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_actor_kind not in ('participant', 'admin')
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or length(coalesce(p_reason, '')) > 1200 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_participant_withdrawal';
  end if;
  select * into v_participant
    from public.spogomi_participants
   where id = p_participant_id and event_id = p_event_id
   for update;
  if not found then raise exception using errcode = 'P0002', message = 'spogomi_participant_not_found'; end if;
  if p_actor_kind = 'participant' and (v_participant.clerk_id is distinct from btrim(p_actor_clerk_id) or v_participant.account_link_status <> 'verified') then
    raise exception using errcode = '42501', message = 'spogomi_participant_required';
  end if;
  if p_actor_kind = 'admin' and p_actor_role not in ('admin', 'max') then
    raise exception using errcode = '42501', message = 'spogomi_admission_admin_required';
  end if;
  if v_participant.registration_status = 'withdrawn' then
    return jsonb_build_object('participantId', v_participant.id, 'eventId', p_event_id, 'registrationStatus', 'withdrawn', 'alreadyProcessed', true);
  end if;
  update public.spogomi_participants
     set registration_status = 'withdrawn', updated_at = now()
   where id = v_participant.id and event_id = p_event_id;
  insert into public.spogomi_participant_lifecycle_events(event_id, participant_id, from_status, to_status, actor_kind, actor_clerk_id, reason)
  values (p_event_id, v_participant.id, 'registered', 'withdrawn', p_actor_kind, btrim(p_actor_clerk_id), nullif(btrim(coalesce(p_reason, '')), ''));
  return jsonb_build_object('participantId', v_participant.id, 'eventId', p_event_id, 'registrationStatus', 'withdrawn', 'alreadyProcessed', false);
end;
$$;

revoke all on function public.withdraw_spogomi_participant(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.withdraw_spogomi_participant(uuid, uuid, text, text, text, text) to service_role;

comment on column public.spogomi_events.registration_contract_revision is
  'Monotonic version of date, location, regulation, eligibility and team-size data used to invalidate quiz proofs for new requests. Existing admissions remain valid.';
comment on table public.spogomi_event_change_history is
  'Append-only, participant-facing history of substantive edition changes. It never cancels an existing admission.';
comment on function public.spogomi_admission_transition_allowed(text, text) is
  'Canonical admission matrix: pending may resolve to approved, rejected or cancelled; terminal states are immutable except for idempotent replay.';

-- A quiz proof is valid for the edition contract that was current when it was
-- submitted. This avoids rewriting or deleting proof rows after an edit.
alter table public.spogomi_registration_quiz_proofs
  add column if not exists registration_contract_revision bigint;

update public.spogomi_registration_quiz_proofs proof
   set registration_contract_revision = event.registration_contract_revision
  from public.spogomi_events event
 where event.id = proof.event_id
   and proof.registration_contract_revision is null;

alter table public.spogomi_registration_quiz_proofs
  alter column registration_contract_revision set default 0,
  alter column registration_contract_revision set not null;

do $$
declare
  v_constraint text;
begin
  select key_usage.constraint_name into v_constraint
    from information_schema.key_column_usage key_usage
    join information_schema.table_constraints table_constraint
      on table_constraint.constraint_schema = key_usage.constraint_schema
     and table_constraint.constraint_name = key_usage.constraint_name
     and table_constraint.table_name = key_usage.table_name
   where key_usage.table_schema = 'public'
     and key_usage.table_name = 'spogomi_registration_quiz_proofs'
     and table_constraint.constraint_type = 'UNIQUE'
   group by key_usage.constraint_name
  having array_agg(key_usage.column_name::text order by key_usage.ordinal_position) = array['event_id', 'division_id', 'clerk_id', 'quiz_version']::text[]
   limit 1;
  if v_constraint is not null then
    execute format('alter table public.spogomi_registration_quiz_proofs drop constraint %I', v_constraint);
  end if;
end;
$$;

alter table public.spogomi_registration_quiz_proofs
  add constraint spogomi_registration_quiz_proofs_current_version_unique
  unique (event_id, division_id, clerk_id, quiz_version, registration_contract_revision);

create or replace function public.capture_spogomi_quiz_contract_revision()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  select event.registration_contract_revision
    into new.registration_contract_revision
    from public.spogomi_events event
   where event.id = new.event_id;
  if new.registration_contract_revision is null then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event not found for quiz proof';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_quiz_proof_contract_revision on public.spogomi_registration_quiz_proofs;
create trigger spogomi_quiz_proof_contract_revision
before insert on public.spogomi_registration_quiz_proofs
for each row execute function public.capture_spogomi_quiz_contract_revision();

-- Keep the existing admission RPC as the single entry point, but make the
-- contract revision part of the server-side proof check. Replays of an active
-- request still happen before this gate and are never invalidated.
create or replace function public.create_spogomi_admission_request(
  p_event_id uuid,
  p_team_id uuid,
  p_requester_clerk_id text,
  p_request_kind text,
  p_division_id uuid,
  p_provided_context text
)
returns table (request_id uuid, request_status text, request_kind text, request_team_id uuid, request_division_id uuid)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_existing public.spogomi_team_join_requests%rowtype;
  v_division_id uuid := p_division_id;
  v_division_count integer;
  v_policy jsonb := '{}'::jsonb;
  v_quiz_version text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SPOGOMI admission requests require the server role';
  end if;
  if p_request_kind not in ('team_join', 'registration', 'presence_regularization')
     or length(btrim(coalesce(p_requester_clerk_id, ''))) = 0
     or length(coalesce(p_provided_context, '')) > 1200 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_admission_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_event_id, p_requester_clerk_id, p_request_kind), 0));
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then
    raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable';
  end if;

  select count(*)::integer into v_division_count from public.spogomi_divisions where event_id = p_event_id;
  if v_division_id is null and v_division_count = 1 then
    select min(id) into v_division_id from public.spogomi_divisions where event_id = p_event_id;
  end if;
  if v_division_id is null or not exists (
    select 1 from public.spogomi_divisions where id = v_division_id and event_id = p_event_id
  ) then
    raise exception using errcode = '22023', message = 'spogomi_admission_division_required';
  end if;
  if v_event.mode = 'mixed' and p_division_id is null then
    raise exception using errcode = '22023', message = 'spogomi_admission_division_required';
  end if;
  if p_team_id is not null and not exists (
    select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = v_division_id
  ) then
    raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable';
  end if;

  select coalesce(d.regulation_config -> 'registrationPolicy', '{}'::jsonb)
    into v_policy
    from public.spogomi_divisions d
   where d.id = v_division_id and d.event_id = p_event_id;
  v_policy := coalesce(v_policy, '{}'::jsonb) || coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);

  if p_request_kind = 'registration' then
    if v_event.state <> 'registration_open'
       or coalesce(v_policy ->> 'directRegistrationOpen', 'false') <> 'true' then
      raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed';
    end if;
    if coalesce(v_policy ->> 'externalTicketingRequired', 'false') = 'true' then
      raise exception using errcode = '42501', message = 'spogomi_external_ticketing_required';
    end if;
    if v_event.mode = 'world_cup' or exists (
      select 1 from public.spogomi_divisions where id = v_division_id and division_type = 'world_cup'
    ) then
      if coalesce(v_policy ->> 'worldCupDirectRegistrationAllowed', 'false') <> 'true' then
        raise exception using errcode = '42501', message = 'spogomi_world_cup_official_path_required';
      end if;
    end if;
  elsif p_request_kind = 'presence_regularization' and v_event.state not in ('in_progress', 'judging') then
    raise exception using errcode = '42501', message = 'spogomi_presence_regularization_closed';
  elsif p_request_kind = 'team_join' and p_team_id is null then
    raise exception using errcode = '22023', message = 'spogomi_team_join_team_required';
  end if;

  select * into v_existing
    from public.spogomi_team_join_requests request
   where request.event_id = p_event_id
     and request.requester_clerk_id = btrim(p_requester_clerk_id)
     and request.request_kind = p_request_kind
     and request.status in ('pending', 'approved')
   order by request.created_at desc
   limit 1 for update;
  if found then
    if v_existing.division_id is distinct from v_division_id or v_existing.team_id is distinct from p_team_id then
      raise exception using errcode = '23505', message = 'spogomi_admission_request_scope_conflict';
    end if;
    return query select v_existing.id, v_existing.status, v_existing.request_kind, v_existing.team_id, v_existing.division_id;
    return;
  end if;

  if exists (
    select 1 from public.spogomi_participants participant
     where participant.event_id = p_event_id
       and participant.clerk_id = btrim(p_requester_clerk_id)
       and participant.account_link_status = 'verified'
       and participant.registration_status = 'registered'
  ) then
    raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
  end if;

  if p_request_kind = 'registration' then
    if coalesce((public.spogomi_registration_readiness(p_event_id) ->> 'ready')::boolean, false) = false then
      raise exception using errcode = '42501', message = 'spogomi_registration_readiness_incomplete';
    end if;
    v_quiz_version := public.spogomi_registration_quiz_definition(p_event_id, v_division_id) ->> 'quizVersion';
    if not exists (
      select 1 from public.spogomi_registration_quiz_proofs proof
       where proof.event_id = p_event_id
         and proof.division_id = v_division_id
         and proof.clerk_id = btrim(p_requester_clerk_id)
         and proof.quiz_version = v_quiz_version
         and proof.registration_contract_revision = v_event.registration_contract_revision
    ) then
      raise exception using errcode = '42501', message = 'spogomi_registration_quiz_required';
    end if;
  end if;

  insert into public.spogomi_team_join_requests (
    event_id, team_id, requester_clerk_id, request_kind, division_id, provided_context
  ) values (
    p_event_id, p_team_id, btrim(p_requester_clerk_id), p_request_kind, v_division_id, btrim(coalesce(p_provided_context, ''))
  ) returning * into v_existing;

  insert into public.spogomi_team_join_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_existing.id, p_event_id, 'pending', 'requester', btrim(p_requester_clerk_id),
    jsonb_build_object('request_kind', p_request_kind, 'division_id', v_division_id, 'registration_contract_revision', v_event.registration_contract_revision, 'quiz_version', v_quiz_version)
  );

  return query select v_existing.id, 'pending'::text, p_request_kind, p_team_id, v_division_id;
end;
$$;

revoke all on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) to service_role;

create or replace function public.transition_spogomi_admission_request(
  p_request_id uuid,
  p_event_id uuid,
  p_target_status text,
  p_actor_kind text,
  p_actor_clerk_id text,
  p_actor_role text,
  p_matched_participant_id uuid,
  p_verification_note text,
  p_resolution_note text,
  p_decision_message text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_request public.spogomi_team_join_requests%rowtype;
  v_event public.spogomi_events%rowtype;
  v_participant public.spogomi_participants%rowtype;
  v_policy jsonb := '{}'::jsonb;
  v_capacity integer;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_target_status not in ('approved', 'rejected', 'cancelled')
     or p_actor_kind not in ('requester', 'admin')
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_admission_transition';
  end if;

  select * into v_request
    from public.spogomi_team_join_requests
   where id = p_request_id and event_id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable';
  end if;

  if p_target_status = 'cancelled' then
    if p_actor_kind <> 'requester' or btrim(p_actor_clerk_id) <> v_request.requester_clerk_id then
      raise exception using errcode = '42501', message = 'spogomi_admission_requester_required';
    end if;
  elsif p_actor_kind <> 'admin'
     or p_actor_role not in ('admin', 'max')
     or btrim(p_actor_clerk_id) = v_request.requester_clerk_id then
    raise exception using errcode = '42501', message = 'spogomi_admission_admin_required';
  end if;

  if v_request.status = p_target_status then return to_jsonb(v_request); end if;
  if not public.spogomi_admission_transition_allowed(v_request.status, p_target_status) then
    raise exception using errcode = '40001', message = 'spogomi_admission_request_already_resolved';
  end if;

  if p_target_status = 'approved' and v_request.request_kind = 'team_join'
     and (p_matched_participant_id is null or length(btrim(coalesce(p_verification_note, ''))) < 10) then
    raise exception using errcode = '42501', message = 'spogomi_admission_verification_required';
  end if;
  if p_target_status = 'approved' and v_request.request_kind = 'registration'
     and length(btrim(coalesce(p_verification_note, ''))) < 10 then
    raise exception using errcode = '42501', message = 'spogomi_registration_verification_required';
  end if;
  if p_target_status = 'approved' and v_request.request_kind = 'presence_regularization'
     and length(btrim(coalesce(p_verification_note, ''))) < 10 then
    raise exception using errcode = '42501', message = 'spogomi_presence_verification_required';
  end if;

  if p_target_status = 'approved' and v_request.request_kind = 'team_join' then
    select * into v_participant
      from public.spogomi_participants participant
     where participant.id = p_matched_participant_id
       and participant.event_id = p_event_id
       and participant.team_id = v_request.team_id
       and participant.registration_status = 'registered'
       and participant.account_link_status <> 'verified'
     for update;
    if not found then raise exception using errcode = '42501', message = 'spogomi_team_join_participant_mismatch'; end if;
    if exists (select 1 from public.spogomi_participants participant where participant.event_id = p_event_id and participant.clerk_id = v_request.requester_clerk_id and participant.account_link_status = 'verified' and participant.registration_status = 'registered') then
      raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
    end if;
    update public.spogomi_participants
       set account_link_status = 'verified', clerk_id = v_request.requester_clerk_id,
           identity_link_code_hash = null, identity_link_code_expires_at = null, identity_link_code_revoked_at = now(), updated_at = now()
     where id = v_participant.id and event_id = p_event_id;
    insert into public.spogomi_identity_link_events(event_id, participant_id, event_type, actor_kind, actor_clerk_id, outcome, reason)
    values (p_event_id, v_participant.id, 'admin_approved', 'admin', p_actor_clerk_id, 'success', 'team_join_request_verified');
  elsif p_target_status = 'approved' and v_request.request_kind = 'registration' then
    select * into v_event from public.spogomi_events where id = p_event_id for update;
    if v_event.state <> 'registration_open' then
      raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed';
    end if;
    select coalesce(d.regulation_config -> 'registrationPolicy', '{}'::jsonb)
      into v_policy from public.spogomi_divisions d where d.id = v_request.division_id and d.event_id = p_event_id;
    v_policy := coalesce(v_policy, '{}'::jsonb) || coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);
    if coalesce(v_policy ->> 'directRegistrationOpen', 'false') <> 'true' then
      raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed';
    end if;
    if coalesce(v_policy ->> 'externalTicketingRequired', 'false') = 'true' then
      raise exception using errcode = '42501', message = 'spogomi_external_ticketing_required';
    end if;
    if v_event.mode = 'world_cup' or exists (select 1 from public.spogomi_divisions where id = v_request.division_id and division_type = 'world_cup') then
      if coalesce(v_policy ->> 'worldCupDirectRegistrationAllowed', 'false') <> 'true' then
        raise exception using errcode = '42501', message = 'spogomi_world_cup_official_path_required';
      end if;
    end if;
    if (v_policy ->> 'capacity') ~ '^[0-9]+$' then
      v_capacity := (v_policy ->> 'capacity')::integer;
      if (select count(*) from public.spogomi_participants where event_id = p_event_id and registration_status = 'registered') >= v_capacity then
        raise exception using errcode = '42501', message = 'spogomi_registration_capacity_reached';
      end if;
    end if;
    if exists (select 1 from public.spogomi_participants participant where participant.event_id = p_event_id and participant.clerk_id = v_request.requester_clerk_id and participant.account_link_status = 'verified' and participant.registration_status = 'registered') then
      raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
    end if;

    select * into v_participant
      from public.spogomi_participants participant
     where participant.event_id = p_event_id
       and participant.division_id = v_request.division_id
       and participant.clerk_id = v_request.requester_clerk_id
       and participant.account_link_status = 'verified'
       and participant.registration_status = 'withdrawn'
       and participant.source_system = 'direct_registration'
     order by participant.updated_at desc
     limit 1
     for update;
    if found then
      update public.spogomi_participants
         set registration_status = 'registered', attendance_status = 'unknown', updated_at = now()
       where id = v_participant.id and event_id = p_event_id;
      insert into public.spogomi_participant_lifecycle_events(event_id, participant_id, from_status, to_status, actor_kind, actor_clerk_id, reason)
      values (p_event_id, v_participant.id, 'withdrawn', 'registered', 'admin', p_actor_clerk_id, 'direct_registration_reopened');
    else
      insert into public.spogomi_participants(event_id, division_id, source_system, identity_status, registration_status, attendance_status, account_link_status, clerk_id)
      values (p_event_id, v_request.division_id, 'direct_registration', 'identified', 'registered', 'unknown', 'verified', v_request.requester_clerk_id)
      returning * into v_participant;
    end if;
    p_matched_participant_id := v_participant.id;
  end if;

  update public.spogomi_team_join_requests
     set status = p_target_status,
         matched_participant_id = case when p_target_status = 'approved' and v_request.request_kind in ('team_join', 'registration') then p_matched_participant_id else null end,
         verification_note = case when p_target_status = 'approved' then nullif(btrim(p_verification_note), '') else null end,
         resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), ''),
         decision_message = nullif(btrim(coalesce(p_decision_message, '')), ''),
         decided_by_clerk_id = btrim(p_actor_clerk_id), decided_at = now(), updated_at = now()
   where id = p_request_id and event_id = p_event_id
   returning * into v_request;

  insert into public.spogomi_team_join_request_events(request_id, event_id, status, actor_kind, actor_clerk_id, details)
  values (v_request.id, v_request.event_id, v_request.status, p_actor_kind, btrim(p_actor_clerk_id),
    jsonb_build_object('request_kind', v_request.request_kind, 'division_id', v_request.division_id, 'matched_participant_id', v_request.matched_participant_id, 'has_verification_note', v_request.verification_note is not null));
  return to_jsonb(v_request);
end;
$$;

revoke all on function public.transition_spogomi_admission_request(uuid, uuid, text, text, text, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.transition_spogomi_admission_request(uuid, uuid, text, text, text, text, uuid, text, text, text) to service_role;
