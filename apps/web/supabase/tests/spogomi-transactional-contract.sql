-- EXECUTED_DB_CONTRACT for SPOGOMI transaction, RLS and projection boundaries.
-- Synthetic fixtures only. The complete contract is rolled back at the end.

begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_team_id uuid := gen_random_uuid();
  v_participant_id uuid := gen_random_uuid();
  v_submission_id uuid := gen_random_uuid();
  v_revision bigint;
begin
  insert into public.actions (id, created_by_clerk_id, action_date, location_label, status)
  values (v_action_id, 'spogomi-transactional-contract-owner', current_date,
          'Synthetic transactional contract', 'pending');
  insert into public.action_organizers (action_id, organizer_clerk_id, organizer_label, is_primary)
  values (v_action_id, 'spogomi-transactional-contract-owner', 'Synthetic organizer', true);
  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode,
    state, starts_at, regulation_version, regulation_status, team_size_config
  ) values (
    v_event_id, v_action_id, 'spogomi-transactional-contract-owner',
    'Synthetic transactional event', 'Synthetic location', 'casual', 'draft',
    '2026-10-20T09:00:00+02:00', 'synthetic-v1', 'complete',
    '{"casual":{"minMembers":1,"maxMembers":4}}'::jsonb
  );
  insert into public.spogomi_teams (id, event_id, team_number, public_name)
  values (v_team_id, v_event_id, 1, 'Synthetic team');
  insert into public.spogomi_participants (
    id, event_id, team_id, external_reference, registration_status, attendance_status
  ) values (
    v_participant_id, v_event_id, null, 'synthetic-ticket-1', 'registered', 'present'
  );

  -- The privileged session is required for the server-owned RPCs, but direct
  -- writes still pass through the composition triggers.
  perform public.spogomi_move_participant_to_team(
    v_event_id, v_participant_id, v_team_id, 0, 'spogomi-transactional-contract-move'
  );
  begin
    update public.spogomi_events set state = 'composition_locked' where id = v_event_id;
    raise exception 'direct event lock mutation was accepted';
  exception when others then
    if sqlerrm not like '%SPOGOMI event locking requires the atomic composition lock procedure%' then
      raise;
    end if;
  end;
  select composition_revision into v_revision
    from public.spogomi_events where id = v_event_id;
  perform public.spogomi_lock_team_composition(
    v_event_id, v_revision, 'spogomi-transactional-contract-lock'
  );

  begin
    update public.spogomi_participants set team_id = null where id = v_participant_id;
    raise exception 'direct participant mutation after composition lock was accepted';
  exception when others then
    if sqlerrm not like '%Direct SPOGOMI team changes require the protected composition procedure%'
       and sqlerrm not like '%composition changes require a versioned correction procedure%' then
      raise;
    end if;
  end;
  begin
    update public.spogomi_teams set composition_state = 'draft' where id = v_team_id;
    raise exception 'direct team unlock after composition lock was accepted';
  exception when others then
    if sqlerrm not like '%Direct SPOGOMI team lock changes require the atomic composition lock procedure%' then
      raise;
    end if;
  end;
end;
$$;

-- RLS and grants are exercised with the actual browser roles. The organizer
-- can read the event/team projection, but roster, sessions, attestations and
-- audit tables remain server-only. The second identity has no event access.
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon","sub":"spogomi-anonymous"}', true);
select set_config('request.jwt.claim.role', 'anon', true);
do $$
begin
  begin
    execute 'select 1 from public.spogomi_participants limit 1';
    raise exception 'anonymous roster read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select 1 from public.spogomi_team_access_sessions limit 1';
    raise exception 'anonymous team-session read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"spogomi-transactional-contract-owner"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'spogomi-transactional-contract-owner', true);
do $$
declare
  v_event_count bigint;
  v_team_count bigint;
  v_result_count bigint;
begin
  select count(*) into v_event_count
    from public.spogomi_events
   where name = 'Synthetic transactional event';
  select count(*) into v_team_count
    from public.spogomi_teams
   where public_name = 'Synthetic team';
  if v_event_count <> 1 or v_team_count <> 1 then
    raise exception 'authorized organizer read did not return its event projection';
  end if;
  execute 'select count(*) from public.spogomi_result_submissions' into v_result_count;
  if v_result_count < 0 then
    raise exception 'authorized organizer result read returned an invalid count';
  end if;
  begin
    execute 'select 1 from public.spogomi_participants limit 1';
    raise exception 'authenticated roster read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select 1 from public.spogomi_recognition_attestations limit 1';
    raise exception 'authenticated attestation read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select 1 from public.spogomi_result_audit_events limit 1';
    raise exception 'authenticated result-audit read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"spogomi-unrelated-account"}', true);
select set_config('request.jwt.claim.sub', 'spogomi-unrelated-account', true);
do $$
declare
  v_event_count bigint;
begin
  select count(*) into v_event_count
    from public.spogomi_events
   where name = 'Synthetic transactional event';
  if v_event_count <> 0 then
    raise exception 'unrelated authenticated account read another event';
  end if;
end;
$$;

-- Privilege inventory is part of the executed boundary, not a text-only
-- assertion. The checks cover roster, team sessions, results, attestations,
-- rankings, consolidation and result-audit data.
set local role postgres;
do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.spogomi_events'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.spogomi_participants'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.spogomi_team_access_sessions'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.spogomi_recognition_attestations'::regclass) then
    raise exception 'a SPOGOMI sensitive table has RLS disabled';
  end if;
  if has_table_privilege('anon', 'public.spogomi_participants', 'SELECT')
     or has_table_privilege('authenticated', 'public.spogomi_participants', 'SELECT')
     or has_table_privilege('anon', 'public.spogomi_team_access_sessions', 'SELECT')
     or has_table_privilege('authenticated', 'public.spogomi_team_access_sessions', 'SELECT')
     or has_table_privilege('anon', 'public.spogomi_recognition_attestations', 'SELECT')
     or has_table_privilege('authenticated', 'public.spogomi_recognition_attestations', 'SELECT')
     or has_table_privilege('anon', 'public.spogomi_result_audit_events', 'SELECT')
     or has_table_privilege('authenticated', 'public.spogomi_result_audit_events', 'SELECT') then
    raise exception 'a browser role retains direct sensitive SPOGOMI table access';
  end if;
  if has_function_privilege('anon', 'public.consolidate_spogomi_event_to_action(uuid,text,text,text,jsonb,jsonb,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.consolidate_spogomi_event_to_action(uuid,text,text,text,jsonb,jsonb,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.consolidate_spogomi_event_to_action(uuid,text,text,text,jsonb,jsonb,text)', 'EXECUTE') then
    raise exception 'consolidation RPC grants do not preserve the server boundary';
  end if;
end;
$$;

-- A separate event exercises atomic consolidation, repeated publication,
-- historical A -> B -> A replay, stale-source rejection and one current
-- projection. The source snapshot deliberately contains no nominative field.
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_team_id uuid := gen_random_uuid();
  v_participant_id uuid := gen_random_uuid();
  v_submission_id uuid := gen_random_uuid();
  v_snapshot jsonb;
  v_projection_a jsonb;
  v_projection_b jsonb;
  v_stale jsonb;
  v_current_hash text;
  v_current_revision integer;
  v_count bigint;
begin
  insert into public.actions (id, created_by_clerk_id, action_date, location_label, status)
  values (v_action_id, 'spogomi-consolidation-contract-owner', current_date,
          'Synthetic consolidation contract', 'pending');
  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode, state,
    starts_at, regulation_version, regulation_status
  ) values (
    v_event_id, v_action_id, 'spogomi-consolidation-contract-owner',
    'Synthetic consolidation event', 'Synthetic consolidation location',
    'casual', 'judging', '2026-10-20T09:00:00+02:00', 'synthetic-v1', 'complete'
  );
  insert into public.spogomi_teams (id, event_id, team_number, public_name, composition_state)
  values (v_team_id, v_event_id, 1, 'Synthetic consolidation team', 'verified');
  insert into public.spogomi_participants (
    id, event_id, team_id, external_reference, registration_status, attendance_status
  ) values (
    v_participant_id, v_event_id, v_team_id, 'synthetic-consolidation-ticket', 'registered', 'present'
  );
  insert into public.spogomi_result_submissions (
    id, event_id, team_id, version, status, regulation_version,
    submitted_by_clerk_id, submitted_at, certified_by_clerk_id, certified_at
  ) values (
    v_submission_id, v_event_id, v_team_id, 1, 'certified', 'synthetic-v1',
    'synthetic-team', now(), 'synthetic-referee', now()
  );
  update public.spogomi_teams
     set certified_submission_id = v_submission_id
   where id = v_team_id;

  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id::text, 'name', e.name, 'locationLabel', e.location_label,
      'startsAt', e.starts_at::text, 'endsAt', e.ends_at::text,
      'mappingVersion', e.environmental_mapping_version, 'updatedAt', e.updated_at::text
    ),
    'action', jsonb_build_object(
      'id', a.id::text, 'organizerId', a.organizer_id,
      'organizerName', a.organizer_name, 'organizerType', a.organizer_type,
      'updatedAt', a.updated_at::text
    ),
    'categories', '[]'::jsonb, 'mappings', '[]'::jsonb,
    'teams', jsonb_build_array(jsonb_build_object('id', t.id::text, 'updatedAt', t.updated_at::text)),
    'submissions', jsonb_build_array(jsonb_build_object('id', s.id::text, 'updatedAt', s.updated_at::text)),
    'items', '[]'::jsonb,
    'participants', jsonb_build_array(jsonb_build_object('id', p.id::text, 'updatedAt', p.updated_at::text)),
    'route', null
  ) into v_snapshot
  from public.spogomi_events e
  join public.actions a on a.id = e.action_id
  join public.spogomi_teams t on t.event_id = e.id
  join public.spogomi_result_submissions s on s.id = t.certified_submission_id
  join public.spogomi_participants p on p.event_id = e.id
  where e.id = v_event_id;

  v_projection_a := jsonb_build_object(
    'readyForPublication', true, 'teamsIncluded', 1, 'participantsPresent', 1,
    'sourceSubmissionIds', jsonb_build_array(v_submission_id::text),
    'sourceSnapshot', v_snapshot,
    'action', jsonb_build_object('wasteKg', '1.250', 'cigaretteButts', 5, 'volunteersCount', 1),
    'totalWasteMassGrams', 1250, 'cigaretteButtsMassGrams', 5, 'cigaretteButtsCount', 5,
    'consolidation', jsonb_build_object('synthetic', 'A')
  );
  v_projection_b := jsonb_set(
    v_projection_a, '{action,wasteKg}', to_jsonb('2.500'::text)
  ) || jsonb_build_object('consolidation', jsonb_build_object('synthetic', 'B'));

  perform public.consolidate_spogomi_event_to_action(
    v_event_id, 'synthetic-consolidation', repeat('a', 64), 'spogomi-cleanmymap-v1',
    '[]'::jsonb, v_projection_a, 'synthetic-publisher-a'
  );
  perform public.consolidate_spogomi_event_to_action(
    v_event_id, 'synthetic-consolidation', repeat('a', 64), 'spogomi-cleanmymap-v1',
    '[]'::jsonb, v_projection_a, 'synthetic-publisher-a-retry'
  );
  select count(*) into v_count
    from public.spogomi_action_consolidations where event_id = v_event_id;
  if v_count <> 1 then raise exception 'identical consolidation was not idempotent'; end if;

  -- Publication owns updated_at on the event and Action. Refresh the source
  -- snapshot before each correction so a valid correction is not confused
  -- with a stale page.
  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id::text, 'name', e.name, 'locationLabel', e.location_label,
      'startsAt', e.starts_at::text, 'endsAt', e.ends_at::text,
      'mappingVersion', e.environmental_mapping_version, 'updatedAt', e.updated_at::text
    ),
    'action', jsonb_build_object(
      'id', a.id::text, 'organizerId', a.organizer_id,
      'organizerName', a.organizer_name, 'organizerType', a.organizer_type,
      'updatedAt', a.updated_at::text
    ),
    'categories', '[]'::jsonb, 'mappings', '[]'::jsonb,
    'teams', jsonb_build_array(jsonb_build_object('id', t.id::text, 'updatedAt', t.updated_at::text)),
    'submissions', jsonb_build_array(jsonb_build_object('id', s.id::text, 'updatedAt', s.updated_at::text)),
    'items', '[]'::jsonb,
    'participants', jsonb_build_array(jsonb_build_object('id', p.id::text, 'updatedAt', p.updated_at::text)),
    'route', null
  ) into v_snapshot
  from public.spogomi_events e
  join public.actions a on a.id = e.action_id
  join public.spogomi_teams t on t.event_id = e.id
  join public.spogomi_result_submissions s on s.id = t.certified_submission_id
  join public.spogomi_participants p on p.event_id = e.id
  where e.id = v_event_id;
  v_projection_b := jsonb_set(v_projection_b, '{sourceSnapshot}', v_snapshot);

  perform public.consolidate_spogomi_event_to_action(
    v_event_id, 'synthetic-consolidation', repeat('b', 64), 'spogomi-cleanmymap-v1',
    '[]'::jsonb, v_projection_b, 'synthetic-publisher-b'
  );

  select jsonb_build_object(
    'event', jsonb_build_object(
      'id', e.id::text, 'name', e.name, 'locationLabel', e.location_label,
      'startsAt', e.starts_at::text, 'endsAt', e.ends_at::text,
      'mappingVersion', e.environmental_mapping_version, 'updatedAt', e.updated_at::text
    ),
    'action', jsonb_build_object(
      'id', a.id::text, 'organizerId', a.organizer_id,
      'organizerName', a.organizer_name, 'organizerType', a.organizer_type,
      'updatedAt', a.updated_at::text
    ),
    'categories', '[]'::jsonb, 'mappings', '[]'::jsonb,
    'teams', jsonb_build_array(jsonb_build_object('id', t.id::text, 'updatedAt', t.updated_at::text)),
    'submissions', jsonb_build_array(jsonb_build_object('id', s.id::text, 'updatedAt', s.updated_at::text)),
    'items', '[]'::jsonb,
    'participants', jsonb_build_array(jsonb_build_object('id', p.id::text, 'updatedAt', p.updated_at::text)),
    'route', null
  ) into v_snapshot
  from public.spogomi_events e
  join public.actions a on a.id = e.action_id
  join public.spogomi_teams t on t.event_id = e.id
  join public.spogomi_result_submissions s on s.id = t.certified_submission_id
  join public.spogomi_participants p on p.event_id = e.id
  where e.id = v_event_id;
  v_projection_a := jsonb_set(v_projection_a, '{sourceSnapshot}', v_snapshot);
  perform public.consolidate_spogomi_event_to_action(
    v_event_id, 'synthetic-consolidation', repeat('a', 64), 'spogomi-cleanmymap-v1',
    '[]'::jsonb, v_projection_a, 'synthetic-publisher-a-replay'
  );

  v_stale := jsonb_set(v_projection_a, '{sourceSnapshot,event,name}', '"stale source"'::jsonb);
  begin
    perform public.consolidate_spogomi_event_to_action(
      v_event_id, 'synthetic-consolidation', repeat('c', 64), 'spogomi-cleanmymap-v1',
      '[]'::jsonb, v_stale, 'synthetic-publisher-stale'
    );
    raise exception 'stale source publication unexpectedly succeeded';
  exception when others then
    if sqlstate <> '40001' then raise; end if;
  end;

  select source_hash, projection_revision into v_current_hash, v_current_revision
    from public.spogomi_action_consolidations
   where event_id = v_event_id and is_current;
  if v_current_hash <> repeat('a', 64) or v_current_revision <> 3 then
    raise exception 'A to B to A consolidation did not restore a new current revision';
  end if;
  select count(*) into v_count
    from public.spogomi_action_consolidations
   where event_id = v_event_id and is_current;
  if v_count <> 1 then raise exception 'more than one consolidation projection is current'; end if;
  select spogomi_projection_source_hash into v_current_hash
    from public.actions where id = v_action_id;
  if v_current_hash <> repeat('a', 64) then
    raise exception 'canonical Action was not restored with the current projection';
  end if;
  if v_projection_a::text ~* '(display_name|clerk_id|external_reference|email)' then
    raise exception 'consolidation projection contains nominative data';
  end if;
  select count(*) into v_count
    from public.spogomi_action_consolidations
   where event_id = v_event_id and source_hash = repeat('c', 64);
  if v_count <> 0 then raise exception 'failed publication left a partial consolidation row'; end if;
end;
$$;

raise notice 'EXECUTED_DB_CONTRACT: SPOGOMI RLS, lock triggers and atomic A-B-A consolidation contract passed';
rollback;
