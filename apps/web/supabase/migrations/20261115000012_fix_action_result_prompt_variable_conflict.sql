-- PURPOSE: resolve the PL/pgSQL action_id ambiguity in the result prompt RPC.
-- CALLER: service_role-only server handlers; authenticated users never invoke
--         this function directly.
-- AUTHORIZATION_BOUNDARY: preserve the recipient-bound pending notification,
--                         canonical registration and service_role guard.
-- IDEMPOTENCY: preserve the action_participants (action_id, user_id) conflict
--              target and the existing treated/unavailable state transitions.
-- ATOMICITY: notification and participation changes remain in this RPC.
-- FAILURE_BEHAVIOR: unavailable, invalid, unauthorized and already-treated
--                   prompts retain their existing outcomes.
-- SEARCH_PATH: public, pg_catalog.
-- GRANTS: service_role only; public, anon and authenticated remain revoked.

create or replace function public.respond_to_action_result_prompt(
  p_action_id uuid,
  p_recipient_id text,
  p_decision text
)
returns table (status text, action_id uuid)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
#variable_conflict use_column
declare
  v_notification_id uuid;
  v_action_id uuid;
  v_participant_id uuid;
  v_participant_status text;
  v_participant_source text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_decision not in ('claim', 'not_participated') then
    raise exception 'Invalid action result decision';
  end if;

  select n.id, a.id
  into v_notification_id, v_action_id
  from public.app_notifications n
  join public.actions a on a.id::text = n.payload ->> 'actionId'
  join public.action_registrations ar
    on ar.action_id = a.id
   and ar.user_id = p_recipient_id
   and ar.registration_status = 'confirmed'
  where n.user_id = p_recipient_id
    and n.type = 'action_event'
    and n.payload ->> 'subtype' = 'action_result'
    and n.payload ->> 'decisionState' = 'pending'
    and a.id = p_action_id
    and a.status = 'approved'
    and a.action_phase = 'post_action_complete'
    and a.published_at is not null
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
  for update of n;

  if v_notification_id is null then
    return query select 'unavailable'::text, p_action_id;
    return;
  end if;

  if p_decision = 'not_participated' then
    update public.app_notifications
    set read_at = coalesce(read_at, timezone('utc', now())),
        seen_at = coalesce(seen_at, timezone('utc', now())),
        payload = coalesce(payload, '{}'::jsonb) ||
          jsonb_build_object('decisionState', 'treated', 'decision', 'not_participated')
    where id = v_notification_id;
    return query select 'declined'::text, v_action_id;
    return;
  end if;

  select ap.id, ap.participation_status, ap.participation_source
  into v_participant_id, v_participant_status, v_participant_source
  from public.action_participants ap
  where ap.action_id = p_action_id
    and ap.user_id = p_recipient_id
  for update;

  if v_participant_id is not null then
    if v_participant_source = 'post_action_claim'
      and v_participant_status in ('pending', 'confirmed') then
      update public.app_notifications
      set read_at = coalesce(read_at, timezone('utc', now())),
          seen_at = coalesce(seen_at, timezone('utc', now())),
          payload = coalesce(payload, '{}'::jsonb) ||
            jsonb_build_object('decisionState', 'treated', 'decision', 'claim')
      where id = v_notification_id;
      return query select 'claimed'::text, v_action_id;
      return;
    end if;

    update public.app_notifications
    set read_at = coalesce(read_at, timezone('utc', now())),
        seen_at = coalesce(seen_at, timezone('utc', now())),
        payload = coalesce(payload, '{}'::jsonb) ||
          jsonb_build_object('decisionState', 'unavailable', 'decision', 'withdrawn')
    where id = v_notification_id;
    return query select 'unavailable'::text, v_action_id;
    return;
  end if;

  insert into public.action_participants (
    action_id, user_id, joined_at, participation_status, participation_source
  )
  values (
    p_action_id, p_recipient_id, timezone('utc', now()), 'pending', 'post_action_claim'
  )
  on conflict (action_id, user_id) do nothing;

  select ap.id, ap.participation_status, ap.participation_source
  into v_participant_id, v_participant_status, v_participant_source
  from public.action_participants ap
  where ap.action_id = p_action_id
    and ap.user_id = p_recipient_id
  for update;

  if v_participant_source = 'post_action_claim'
    and v_participant_status = 'pending' then
    update public.app_notifications
    set read_at = coalesce(read_at, timezone('utc', now())),
        seen_at = coalesce(seen_at, timezone('utc', now())),
        payload = coalesce(payload, '{}'::jsonb) ||
          jsonb_build_object('decisionState', 'treated', 'decision', 'claim')
    where id = v_notification_id;
    return query select 'claimed'::text, v_action_id;
    return;
  end if;

  update public.app_notifications
  set read_at = coalesce(read_at, timezone('utc', now())),
      seen_at = coalesce(seen_at, timezone('utc', now())),
      payload = coalesce(payload, '{}'::jsonb) ||
        jsonb_build_object('decisionState', 'unavailable', 'decision', 'withdrawn')
  where id = v_notification_id;
  return query select 'unavailable'::text, v_action_id;
end;
$$;

revoke all on function public.respond_to_action_result_prompt(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_action_result_prompt(uuid, text, text)
  to service_role;
