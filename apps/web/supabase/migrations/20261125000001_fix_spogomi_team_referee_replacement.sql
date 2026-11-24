begin;

-- Forward-only repair for installations that already recorded the original migration.
-- Replacement preserves the old assignment chain and runs atomically per RPC call.

create or replace function public.spogomi_assign_team_referee(
  p_event_id uuid,
  p_division_id uuid,
  p_team_id uuid,
  p_referee_clerk_id text,
  p_actor_clerk_id text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_referee_id text := btrim(coalesce(p_referee_clerk_id, ''));
  v_actor_id text := btrim(coalesce(p_actor_clerk_id, ''));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_team public.spogomi_teams%rowtype;
  v_existing public.spogomi_team_referee_assignments%rowtype;
  v_conflict public.spogomi_team_referee_assignments%rowtype;
  v_inserted public.spogomi_team_referee_assignments%rowtype;
  v_action text := 'assigned';
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_assign_team_referee_requires_service_role';
  end if;
  if length(v_actor_id) = 0 or length(v_referee_id) = 0 then
    raise exception using errcode = '23514', message = 'spogomi_team_referee_actor_and_subject_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('spogomi_team_referee:%s', p_event_id), 0));

  perform 1 from public.spogomi_events where id = p_event_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_event_not_found';
  end if;

  if not public.spogomi_actor_is_event_organizer(p_event_id, v_actor_id) then
    raise exception using errcode = '42501', message = 'spogomi_team_referee_organizer_required';
  end if;

  select *
  into v_team
  from public.spogomi_teams
  where id = p_team_id
    and event_id = p_event_id
    and division_id = p_division_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_team_not_found';
  end if;

  if exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_referee_id
  ) then
    raise exception using errcode = '23514', message = 'spogomi_participant_cannot_be_team_referee';
  end if;

  if not public.spogomi_referee_is_team_eligible(p_event_id, p_division_id, v_referee_id) then
    raise exception using errcode = '42501', message = 'spogomi_referee_not_habilitated_for_division';
  end if;

  select *
  into v_existing
  from public.spogomi_team_referee_assignments
  where team_id = p_team_id
    and revoked_at is null
  for update;

  if found and v_existing.referee_clerk_id = v_referee_id then
    return jsonb_build_object(
      'already_processed', true,
      'assignment', to_jsonb(v_existing),
      'status', public.spogomi_team_referee_status(p_event_id, p_division_id, p_team_id)
    );
  end if;

  select *
  into v_conflict
  from public.spogomi_team_referee_assignments
  where event_id = p_event_id
    and referee_clerk_id = v_referee_id
    and revoked_at is null
    and team_id <> p_team_id
  limit 1;
  if found then
    raise exception using errcode = '23505', message = 'spogomi_referee_already_assigned_in_event';
  end if;

  -- Revoke the current row before inserting its replacement: the partial
  -- unique index permits only one active assignment per team. Any later
  -- failure rolls this update back with the function call's transaction.
  if v_existing.id is not null then
    v_action := 'replaced';
    update public.spogomi_team_referee_assignments
    set revoked_at = now(),
        revoked_by_clerk_id = v_actor_id,
        revocation_reason = coalesce(v_reason, 'replaced'),
        updated_at = now()
    where id = v_existing.id;
  end if;

  insert into public.spogomi_team_referee_assignments (
    event_id,
    division_id,
    team_id,
    referee_clerk_id,
    assigned_by_clerk_id
  ) values (
    p_event_id,
    p_division_id,
    p_team_id,
    v_referee_id,
    v_actor_id
  )
  returning * into v_inserted;

  if v_existing.id is not null then
    update public.spogomi_team_referee_assignments
    set replaced_by_assignment_id = v_inserted.id,
        updated_at = now()
    where id = v_existing.id;
  end if;

  insert into public.spogomi_team_referee_assignment_audit (
    assignment_id,
    event_id,
    division_id,
    team_id,
    referee_clerk_id,
    action,
    actor_clerk_id,
    reason
  ) values (
    v_inserted.id,
    p_event_id,
    p_division_id,
    p_team_id,
    v_referee_id,
    v_action,
    v_actor_id,
    v_reason
  );

  return jsonb_build_object(
    'already_processed', false,
    'action', v_action,
    'assignment', to_jsonb(v_inserted),
    'status', public.spogomi_team_referee_status(p_event_id, p_division_id, p_team_id)
  );
end;
$$;

revoke all on function public.spogomi_assign_team_referee(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_assign_team_referee(uuid, uuid, uuid, text, text, text) to service_role;

commit;
