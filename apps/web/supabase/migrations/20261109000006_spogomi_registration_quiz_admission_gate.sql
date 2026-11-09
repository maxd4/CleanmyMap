-- SPOGOMI: require a current server proof of the applicable educational quiz
-- for a new self-service sport registration. Existing pending/approved
-- requests replay before this gate and are never invalidated retroactively.

create or replace function public.create_spogomi_admission_request(
  p_event_id uuid,
  p_team_id uuid,
  p_requester_clerk_id text,
  p_request_kind text,
  p_division_id uuid,
  p_provided_context text
)
returns table (request_id uuid, request_status text, request_kind text, request_team_id uuid, request_division_id uuid)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_existing public.spogomi_team_join_requests%rowtype;
  v_division_id uuid := p_division_id;
  v_division_count integer;
  v_policy jsonb := '{}'::jsonb;
  v_quiz_version text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SPOGOMI admission requests require the server role';
  end if;
  if p_request_kind not in ('team_join', 'registration', 'presence_regularization')
     or length(btrim(coalesce(p_requester_clerk_id, ''))) = 0
     or length(coalesce(p_provided_context, '')) > 1200 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_admission_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_event_id, p_requester_clerk_id, p_request_kind), 0));
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found or v_event.public_visibility <> 'published' or v_event.state = 'cancelled' then
    raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable';
  end if;

  select count(*)::integer into v_division_count from public.spogomi_divisions where event_id = p_event_id;
  if v_division_id is null and v_division_count = 1 then
    select min(id) into v_division_id from public.spogomi_divisions where event_id = p_event_id;
  end if;
  if v_division_id is null or not exists (
    select 1 from public.spogomi_divisions where id = v_division_id and event_id = p_event_id
  ) then
    raise exception using errcode = '22023', message = 'spogomi_admission_division_required';
  end if;
  if v_event.mode = 'mixed' and p_division_id is null then
    raise exception using errcode = '22023', message = 'spogomi_admission_division_required';
  end if;
  if p_team_id is not null and not exists (
    select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = v_division_id
  ) then
    raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable';
  end if;

  select coalesce(d.regulation_config -> 'registrationPolicy', '{}'::jsonb)
    into v_policy
    from public.spogomi_divisions d
   where d.id = v_division_id and d.event_id = p_event_id;
  v_policy := coalesce(v_policy, '{}'::jsonb) || coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);

  if p_request_kind = 'registration' then
    if v_event.state <> 'registration_open'
       or coalesce(v_policy ->> 'directRegistrationOpen', 'false') <> 'true' then
      raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed';
    end if;
    if coalesce(v_policy ->> 'externalTicketingRequired', 'false') = 'true' then
      raise exception using errcode = '42501', message = 'spogomi_external_ticketing_required';
    end if;
    if v_event.mode = 'world_cup' or exists (
      select 1 from public.spogomi_divisions where id = v_division_id and division_type = 'world_cup'
    ) then
      if coalesce(v_policy ->> 'worldCupDirectRegistrationAllowed', 'false') <> 'true' then
        raise exception using errcode = '42501', message = 'spogomi_world_cup_official_path_required';
      end if;
    end if;
  elsif p_request_kind = 'presence_regularization' and v_event.state not in ('in_progress', 'judging') then
    raise exception using errcode = '42501', message = 'spogomi_presence_regularization_closed';
  elsif p_request_kind = 'team_join' and p_team_id is null then
    raise exception using errcode = '22023', message = 'spogomi_team_join_team_required';
  end if;

  select * into v_existing
    from public.spogomi_team_join_requests request
   where request.event_id = p_event_id
     and request.requester_clerk_id = btrim(p_requester_clerk_id)
     and request.request_kind = p_request_kind
     and request.status in ('pending', 'approved')
   order by request.created_at desc
   limit 1 for update;
  if found then
    if v_existing.division_id is distinct from v_division_id or v_existing.team_id is distinct from p_team_id then
      raise exception using errcode = '23505', message = 'spogomi_admission_request_scope_conflict';
    end if;
    return query select v_existing.id, v_existing.status, v_existing.request_kind, v_existing.team_id, v_existing.division_id;
    return;
  end if;

  if exists (
    select 1 from public.spogomi_participants participant
     where participant.event_id = p_event_id
       and participant.clerk_id = btrim(p_requester_clerk_id)
       and participant.account_link_status = 'verified'
  ) then
    raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
  end if;

  if p_request_kind = 'registration' then
    if coalesce((public.spogomi_registration_readiness(p_event_id) ->> 'ready')::boolean, false) = false then
      raise exception using errcode = '42501', message = 'spogomi_registration_readiness_incomplete';
    end if;
    v_quiz_version := public.spogomi_registration_quiz_definition(p_event_id, v_division_id) ->> 'quizVersion';
    if not exists (
      select 1 from public.spogomi_registration_quiz_proofs proof
       where proof.event_id = p_event_id
         and proof.division_id = v_division_id
         and proof.clerk_id = btrim(p_requester_clerk_id)
         and proof.quiz_version = v_quiz_version
    ) then
      raise exception using errcode = '42501', message = 'spogomi_registration_quiz_required';
    end if;
  end if;

  insert into public.spogomi_team_join_requests (
    event_id, team_id, requester_clerk_id, request_kind, division_id, provided_context
  ) values (
    p_event_id, p_team_id, btrim(p_requester_clerk_id), p_request_kind, v_division_id, btrim(coalesce(p_provided_context, ''))
  ) returning * into v_existing;

  insert into public.spogomi_team_join_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_existing.id, p_event_id, 'pending', 'requester', btrim(p_requester_clerk_id),
    jsonb_build_object('request_kind', p_request_kind, 'division_id', v_division_id, 'quiz_version', v_quiz_version)
  );

  return query select v_existing.id, 'pending'::text, p_request_kind, p_team_id, v_division_id;
end;
$$;

revoke all on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) to service_role;
