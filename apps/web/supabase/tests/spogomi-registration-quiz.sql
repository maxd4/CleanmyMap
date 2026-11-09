-- Executed PostgreSQL contract for the server-owned SPOGOMI registration quiz.
-- The synthetic fixture is rolled back and never becomes an event or proof.

begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_division_id uuid := md5(v_event_id::text || ':casual')::uuid;
  v_category_id uuid := gen_random_uuid();
  v_user_id text := 'spogomi-quiz-db-user';
  v_definition jsonb;
  v_questions jsonb;
  v_answers jsonb := '{}'::jsonb;
  v_submission jsonb;
  v_repeat_submission jsonb;
  v_revision bigint;
  v_question jsonb;
begin
  insert into public.actions (id, created_by_clerk_id, action_date, location_label,
    waste_kg, cigarette_butts, volunteers_count)
  values (v_action_id, 'spogomi-quiz-db-owner', current_date,
    'SPOGOMI quiz SQL contract', 1, 1, 1);

  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode, state,
    starts_at, regulation_version, regulation_status, regulation_source_reference,
    regulation_config, team_size_config, public_visibility
  ) values (
    v_event_id, v_action_id, 'spogomi-quiz-db-owner',
    'SPOGOMI registration quiz SQL contract', 'Rendez-vous vérifié', 'casual',
    'draft', now() + interval '1 day', 'event-v1', 'complete',
    'https://example.invalid/official-regulation',
    jsonb_build_object('registrationPolicy', jsonb_build_object(
      'capacity', 10,
      'safetyInstructions', 'Rester dans le périmètre, se déplacer prudemment et ne jamais ramasser de déchet interdit.',
      'safetyInstructionsVerified', true,
      'organizationContact', 'Contact officiel CleanMyMap — canal organisation',
      'organizationContactVerified', true,
      'assistanceProcedure', 'Contacter l’organisation via le canal officiel.',
      'assistanceProcedureVerified', true,
      'minorsApplicable', false,
      'directRegistrationOpen', true,
      'worldCupDirectRegistrationAllowed', true
    )),
    '{"casual":{"minMembers":1,"maxMembers":4}}'::jsonb, 'published'
  );
  perform public.spogomi_ensure_parent_divisions(v_event_id, 'casual');

  update public.spogomi_divisions
     set regulation_version = 'division-v1',
         regulation_status = 'complete',
         regulation_source_reference = 'https://example.invalid/division-regulation',
         regulation_config = jsonb_build_object(
           'rounding', jsonb_build_object('decimals', 2, 'mode', 'half_up'),
           'eligibility', jsonb_build_object('requiresAllCategories', true, 'minimumPresentParticipants', 1),
           'tiebreakers', jsonb_build_array('sporting_score')
         ),
         team_size_config = '{"casual":{"minMembers":1,"maxMembers":4}}'::jsonb
   where id = v_division_id and event_id = v_event_id;

  insert into public.spogomi_category_rules (
    id, event_id, division_id, regulation_version, code, label,
    measurement_kind, unit, coefficient, coefficient_status,
    environmental_category_slug, display_order, is_complete
  ) values (
    v_category_id, v_event_id, v_division_id, 'division-v1', 'plastic',
    'Plastique', 'mass', 'grams', 1, 'confirmed', 'plastic', 1, true
  );
  insert into public.spogomi_environment_category_mappings (
    event_id, division_id, category_rule_id, mapping_version, category_code,
    environmental_category_slug, source_field, source_unit, target_unit,
    unit_factor_to_target, mapping_status
  ) values (
    v_event_id, v_division_id, v_category_id, 'spogomi-cleanmymap-v1',
    'plastic', 'plastic', 'mass_grams', 'grams', 'grams', 1, 'mapped'
  );
  insert into public.spogomi_event_routes (
    event_id, action_id, file_name, point_count, reference_distance_km,
    inferred_topology, geometry_geojson, imported_by_clerk_id
  ) values (
    v_event_id, v_action_id, 'official-route.gpx', 2, 1.2, 'point_to_point',
    '{"type":"LineString","coordinates":[[2,48],[2.01,48.01]]}'::jsonb,
    'spogomi-quiz-db-owner'
  );
  insert into public.spogomi_field_operations (
    event_id, division_id, timezone_name, regulation_version,
    official_start_at, collection_limit_at, sorting_limit_at,
    weighing_start_at, weighing_end_at, updated_by_clerk_id
  ) values (
    v_event_id, v_division_id, 'Europe/Paris', 'division-v1',
    now() + interval '1 day', now() + interval '1 day 1 hour',
    now() + interval '1 day 2 hours', now() + interval '1 day 2 hours',
    now() + interval '1 day 3 hours', 'spogomi-quiz-db-owner'
  );

  -- Before the proof exists, the admission owner rejects the request and the
  -- quiz projection exposes no answer key.
  v_definition := public.spogomi_registration_quiz_definition(v_event_id, v_division_id);
  if coalesce((v_definition ->> 'available')::boolean, false) is not true then
    raise exception 'a complete published quiz definition was not available';
  end if;
  v_questions := v_definition -> 'questions';
  if jsonb_array_length(v_questions) <> 6 then
    raise exception 'the contextual quiz did not contain all required topics';
  end if;
  if (select public.spogomi_registration_quiz(v_event_id, v_division_id) #> '{questions,0,correctOptionId}') is not null then
    raise exception 'the public quiz projection exposed the answer key';
  end if;

  select public.spogomi_submit_registration_quiz(
    v_event_id, v_division_id, v_user_id, v_definition ->> 'quizVersion',
    '{}'::jsonb
  ) into v_submission;
  if coalesce((v_submission ->> 'passed')::boolean, true) is true
     or (v_submission ->> 'proofId') is not null then
    raise exception 'a critical quiz failure created a proof';
  end if;

  begin
    perform public.create_spogomi_admission_request(
      v_event_id, null, v_user_id, 'registration', v_division_id,
      'attempt without proof'
    );
    raise exception 'registration without quiz proof was accepted';
  exception when others then
    if sqlerrm <> 'spogomi_direct_registration_closed' then
      raise;
    end if;
  end;

  select composition_revision into v_revision
    from public.spogomi_events where id = v_event_id;
  perform public.spogomi_open_registration(v_event_id, v_revision, 'spogomi-quiz-db-owner');

  begin
    perform public.create_spogomi_admission_request(
      v_event_id, null, v_user_id, 'registration', v_division_id,
      'attempt without proof after opening'
    );
    raise exception 'registration without quiz proof was accepted after opening';
  exception when others then
    if sqlerrm <> 'spogomi_registration_quiz_required' then
      raise;
    end if;
  end;

  for v_question in select value from jsonb_array_elements(v_questions) as item(value) loop
    v_answers := v_answers || jsonb_build_object(v_question ->> 'id', v_question ->> 'correctOptionId');
  end loop;
  select public.spogomi_submit_registration_quiz(
    v_event_id, v_division_id, v_user_id, v_definition ->> 'quizVersion',
    v_answers, 'yes', 'Participation à une cleanwalk déclarée uniquement à titre pédagogique.'
  ) into v_submission;
  if coalesce((v_submission ->> 'passed')::boolean, false) is not true
     or (v_submission ->> 'proofId') is null then
    raise exception 'correct contextual quiz answers did not create a server proof';
  end if;

  select public.spogomi_submit_registration_quiz(
    v_event_id, v_division_id, v_user_id, v_definition ->> 'quizVersion',
    v_answers, 'yes', 'Retry idempotent du questionnaire.'
  ) into v_repeat_submission;
  if (v_repeat_submission ->> 'proofId') is null
     or (select count(*) from public.spogomi_registration_quiz_proofs
          where event_id = v_event_id and division_id = v_division_id and clerk_id = v_user_id) <> 1 then
    raise exception 'repeated successful submission was not idempotent';
  end if;

  if not exists (
    select 1 from public.spogomi_registration_quiz_proofs
     where event_id = v_event_id and division_id = v_division_id
       and clerk_id = v_user_id and quiz_version = v_definition ->> 'quizVersion'
  ) then
    raise exception 'the proof is not scoped to account, event, division and version';
  end if;

  if not exists (
    select 1 from public.create_spogomi_admission_request(
      v_event_id, null, v_user_id, 'registration', v_division_id,
      'registration after verified quiz'
    )
  ) then
    raise exception 'registration with a valid quiz proof was not accepted';
  end if;
  if (select count(*) from public.spogomi_team_join_requests
       where event_id = v_event_id and requester_clerk_id = v_user_id
         and request_kind = 'registration') <> 1 then
    raise exception 'registration request was not persisted exactly once';
  end if;

  -- A different account cannot reuse the first account's proof.
  begin
    perform public.create_spogomi_admission_request(
      v_event_id, null, 'spogomi-quiz-other-user', 'registration', v_division_id,
      'attempt with another account'
    );
    raise exception 'another account reused the quiz proof';
  exception when others then
    if sqlerrm <> 'spogomi_registration_quiz_required' then
      raise;
    end if;
  end;
end;
$$;

do $$
begin
  raise notice 'EXECUTED_DB_CONTRACT: SPOGOMI registration quiz proof and admission gate passed';
end;
$$;

rollback;
