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
  v_count integer;
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
end;
$$;

rollback;
