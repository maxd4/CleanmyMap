-- Executed PostgreSQL smoke contract for one mixed parent edition.
-- The transaction is rolled back: it creates no durable fixture or business data.
begin;

select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_casual_id uuid := md5(v_event_id::text || ':casual')::uuid;
  v_world_cup_id uuid := md5(v_event_id::text || ':world_cup')::uuid;
  v_team_casual uuid := gen_random_uuid();
  v_team_world_cup uuid := gen_random_uuid();
  v_participant_casual uuid := gen_random_uuid();
  v_count integer;
  v_decision_id uuid;
begin
  insert into public.actions (id, created_by_clerk_id, action_date, location_label)
  values (v_action_id, 'spogomi-db-smoke', current_date, 'SPOGOMI smoke');

  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode,
    starts_at, regulation_version, regulation_status, regulation_config,
    team_size_config, creation_state, public_visibility
  ) values (
    v_event_id, v_action_id, 'spogomi-db-smoke', 'SPOGOMI mixed smoke',
    'SPOGOMI smoke', 'mixed', now(), 'pending', 'incomplete', '{}'::jsonb,
    '{}'::jsonb, 'event_pending', 'private'
  );

  perform public.spogomi_ensure_parent_divisions(v_event_id, 'mixed');
  perform public.spogomi_ensure_parent_divisions(v_event_id, 'mixed');

  select count(*) into v_count from public.spogomi_divisions where event_id = v_event_id;
  if v_count <> 2 then raise exception 'mixed edition did not converge to two divisions'; end if;
  if (select count(*) from public.actions where id = v_action_id) <> 1 then raise exception 'mixed edition created a second action'; end if;
  if public.spogomi_division_regulation_is_complete(v_event_id, v_casual_id, 'pending') then
    raise exception 'an incomplete division regulation was reported as complete';
  end if;

  insert into public.spogomi_teams (id, event_id, division_id, team_number, public_name)
  values
    (v_team_casual, v_event_id, v_casual_id, 1, 'Casual 1'),
    (v_team_world_cup, v_event_id, v_world_cup_id, 1, 'World Cup 1');

  insert into public.spogomi_participants (id, event_id, division_id, team_id, external_reference, registration_status, attendance_status)
  values (v_participant_casual, v_event_id, v_casual_id, v_team_casual, 'smoke-participant', 'registered', 'present');

  insert into public.spogomi_official_rankings (
    event_id, division_id, team_id, kind, rank, status, team_eligible,
    decision_version, source_reference, source_snapshot, decided_by_clerk_id
  ) values (
    v_event_id, v_casual_id, v_team_casual, 'points', 1, 'certified', true,
    'smoke-ranking-v1', 'smoke:ranking:v1', '{}'::jsonb, 'spogomi-db-smoke'
  );

  insert into public.spogomi_action_consolidations (
    event_id, action_id, consolidation_key, projection_version,
    projection_revision, source_hash, mapping_version, status, is_current,
    teams_included, participants_present, source_submission_ids, projection,
    published_by_clerk_id
  ) values (
    v_event_id, v_action_id, 'smoke-consolidation', 'smoke-v1', 1,
    repeat('a', 64), 'smoke-v1', 'published', true, 1, 1, '[]'::jsonb,
    '{"readyForPublication":true}'::jsonb, 'spogomi-db-smoke'
  );

  insert into public.spogomi_recognition_attestations (
    event_id, division_id, participant_id, kind, status, evidence_reference,
    certified_by_clerk_id, certified_at, certification_version
  ) values (
    v_event_id, v_casual_id, v_participant_casual, 'collector', 'certified',
    'smoke:evidence', 'spogomi-db-smoke', now(), 'smoke-v1'
  );

  insert into public.spogomi_collection_awards (
    user_id, event_id, division_id, badge_type_id, event_year,
    event_local_date, event_timezone, proof_reference, certification_reference,
    ranking_version, status
  ) values (
    'smoke-user', v_event_id, v_casual_id, 'spogomi_points_gold', 2026,
    current_date, 'Europe/Paris', 'smoke:proof', 'smoke:cert', 'smoke-ranking-v1', 'active'
  );

  begin
    insert into public.spogomi_teams (event_id, team_number, public_name)
    values (v_event_id, 2, 'Ambiguous team');
    raise exception 'an ambiguous mixed team insert was accepted';
  exception when others then
    if position('mixed edition requires an explicit division_id' in sqlerrm) = 0 then raise; end if;
  end;

  begin
    perform public.spogomi_save_team_submission_for_division(
      v_event_id, v_world_cup_id, v_team_casual, null, 'smoke-key', 'draft',
      'pending', null, null, '[]'::jsonb, 'team_session'
    );
    raise exception 'a team from another division was accepted';
  exception when others then
    if position('division is forbidden' in lower(sqlerrm)) = 0 then raise; end if;
  end;

  begin
    perform public.spogomi_move_participant_to_team_for_division(
      v_event_id, v_world_cup_id, gen_random_uuid(), v_team_casual, 0, 'smoke'
    );
    raise exception 'a cross-division participant move was accepted';
  exception when others then
    if position('division' in lower(sqlerrm)) = 0 then raise; end if;
  end;

  select id into v_decision_id from public.spogomi_set_team_closure_decision(
    v_event_id, v_casual_id, v_team_casual, 'forfeit', false, 'excluded',
    'Absent au contrôle de départ', 1, 'spogomi-db-smoke'
  );
  if v_decision_id is null then raise exception 'closure decision was not recorded'; end if;
  perform public.spogomi_set_team_closure_decision(
    v_event_id, v_casual_id, v_team_casual, 'forfeit', false, 'excluded',
    'Absent au contrôle de départ', 1, 'spogomi-db-smoke'
  );
  perform public.spogomi_set_team_closure_decision(
    v_event_id, v_casual_id, v_team_casual, 'disqualified', false, 'eligible',
    'Décision arbitrale révisée', 2, 'spogomi-db-smoke'
  );
  if (select count(*) from public.spogomi_team_closure_decisions where event_id = v_event_id and division_id = v_casual_id and team_id = v_team_casual) <> 2 then
    raise exception 'closure replay did not preserve decision history';
  end if;
  if (select count(*) from public.spogomi_team_closure_decisions where event_id = v_event_id and division_id = v_casual_id and team_id = v_team_casual and is_current) <> 1 then
    raise exception 'closure replay did not keep one current decision';
  end if;
  if (select count(*) from public.spogomi_official_rankings where event_id = v_event_id and division_id = v_casual_id and team_id = v_team_casual and status = 'certified') <> 0 then
    raise exception 'closure correction did not revoke the official ranking';
  end if;
  if (select count(*) from public.spogomi_official_ranking_history where event_id = v_event_id and division_id = v_casual_id and team_id = v_team_casual and action = 'revoked') <> 1 then
    raise exception 'closure correction did not preserve ranking revocation history';
  end if;
  if (select count(*) from public.spogomi_recognition_attestations where event_id = v_event_id and division_id = v_casual_id and participant_id = v_participant_casual and status = 'revoked') <> 1 then
    raise exception 'closure correction did not revoke the collector attestation';
  end if;
  if (select count(*) from public.spogomi_collection_awards where event_id = v_event_id and division_id = v_casual_id and user_id = 'smoke-user' and status = 'replaced') <> 1 then
    raise exception 'closure correction did not replace the ranking award';
  end if;
  if (select count(*) from public.spogomi_action_consolidations where event_id = v_event_id and is_current) <> 0 then
    raise exception 'closure correction left a stale environmental consolidation current';
  end if;

  begin
    perform public.spogomi_set_team_closure_decision(
      v_event_id, v_world_cup_id, v_team_casual, 'absent', false, 'excluded',
      'Mauvaise division', 1, 'spogomi-db-smoke'
    );
    raise exception 'a cross-division closure decision was accepted';
  exception when others then
    if position('outside the selected division' in lower(sqlerrm)) = 0 then raise; end if;
  end;
end;
$$;

rollback;
