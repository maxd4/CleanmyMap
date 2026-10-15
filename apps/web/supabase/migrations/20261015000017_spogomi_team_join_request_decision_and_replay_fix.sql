-- SPOGOMI team join requests: separate administrative rejection from approval
-- validation and keep cross-team replays fail-closed.

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
  v_existing public.spogomi_team_join_requests%rowtype;
  v_request_id uuid;
begin
  -- PUBLIC_AUTHN: the route authenticates the Clerk account before calling.
  -- PUBLIC_SCOPE: only a published event and an existing team are accepted.
  -- IDEMPOTENCY: one pending or approved request per account and event under an advisory lock.
  -- SIDE_EFFECTS: this function inserts only a request and its history row.
  if length(btrim(coalesce(p_requester_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_team_join_request';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s', p_event_id, btrim(p_requester_clerk_id)), 0));

  if not exists (
    select 1 from public.spogomi_events event
     where event.id = p_event_id
       and event.public_visibility = 'published'
       and event.state <> 'cancelled'
  ) or not exists (
    select 1 from public.spogomi_teams team
     where team.id = p_team_id and team.event_id = p_event_id
  ) then
    raise exception using errcode = 'P0002', message = 'spogomi_team_join_unavailable';
  end if;

  select * into v_existing
    from public.spogomi_team_join_requests request
   where request.event_id = p_event_id
     and request.requester_clerk_id = btrim(p_requester_clerk_id)
     and request.status in ('pending', 'approved')
   order by request.created_at desc
   limit 1
   for update;
  if found then
    if v_existing.status = 'pending' and v_existing.team_id is distinct from p_team_id then
      raise exception using errcode = '23505', message = 'spogomi_team_join_request_already_pending';
    end if;
    if v_existing.status = 'approved' and v_existing.team_id is distinct from p_team_id then
      raise exception using errcode = '23505', message = 'spogomi_team_join_request_already_approved';
    end if;
    return query select v_existing.id, v_existing.status, v_existing.team_id;
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
    event_id, team_id, requester_clerk_id
  ) values (
    p_event_id, p_team_id, btrim(p_requester_clerk_id)
  ) returning id into v_request_id;

  insert into public.spogomi_team_join_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_request_id, p_event_id, 'pending', 'requester', btrim(p_requester_clerk_id), '{}'::jsonb
  );

  return query select v_request_id, 'pending'::text, p_team_id;
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
declare
  v_request public.spogomi_team_join_requests%rowtype;
  v_participant public.spogomi_participants%rowtype;
begin
  -- AUTHZ: requester cancellation or an active admin/max decision only.
  -- ATOMICITY: request, identity link and both audit histories commit together.
  -- INTEGRITY: the selected participant must already belong to this exact team.
  -- IDEMPOTENCY: repeating the same final status returns the current request after authz.
  if p_target_status not in ('approved', 'rejected', 'cancelled')
     or p_actor_kind not in ('requester', 'admin')
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'invalid_spogomi_team_join_transition';
  end if;

  select * into v_request
    from public.spogomi_team_join_requests request
   where request.id = p_request_id and request.event_id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_team_join_unavailable';
  end if;

  if p_target_status = 'cancelled' then
    if p_actor_kind <> 'requester' or btrim(p_actor_clerk_id) <> v_request.requester_clerk_id then
      raise exception using errcode = '42501', message = 'spogomi_team_join_requester_required';
    end if;
  elsif p_actor_kind <> 'admin'
     or p_actor_role is null
     or p_actor_role not in ('admin', 'max') then
    raise exception using errcode = '42501', message = 'spogomi_team_join_admin_required';
  end if;

  if v_request.status = p_target_status then
    return to_jsonb(v_request);
  end if;
  if v_request.status <> 'pending' then
    raise exception using errcode = '40001', message = 'spogomi_team_join_already_resolved';
  end if;

  if p_target_status = 'approved' then
    if p_matched_participant_id is null or length(btrim(coalesce(p_verification_note, ''))) < 10 then
      raise exception using errcode = '42501', message = 'spogomi_team_join_admin_verification_required';
    end if;

    select * into v_participant
      from public.spogomi_participants participant
     where participant.id = p_matched_participant_id
       and participant.event_id = p_event_id
       and participant.team_id = v_request.team_id
       and participant.registration_status = 'registered'
       and participant.account_link_status <> 'verified'
     for update;
    if not found then
      raise exception using errcode = '42501', message = 'spogomi_team_join_participant_mismatch';
    end if;
    if exists (
      select 1 from public.spogomi_participants participant
       where participant.event_id = p_event_id
         and participant.clerk_id = v_request.requester_clerk_id
         and participant.account_link_status = 'verified'
    ) then
      raise exception using errcode = '23505', message = 'spogomi_account_already_linked_for_event';
    end if;

    update public.spogomi_participants
       set account_link_status = 'verified',
           clerk_id = v_request.requester_clerk_id,
           identity_link_code_hash = null,
           identity_link_code_expires_at = null,
           identity_link_code_revoked_at = now(),
           updated_at = now()
     where id = v_participant.id and event_id = p_event_id;

    insert into public.spogomi_identity_link_events (
      event_id, participant_id, event_type, actor_kind, actor_clerk_id, outcome, reason
    ) values (
      p_event_id, v_participant.id, 'admin_approved', 'admin', p_actor_clerk_id, 'success', 'team_join_request_verified'
    );
  end if;

  update public.spogomi_team_join_requests
     set status = p_target_status,
         matched_participant_id = case when p_target_status = 'approved' then p_matched_participant_id else null end,
         verification_note = case when p_target_status = 'approved' then btrim(p_verification_note) else null end,
         resolution_note = nullif(btrim(coalesce(p_resolution_note, '')), ''),
         decided_by_clerk_id = btrim(p_actor_clerk_id),
         decided_at = now(),
         updated_at = now()
   where id = p_request_id
   returning * into v_request;

  insert into public.spogomi_team_join_request_events (
    request_id, event_id, status, actor_kind, actor_clerk_id, details
  ) values (
    v_request.id, v_request.event_id, v_request.status, p_actor_kind, btrim(p_actor_clerk_id),
    jsonb_build_object('matched_participant_id', v_request.matched_participant_id, 'has_verification_note', v_request.verification_note is not null)
  );

  return to_jsonb(v_request);
end;
$$;

revoke all on function public.create_spogomi_team_join_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.transition_spogomi_team_join_request(uuid, uuid, text, text, text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.create_spogomi_team_join_request(uuid, uuid, text) to service_role;
grant execute on function public.transition_spogomi_team_join_request(uuid, uuid, text, text, text, text, uuid, text, text) to service_role;
