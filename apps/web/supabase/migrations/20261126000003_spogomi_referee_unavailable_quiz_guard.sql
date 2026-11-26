begin;

-- Forward-only hardening:
-- Ensure spogomi_referee_is_team_eligible and spogomi_team_referee_status fail closed
-- when a division regulation is incomplete/missing or the quiz is unavailable (P0002),
-- without crashing historical projections or exposing quiz answers.

create or replace function public.spogomi_referee_is_team_eligible(
  p_event_id uuid,
  p_division_id uuid,
  p_referee_clerk_id text
)
returns boolean
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  -- PURPOSE: verify referee eligibility for a specific division using division regulation and quiz version.
  -- CALLER: spogomi_assign_team_referee or server-only referee checks.
  -- AUTHORIZATION_BOUNDARY: service_role only.
  -- IDEMPOTENCY: read-only function.
  -- ATOMICITY: single consistent read within caller transaction.
  -- FAILURE_BEHAVIOR: raises 42501 for non-service_role; returns false if regulation/quiz is unavailable.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only below.
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_quiz_def jsonb;
  v_current_quiz_version text;
  v_referee_id text := btrim(coalesce(p_referee_clerk_id, ''));
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_referee_eligibility_requires_service_role';
  end if;
  if length(v_referee_id) = 0 then
    return false;
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then
    return false;
  end if;

  select * into v_division
  from public.spogomi_divisions d
  where d.id = p_division_id and d.event_id = p_event_id;
  if not found
     or v_division.regulation_status is distinct from 'complete'
     or nullif(btrim(coalesce(v_division.regulation_version, '')), '') is null then
    return false;
  end if;

  -- Registered competitors across the entire event cannot be assigned as team referees.
  if exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_referee_id
  ) then
    return false;
  end if;

  if not exists (
    select 1
    from public.spogomi_event_reviewers r
    where r.event_id = p_event_id
      and r.clerk_id = v_referee_id
      and r.role = 'referee'
      and r.revoked_at is null
  ) then
    return false;
  end if;

  begin
    v_quiz_def := public.spogomi_referee_quiz_definition_internal(p_event_id, p_division_id);
  exception when sqlstate 'P0002' then
    return false;
  end;

  if not coalesce((v_quiz_def ->> 'available')::boolean, false) then
    return false;
  end if;

  v_current_quiz_version := nullif(btrim(coalesce(v_quiz_def ->> 'quizVersion', '')), '');
  if v_current_quiz_version is null then
    return false;
  end if;

  if not exists (
    select 1
    from public.spogomi_referee_applications app
    where app.event_id = p_event_id
      and app.division_id = p_division_id
      and app.clerk_id = v_referee_id
      and app.status = 'habilitated'
      and app.regulation_version = v_division.regulation_version
      and app.quiz_version is not null
      and app.quiz_version = v_current_quiz_version
      and app.theory_proof_id is not null
      and app.practical_confirmed_at is not null
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.spogomi_referee_is_team_eligible(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.spogomi_referee_is_team_eligible(uuid, uuid, text) to service_role;

create or replace function public.spogomi_team_referee_status(
  p_event_id uuid,
  p_division_id uuid,
  p_team_id uuid
)
returns text
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  -- PURPOSE: compute current team referee assignment status against division regulation and quiz version.
  -- CALLER: spogomi_assign_team_referee, spogomi_division_referee_coverage_ready, and server projections.
  -- AUTHORIZATION_BOUNDARY: service_role only.
  -- IDEMPOTENCY: read-only function.
  -- ATOMICITY: single consistent read within caller transaction.
  -- FAILURE_BEHAVIOR: raises 42501 for non-service_role; returns pending_validation if regulation/quiz is unavailable.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: service_role only below.
  v_assignment public.spogomi_team_referee_assignments%rowtype;
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_quiz_def jsonb;
  v_current_quiz_version text;
  v_app public.spogomi_referee_applications%rowtype;
  v_has_active_reviewer boolean;
  v_is_participant boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_team_referee_status_requires_service_role';
  end if;

  select *
  into v_assignment
  from public.spogomi_team_referee_assignments a
  where a.event_id = p_event_id
    and a.division_id = p_division_id
    and a.team_id = p_team_id
    and a.revoked_at is null
  limit 1;

  if not found then
    return 'to_assign';
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then
    return 'unavailable';
  end if;

  select * into v_division
  from public.spogomi_divisions d
  where d.id = p_division_id and d.event_id = p_event_id;
  if not found then
    return 'unavailable';
  end if;

  select exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_assignment.referee_clerk_id
  ) into v_is_participant;

  if v_is_participant then
    return 'unavailable';
  end if;

  select exists (
    select 1
    from public.spogomi_event_reviewers r
    where r.event_id = p_event_id
      and r.clerk_id = v_assignment.referee_clerk_id
      and r.role = 'referee'
      and r.revoked_at is null
  ) into v_has_active_reviewer;

  if not v_has_active_reviewer then
    return 'unavailable';
  end if;

  select *
  into v_app
  from public.spogomi_referee_applications app
  where app.event_id = p_event_id
    and app.division_id = p_division_id
    and app.clerk_id = v_assignment.referee_clerk_id
  limit 1;

  if not found then
    return 'unavailable';
  end if;

  if v_app.status in ('refused', 'revoked') then
    return 'unavailable';
  end if;

  if v_division.regulation_status is distinct from 'complete'
     or nullif(btrim(coalesce(v_division.regulation_version, '')), '') is null then
    return 'pending_validation';
  end if;

  begin
    v_quiz_def := public.spogomi_referee_quiz_definition_internal(p_event_id, p_division_id);
  exception when sqlstate 'P0002' then
    return 'pending_validation';
  end;

  if not coalesce((v_quiz_def ->> 'available')::boolean, false) then
    return 'pending_validation';
  end if;

  v_current_quiz_version := nullif(btrim(coalesce(v_quiz_def ->> 'quizVersion', '')), '');
  if v_current_quiz_version is null then
    return 'pending_validation';
  end if;

  if v_app.status in ('candidate', 'theory_qualified', 'practical_pending')
     or v_app.regulation_version is distinct from v_division.regulation_version
     or v_app.quiz_version is distinct from v_current_quiz_version
     or v_app.theory_proof_id is null
     or v_app.practical_confirmed_at is null then
    return 'pending_validation';
  end if;

  if v_app.status = 'habilitated' then
    return 'assigned';
  end if;

  return 'unavailable';
end;
$$;

revoke all on function public.spogomi_team_referee_status(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_team_referee_status(uuid, uuid, uuid) to service_role;

commit;
