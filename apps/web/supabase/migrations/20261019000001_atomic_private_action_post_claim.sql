-- PURPOSE: atomically authenticate a private post-action claim with the
--          invitation bearer proof before creating action_participants.
-- CALLER: authenticated server-side invitation route through service_role.
-- AUTHORIZATION_BOUNDARY: browser roles have no table or function access;
--                         the function requires invite_link plus the matching
--                         hash for this action.
-- IDEMPOTENCY: one action/user row is serialized by an advisory transaction
--              lock; an existing pending post_action_claim or confirmed
--              participation is returned unchanged, while cancelled rows stay
--              terminal.
-- ATOMICITY: invitation, action, and participant decisions are locked in one
--            transaction before validation and insertion.
-- FAILURE_BEHAVIOR: invalid, expired, revoked, replaced, non-private,
--                   unpublished, hidden, non-terminal, or terminally refused
--                   claims abort without a participant write.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: service_role only.

create or replace function public.claim_private_action_participation(
  p_action_id uuid,
  p_user_id text,
  p_token_hash text
)
returns table (
  action_id uuid,
  participant_user_id text,
  participation_status text,
  participation_source text,
  joined_at timestamptz,
  updated_at timestamptz,
  already_requested boolean
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_invitation public.action_invitation_links;
  v_action public.actions;
  v_participant public.action_participants;
  v_now timestamptz := timezone('utc', now());
  v_local_now timestamp := timezone('Europe/Paris', v_now);
begin
  if nullif(trim(p_user_id), '') is null then
    raise exception 'private_post_action_claim_user_required' using errcode = '22023';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'private_post_action_claim_invitation_invalid' using errcode = 'P0001';
  end if;

  select *
    into v_invitation
    from public.action_invitation_links
   where action_id = p_action_id
     and token_hash = p_token_hash
   for update;
  if not found
     or v_invitation.revoked_at is not null
     or v_invitation.expires_at <= v_now then
    raise exception 'private_post_action_claim_invitation_invalid' using errcode = 'P0001';
  end if;

  select *
    into v_action
    from public.actions
   where id = p_action_id
   for update;
  if not found
     or coalesce(v_action.access_mode, 'public') <> 'invite_link'
     or v_action.status <> 'approved'
     or coalesce(v_action.moderation_visibility, 'visible') = 'hidden'
     or v_action.published_at is null
     or v_action.action_phase <> 'post_action_complete'
     or v_action.action_date > v_local_now::date
     or (
       v_action.action_date = v_local_now::date
       and v_action.event_start_time is not null
       and v_action.event_start_time > v_local_now::time
     ) then
    raise exception 'private_post_action_claim_action_unavailable' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_action_id::text || ':' || p_user_id, 0)
  );

  select *
    into v_participant
    from public.action_participants
   where action_id = p_action_id
     and user_id = p_user_id
   for update;

  if found then
    if v_participant.participation_status = 'cancelled' then
      raise exception 'private_post_action_claim_already_decided' using errcode = 'P0001';
    end if;
    if v_participant.participation_status = 'pending'
       and v_participant.participation_source <> 'post_action_claim' then
      raise exception 'private_post_action_claim_already_active' using errcode = 'P0001';
    end if;

    return query
    select
      v_participant.action_id,
      v_participant.user_id,
      v_participant.participation_status,
      v_participant.participation_source,
      v_participant.joined_at,
      v_participant.updated_at,
      true;
    return;
  end if;

  insert into public.action_participants (
    action_id,
    user_id,
    joined_at,
    participation_status,
    participation_source
  ) values (
    p_action_id,
    p_user_id,
    v_now,
    'pending',
    'post_action_claim'
  )
  returning * into v_participant;

  return query
  select
    v_participant.action_id,
    v_participant.user_id,
    v_participant.participation_status,
    v_participant.participation_source,
    v_participant.joined_at,
    v_participant.updated_at,
    false;
end;
$$;

revoke all on function public.claim_private_action_participation(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_private_action_participation(uuid, text, text)
  to service_role;
