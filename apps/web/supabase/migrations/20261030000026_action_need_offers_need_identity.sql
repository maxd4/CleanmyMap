-- PURPOSE: bind every offer transition to the need identity supplied by the
-- HTTP route before any status or notification mutation can occur.
-- CALLER: the authenticated community offer PATCH route through the canonical
-- service helper.
-- AUTHORIZATION_BOUNDARY: only service_role can execute the transition RPC;
-- the HTTP handler remains responsible for AuthN and business authorization.
-- IDEMPOTENCY: terminal retries and acceptance notification deduplication are
-- preserved; the old three-argument RPC signature is removed.
-- ATOMICITY: expected need, action and offer are locked before transition or
-- notification insertion.
-- FAILURE_BEHAVIOR: an absent or mismatched need/offer pair raises P0002 before
-- any business mutation; existing actor, status and eligibility errors remain.
-- SEARCH_PATH: explicit pg_catalog, public.
-- GRANTS: only service_role can execute the four-argument RPC.

create or replace function public.transition_action_need_offer(
  p_need_id uuid,
  p_offer_id uuid,
  p_actor_clerk_id text,
  p_operation text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_need public.action_needs%rowtype;
  v_action public.actions%rowtype;
  v_offer public.action_need_offers%rowtype;
  v_target_status text;
  v_notification_id uuid;
begin
  if nullif(btrim(p_actor_clerk_id), '') is null then
    raise exception 'action_need_offer_actor_required' using errcode = '42501';
  end if;
  if p_operation not in ('accept', 'decline', 'withdraw') then
    raise exception 'action_need_offer_operation_invalid' using errcode = '22023';
  end if;

  -- Lock the expected need and its action before resolving the offer. The
  -- second predicate binds the offer identity to that locked need, so a URL
  -- containing another need can never reach a status or notification write.
  select into v_need, v_action
    n, a
    from public.action_needs n
    join public.actions a on a.id = n.action_id
   where n.id = p_need_id
   for update of n, a;
  if not found then
    raise exception 'action_need_offer_not_found' using errcode = 'P0002';
  end if;

  select * into v_offer
    from public.action_need_offers
   where id = p_offer_id
     and need_id = v_need.id
   for update;
  if not found then
    raise exception 'action_need_offer_not_found' using errcode = 'P0002';
  end if;

  if p_operation = 'withdraw' then
    if v_offer.offered_by_clerk_id <> btrim(p_actor_clerk_id) then
      raise exception 'action_need_offer_withdraw_forbidden' using errcode = '42501';
    end if;
    if v_offer.status = 'withdrawn' then
      return jsonb_build_object('status', 'withdrawn', 'offer', to_jsonb(v_offer), 'notificationId', null);
    end if;
    if v_offer.status <> 'pending' then
      raise exception 'action_need_offer_transition_conflict' using errcode = '40001';
    end if;
    update public.action_need_offers
       set status = 'withdrawn'
     where id = v_offer.id
     returning * into v_offer;
    return jsonb_build_object('status', 'withdrawn', 'offer', to_jsonb(v_offer), 'notificationId', null);
  end if;

  if v_action.created_by_clerk_id <> btrim(p_actor_clerk_id)
     and not exists (
       select 1
       from public.action_organizers ao
       where ao.action_id = v_action.id
         and ao.organizer_clerk_id = btrim(p_actor_clerk_id)
     ) then
    raise exception 'action_need_offer_manager_forbidden' using errcode = '42501';
  end if;

  v_target_status := case when p_operation = 'accept' then 'accepted' else 'declined' end;
  if v_offer.status = v_target_status then
    -- A retry is idempotent. Repair the notification if an older accepted row
    -- predates this boundary, while the unique index prevents duplication.
    if v_target_status = 'accepted' then
      insert into public.app_notifications (user_id, type, title, content, payload)
      values (
        v_offer.offered_by_clerk_id,
        'community',
        'Offre d’aide acceptée',
        'Votre proposition d’aide pour un besoin d’action a été acceptée.',
        jsonb_build_object(
          'kind', 'action_need_offer_accepted',
          'offerId', v_offer.id::text,
          'needId', v_need.id::text,
          'actionId', v_action.id::text
        )
      )
      on conflict (user_id, type, ((payload ->> 'offerId')))
        where type = 'community'
          and (payload ->> 'kind') = 'action_need_offer_accepted'
      do nothing
      returning id into v_notification_id;
      if v_notification_id is null then
        select id into v_notification_id
          from public.app_notifications
         where user_id = v_offer.offered_by_clerk_id
           and type = 'community'
           and payload ->> 'kind' = 'action_need_offer_accepted'
           and payload ->> 'offerId' = v_offer.id::text
         limit 1;
      end if;
    end if;
    return jsonb_build_object('status', v_offer.status, 'offer', to_jsonb(v_offer), 'notificationId', v_notification_id);
  end if;

  if v_offer.status <> 'pending' then
    raise exception 'action_need_offer_transition_conflict' using errcode = '40001';
  end if;
  if not public.is_public_open_action_need(v_need.id) then
    raise exception 'action_need_offer_need_not_eligible' using errcode = '40001';
  end if;

  update public.action_need_offers
     set status = v_target_status
   where id = v_offer.id
   returning * into v_offer;

  if v_target_status = 'accepted' then
    insert into public.app_notifications (user_id, type, title, content, payload)
    values (
      v_offer.offered_by_clerk_id,
      'community',
      'Offre d’aide acceptée',
      'Votre proposition d’aide pour un besoin d’action a été acceptée.',
      jsonb_build_object(
        'kind', 'action_need_offer_accepted',
        'offerId', v_offer.id::text,
        'needId', v_need.id::text,
        'actionId', v_action.id::text
      )
    )
    on conflict (user_id, type, ((payload ->> 'offerId')))
      where type = 'community'
        and (payload ->> 'kind') = 'action_need_offer_accepted'
    do nothing
    returning id into v_notification_id;
  end if;

  return jsonb_build_object('status', v_offer.status, 'offer', to_jsonb(v_offer), 'notificationId', v_notification_id);
end;
$$;

revoke all on function public.transition_action_need_offer(uuid, text, text)
  from public, anon, authenticated, service_role;
drop function if exists public.transition_action_need_offer(uuid, text, text);
revoke all on function public.transition_action_need_offer(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.transition_action_need_offer(uuid, uuid, text, text)
  to service_role;
