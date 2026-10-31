-- 6C1 corrective migration: qualify columns that collide with RETURNS TABLE
-- output variables in accept_action_buddy_proposal without changing its
-- matching, locking, transition, notification or privilege contract.

create or replace function public.accept_action_buddy_proposal(p_proposal_id uuid)
returns table (
  status text,
  request_id uuid,
  proposal_id uuid,
  mentor_user_id text,
  matched_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action public.actions%rowtype;
  v_request public.action_buddy_requests%rowtype;
  v_proposal public.action_buddy_proposals%rowtype;
  v_probe record;
  v_registration record;
  v_requester_confirmed boolean := false;
  v_mentor_confirmed boolean := false;
  v_existing_request_id uuid;
  v_matched_at timestamptz := now();
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'action_buddy_server_only' using errcode = '42501';
  end if;

  select p.id, p.request_id, p.mentor_user_id, r.action_id
  into v_probe
  from public.action_buddy_proposals as p
  join public.action_buddy_requests as r on r.id = p.request_id
  where p.id = p_proposal_id;

  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  -- Serialize every acceptance competing for the same action/mentor before
  -- taking the canonical action/request/proposal row locks.
  perform pg_advisory_xact_lock(
    hashtextextended(format('action-buddy:%s:%s', v_probe.action_id, v_probe.mentor_user_id), 0)
  );

  select action_row.* into v_action
  from public.actions as action_row
  where action_row.id = v_probe.action_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  select request_row.* into v_request
  from public.action_buddy_requests as request_row
  where request_row.id = v_probe.request_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  select proposal_row.* into v_proposal
  from public.action_buddy_proposals as proposal_row
  where proposal_row.id = p_proposal_id
  for update;
  if not found then
    raise exception 'action_buddy_not_found' using errcode = 'P0002';
  end if;

  if v_proposal.status = 'accepted'
     and v_request.status = 'matched'
     and v_request.matched_mentor_user_id = v_proposal.mentor_user_id then
    return query select 'already_matched'::text, v_request.id, v_proposal.id, v_proposal.mentor_user_id, v_request.matched_at;
    return;
  end if;

  if v_proposal.status <> 'pending' then
    raise exception 'action_buddy_conflict_proposal_not_pending' using errcode = 'P0001';
  end if;
  if v_request.status <> 'open' then
    raise exception 'action_buddy_conflict_request_not_open' using errcode = 'P0001';
  end if;
  if v_request.requester_user_id = v_proposal.mentor_user_id then
    raise exception 'action_buddy_conflict_self_match' using errcode = 'P0001';
  end if;
  if coalesce(v_action.access_mode, 'public') = 'invite_link'
     or not public.is_public_future_pre_action_reviewed(
       coalesce(v_action.action_phase, 'post_action_complete'),
       v_action.published_at,
       coalesce(v_action.moderation_visibility, 'visible'),
       v_action.status,
       coalesce(v_action.review_state, 'not_required'),
       v_action.action_date,
       v_action.event_start_time
     ) then
    raise exception 'action_buddy_conflict_action_not_eligible' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.action_buddy_availability as availability_row
    where availability_row.action_id = v_action.id
      and availability_row.mentor_user_id = v_proposal.mentor_user_id
    for update
  ) then
    raise exception 'action_buddy_conflict_mentor_unavailable' using errcode = 'P0001';
  end if;

  for v_registration in
    select ar.user_id, ar.registration_status
    from public.action_registrations as ar
    where ar.action_id = v_action.id
      and ar.user_id in (v_request.requester_user_id, v_proposal.mentor_user_id)
    order by ar.user_id
    for update
  loop
    if v_registration.user_id = v_request.requester_user_id
       and v_registration.registration_status = 'confirmed' then
      v_requester_confirmed := true;
    end if;
    if v_registration.user_id = v_proposal.mentor_user_id
       and v_registration.registration_status = 'confirmed' then
      v_mentor_confirmed := true;
    end if;
  end loop;

  if not v_requester_confirmed or not v_mentor_confirmed then
    raise exception 'action_buddy_conflict_registration_not_confirmed' using errcode = 'P0001';
  end if;

  select existing_request.id into v_existing_request_id
  from public.action_buddy_requests as existing_request
  where existing_request.action_id = v_action.id
    and existing_request.status = 'matched'
    and existing_request.matched_mentor_user_id = v_proposal.mentor_user_id
    and existing_request.id <> v_request.id
  order by existing_request.id
  for update;

  if found then
    raise exception 'action_buddy_conflict_mentor_already_matched' using errcode = 'P0001';
  end if;

  update public.action_buddy_proposals as competing_proposal
  set status = 'declined', resolved_at = v_matched_at
  where competing_proposal.request_id = v_request.id
    and competing_proposal.status = 'pending'
    and competing_proposal.id <> v_proposal.id;

  update public.action_buddy_requests as accepted_request
  set status = 'matched',
      matched_mentor_user_id = v_proposal.mentor_user_id,
      matched_at = v_matched_at
  where accepted_request.id = v_request.id;

  update public.action_buddy_proposals as accepted_proposal
  set status = 'accepted', resolved_at = v_matched_at
  where accepted_proposal.id = v_proposal.id;

  return query select 'matched'::text, v_request.id, v_proposal.id, v_proposal.mentor_user_id, v_matched_at;
exception
  when unique_violation then
    raise exception 'action_buddy_conflict_unique_matching' using errcode = 'P0001';
end;
$$;

revoke all on function public.accept_action_buddy_proposal(uuid) from public, anon, authenticated;
grant execute on function public.accept_action_buddy_proposal(uuid) to service_role;
