begin;

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"impact-concurrency-test"}', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_participant_id uuid := gen_random_uuid();
  v_initial_revision timestamptz;
  v_revision_after_replay timestamptz;
  v_revision_after_waste_patch timestamptz;
  v_revision_after_butts_patch timestamptz;
  v_result jsonb;
begin
  insert into public.actions (
    id, created_by_clerk_id, action_date, location_label, status
  ) values (
    v_action_id, 'impact-owner', current_date, 'Optimistic concurrency contract', 'approved'
  );

  insert into public.action_organizers (
    action_id, organizer_clerk_id, organizer_label
  ) values (
    v_action_id, 'impact-reviewer', 'Impact reviewer'
  );

  insert into public.action_participants (
    id, action_id, user_id, participation_status
  ) values (
    v_participant_id, v_action_id, 'impact-participant', 'confirmed'
  );

  select updated_at
    into v_initial_revision
    from public.action_participants
   where id = v_participant_id;

  v_result := public.persist_action_participant_individual_impact(
    v_action_id, v_participant_id, 'impact-reviewer', false, v_initial_revision,
    1, 'sec', 'scale', 'cleanmymap-waste-v1', 10, null, 'propre', 'counted',
    null, null, 'impact-reviewer', '2026-11-01T00:00:00Z'::timestamptz
  );
  if v_result ->> 'ok' <> 'true' or v_result ->> 'changed' <> 'true' then
    raise exception 'initial individual impact PATCH was not applied: %', v_result;
  end if;

  select updated_at
    into v_revision_after_replay
    from public.action_participants
   where id = v_participant_id;

  v_result := public.persist_action_participant_individual_impact(
    v_action_id, v_participant_id, 'impact-reviewer', false, v_revision_after_replay,
    1, 'sec', 'scale', 'cleanmymap-waste-v1', 10, null, 'propre', 'counted',
    null, null, 'impact-reviewer', '2026-11-01T00:00:00Z'::timestamptz
  );
  if v_result ->> 'ok' <> 'true' or v_result ->> 'changed' <> 'false' then
    raise exception 'identical retry was not an idempotent no-op: %', v_result;
  end if;

  v_result := public.persist_action_participant_individual_impact(
    v_action_id, v_participant_id, 'impact-reviewer', false, v_initial_revision - interval '1 second',
    3, 'sec', 'scale', 'cleanmymap-waste-v1', 10, null, 'propre', 'counted',
    null, null, 'impact-reviewer', '2026-11-01T00:00:00Z'::timestamptz
  );
  if v_result ->> 'code' <> 'revision_conflict' then
    raise exception 'stale revision was not rejected: %', v_result;
  end if;

  if (select individual_waste_kg from public.action_participants where id = v_participant_id) <> 1 then
    raise exception 'stale revision changed the stored waste value';
  end if;

  v_result := public.persist_action_participant_individual_impact(
    v_action_id, v_participant_id, 'impact-reviewer', false, v_revision_after_replay,
    2, 'sec', 'scale', 'cleanmymap-waste-v1', 10, null, 'propre', 'counted',
    null, null, 'impact-reviewer', '2026-11-01T00:00:00Z'::timestamptz
  );
  if v_result ->> 'ok' <> 'true' or v_result ->> 'changed' <> 'true' then
    raise exception 'waste-only PATCH was not applied: %', v_result;
  end if;

  if (select individual_cigarette_butts_count from public.action_participants where id = v_participant_id) <> 10 then
    raise exception 'waste-only PATCH changed the cigarette-butt count';
  end if;

  select updated_at
    into v_revision_after_waste_patch
    from public.action_participants
   where id = v_participant_id;

  v_result := public.persist_action_participant_individual_impact(
    v_action_id, v_participant_id, 'impact-reviewer', false, v_revision_after_waste_patch,
    2, 'sec', 'scale', 'cleanmymap-waste-v1', 20, null, 'propre', 'counted',
    null, null, 'impact-reviewer', '2026-11-01T00:00:00Z'::timestamptz
  );
  if v_result ->> 'ok' <> 'true' or v_result ->> 'changed' <> 'true' then
    raise exception 'cigarette-butt-only PATCH was not applied: %', v_result;
  end if;

  if (select individual_waste_kg from public.action_participants where id = v_participant_id) <> 2 then
    raise exception 'cigarette-butt-only PATCH changed the waste value';
  end if;

  select updated_at
    into v_revision_after_butts_patch
    from public.action_participants
   where id = v_participant_id;

  delete from public.action_organizers
   where action_id = v_action_id
     and organizer_clerk_id = 'impact-reviewer';

  v_result := public.persist_action_participant_individual_impact(
    v_action_id, v_participant_id, 'impact-reviewer', false, v_revision_after_butts_patch,
    2, 'sec', 'scale', 'cleanmymap-waste-v1', 20, null, 'propre', 'counted',
    null, null, 'impact-reviewer', '2026-11-01T00:00:00Z'::timestamptz
  );
  if v_result ->> 'code' <> 'impact_target_not_eligible' then
    raise exception 'removed organizer authorization was not rejected: %', v_result;
  end if;

  if (select individual_cigarette_butts_count from public.action_participants where id = v_participant_id) <> 20
     or (select updated_at from public.action_participants where id = v_participant_id) <> v_revision_after_butts_patch then
    raise exception 'unauthorized PATCH changed participant data';
  end if;
end;
$$;

select 'EXECUTED_DB_CONTRACT: optimistic individual-impact revision, partial PATCH, authorization withdrawal and idempotent retry contract passed' as proof;

rollback;
