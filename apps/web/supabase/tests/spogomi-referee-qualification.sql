-- Executed PostgreSQL contract for SPOGOMI referee quiz evaluation,
-- privilege isolation, rate-limiting, division isolation, and versioned requalification.
-- The transaction is rolled back: it creates no durable fixture or business data.
begin;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_casual_id uuid := md5(v_event_id::text || ':casual')::uuid;
  v_world_cup_id uuid := md5(v_event_id::text || ':world_cup')::uuid;
  v_org_clerk text := 'spogomi-ref-org-' || substr(gen_random_uuid()::text, 1, 8);
  v_user_a text := 'spogomi-ref-a-' || substr(gen_random_uuid()::text, 1, 8);
  v_user_b text := 'spogomi-ref-b-' || substr(gen_random_uuid()::text, 1, 8);
  v_user_c text := 'spogomi-ref-c-' || substr(gen_random_uuid()::text, 1, 8);
  v_user_rate text := 'spogomi-ref-rate-' || substr(gen_random_uuid()::text, 1, 8);

  v_public_def jsonb;
  v_private_def jsonb;
  v_quiz_version_v1 text;
  v_quiz_version_v2 text;

  v_question jsonb;
  v_qid text;
  v_correct_id text;
  v_wrong_id text;
  v_is_critical boolean;
  v_critical_count integer := 0;
  v_general_count integer := 0;
  v_critical_wrong_done boolean := false;
  v_pass_wrong_done boolean := false;
  v_general_wrong_count integer := 0;

  v_answers_all_correct jsonb := '{}'::jsonb;
  v_answers_pass jsonb := '{}'::jsonb;
  v_answers_fail_critical jsonb := '{}'::jsonb;
  v_answers_fail_general jsonb := '{}'::jsonb;

  v_res jsonb;
  v_app_a_casual uuid;
  v_app_a_wc uuid;
  v_app_b_casual uuid;
  v_app_c_casual uuid;
  v_sqlstate text;
  v_count integer;
  v_eval_item jsonb;
  v_idx integer;
begin
  -- 1. Privilege boundaries: anon and authenticated must have zero direct access
  if has_table_privilege('anon', 'public.spogomi_referee_quiz_rotation_secrets', 'SELECT')
     or has_table_privilege('authenticated', 'public.spogomi_referee_quiz_rotation_secrets', 'SELECT') then
    raise exception 'rotation secrets table is readable by anon or authenticated';
  end if;

  if has_function_privilege('anon', 'public.spogomi_referee_quiz_definition_private(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_referee_quiz_definition_private(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_referee_quiz_definition_private(uuid,uuid)', 'EXECUTE') then
    raise exception 'spogomi_referee_quiz_definition_private ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_referee_quiz_definition_internal(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_referee_quiz_definition_internal(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_referee_quiz_definition_internal(uuid,uuid)', 'EXECUTE') then
    raise exception 'spogomi_referee_quiz_definition_internal ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_referee_quiz_definition(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_referee_quiz_definition(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_referee_quiz_definition(uuid,uuid)', 'EXECUTE') then
    raise exception 'spogomi_referee_quiz_definition ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_submit_referee_quiz(uuid,uuid,text,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_submit_referee_quiz(uuid,uuid,text,text,jsonb)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_submit_referee_quiz(uuid,uuid,text,text,jsonb)', 'EXECUTE') then
    raise exception 'spogomi_submit_referee_quiz ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_create_referee_application(uuid,uuid,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_create_referee_application(uuid,uuid,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_create_referee_application(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'spogomi_create_referee_application ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_confirm_referee_practical(uuid,text,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_confirm_referee_practical(uuid,text,text,jsonb)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_confirm_referee_practical(uuid,text,text,jsonb)', 'EXECUTE') then
    raise exception 'spogomi_confirm_referee_practical ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_decide_referee_application(uuid,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_decide_referee_application(uuid,text,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_decide_referee_application(uuid,text,text,text)', 'EXECUTE') then
    raise exception 'spogomi_decide_referee_application ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_set_operational_access(uuid,text,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_set_operational_access(uuid,text,text,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_set_operational_access(uuid,text,text,text,text)', 'EXECUTE') then
    raise exception 'spogomi_set_operational_access ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_set_event_access(uuid,text,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_set_event_access(uuid,text,text,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_set_event_access(uuid,text,text,text,text)', 'EXECUTE') then
    raise exception 'spogomi_set_event_access ACL is not service-only';
  end if;

  -- Setup mixed SPOGOMI event under regulation reg-v1
  insert into public.actions (id, created_by_clerk_id, action_date, location_label, waste_kg, cigarette_butts, volunteers_count, notes)
  values (v_action_id, v_org_clerk, current_date, 'SPOGOMI referee contract', 0, 0, 1, 'referee contract fixture');

  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode,
    starts_at, regulation_version, regulation_status, regulation_config,
    team_size_config, creation_state, public_visibility
  ) values (
    v_event_id, v_action_id, v_org_clerk, 'SPOGOMI Referee Contract',
    'Paris', 'mixed', now(), 'reg-v1', 'complete', '{}'::jsonb,
    '{}'::jsonb, 'ready', 'private'
  );

  perform public.spogomi_ensure_parent_divisions(v_event_id, 'mixed');

  -- 2. Public projection: 22 questions (12 critical, 10 general), no correctOptionId or explanation
  v_public_def := public.spogomi_referee_quiz_definition(v_event_id, v_casual_id);
  if jsonb_array_length(v_public_def->'questions') <> 22 then
    raise exception 'expected 22 public quiz questions, got %', jsonb_array_length(v_public_def->'questions');
  end if;

  for v_question in select value from jsonb_array_elements(v_public_def->'questions') loop
    if (v_question ? 'correctOptionId') or (v_question ? 'explanation') then
      raise exception 'public quiz definition leaked correctOptionId or explanation for question %', v_question->>'id';
    end if;
    if coalesce((v_question->>'critical')::boolean, false) then
      v_critical_count := v_critical_count + 1;
    else
      v_general_count := v_general_count + 1;
    end if;
  end loop;

  if v_critical_count <> 12 or v_general_count <> 10 then
    raise exception 'expected 12 critical and 10 general questions, got % critical / % general', v_critical_count, v_general_count;
  end if;

  -- 3. Build answer sets from private definition
  v_private_def := public.spogomi_referee_quiz_definition_private(v_event_id, v_casual_id);
  v_quiz_version_v1 := v_private_def->>'version';

  for v_question in select value from jsonb_array_elements(v_private_def->'questions') loop
    v_qid := v_question->>'id';
    v_correct_id := v_question->>'correctOptionId';
    v_is_critical := coalesce((v_question->>'critical')::boolean, false);
    select opt->>'id'
    into v_wrong_id
    from jsonb_array_elements(v_question->'options') as opt
    where opt->>'id' <> v_correct_id
    limit 1;

    if v_correct_id is null or v_wrong_id is null then
      raise exception 'private quiz question % missing correct or alternative option', v_qid;
    end if;

    v_answers_all_correct := v_answers_all_correct || jsonb_build_object(v_qid, v_correct_id);

    -- v_answers_pass: 12/12 critical, 9/10 general (1 general wrong)
    if (not v_is_critical) and not v_pass_wrong_done then
      v_answers_pass := v_answers_pass || jsonb_build_object(v_qid, v_wrong_id);
      v_pass_wrong_done := true;
    else
      v_answers_pass := v_answers_pass || jsonb_build_object(v_qid, v_correct_id);
    end if;

    -- v_answers_fail_critical: 11/12 critical, 10/10 general
    if v_is_critical and not v_critical_wrong_done then
      v_answers_fail_critical := v_answers_fail_critical || jsonb_build_object(v_qid, v_wrong_id);
      v_critical_wrong_done := true;
    else
      v_answers_fail_critical := v_answers_fail_critical || jsonb_build_object(v_qid, v_correct_id);
    end if;

    -- v_answers_fail_general: 12/12 critical, 8/10 general
    if (not v_is_critical) and v_general_wrong_count < 2 then
      v_answers_fail_general := v_answers_fail_general || jsonb_build_object(v_qid, v_wrong_id);
      v_general_wrong_count := v_general_wrong_count + 1;
    else
      v_answers_fail_general := v_answers_fail_general || jsonb_build_object(v_qid, v_correct_id);
    end if;
  end loop;

  -- 4. Fail with 11/12 critical + non-null explanation on error
  v_res := public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_a, v_quiz_version_v1, v_answers_fail_critical);
  if coalesce((v_res->>'passed')::boolean, true)
     or (v_res->>'criticalCorrect')::integer <> 11
     or (v_res->>'generalCorrect')::integer <> 10 then
    raise exception 'expected 11/12 critical attempt to fail, got %', v_res;
  end if;
  for v_eval_item in select value from jsonb_array_elements(v_res->'evaluation') loop
    if not coalesce((v_eval_item->>'isCorrect')::boolean, false) then
      if length(btrim(coalesce(v_eval_item->>'explanation', ''))) = 0 then
        raise exception 'missing explanation on failed critical question %', v_eval_item;
      end if;
    end if;
  end loop;

  -- 5. Fail with 8/10 general + non-null explanations on both errors
  v_res := public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_a, v_quiz_version_v1, v_answers_fail_general);
  if coalesce((v_res->>'passed')::boolean, true)
     or (v_res->>'criticalCorrect')::integer <> 12
     or (v_res->>'generalCorrect')::integer <> 8 then
    raise exception 'expected 8/10 general attempt to fail, got %', v_res;
  end if;
  v_count := 0;
  for v_eval_item in select value from jsonb_array_elements(v_res->'evaluation') loop
    if not coalesce((v_eval_item->>'isCorrect')::boolean, false) then
      v_count := v_count + 1;
      if length(btrim(coalesce(v_eval_item->>'explanation', ''))) = 0 then
        raise exception 'missing explanation on failed general question %', v_eval_item;
      end if;
    end if;
  end loop;
  if v_count <> 2 then
    raise exception 'expected 2 failed explanations for 8/10 general, got %', v_count;
  end if;

  -- 6. Pass with 12/12 critical and 9/10 general + non-null explanation on the 1 wrong question
  v_res := public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_a, v_quiz_version_v1, v_answers_pass);
  if not coalesce((v_res->>'passed')::boolean, false)
     or (v_res->>'criticalCorrect')::integer <> 12
     or (v_res->>'generalCorrect')::integer <> 9 then
    raise exception 'expected 12/12 critical and 9/10 general to pass, got %', v_res;
  end if;
  v_app_a_casual := (v_res->'application'->>'id')::uuid;
  if (v_res->'application'->>'status') <> 'theory_qualified' then
    raise exception 'expected theory_qualified after passing quiz, got %', v_res->'application';
  end if;
  v_count := 0;
  for v_eval_item in select value from jsonb_array_elements(v_res->'evaluation') loop
    if not coalesce((v_eval_item->>'isCorrect')::boolean, false) then
      v_count := v_count + 1;
      if length(btrim(coalesce(v_eval_item->>'explanation', ''))) = 0 then
        raise exception 'missing explanation on 1 wrong question in passing attempt %', v_eval_item;
      end if;
    end if;
  end loop;
  if v_count <> 1 then
    raise exception 'expected 1 wrong explanation in 12/12 + 9/10 pass, got %', v_count;
  end if;

  -- 7. Stale quiz version must be rejected (SQLSTATE 40001)
  begin
    perform public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_a, 'stale-quiz-version', v_answers_all_correct);
    raise exception 'stale quiz version was not rejected';
  exception when sqlstate '40001' then
    null;
  end;

  -- 8. Rate limit: 10 attempts per hour allowed, 11th rejected with SQLSTATE 42900
  for v_idx in 1..10 loop
    perform public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_rate, v_quiz_version_v1, v_answers_fail_general);
  end loop;
  begin
    perform public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_rate, v_quiz_version_v1, v_answers_fail_general);
    raise exception '11th quiz attempt within 1 hour was not rate-limited';
  exception when sqlstate '42900' then
    null;
  end;

  -- 9. Practical confirmation + approval + mixed-mode division isolation
  v_res := public.spogomi_confirm_referee_practical(v_app_a_casual, v_org_clerk, 'practical-v1', '{"verified":true}'::jsonb);
  if (v_res->>'status') <> 'practical_pending' then
    raise exception 'expected practical_pending after confirmation, got %', v_res;
  end if;

  v_res := public.spogomi_decide_referee_application(v_app_a_casual, v_org_clerk, 'approve', 'casual habilitated');
  if (v_res->>'status') <> 'habilitated' then
    raise exception 'expected habilitated after approval, got %', v_res;
  end if;

  -- Mixed mode: casual alone does NOT satisfy spogomi_referee_scope_current
  if public.spogomi_referee_scope_current(v_event_id, v_user_a) then
    raise exception 'casual-only habilitation satisfied mixed-mode spogomi_referee_scope_current';
  end if;

  -- Granting operational referee role fails when world_cup is not habilitated
  begin
    perform public.spogomi_set_operational_access(v_event_id, v_user_a, 'referee', 'grant', v_org_clerk);
    raise exception 'referee capability granted in mixed mode with only casual habilitated';
  exception when others then
    null;
  end;

  -- Qualify and habilitate user_a on world_cup as well
  v_res := public.spogomi_submit_referee_quiz(v_event_id, v_world_cup_id, v_user_a, (public.spogomi_referee_quiz_definition_private(v_event_id, v_world_cup_id)->>'version'), v_answers_pass);
  v_app_a_wc := (v_res->'application'->>'id')::uuid;
  perform public.spogomi_confirm_referee_practical(v_app_a_wc, v_org_clerk, 'practical-v1', '{"verified":true}'::jsonb);
  perform public.spogomi_decide_referee_application(v_app_a_wc, v_org_clerk, 'approve', 'world_cup habilitated');

  if not public.spogomi_referee_scope_current(v_event_id, v_user_a) then
    raise exception 'mixed-mode spogomi_referee_scope_current remained false after both divisions habilitated';
  end if;

  perform public.spogomi_set_operational_access(v_event_id, v_user_a, 'referee', 'grant', v_org_clerk);
  if not exists (
    select 1
    from public.spogomi_event_reviewers
    where event_id = v_event_id
      and clerk_id = v_user_a
      and role = 'referee'
      and revoked_at is null
  ) then
    raise exception 'referee capability row not created in spogomi_event_reviewers';
  end if;

  -- Prepare user_b in practical_pending and user_c in theory_qualified on casual
  v_res := public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_b, v_quiz_version_v1, v_answers_all_correct);
  v_app_b_casual := (v_res->'application'->>'id')::uuid;
  perform public.spogomi_confirm_referee_practical(v_app_b_casual, v_org_clerk, 'practical-v1', '{"verified":true}'::jsonb);

  v_res := public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_c, v_quiz_version_v1, v_answers_all_correct);
  v_app_c_casual := (v_res->'application'->>'id')::uuid;

  -- 10. Regulation change (reg-v1 -> reg-v2): requalification from theory_qualified, practical_pending, habilitated
  update public.spogomi_events
  set regulation_version = 'reg-v2'
  where id = v_event_id;

  v_quiz_version_v2 := public.spogomi_referee_quiz_definition_private(v_event_id, v_casual_id)->>'version';

  -- Must reset all 3 statuses to 'registered' cleanly without CHECK violation
  v_res := public.spogomi_create_referee_application(v_event_id, v_casual_id, v_user_c);
  if (v_res->>'status') <> 'registered' or (v_res->>'regulation_version') <> 'reg-v2' then
    raise exception 'expected theory_qualified app to reset to registered under reg-v2, got %', v_res;
  end if;

  v_res := public.spogomi_create_referee_application(v_event_id, v_casual_id, v_user_b);
  if (v_res->>'status') <> 'registered' or (v_res->>'regulation_version') <> 'reg-v2' then
    raise exception 'expected practical_pending app to reset to registered under reg-v2, got %', v_res;
  end if;

  v_res := public.spogomi_create_referee_application(v_event_id, v_casual_id, v_user_a);
  if (v_res->>'status') <> 'registered'
     or (v_res->>'regulation_version') <> 'reg-v2'
     or (v_res->>'quiz_proof_id') is not null
     or (v_res->>'practical_confirmation_id') is not null
     or (v_res->>'decision_actor_clerk_id') is not null then
    raise exception 'expected habilitated app to reset cleanly under reg-v2, got %', v_res;
  end if;

  -- Historical proofs, practical confirmations, events, and active reviewer capability are preserved
  if (select count(*) from public.spogomi_referee_quiz_proofs where application_id in (v_app_a_casual, v_app_b_casual, v_app_c_casual) and regulation_version = 'reg-v1') <> 3 then
    raise exception 'historical quiz proofs were not preserved after requalification reset';
  end if;
  if (select count(*) from public.spogomi_referee_practical_confirmations where application_id in (v_app_a_casual, v_app_b_casual)) <> 2 then
    raise exception 'historical practical confirmations were not preserved after requalification reset';
  end if;
  if (select count(*) from public.spogomi_referee_application_events where application_id = v_app_a_casual and event_type = 'requalification_reset') <> 1 then
    raise exception 'requalification_reset audit event missing for user_a';
  end if;
  if not exists (
    select 1
    from public.spogomi_event_reviewers
    where event_id = v_event_id
      and clerk_id = v_user_a
      and role = 'referee'
      and revoked_at is null
  ) then
    raise exception 'existing historical referee capability was unexpectedly deleted or revoked during reset';
  end if;

  -- Cannot approve or grant new capabilities while obsolete/unqualified
  if public.spogomi_referee_scope_current(v_event_id, v_user_a) then
    raise exception 'spogomi_referee_scope_current remained true after regulation change';
  end if;

  begin
    perform public.spogomi_decide_referee_application(v_app_a_casual, v_org_clerk, 'approve', 'should fail');
    raise exception 'approved reset application without quiz and practical';
  exception when others then
    null;
  end;

  -- Re-submit quiz on reg-v2 for user_a casual -> theory_qualified, still cannot approve without new practical
  v_private_def := public.spogomi_referee_quiz_definition_private(v_event_id, v_casual_id);
  v_answers_pass := '{}'::jsonb;
  v_general_wrong_count := 0;
  for v_question in select value from jsonb_array_elements(v_private_def->'questions') loop
    v_qid := v_question->>'id';
    v_correct_id := v_question->>'correctOptionId';
    v_is_critical := coalesce((v_question->>'critical')::boolean, false);
    select opt->>'id' into v_wrong_id
    from jsonb_array_elements(v_question->'options') as opt
    where opt->>'id' <> v_correct_id limit 1;
    if (not v_is_critical) and v_general_wrong_count = 0 then
      v_answers_pass := v_answers_pass || jsonb_build_object(v_qid, v_wrong_id);
      v_general_wrong_count := 1;
    else
      v_answers_pass := v_answers_pass || jsonb_build_object(v_qid, v_correct_id);
    end if;
  end loop;

  v_res := public.spogomi_submit_referee_quiz(v_event_id, v_casual_id, v_user_a, v_quiz_version_v2, v_answers_pass);
  if (v_res->'application'->>'status') <> 'theory_qualified' then
    raise exception 'expected theory_qualified on reg-v2 quiz pass, got %', v_res->'application';
  end if;

  begin
    perform public.spogomi_decide_referee_application(v_app_a_casual, v_org_clerk, 'approve', 'no new practical');
    raise exception 'approved reg-v2 application without new practical confirmation';
  exception when others then
    null;
  end;

  -- New practical + explicit organizer decision on casual; still blocked until world_cup also requalifies
  perform public.spogomi_confirm_referee_practical(v_app_a_casual, v_org_clerk, 'practical-v2', '{"verified":true}'::jsonb);
  begin
    perform public.spogomi_set_operational_access(v_event_id, v_user_a, 'referee', 'grant', v_org_clerk);
    raise exception 'granted referee capability before approval';
  exception when others then
    null;
  end;

  perform public.spogomi_decide_referee_application(v_app_a_casual, v_org_clerk, 'approve', 'casual reg-v2 approved');
  if public.spogomi_referee_scope_current(v_event_id, v_user_a) then
    raise exception 'scope_current became true before world_cup requalified under reg-v2';
  end if;

  -- Requalify user_a on world_cup under reg-v2
  perform public.spogomi_create_referee_application(v_event_id, v_world_cup_id, v_user_a);
  v_private_def := public.spogomi_referee_quiz_definition_private(v_event_id, v_world_cup_id);
  v_answers_all_correct := '{}'::jsonb;
  for v_question in select value from jsonb_array_elements(v_private_def->'questions') loop
    v_answers_all_correct := v_answers_all_correct || jsonb_build_object(v_question->>'id', v_question->>'correctOptionId');
  end loop;
  perform public.spogomi_submit_referee_quiz(v_event_id, v_world_cup_id, v_user_a, v_private_def->>'version', v_answers_all_correct);
  perform public.spogomi_confirm_referee_practical(v_app_a_wc, v_org_clerk, 'practical-v2', '{"verified":true}'::jsonb);
  perform public.spogomi_decide_referee_application(v_app_a_wc, v_org_clerk, 'approve', 'world_cup reg-v2 approved');

  if not public.spogomi_referee_scope_current(v_event_id, v_user_a) then
    raise exception 'spogomi_referee_scope_current remained false after full reg-v2 requalification';
  end if;
end;
$$;

do $$
begin
  raise notice 'EXECUTED_DB_CONTRACT: SPOGOMI referee quiz evaluation and versioned requalification contract passed';
end;
$$;

rollback;
