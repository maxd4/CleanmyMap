-- Executed PostgreSQL smoke contract for one mixed parent edition.
-- The transaction is rolled back: it creates no durable fixture or business data.
begin;

select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_independent_action_id uuid := gen_random_uuid();
  v_conversion_action_id uuid := gen_random_uuid();
  v_reverse_conversion_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_conversion_event_id uuid := gen_random_uuid();
  v_reverse_conversion_event_id uuid := gen_random_uuid();
  v_casual_id uuid := md5(v_event_id::text || ':casual')::uuid;
  v_world_cup_id uuid := md5(v_event_id::text || ':world_cup')::uuid;
  v_team_casual uuid := gen_random_uuid();
  v_team_world_cup uuid := gen_random_uuid();
  v_participant_casual uuid := gen_random_uuid();
  v_participant_casual_two uuid := gen_random_uuid();
  v_count integer;
  v_decision_id uuid;
  v_metadata jsonb;
begin
  insert into public.actions (id, created_by_clerk_id, action_date, location_label, waste_kg, cigarette_butts, volunteers_count, spogomi_total_mass_grams, spogomi_megots_mass_grams, spogomi_megots_count, spogomi_projection_source_hash, spogomi_projection_version, notes)
  values (v_action_id, 'spogomi-db-smoke', current_date, 'SPOGOMI smoke', 12.5, 42, 7, 12500, 10, 42, repeat('a', 64), 'smoke-v1', 'owned by SPOGOMI');
  insert into public.actions (id, created_by_clerk_id, action_date, location_label, waste_kg, cigarette_butts, volunteers_count, notes)
  values (v_independent_action_id, 'spogomi-db-smoke', current_date, 'Independent smoke', 8.5, 9, 3, 'independent measurement');

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

  select public.spogomi_update_event_metadata(
    v_event_id, 0, 'spogomi-db-smoke', 'SPOGOMI mixed smoke updated',
    'SPOGOMI smoke', now(), null, 'mixed', '{}'::jsonb, 'private', 'hidden'
  ) into v_metadata;
  if v_metadata->>'mode' <> 'mixed' or v_metadata->>'name' <> 'SPOGOMI mixed smoke updated' then
    raise exception 'an existing mixed edition did not preserve its mode during metadata update';
  end if;

  begin
    perform public.spogomi_update_event_metadata(
      v_event_id, 0, 'spogomi-db-smoke', 'invalid casual zero', 'SPOGOMI smoke', now(), null,
      'mixed', '{"casual":{"minMembers":0,"maxMembers":4}}'::jsonb, 'private', 'hidden'
    );
    raise exception 'mixed RPC accepted a zero Casual bound';
  exception when others then
    if position('casual team-size bounds' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  begin
    perform public.spogomi_update_event_metadata(
      v_event_id, 0, 'spogomi-db-smoke', 'invalid casual negative', 'SPOGOMI smoke', now(), null,
      'mixed', '{"casual":{"minMembers":-1,"maxMembers":4}}'::jsonb, 'private', 'hidden'
    );
    raise exception 'mixed RPC accepted a negative Casual bound';
  exception when others then
    if position('casual team-size bounds' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  begin
    perform public.spogomi_update_event_metadata(
      v_event_id, 0, 'spogomi-db-smoke', 'invalid casual decimal', 'SPOGOMI smoke', now(), null,
      'mixed', '{"casual":{"minMembers":1.5,"maxMembers":4}}'::jsonb, 'private', 'hidden'
    );
    raise exception 'mixed RPC accepted a fractional Casual bound';
  exception when others then
    if position('casual team-size bounds' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  begin
    perform public.spogomi_update_event_metadata(
      v_event_id, 0, 'spogomi-db-smoke', 'invalid casual order', 'SPOGOMI smoke', now(), null,
      'mixed', '{"casual":{"minMembers":4,"maxMembers":2}}'::jsonb, 'private', 'hidden'
    );
    raise exception 'mixed RPC accepted incoherent Casual bounds';
  exception when others then
    if position('casual team-size bounds' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  select public.spogomi_update_event_metadata(
    v_event_id, 0, 'spogomi-db-smoke', 'SPOGOMI mixed bounded', 'SPOGOMI smoke', now(), null,
    'mixed', '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, 'private', 'hidden'
  ) into v_metadata;
  if (v_metadata->>'composition_revision')::bigint <> 1 then
    raise exception 'valid mixed Casual bounds did not advance the revision';
  end if;

  insert into public.actions (id, created_by_clerk_id, action_date, location_label, waste_kg, cigarette_butts, volunteers_count)
  values (v_conversion_action_id, 'spogomi-db-smoke', current_date, 'SPOGOMI conversion smoke', 1, 1, 1);
  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode,
    starts_at, regulation_version, regulation_status, regulation_config,
    team_size_config, creation_state, public_visibility
  ) values (
    v_conversion_event_id, v_conversion_action_id, 'spogomi-db-smoke', 'SPOGOMI casual conversion smoke',
    'SPOGOMI smoke', 'casual', now(), 'pending', 'incomplete', '{}'::jsonb,
    '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, 'event_pending', 'private'
  );
  begin
    perform public.spogomi_update_event_metadata(
      v_conversion_event_id, 0, 'spogomi-db-smoke', 'SPOGOMI conversion smoke',
      'SPOGOMI smoke', now(), null, 'mixed', '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, 'private', 'hidden'
    );
    raise exception 'a non-mixed edition was converted to mixed by the metadata RPC';
  exception when others then
    if position('converting an existing spogomi event to mixed is not allowed' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  if (select mode from public.spogomi_events where id = v_conversion_event_id) <> 'casual' then
    raise exception 'a refused mixed conversion mutated the source edition';
  end if;

  begin
    perform public.spogomi_update_event_metadata(
      v_conversion_event_id, 0, 'spogomi-db-smoke', 'SPOGOMI Casual to World Cup',
      'SPOGOMI smoke', now(), null, 'world_cup', '{}'::jsonb, 'private', 'hidden'
    );
    raise exception 'a Casual edition was converted to World Cup by the metadata RPC';
  exception when others then
    if position('changing the mode of an existing spogomi event is not allowed' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  if (select mode from public.spogomi_events where id = v_conversion_event_id) <> 'casual' then
    raise exception 'a refused Casual to World Cup conversion mutated the source edition';
  end if;

  perform public.spogomi_ensure_parent_divisions(v_conversion_event_id, 'casual');
  begin
    update public.spogomi_divisions
       set division_type = 'world_cup', division_key = 'world_cup'
     where event_id = v_conversion_event_id
       and division_type = 'casual';
    set constraints spogomi_divisions_parent_integrity immediate;
    raise exception 'a Casual parent accepted a World Cup division';
  exception when others then
    if position('requires exactly one casual division' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  if (select division_type from public.spogomi_divisions where event_id = v_conversion_event_id) <> 'casual' then
    raise exception 'a rejected parent/division mismatch mutated the division';
  end if;
  begin
    perform set_config('spogomi.composition_write_context', 'event_metadata_update', true);
    update public.spogomi_events set mode = 'world_cup' where id = v_conversion_event_id;
    set constraints spogomi_events_parent_integrity immediate;
    raise exception 'a Casual parent accepted a direct World Cup mode update';
  exception when others then
    if position('mode of an existing event is immutable' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  if (select mode from public.spogomi_events where id = v_conversion_event_id) <> 'casual' then
    raise exception 'a rejected direct mode update mutated the parent edition';
  end if;

  begin
    perform set_config('spogomi.composition_write_context', 'event_metadata_update', true);
    update public.spogomi_events set mode = 'world_cup' where id = v_conversion_event_id;
    update public.spogomi_divisions
       set division_type = 'world_cup', division_key = 'world_cup'
     where event_id = v_conversion_event_id
       and division_type = 'casual';
    set constraints spogomi_events_parent_integrity, spogomi_divisions_parent_integrity immediate;
    raise exception 'a coordinated parent/division mode conversion was accepted';
  exception when others then
    if position('mode of an existing event is immutable' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  if (select mode from public.spogomi_events where id = v_conversion_event_id) <> 'casual'
     or (select division_type from public.spogomi_divisions where event_id = v_conversion_event_id) <> 'casual' then
    raise exception 'a rejected coordinated conversion mutated the parent or division';
  end if;

  insert into public.actions (id, created_by_clerk_id, action_date, location_label, waste_kg, cigarette_butts, volunteers_count)
  values (v_reverse_conversion_action_id, 'spogomi-db-smoke', current_date, 'SPOGOMI reverse conversion smoke', 1, 1, 1);
  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode,
    starts_at, regulation_version, regulation_status, regulation_config,
    team_size_config, creation_state, public_visibility
  ) values (
    v_reverse_conversion_event_id, v_reverse_conversion_action_id, 'spogomi-db-smoke', 'SPOGOMI World Cup conversion smoke',
    'SPOGOMI smoke', 'world_cup', now(), 'pending', 'incomplete', '{}'::jsonb,
    '{}'::jsonb, 'event_pending', 'private'
  );
  perform public.spogomi_ensure_parent_divisions(v_reverse_conversion_event_id, 'world_cup');
  begin
    perform public.spogomi_update_event_metadata(
      v_reverse_conversion_event_id, 0, 'spogomi-db-smoke', 'SPOGOMI reverse conversion smoke',
      'SPOGOMI smoke', now(), null, 'casual', '{}'::jsonb, 'private', 'hidden'
    );
    raise exception 'a World Cup edition was converted to Casual by the metadata RPC';
  exception when others then
    if position('changing the mode of an existing spogomi event is not allowed' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  if (select mode from public.spogomi_events where id = v_reverse_conversion_event_id) <> 'world_cup' then
    raise exception 'a refused reverse mode conversion mutated the source edition';
  end if;

  insert into public.spogomi_teams (id, event_id, division_id, team_number, public_name)
  values
    (v_team_casual, v_event_id, v_casual_id, 1, 'Casual 1'),
    (v_team_world_cup, v_event_id, v_world_cup_id, 1, 'World Cup 1');

  insert into public.spogomi_participants (id, event_id, division_id, team_id, external_reference, registration_status, attendance_status)
  values
    (v_participant_casual, v_event_id, v_casual_id, v_team_casual, 'smoke-participant', 'registered', 'present'),
    (v_participant_casual_two, v_event_id, v_casual_id, v_team_casual, 'smoke-participant-two', 'registered', 'present');

  begin
    perform public.spogomi_update_event_metadata(
      v_event_id, 1, 'spogomi-db-smoke', 'invalid bounded Casual', 'SPOGOMI smoke', now(), null,
      'mixed', '{"casual":{"minMembers":2,"maxMembers":1}}'::jsonb, 'private', 'hidden'
    );
    raise exception 'metadata RPC accepted a Casual bound smaller than an existing team';
  exception when check_violation then
    if position('casual team is outside the event bounds' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  if (select team_size_config #>> '{casual,maxMembers}' from public.spogomi_events where id = v_event_id) <> '4' then
    raise exception 'a rejected Casual bound update mutated the event';
  end if;

  select public.spogomi_update_event_metadata(
    v_event_id, 1, 'spogomi-db-smoke', 'SPOGOMI mixed visible', 'SPOGOMI smoke', now(), null,
    'mixed', '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, 'published', 'hidden'
  ) into v_metadata;
  if v_metadata->>'mode' <> 'mixed' or v_metadata->>'public_visibility' <> 'published'
     or (v_metadata->>'composition_revision')::bigint <> 1 then
    raise exception 'mixed visibility update did not preserve mode';
  end if;

  begin
    perform public.spogomi_update_event_metadata(
      v_event_id, 0, 'spogomi-db-smoke', 'stale metadata revision', 'SPOGOMI smoke', now(), null,
      'mixed', '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, 'published', 'hidden'
    );
    raise exception 'an obsolete metadata revision was accepted';
  exception when serialization_failure then
    null;
  end;

  begin
    update public.spogomi_events
       set regulation_config = '{"changed":true}'::jsonb
     where id = v_event_id;
    raise exception 'an unversioned regulation change was accepted';
  exception when check_violation then
    if position('requires a new version' in lower(sqlerrm)) = 0 then raise; end if;
  end;
  update public.spogomi_events
     set regulation_version = 'smoke-regulation-v2',
         regulation_config = '{"changed":true}'::jsonb
   where id = v_event_id;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  begin
    perform public.spogomi_update_event_metadata(
      v_event_id, 1, 'spogomi-db-smoke', 'unauthorized metadata mutation', 'SPOGOMI smoke', now(), null,
      'mixed', '{"casual":{"minMembers":2,"maxMembers":4}}'::jsonb, 'private', 'hidden'
    );
    raise exception 'an authenticated caller updated SPOGOMI metadata';
  exception when insufficient_privilege then
    null;
  end;
  perform set_config('request.jwt.claim.role', 'service_role', true);
  if (select name from public.spogomi_events where id = v_event_id) <> 'SPOGOMI mixed visible' then
    raise exception 'an unauthorized metadata attempt mutated the event';
  end if;

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
  if exists (
    select 1 from public.actions
     where id = v_action_id
       and (waste_kg is not null or cigarette_butts is not null or volunteers_count is not null
         or spogomi_total_mass_grams is not null or spogomi_megots_mass_grams is not null
         or spogomi_megots_count is not null or spogomi_projection_source_hash is not null
         or spogomi_projection_version is not null)
  ) then
    raise exception 'closure correction left hash-owned SPOGOMI measures visible';
  end if;
  if not exists (
    select 1 from public.actions
     where id = v_independent_action_id
       and waste_kg = 8.5 and cigarette_butts = 9 and volunteers_count = 3
  ) then
    raise exception 'closure correction modified independent action measures';
  end if;

  if ((timestamptz '2026-06-30 23:30:00+00' at time zone 'Europe/Paris')::date <> date '2026-07-01')
     or ((timestamptz '2026-07-01 00:30:00+00' at time zone 'Europe/Paris')::date <> date '2026-07-01') then
    raise exception 'official timezone civil-date boundary is incorrect';
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

do $$
begin
  raise notice 'EXECUTED_DB_CONTRACT: SPOGOMI mixed-division closure and replay contract passed';
end;
$$;

rollback;
