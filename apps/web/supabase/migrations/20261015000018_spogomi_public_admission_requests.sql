-- SPOGOMI public admission requests: distinguish a new sport registration
-- from an existing-roster team claim and from an exceptional presence report.
-- Requests remain service-only; the HTTP layer supplies Clerk AuthN/AuthZ.

alter table public.spogomi_participants
  drop constraint if exists spogomi_participants_source_system_check;

alter table public.spogomi_participants
  add constraint spogomi_participants_source_system_check
  check (source_system in ('manual_roster', 'cachan_ticketing', 'direct_registration'));

alter table public.spogomi_team_join_requests
  add column if not exists request_kind text not null default 'team_join',
  add column if not exists division_id uuid,
  add column if not exists provided_context text not null default '',
  add column if not exists decision_message text;

alter table public.spogomi_team_join_requests
  drop constraint if exists spogomi_team_join_requests_check;

alter table public.spogomi_team_join_requests
  drop constraint if exists spogomi_team_join_requests_request_kind_check,
  add constraint spogomi_team_join_requests_request_kind_check
  check (request_kind in ('team_join', 'registration', 'presence_regularization'));

alter table public.spogomi_team_join_requests
  drop constraint if exists spogomi_team_join_requests_provided_context_check,
  add constraint spogomi_team_join_requests_provided_context_check
  check (length(provided_context) <= 1200);

alter table public.spogomi_team_join_requests
  alter column team_id drop not null;

update public.spogomi_team_join_requests request
   set division_id = team.division_id
  from public.spogomi_teams team
 where request.team_id = team.id
   and request.event_id = team.event_id
   and request.division_id is null;

alter table public.spogomi_team_join_requests
  drop constraint if exists spogomi_team_join_requests_division_event_fk;
alter table public.spogomi_team_join_requests
  add constraint spogomi_team_join_requests_division_event_fk
  foreign key (division_id, event_id)
  references public.spogomi_divisions(id, event_id)
  on delete restrict;

alter table public.spogomi_team_join_requests
  add constraint spogomi_team_join_requests_request_shape_check
  check (
    (request_kind = 'team_join' and team_id is not null)
    or request_kind in ('registration', 'presence_regularization')
  );

alter table public.spogomi_team_join_requests
  add constraint spogomi_team_join_requests_status_shape_check
  check (
    (status = 'pending' and matched_participant_id is null and decided_at is null and decided_by_clerk_id is null)
    or (
      status = 'approved'
      and (
        (request_kind in ('team_join', 'registration') and matched_participant_id is not null and verification_note is not null)
        or (request_kind = 'presence_regularization' and matched_participant_id is null and verification_note is not null)
      )
      and decided_at is not null
      and decided_by_clerk_id is not null
    )
    or (status in ('rejected', 'cancelled') and matched_participant_id is null and decided_at is not null and decided_by_clerk_id is not null)
  );

drop index if exists public.spogomi_team_join_pending_requester_unique;
create unique index spogomi_team_join_pending_requester_kind_unique
  on public.spogomi_team_join_requests(event_id, requester_clerk_id, request_kind)
  where status = 'pending';

create index if not exists spogomi_team_join_request_kind_idx
  on public.spogomi_team_join_requests(event_id, request_kind, status, created_at desc);

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

  insert into public.spogomi_team_join_requests (
    event_id, team_id, requester_clerk_id, request_kind, division_id, provided_context
  ) values (
    p_event_id, p_team_id, btrim(p_requester_clerk_id), p_request_kind, v_division_id, btrim(coalesce(p_provided_context, ''))
  ) returning * into v_existing;

  insert into public.spogomi_team_join_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_existing.id, p_event_id, 'pending', 'requester', btrim(p_requester_clerk_id),
    jsonb_build_object('request_kind', p_request_kind, 'division_id', v_division_id)
  );

  return query select v_existing.id, 'pending'::text, p_request_kind, p_team_id, v_division_id;
end;
$$;

create or replace function public.create_spogomi_team_join_request(
  p_event_id uuid,
  p_team_id uuid,
  p_requester_clerk_id text
)
returns table (request_id uuid, request_status text, request_team_id uuid)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_division_id uuid;
begin
  select division_id into v_division_id
    from public.spogomi_teams
   where id = p_team_id and event_id = p_event_id;
  return query
    select request_id, request_status, request_team_id
      from public.create_spogomi_admission_request(p_event_id, p_team_id, p_requester_clerk_id, 'team_join', v_division_id, '');
end;
$$;

create or replace function public.transition_spogomi_admission_request(
  p_request_id uuid,
  p_event_id uuid,
  p_target_status text,
  p_actor_kind text,
  p_actor_clerk_id text,
  p_actor_role text,
  p_matched_participant_id uuid,
  p_verification_note text,
  p_resolution_note text,
  p_decision_message text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_request public.spogomi_team_join_requests%rowtype;
  v_event public.spogomi_events%rowtype;
  v_participant public.spogomi_participants%rowtype;
  v_policy jsonb := '{}'::jsonb;
  v_capacity integer;
  v_division_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_target_status not in ('approved', 'rejected', 'cancelled')
     or p_actor_kind not in ('requester', 'admin')
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_admission_transition';
  end if;

  select * into v_request from public.spogomi_team_join_requests where id = p_request_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'spogomi_admission_request_unavailable'; end if;
  if v_request.status = p_target_status then return to_jsonb(v_request); end if;
  if v_request.status <> 'pending' then raise exception using errcode = '40001', message = 'spogomi_admission_request_already_resolved'; end if;

  if p_target_status = 'cancelled' then
    if p_actor_kind <> 'requester' or p_actor_clerk_id <> v_request.requester_clerk_id then
      raise exception using errcode = '42501', message = 'spogomi_admission_requester_required';
    end if;
  elsif p_actor_kind <> 'admin' or p_actor_role not in ('admin', 'max') or p_actor_clerk_id = v_request.requester_clerk_id then
    raise exception using errcode = '42501', message = 'spogomi_admission_admin_required';
  end if;

  if p_target_status = 'approved' and v_request.request_kind = 'team_join'
     and (p_matched_participant_id is null or length(btrim(coalesce(p_verification_note, ''))) < 10) then
    raise exception using errcode = '42501', message = 'spogomi_admission_verification_required';
  end if;
  if p_target_status = 'approved' and v_request.request_kind = 'registration'
     and (p_matched_participant_id is not null or length(btrim(coalesce(p_verification_note, ''))) < 10) then
    raise exception using errcode = '42501', message = 'spogomi_registration_verification_required';
  end if;
  if p_target_status = 'approved' and v_request.request_kind = 'presence_regularization'
     and length(btrim(coalesce(p_verification_note, ''))) < 10 then
    raise exception using errcode = '42501', message = 'spogomi_presence_verification_required';
  end if;

  if p_target_status = 'approved' and v_request.request_kind = 'team_join' then
    select * into v_participant
      from public.spogomi_participants participant
     where participant.id = p_matched_participant_id
       and participant.event_id = p_event_id
       and participant.team_id = v_request.team_id
       and participant.registration_status = 'registered'
       and participant.account_link_status <> 'verified'
     for update;
    if not found then raise exception using errcode = '42501', message = 'spogomi_team_join_participant_mismatch'; end if;
    if exists (select 1 from public.spogomi_participants participant where participant.event_id = p_event_id and participant.clerk_id = v_request.requester_clerk_id and participant.account_link_status = 'verified') then
      raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
    end if;
    update public.spogomi_participants
       set account_link_status = 'verified', clerk_id = v_request.requester_clerk_id,
           identity_link_code_hash = null, identity_link_code_expires_at = null, identity_link_code_revoked_at = now(), updated_at = now()
     where id = v_participant.id and event_id = p_event_id;
    insert into public.spogomi_identity_link_events(event_id, participant_id, event_type, actor_kind, actor_clerk_id, outcome, reason)
    values (p_event_id, v_participant.id, 'admin_approved', 'admin', p_actor_clerk_id, 'success', 'team_join_request_verified');
  elsif p_target_status = 'approved' and v_request.request_kind = 'registration' then
    select * into v_event from public.spogomi_events where id = p_event_id for update;
    if v_event.state <> 'registration_open' then
      raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed';
    end if;
    select coalesce(d.regulation_config -> 'registrationPolicy', '{}'::jsonb)
      into v_policy from public.spogomi_divisions d where d.id = v_request.division_id and d.event_id = p_event_id;
    v_policy := coalesce(v_policy, '{}'::jsonb) || coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);
    if coalesce(v_policy ->> 'directRegistrationOpen', 'false') <> 'true' then
      raise exception using errcode = '42501', message = 'spogomi_direct_registration_closed';
    end if;
    if coalesce(v_policy ->> 'externalTicketingRequired', 'false') = 'true' then
      raise exception using errcode = '42501', message = 'spogomi_external_ticketing_required';
    end if;
    if v_event.mode = 'world_cup' or exists (
      select 1 from public.spogomi_divisions where id = v_request.division_id and division_type = 'world_cup'
    ) then
      if coalesce(v_policy ->> 'worldCupDirectRegistrationAllowed', 'false') <> 'true' then
        raise exception using errcode = '42501', message = 'spogomi_world_cup_official_path_required';
      end if;
    end if;
    if (v_policy ->> 'capacity') ~ '^[0-9]+$' then
      v_capacity := (v_policy ->> 'capacity')::integer;
      if (select count(*) from public.spogomi_participants where event_id = p_event_id and registration_status = 'registered') >= v_capacity then
        raise exception using errcode = '42501', message = 'spogomi_registration_capacity_reached';
      end if;
    end if;
    if exists (select 1 from public.spogomi_participants participant where participant.event_id = p_event_id and participant.clerk_id = v_request.requester_clerk_id and participant.account_link_status = 'verified') then
      raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
    end if;
    insert into public.spogomi_participants(event_id, division_id, source_system, identity_status, registration_status, attendance_status, account_link_status, clerk_id)
    values (p_event_id, v_request.division_id, 'direct_registration', 'identified', 'registered', 'unknown', 'verified', v_request.requester_clerk_id)
    returning * into v_participant;
    p_matched_participant_id := v_participant.id;
  end if;

  update public.spogomi_team_join_requests
     set status = p_target_status,
         matched_participant_id = case when p_target_status = 'approved' and v_request.request_kind in ('team_join', 'registration') then p_matched_participant_id else null end,
         verification_note = case when p_target_status = 'approved' then nullif(btrim(p_verification_note), '') else null end,
         resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), ''),
         decision_message = nullif(btrim(coalesce(p_decision_message, '')), ''),
         decided_by_clerk_id = btrim(p_actor_clerk_id), decided_at = now(), updated_at = now()
   where id = p_request_id and event_id = p_event_id
   returning * into v_request;

  insert into public.spogomi_team_join_request_events(request_id, event_id, status, actor_kind, actor_clerk_id, details)
  values (v_request.id, v_request.event_id, v_request.status, p_actor_kind, btrim(p_actor_clerk_id),
    jsonb_build_object('request_kind', v_request.request_kind, 'division_id', v_request.division_id, 'matched_participant_id', v_request.matched_participant_id, 'has_verification_note', v_request.verification_note is not null));
  return to_jsonb(v_request);
end;
$$;

create or replace function public.transition_spogomi_team_join_request(
  p_request_id uuid,
  p_event_id uuid,
  p_target_status text,
  p_actor_kind text,
  p_actor_clerk_id text,
  p_actor_role text,
  p_matched_participant_id uuid,
  p_verification_note text,
  p_resolution_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  return public.transition_spogomi_admission_request(p_request_id, p_event_id, p_target_status, p_actor_kind, p_actor_clerk_id, p_actor_role, p_matched_participant_id, p_verification_note, p_resolution_note, null);
end;
$$;

revoke all on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.transition_spogomi_admission_request(uuid, uuid, text, text, text, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_admission_request(uuid, uuid, text, text, uuid, text) to service_role;
grant execute on function public.transition_spogomi_admission_request(uuid, uuid, text, text, text, text, uuid, text, text, text) to service_role;
