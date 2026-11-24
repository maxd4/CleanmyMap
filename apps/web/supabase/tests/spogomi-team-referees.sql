-- Executed PostgreSQL contract for SPOGOMI per-team referee assignment,
-- 1:1 edition uniqueness, privilege isolation, replacement, revocation, and operational readiness.
-- The transaction is rolled back: it creates no durable fixture or business data.
begin;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_other_event_id uuid := gen_random_uuid();
  v_other_action_id uuid := gen_random_uuid();
  v_casual_id uuid := md5(v_event_id::text || ':casual')::uuid;
  v_world_cup_id uuid := md5(v_event_id::text || ':world_cup')::uuid;
  v_other_wc_id uuid := md5(v_other_event_id::text || ':world_cup')::uuid;

  v_team_wc_1 uuid := gen_random_uuid();
  v_team_wc_2 uuid := gen_random_uuid();
  v_team_casual_1 uuid := gen_random_uuid();

  v_org_clerk text := 'spogomi-tr-org-' || substr(gen_random_uuid()::text, 1, 8);
  v_non_org_clerk text := 'spogomi-tr-nonorg-' || substr(gen_random_uuid()::text, 1, 8);
  v_ref_1 text := 'spogomi-tr-ref1-' || substr(gen_random_uuid()::text, 1, 8);
  v_ref_2 text := 'spogomi-tr-ref2-' || substr(gen_random_uuid()::text, 1, 8);
  v_ref_3 text := 'spogomi-tr-ref3-' || substr(gen_random_uuid()::text, 1, 8);
  v_ref_unhab text := 'spogomi-tr-unhab-' || substr(gen_random_uuid()::text, 1, 8);
  v_participant_clerk text := 'spogomi-tr-part-' || substr(gen_random_uuid()::text, 1, 8);

  v_app_id uuid;
  v_answers jsonb;
  v_question jsonb;
  v_private_def jsonb;
  v_res jsonb;
  v_idx integer;
begin
  -- 1. Privilege boundaries
  if has_table_privilege('anon', 'public.spogomi_team_referee_assignments', 'SELECT')
     or has_table_privilege('authenticated', 'public.spogomi_team_referee_assignments', 'SELECT')
     or has_table_privilege('anon', 'public.spogomi_team_referee_assignment_audit', 'SELECT')
     or has_table_privilege('authenticated', 'public.spogomi_team_referee_assignment_audit', 'SELECT') then
    raise exception 'team referee tables are readable by anon or authenticated';
  end if;

  if has_function_privilege('anon', 'public.spogomi_assign_team_referee(uuid,uuid,uuid,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_assign_team_referee(uuid,uuid,uuid,text,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_assign_team_referee(uuid,uuid,uuid,text,text,text)', 'EXECUTE') then
    raise exception 'spogomi_assign_team_referee ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_revoke_team_referee(uuid,uuid,uuid,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_revoke_team_referee(uuid,uuid,uuid,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_revoke_team_referee(uuid,uuid,uuid,text,text)', 'EXECUTE') then
    raise exception 'spogomi_revoke_team_referee ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_team_referee_status(uuid,uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_team_referee_status(uuid,uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_team_referee_status(uuid,uuid,uuid)', 'EXECUTE') then
    raise exception 'spogomi_team_referee_status ACL is not service-only';
  end if;

  if has_function_privilege('anon', 'public.spogomi_division_referee_coverage_ready(uuid,uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.spogomi_division_referee_coverage_ready(uuid,uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.spogomi_division_referee_coverage_ready(uuid,uuid)', 'EXECUTE') then
    raise exception 'spogomi_division_referee_coverage_ready ACL is not service-only';
  end if;

  -- 2. Setup mixed event + secondary event + teams + 3 World Cup participants + 2 Casual participants
  insert into public.actions (id, created_by_clerk_id, action_date, location_label, waste_kg, cigarette_butts, volunteers_count, notes)
  values
    (v_action_id, v_org_clerk, current_date, 'SPOGOMI team referee contract', 0, 0, 1, 'team referee fixture'),
    (v_other_action_id, v_org_clerk, current_date, 'SPOGOMI other event', 0, 0, 1, 'other event fixture');

  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode,
    starts_at, regulation_version, regulation_status, regulation_config,
    team_size_config, creation_state, public_visibility
  ) values
    (v_event_id, v_action_id, v_org_clerk, 'SPOGOMI Team Ref Contract', 'Paris', 'mixed', now(), 'reg-v1', 'complete', '{}'::jsonb, '{"casual":{"minMembers":1,"maxMembers":5}}'::jsonb, 'ready', 'private'),
    (v_other_event_id, v_other_action_id, v_org_clerk, 'SPOGOMI Other Event', 'Lyon', 'world_cup', now(), 'reg-v1', 'complete', '{}'::jsonb, '{}'::jsonb, 'ready', 'private');

  perform public.spogomi_ensure_parent_divisions(v_event_id, 'mixed');
  perform public.spogomi_ensure_parent_divisions(v_other_event_id, 'world_cup');

  -- Draft team creation never requires a referee
  insert into public.spogomi_teams (id, event_id, division_id, team_number, public_name, composition_state)
  values
    (v_team_wc_1, v_event_id, v_world_cup_id, 1, 'WC Alpha', 'draft'),
    (v_team_wc_2, v_event_id, v_world_cup_id, 2, 'WC Beta', 'draft'),
    (v_team_casual_1, v_event_id, v_casual_id, 1, 'Casual One', 'draft');

  for v_idx in 1..3 loop
    insert into public.spogomi_participants (id, event_id, division_id, team_id, display_name, registration_status, account_link_status, clerk_id)
    values (
      gen_random_uuid(),
      v_event_id,
      v_world_cup_id,
      v_team_wc_1,
      format('Competiteur WC1-%s', v_idx),
      'registered',
      case when v_idx = 1 then 'verified' else 'unlinked' end,
      case when v_idx = 1 then v_participant_clerk else null end
    );
    insert into public.spogomi_participants (id, event_id, division_id, team_id, display_name, registration_status)
    values (gen_random_uuid(), v_event_id, v_world_cup_id, v_team_wc_2, format('Competiteur WC2-%s', v_idx), 'registered');
  end loop;

  insert into public.spogomi_participants (id, event_id, division_id, team_id, display_name, registration_status)
  values (gen_random_uuid(), v_event_id, v_casual_id, v_team_casual_1, 'Competiteur Casual 1', 'registered');

  -- Qualify and habilitate v_ref_1, v_ref_2, v_ref_3 on World Cup division (and v_participant_clerk too to test participant block)
  v_private_def := public.spogomi_referee_quiz_definition_private(v_event_id, v_world_cup_id);
  v_answers := '{}'::jsonb;
  for v_question in select value from jsonb_array_elements(v_private_def->'questions') loop
    v_answers := v_answers || jsonb_build_object(v_question->>'id', v_question->>'correctOptionId');
  end loop;

  foreach v_ref_unhab in array array[v_ref_1, v_ref_2, v_ref_3, v_participant_clerk] loop
    v_res := public.spogomi_submit_referee_quiz(v_event_id, v_world_cup_id, v_ref_unhab, v_private_def->>'version', v_answers);
    v_app_id := (v_res->'application'->>'id')::uuid;
    perform public.spogomi_confirm_referee_practical(v_app_id, v_org_clerk, 'practical-v1', '{"verified":true}'::jsonb);
    perform public.spogomi_decide_referee_application(v_app_id, v_org_clerk, 'approve', 'habilitated');
    insert into public.spogomi_event_reviewers (event_id, clerk_id, role, assigned_by_clerk_id)
    values (v_event_id, v_ref_unhab, 'referee', v_org_clerk)
    on conflict do nothing;
  end loop;
  v_ref_unhab := 'spogomi-tr-unhab-' || substr(gen_random_uuid()::text, 1, 8);

  -- 3. Reject non-organizer, non-habilitated, participant, and cross-division
  begin
    perform public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_1, v_ref_1, v_non_org_clerk, 'unauthorized');
    raise exception 'non-organizer was allowed to assign team referee';
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_1, v_ref_unhab, v_org_clerk, 'unhabilitated');
    raise exception 'unhabilitated account was assigned as team referee';
  exception when sqlstate '42501' then null;
  end;

  begin
    perform public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_1, v_participant_clerk, v_org_clerk, 'participant');
    raise exception 'registered participant was assigned as team referee';
  exception when sqlstate '23514' then null;
  end;

  -- Cross-division (v_ref_1 is only qualified on World Cup, not Casual)
  begin
    perform public.spogomi_assign_team_referee(v_event_id, v_casual_id, v_team_casual_1, v_ref_1, v_org_clerk, 'cross division');
    raise exception 'referee qualified only on world_cup was assigned to casual team';
  exception when sqlstate '42501' then null;
  end;

  -- 4. Assign 1:1, enforce uniqueness within edition, replace, and revoke
  if public.spogomi_team_referee_status(v_event_id, v_world_cup_id, v_team_wc_1) <> 'to_assign' then
    raise exception 'expected initial status to_assign';
  end if;

  v_res := public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_1, v_ref_1, v_org_clerk, 'initial');
  if (v_res->>'status') <> 'assigned' or coalesce((v_res->>'already_processed')::boolean, true) then
    raise exception 'expected assigned status on first assignment, got %', v_res;
  end if;

  -- Idempotent replay
  v_res := public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_1, v_ref_1, v_org_clerk, 'replay');
  if not coalesce((v_res->>'already_processed')::boolean, false) then
    raise exception 'expected idempotent replay on identical team/referee assignment';
  end if;

  -- 1:1 uniqueness across teams in same edition
  begin
    perform public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_2, v_ref_1, v_org_clerk, 'duplicate');
    raise exception 'same referee was assigned to two teams in the same edition';
  exception when sqlstate '23505' then null;
  end;

  perform public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_2, v_ref_2, v_org_clerk, 'team 2');

  -- Replace v_ref_1 with v_ref_3 on v_team_wc_1
  v_res := public.spogomi_assign_team_referee(v_event_id, v_world_cup_id, v_team_wc_1, v_ref_3, v_org_clerk, 'swap');
  if (v_res->>'action') <> 'replaced' then
    raise exception 'expected replaced action, got %', v_res;
  end if;
  if (select count(*) from public.spogomi_team_referee_assignment_audit where team_id = v_team_wc_1 and action = 'replaced') <> 1 then
    raise exception 'missing replaced audit record';
  end if;
  if not exists (
    select 1
    from public.spogomi_team_referee_assignments old_assignment
    join public.spogomi_team_referee_assignments new_assignment
      on new_assignment.id = old_assignment.replaced_by_assignment_id
    where old_assignment.team_id = v_team_wc_1
      and old_assignment.referee_clerk_id = v_ref_1
      and old_assignment.revoked_at is not null
      and new_assignment.team_id = v_team_wc_1
      and new_assignment.referee_clerk_id = v_ref_3
      and new_assignment.revoked_at is null
  ) then
    raise exception 'replacement did not preserve the old-to-new assignment chain';
  end if;

  -- 5. Operational readiness & field launch gate
  if not public.spogomi_division_referee_coverage_ready(v_event_id, v_world_cup_id) then
    raise exception 'world_cup division should be referee-coverage ready';
  end if;
  if public.spogomi_division_referee_coverage_ready(v_event_id, v_casual_id) then
    raise exception 'casual division without referee should not be ready';
  end if;

  perform public.spogomi_configure_field_operation(v_event_id, v_world_cup_id, 'Europe/Paris', 'reg-v1', now(), null, null, null, null, v_org_clerk, 'setup', 'contract');
  perform public.spogomi_configure_field_operation(v_event_id, v_casual_id, 'Europe/Paris', 'reg-v1', now(), null, null, null, null, v_org_clerk, 'setup', 'contract');

  -- Casual launch blocked when team lacks referee
  begin
    perform public.spogomi_launch_field_phase(v_event_id, v_casual_id, 'collection', now(), v_org_clerk, 'start', 'contract');
    raise exception 'casual collection phase started without team referee coverage';
  exception when sqlstate '42501' then null;
  end;

  -- World Cup launch succeeds when all teams have assigned referees
  perform public.spogomi_launch_field_phase(v_event_id, v_world_cup_id, 'collection', now(), v_org_clerk, 'start', 'contract');

  -- 6. Revocation & regulation invalidation withdraw readiness without altering sporting roster
  perform public.spogomi_revoke_team_referee(v_event_id, v_world_cup_id, v_team_wc_1, v_org_clerk, 'absent');
  if public.spogomi_team_referee_status(v_event_id, v_world_cup_id, v_team_wc_1) <> 'to_assign' then
    raise exception 'expected to_assign after revocation';
  end if;
  if public.spogomi_division_referee_coverage_ready(v_event_id, v_world_cup_id) then
    raise exception 'readiness remained true after team referee revocation';
  end if;
  if (select count(*) from public.spogomi_participants where team_id = v_team_wc_1 and registration_status = 'registered') <> 3 then
    raise exception 'sporting roster count changed after referee revocation';
  end if;

  -- Regulation change invalidates existing assignment into pending_validation and drops readiness
  update public.spogomi_events set regulation_version = 'reg-v2' where id = v_event_id;
  if public.spogomi_team_referee_status(v_event_id, v_world_cup_id, v_team_wc_2) <> 'pending_validation' then
    raise exception 'expected pending_validation after regulation change';
  end if;

  -- Reviewer revocation turns active assignment into unavailable
  update public.spogomi_event_reviewers set revoked_at = now() where event_id = v_event_id and clerk_id = v_ref_2;
  if public.spogomi_team_referee_status(v_event_id, v_world_cup_id, v_team_wc_2) <> 'unavailable' then
    raise exception 'expected unavailable after reviewer access revocation';
  end if;
end;
$$;

do $$
begin
  raise notice 'EXECUTED_DB_CONTRACT: SPOGOMI team referee assignment, 1:1 uniqueness, and readiness contract passed';
end;
$$;

rollback;
