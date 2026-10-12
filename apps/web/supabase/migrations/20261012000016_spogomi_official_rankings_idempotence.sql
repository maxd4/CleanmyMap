-- SPOGOMI lot 9: idempotent official ranking publication with a checked source snapshot.
-- This migration is append-only. Migrations 00009, 00014 and the applied 00015 remain unchanged.

alter table public.spogomi_official_rankings
  add column if not exists source_snapshot jsonb;

create table if not exists public.spogomi_official_ranking_history (
  id uuid primary key default gen_random_uuid(),
  ranking_id uuid not null references public.spogomi_official_rankings(id) on delete restrict,
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  team_id uuid not null references public.spogomi_teams(id) on delete restrict,
  kind text not null check (kind in ('points', 'butts')),
  rank integer not null check (rank > 0),
  status text not null check (status in ('certified', 'revoked')),
  action text not null check (action in ('certified', 'revoked', 'reinstated')),
  team_eligible boolean not null,
  decision_version text not null check (length(btrim(decision_version)) > 0),
  source_reference text not null check (length(btrim(source_reference)) > 0),
  source_snapshot jsonb,
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists spogomi_official_ranking_history_event_idx
  on public.spogomi_official_ranking_history(event_id, kind, team_id, created_at desc);

alter table public.spogomi_official_ranking_history enable row level security;
revoke all on table public.spogomi_official_ranking_history from public, anon, authenticated;
grant all on table public.spogomi_official_ranking_history to service_role;

create or replace function public.publish_spogomi_official_rankings_checked(
  p_event_id uuid,
  p_decision_version text,
  p_source_reference text,
  p_rankings jsonb,
  p_actor_clerk_id text,
  p_source_snapshot jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_ranking jsonb;
  v_current public.spogomi_official_rankings%rowtype;
  v_existing public.spogomi_official_rankings%rowtype;
  v_count integer := 0;
  v_action text;
begin
  -- PURPOSE: publish one complete official ranking decision atomically.
  -- IDEMPOTENCY: an identical current decision is a no-op; historical decisions can be reinstated.
  -- ATOMICITY: source verification, revocation and certification share this transaction.
  -- CONCURRENCY: the event and source-row locks serialize publication with source mutations in a deterministic order.
  -- SOURCE_INTEGRITY: every event, rule, team, submission, item and participant business field is checked before mutation.
  if coalesce(auth.role(), '') <> 'service_role'
     or p_event_id is null
     or length(btrim(coalesce(p_decision_version, ''))) = 0
     or length(btrim(coalesce(p_source_reference, ''))) = 0
     or jsonb_typeof(p_rankings) <> 'array'
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or jsonb_typeof(p_source_snapshot -> 'event') <> 'object'
     or jsonb_typeof(p_source_snapshot -> 'categories') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'teams') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'submissions') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'items') <> 'array'
     or jsonb_typeof(p_source_snapshot -> 'participants') <> 'array' then
    raise exception using errcode = '42501', message = 'SPOGOMI checked ranking publication is forbidden';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_rankings) as candidate(value)
     group by candidate.value ->> 'kind', candidate.value ->> 'teamId'
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'A SPOGOMI official ranking contains a duplicate team and kind';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event not found';
  end if;
  if v_event.state <> 'certified' or v_event.regulation_status <> 'complete' then
    raise exception using errcode = '23514', message = 'Only a certified event with complete rules can publish official rankings';
  end if;

  -- Lock every source relation before comparing it. The order is shared with the
  -- consolidation mutation path: event, rules, teams, submissions, items, presence.
  perform 1 from public.spogomi_category_rules where event_id = p_event_id order by id for update;
  perform 1 from public.spogomi_teams where event_id = p_event_id order by id for update;
  perform 1 from public.spogomi_result_submissions where event_id = p_event_id order by id for update;
  perform 1 from public.spogomi_result_items where event_id = p_event_id order by id for update;
  perform 1 from public.spogomi_participants where event_id = p_event_id order by id for update;

  if (p_source_snapshot #>> '{event,id}') is distinct from v_event.id::text
     or (p_source_snapshot #>> '{event,regulationVersion}') is distinct from v_event.regulation_version
     or (p_source_snapshot #>> '{event,regulationStatus}') is distinct from v_event.regulation_status
     or (p_source_snapshot #>> '{event,regulationSourceReference}') is distinct from v_event.regulation_source_reference
      or (p_source_snapshot -> 'event' -> 'regulationConfig') is distinct from v_event.regulation_config
      or (p_source_snapshot -> 'event' -> 'teamSizeConfig') is distinct from v_event.team_size_config then
    raise exception using errcode = '40001', message = 'The SPOGOMI ranking source snapshot changed since calculation';
  end if;

  if jsonb_array_length(p_source_snapshot -> 'categories') <> (select count(*) from public.spogomi_category_rules where event_id = p_event_id)
     or exists (
       select 1 from public.spogomi_category_rules row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1 from jsonb_array_elements(p_source_snapshot -> 'categories') captured(value)
             where captured.value ->> 'id' = row_data.id::text
                and captured.value ->> 'regulationVersion' = row_data.regulation_version
                and captured.value ->> 'code' = row_data.code
                and captured.value ->> 'measurementKind' = row_data.measurement_kind
                and captured.value ->> 'unit' = row_data.unit
                and captured.value ->> 'coefficient' is not distinct from row_data.coefficient::text
                and captured.value ->> 'coefficientStatus' = row_data.coefficient_status
                and captured.value ->> 'environmentalCategorySlug' is not distinct from row_data.environmental_category_slug
                and (captured.value ->> 'isComplete')::boolean is not distinct from row_data.is_complete
          )
     ) then
    raise exception using errcode = '40001', message = 'The SPOGOMI category source snapshot changed since calculation';
  end if;
  if jsonb_array_length(p_source_snapshot -> 'teams') <> (select count(*) from public.spogomi_teams where event_id = p_event_id)
     or exists (
       select 1 from public.spogomi_teams row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1 from jsonb_array_elements(p_source_snapshot -> 'teams') captured(value)
             where captured.value ->> 'id' = row_data.id::text
                and (captured.value ->> 'teamNumber')::integer = row_data.team_number
                and captured.value ->> 'compositionState' = row_data.composition_state
                and captured.value ->> 'certifiedSubmissionId' is not distinct from row_data.certified_submission_id::text
          )
     ) then
    raise exception using errcode = '40001', message = 'The SPOGOMI team source snapshot changed since calculation';
  end if;
  if jsonb_array_length(p_source_snapshot -> 'submissions') <> (select count(*) from public.spogomi_result_submissions where event_id = p_event_id)
     or exists (
       select 1 from public.spogomi_result_submissions row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1 from jsonb_array_elements(p_source_snapshot -> 'submissions') captured(value)
             where captured.value ->> 'id' = row_data.id::text
                and captured.value ->> 'teamId' = row_data.team_id::text
                and (captured.value ->> 'version')::integer = row_data.version
                and captured.value ->> 'status' = row_data.status
                and nullif(captured.value ->> 'submittedAt', '')::timestamptz is not distinct from row_data.submitted_at
                and captured.value ->> 'regulationVersion' = row_data.regulation_version
          )
     ) then
    raise exception using errcode = '40001', message = 'The SPOGOMI submission source snapshot changed since calculation';
  end if;
  if jsonb_array_length(p_source_snapshot -> 'items') <> (select count(*) from public.spogomi_result_items where event_id = p_event_id)
     or exists (
       select 1 from public.spogomi_result_items row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1 from jsonb_array_elements(p_source_snapshot -> 'items') captured(value)
             where captured.value ->> 'id' = row_data.id::text
                and captured.value ->> 'submissionId' = row_data.submission_id::text
                and captured.value ->> 'categoryRuleId' = row_data.category_rule_id::text
                and captured.value ->> 'measurementKind' = row_data.measurement_kind
                and captured.value ->> 'unit' = row_data.unit
                and nullif(captured.value ->> 'quantity', '')::numeric is not distinct from row_data.quantity
                and nullif(captured.value ->> 'massGrams', '')::numeric is not distinct from row_data.mass_grams
                and nullif(captured.value ->> 'objectCount', '')::numeric is not distinct from row_data.object_count
                and captured.value ->> 'measurementMethod' is not distinct from row_data.measurement_method
                and captured.value ->> 'provenance' = row_data.provenance
                and captured.value ->> 'sourceReference' is not distinct from row_data.source_reference
          )
     ) then
    raise exception using errcode = '40001', message = 'The SPOGOMI measurement source snapshot changed since calculation';
  end if;
  if jsonb_array_length(p_source_snapshot -> 'participants') <> (select count(*) from public.spogomi_participants where event_id = p_event_id)
     or exists (
       select 1 from public.spogomi_participants row_data
        where row_data.event_id = p_event_id
          and not exists (
            select 1 from jsonb_array_elements(p_source_snapshot -> 'participants') captured(value)
             where captured.value ->> 'id' = row_data.id::text
                and captured.value ->> 'teamId' is not distinct from row_data.team_id::text
                and captured.value ->> 'registrationStatus' = row_data.registration_status
                and captured.value ->> 'attendanceStatus' = row_data.attendance_status
          )
     ) then
    raise exception using errcode = '40001', message = 'The SPOGOMI presence source snapshot changed since calculation';
  end if;

  if exists (
    select 1
      from public.spogomi_official_rankings current_row
     where current_row.event_id = p_event_id
       and current_row.status = 'certified'
       and current_row.source_snapshot = p_source_snapshot
       and current_row.decision_version <> btrim(p_decision_version)
  ) then
    raise exception using errcode = '40001', message = 'A different SPOGOMI ranking decision already exists for this source snapshot';
  end if;

  for v_ranking in select value from jsonb_array_elements(p_rankings) loop
    if (v_ranking ->> 'kind') not in ('points', 'butts')
       or (v_ranking ->> 'teamId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or (v_ranking ->> 'rank') !~ '^[1-9][0-9]*$'
       or jsonb_typeof(v_ranking -> 'teamEligible') <> 'boolean'
       or not exists (select 1 from public.spogomi_teams where id = (v_ranking ->> 'teamId')::uuid and event_id = p_event_id) then
      raise exception using errcode = '22023', message = 'Invalid SPOGOMI official ranking';
    end if;
  end loop;

  for v_current in
    select * from public.spogomi_official_rankings
     where event_id = p_event_id and status = 'certified'
     for update
  loop
    if not exists (
      select 1 from jsonb_array_elements(p_rankings) desired(value)
       where (desired.value ->> 'kind') = v_current.kind
         and (desired.value ->> 'teamId')::uuid = v_current.team_id
         and (desired.value ->> 'rank')::integer = v_current.rank
         and (desired.value ->> 'teamEligible')::boolean = v_current.team_eligible
    ) or v_current.decision_version <> btrim(p_decision_version) then
      update public.spogomi_official_rankings
         set status = 'revoked', updated_at = now()
       where id = v_current.id;
      insert into public.spogomi_official_ranking_history (
        ranking_id, event_id, team_id, kind, rank, status, action, team_eligible,
        decision_version, source_reference, source_snapshot, actor_clerk_id
      ) values (
        v_current.id, v_current.event_id, v_current.team_id, v_current.kind, v_current.rank,
        'revoked', 'revoked', v_current.team_eligible, v_current.decision_version,
        v_current.source_reference, v_current.source_snapshot, btrim(p_actor_clerk_id)
      );
    end if;
  end loop;

  for v_ranking in select value from jsonb_array_elements(p_rankings) loop
    select * into v_existing
      from public.spogomi_official_rankings
     where event_id = p_event_id
       and kind = v_ranking ->> 'kind'
       and team_id = (v_ranking ->> 'teamId')::uuid
       and decision_version = btrim(p_decision_version)
     for update;

    if found then
      if v_existing.rank <> (v_ranking ->> 'rank')::integer
         or v_existing.team_eligible <> (v_ranking ->> 'teamEligible')::boolean
         or v_existing.source_snapshot is distinct from p_source_snapshot then
        raise exception using errcode = '40001', message = 'The SPOGOMI decision version is already bound to another ranking';
      end if;
      if v_existing.status = 'revoked' then
        update public.spogomi_official_rankings
           set status = 'certified', updated_at = now()
         where id = v_existing.id;
        v_action := 'reinstated';
        insert into public.spogomi_official_ranking_history (
          ranking_id, event_id, team_id, kind, rank, status, action, team_eligible,
          decision_version, source_reference, source_snapshot, actor_clerk_id
        ) values (
          v_existing.id, v_existing.event_id, v_existing.team_id, v_existing.kind, v_existing.rank,
          'certified', v_action, v_existing.team_eligible, v_existing.decision_version,
          v_existing.source_reference, v_existing.source_snapshot, btrim(p_actor_clerk_id)
        );
      end if;
    else
      insert into public.spogomi_official_rankings (
        event_id, team_id, kind, rank, status, team_eligible, decision_version,
        source_reference, source_snapshot, decided_by_clerk_id
      ) values (
        p_event_id, (v_ranking ->> 'teamId')::uuid, v_ranking ->> 'kind',
        (v_ranking ->> 'rank')::integer, 'certified',
        (v_ranking ->> 'teamEligible')::boolean, btrim(p_decision_version),
        btrim(p_source_reference), p_source_snapshot, btrim(p_actor_clerk_id)
      ) returning * into v_existing;
      insert into public.spogomi_official_ranking_history (
        ranking_id, event_id, team_id, kind, rank, status, action, team_eligible,
        decision_version, source_reference, source_snapshot, actor_clerk_id
      ) values (
        v_existing.id, v_existing.event_id, v_existing.team_id, v_existing.kind, v_existing.rank,
        'certified', 'certified', v_existing.team_eligible, v_existing.decision_version,
        v_existing.source_reference, v_existing.source_snapshot, btrim(p_actor_clerk_id)
      );
    end if;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.publish_spogomi_official_rankings_checked(uuid, text, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_spogomi_official_rankings_checked(uuid, text, text, jsonb, text, jsonb) to service_role;

comment on function public.publish_spogomi_official_rankings_checked(uuid, text, text, jsonb, text, jsonb) is
  'ATOMIC, service-only, idempotent SPOGOMI official ranking publication with source snapshot validation and append-only transition history.';
