-- SPOGOMI: explicit field start/closure with a private immutable diagnostic.
-- The transition is deliberately separate from certification, consolidation and
-- publication.  A closure only moves the event to judging and drafts the
-- canonical action for the post-action workflow.

create table public.spogomi_event_closure_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.spogomi_events(id) on delete restrict,
  event_state text not null check (event_state = 'judging'),
  closed_at timestamptz not null,
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  event_revision bigint not null check (event_revision >= 0),
  snapshot_version integer not null default 1 check (snapshot_version = 1),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create index spogomi_event_closure_snapshots_actor_idx
  on public.spogomi_event_closure_snapshots(actor_clerk_id, created_at desc);

create or replace function public.prevent_spogomi_closure_snapshot_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception using errcode = '55006', message = 'SPOGOMI closure snapshots are immutable';
end;
$$;

drop trigger if exists spogomi_event_closure_snapshots_immutable
  on public.spogomi_event_closure_snapshots;
create trigger spogomi_event_closure_snapshots_immutable
before update or delete on public.spogomi_event_closure_snapshots
for each row execute function public.prevent_spogomi_closure_snapshot_mutation();

alter table public.spogomi_event_closure_snapshots enable row level security;
revoke all on table public.spogomi_event_closure_snapshots from public, anon, authenticated;
grant all on table public.spogomi_event_closure_snapshots to service_role;
revoke all on function public.prevent_spogomi_closure_snapshot_mutation() from public, anon, authenticated;
grant execute on function public.prevent_spogomi_closure_snapshot_mutation() to service_role;

create or replace function public.spogomi_transition_event(
  p_event_id uuid,
  p_transition text,
  p_expected_revision bigint,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_snapshot public.spogomi_event_closure_snapshots%rowtype;
  v_closed_at timestamptz;
  v_next_revision bigint;
  v_anomalies jsonb := '[]'::jsonb;
begin
  -- PURPOSE: serialize the explicit start/closure transition of one edition.
  -- CALLER: server-only cockpit action after Clerk ACTIVE_ROLE and event scope checks.
  -- AUTHORIZATION_BOUNDARY: service_role only; business authorization stays in the server route.
  -- IDEMPOTENCY: start replays in in_progress; closure replays its immutable snapshot.
  -- ATOMICITY: event lock, action phase, snapshot and revision commit together.
  if coalesce(auth.role(), '') <> 'service_role'
     or p_event_id is null
     or p_transition not in ('start', 'close')
     or p_expected_revision is null
     or p_expected_revision < 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'Invalid SPOGOMI lifecycle transition';
  end if;

  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event not found';
  end if;
  perform set_config('spogomi.change_actor', btrim(p_actor_clerk_id), true);

  if p_transition = 'start' then
    if v_event.state = 'in_progress' then
      return jsonb_build_object(
        'already_processed', true,
        'transition', 'start',
        'eventId', v_event.id,
        'state', v_event.state,
        'compositionRevision', v_event.composition_revision
      );
    end if;
    if v_event.composition_revision <> p_expected_revision then
      raise exception using errcode = '40001', message = 'The SPOGOMI event changed since the start preview';
    end if;
    if v_event.state <> 'composition_locked' then
      raise exception using errcode = 'check_violation', message = 'The SPOGOMI event is not ready to start';
    end if;
    update public.spogomi_events
       set state = 'in_progress',
           composition_revision = composition_revision + 1,
           updated_at = now()
     where id = p_event_id;
    v_next_revision := v_event.composition_revision + 1;
    return jsonb_build_object(
      'already_processed', false,
      'transition', 'start',
      'eventId', v_event.id,
      'state', 'in_progress',
      'compositionRevision', v_next_revision
    );
  end if;

  select * into v_snapshot
    from public.spogomi_event_closure_snapshots
   where event_id = p_event_id;
  if found and v_event.state in ('judging', 'certified', 'archived') then
    return jsonb_build_object(
      'already_processed', true,
      'transition', 'close',
      'eventId', v_event.id,
      'state', v_event.state,
      'endsAt', v_event.ends_at,
      'compositionRevision', v_event.composition_revision,
      'snapshotId', v_snapshot.id,
      'snapshotVersion', v_snapshot.snapshot_version
    );
  end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'The SPOGOMI event changed since the closure preview';
  end if;
  if v_event.state <> 'in_progress' then
    raise exception using errcode = 'check_violation', message = 'Only a started SPOGOMI event can be closed';
  end if;
  if found then
    raise exception using errcode = 'serialization_failure', message = 'The SPOGOMI closure snapshot is inconsistent with the event state';
  end if;

  v_closed_at := clock_timestamp();
  update public.spogomi_events
     set state = 'judging',
         ends_at = v_closed_at,
         composition_revision = composition_revision + 1,
         updated_at = now()
   where id = p_event_id;
  update public.actions
     set action_phase = 'post_action_draft', updated_at = now()
   where id = v_event.action_id;
  v_next_revision := v_event.composition_revision + 1;

  if not public.spogomi_route_coverage_complete(p_event_id) then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'missing', 'code', 'planned_route', 'message', 'Le parcours prévu n’est pas complet.',
      'provenance', jsonb_build_array('spogomi_event_routes')
    ));
  end if;
  if v_event.regulation_status <> 'complete' or exists (
    select 1 from public.spogomi_divisions where event_id = p_event_id and regulation_status <> 'complete'
  ) then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'missing', 'code', 'regulation', 'message', 'Le règlement applicable n’est pas complet.',
      'provenance', jsonb_build_array('spogomi_events', 'spogomi_divisions')
    ));
  end if;
  if not exists (select 1 from public.spogomi_teams where event_id = p_event_id) then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'missing', 'code', 'teams', 'message', 'Aucune équipe n’est enregistrée.',
      'provenance', jsonb_build_array('spogomi_teams')
    ));
  end if;
  if exists (select 1 from public.spogomi_participants where event_id = p_event_id and attendance_status = 'unknown') then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'unverified', 'code', 'attendance', 'message', 'Des présences restent non vérifiées.',
      'provenance', jsonb_build_array('spogomi_participants')
    ));
  end if;
  if exists (select 1 from public.spogomi_result_submissions where event_id = p_event_id and status <> 'certified')
     or not exists (select 1 from public.spogomi_result_submissions where event_id = p_event_id) then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'certification_blocker', 'code', 'results', 'message', 'Les résultats ne sont pas tous certifiés.',
      'provenance', jsonb_build_array('spogomi_result_submissions')
    ));
  end if;
  if exists (
    select 1
      from public.spogomi_result_submissions s
      left join public.spogomi_teams t on t.id = s.team_id and t.event_id = s.event_id
     where s.event_id = p_event_id and t.id is null
  ) then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'inconsistent', 'code', 'result_team_scope', 'message', 'Une soumission de résultat ne correspond pas à une équipe de cette édition.',
      'provenance', jsonb_build_array('spogomi_result_submissions', 'spogomi_teams')
    ));
  end if;
  if exists (select 1 from public.spogomi_operational_measurements where event_id = p_event_id and status in ('draft', 'submitted')) then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'unverified', 'code', 'measurements', 'message', 'Des mesures restent à vérifier ou certifier.',
      'provenance', jsonb_build_array('spogomi_operational_measurements')
    ));
  end if;
  if exists (select 1 from public.spogomi_field_incidents where event_id = p_event_id and decision_status = 'open') then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'unverified', 'code', 'incidents', 'message', 'Des incidents terrain restent ouverts.',
      'provenance', jsonb_build_array('spogomi_field_incidents')
    ));
  end if;
  if not exists (select 1 from public.spogomi_action_consolidations where event_id = p_event_id and is_current and status = 'published') then
    v_anomalies := v_anomalies || jsonb_build_array(jsonb_build_object(
      'kind', 'unverified', 'code', 'environmental_consolidation', 'message', 'La consolidation environnementale n’est pas publiée.',
      'provenance', jsonb_build_array('spogomi_action_consolidations')
    ));
  end if;

  insert into public.spogomi_event_closure_snapshots (
    event_id, event_state, closed_at, actor_clerk_id, event_revision, snapshot
  ) values (
    p_event_id, 'judging', v_closed_at, btrim(p_actor_clerk_id), v_next_revision,
    jsonb_build_object(
      'snapshotVersion', 1,
      'event', jsonb_build_object(
        'id', v_event.id, 'name', v_event.name, 'mode', v_event.mode,
        'state', 'judging', 'startsAt', v_event.starts_at, 'endsAt', v_closed_at,
        'regulationVersion', v_event.regulation_version,
        'regulationStatus', v_event.regulation_status
      ),
      'divisions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'type', d.division_type, 'regulationStatus', d.regulation_status
      ) order by d.division_type) from public.spogomi_divisions d where d.event_id = p_event_id), '[]'::jsonb),
      'routes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'divisionId', r.division_id, 'source', r.source, 'fileName', r.file_name,
        'routeVersion', r.route_version, 'pointCount', r.point_count,
        'referenceDistanceKm', r.reference_distance_km
      ) order by r.division_id nulls first) from public.spogomi_event_routes r where r.event_id = p_event_id), '[]'::jsonb),
      'teams', coalesce((select jsonb_agg(jsonb_build_object(
        'id', t.id, 'divisionId', t.division_id, 'teamNumber', t.team_number,
        'publicName', t.public_name, 'compositionState', t.composition_state
      ) order by t.division_id, t.team_number) from public.spogomi_teams t where t.event_id = p_event_id), '[]'::jsonb),
      'attendance', coalesce((select jsonb_agg(jsonb_build_object(
        'divisionId', attendance.division_id,
        'registered', attendance.registered,
        'present', attendance.present,
        'absent', attendance.absent,
        'unknown', attendance.unknown
      ) order by attendance.division_id) from (
        select p.division_id,
          count(*) filter (where p.registration_status = 'registered') as registered,
          count(*) filter (where p.attendance_status = 'present') as present,
          count(*) filter (where p.attendance_status = 'absent') as absent,
          count(*) filter (where p.attendance_status = 'unknown') as unknown
        from public.spogomi_participants p
        where p.event_id = p_event_id
        group by p.division_id
      ) attendance), '[]'::jsonb),
      'closureDecisions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'divisionId', d.division_id, 'teamId', d.team_id,
        'status', d.status, 'sportEligible', d.sport_eligible,
        'environmentalEligibility', d.environmental_eligibility,
        'decisionVersion', d.decision_version, 'decidedAt', d.decided_at
      ) order by d.division_id, d.team_id) from public.spogomi_team_closure_decisions d where d.event_id = p_event_id and d.is_current), '[]'::jsonb),
      'results', coalesce((select jsonb_agg(jsonb_build_object(
        'id', s.id, 'teamId', s.team_id, 'status', s.status, 'version', s.version
      ) order by s.team_id, s.version desc) from public.spogomi_result_submissions s where s.event_id = p_event_id), '[]'::jsonb),
      'measurements', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'divisionId', m.division_id, 'teamId', m.team_id,
        'status', m.status, 'revision', m.revision, 'provenance', m.provenance
      ) order by m.division_id, m.team_id, m.revision desc) from public.spogomi_operational_measurements m where m.event_id = p_event_id), '[]'::jsonb),
      'certifications', coalesce((select jsonb_agg(jsonb_build_object(
        'id', a.id, 'participantId', a.participant_id, 'kind', a.kind, 'status', a.status,
        'certificationVersion', a.certification_version, 'certifiedAt', a.certified_at
      ) order by a.kind, a.participant_id) from public.spogomi_recognition_attestations a where a.event_id = p_event_id), '[]'::jsonb),
      'rankings', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.id, 'divisionId', t.division_id, 'teamId', r.team_id, 'kind', r.kind,
        'rank', r.rank, 'status', r.status, 'decisionVersion', r.decision_version,
        'sourceReference', r.source_reference
      ) order by t.division_id, r.kind, r.rank) from public.spogomi_official_rankings r join public.spogomi_teams t on t.id = r.team_id where r.event_id = p_event_id), '[]'::jsonb),
      'consolidation', coalesce((select jsonb_build_object(
        'id', c.id, 'status', c.status, 'projectionVersion', c.projection_version,
        'projectionRevision', c.projection_revision, 'sourceHash', c.source_hash,
        'mappingVersion', c.mapping_version, 'sourceSubmissionIds', c.source_submission_ids
      ) from public.spogomi_action_consolidations c where c.event_id = p_event_id and c.is_current limit 1), jsonb_build_object('status', 'missing')),
      'anomalies', v_anomalies,
      'provenance', jsonb_build_object(
        'eventRevision', v_next_revision,
        'sources', jsonb_build_array(
          'spogomi_events', 'spogomi_divisions', 'spogomi_event_routes', 'spogomi_teams',
          'spogomi_participants', 'spogomi_team_closure_decisions', 'spogomi_result_submissions',
          'spogomi_operational_measurements', 'spogomi_recognition_attestations',
          'spogomi_official_rankings', 'spogomi_action_consolidations'
        )
      )
    )
  ) returning * into v_snapshot;

  return jsonb_build_object(
    'already_processed', false,
    'transition', 'close',
    'eventId', p_event_id,
    'state', 'judging',
    'endsAt', v_closed_at,
    'compositionRevision', v_next_revision,
    'snapshotId', v_snapshot.id,
    'snapshotVersion', v_snapshot.snapshot_version,
    'snapshot', v_snapshot.snapshot
  );
end;
$$;

revoke all on function public.spogomi_transition_event(uuid, text, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_transition_event(uuid, text, bigint, text) to service_role;

comment on table public.spogomi_event_closure_snapshots is
  'Immutable private diagnostic captured when a started SPOGOMI event moves to judging; it never certifies, consolidates or publishes results.';
comment on function public.spogomi_transition_event(uuid, text, bigint, text) is
  'Explicit, versioned and idempotent start/closure transition. Closure sets ends_at from the server clock and drafts the canonical action.';
