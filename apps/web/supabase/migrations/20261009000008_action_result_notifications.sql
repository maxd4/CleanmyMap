-- PURPOSE: connect the public final action results to the existing in-app inbox.
-- CALLER: service_role action lifecycle triggers and authenticated server routes.
-- AUTHORIZATION_BOUNDARY: recipient/reviewer identity is checked against the
--                         canonical registration, participant and organizer rows.
-- IDEMPOTENCY: versioned event keys and conditional pending updates prevent
--              duplicate prompts, claims and review cards.
-- ATOMICITY: result responses and their notification state are one RPC; claim
--            review keeps the existing action_participants review mutation.
-- FAILURE_BEHAVIOR: an unavailable or already-finalized prompt is not actionable
--                   and never changes collective results.
-- SEARCH_PATH: every SECURITY DEFINER function pins public, pg_catalog.
-- GRANTS: RPCs are service_role-only; end users reach them through authenticated
--         handlers which bind the Clerk user id server-side.

create unique index if not exists app_notifications_action_result_event_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventKey')
  )
  where type = 'action_event'
    and payload ->> 'subtype' in (
      'action_result',
      'post_action_claim',
      'post_action_claim_decision'
    )
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.emit_action_result_notifications(
  p_action_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_inserted_count integer := 0;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if not exists (
    select 1
    from public.actions a
    where a.id = p_action_id
      and a.status = 'approved'
      and a.action_phase = 'post_action_complete'
      and a.published_at is not null
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
  ) then
    return 0;
  end if;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select
    ar.user_id,
    'action_event',
    'Résultats disponibles',
    'Le bilan public de cette action est disponible. Indiquez si vous y avez participé.',
    jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'action_result',
      'requestKind', 'action_result',
      'actionId', ar.action_id,
      'decisionState', 'pending',
      'eventKey', 'action_result:' || ar.action_id::text,
      'href', '/sections/rejoindre-une-action?actionId=' || ar.action_id
    )
  from public.action_registrations ar
  left join public.action_participants ap
    on ap.action_id = ar.action_id
   and ap.user_id = ar.user_id
   and ap.participation_status = 'confirmed'
  where ar.action_id = p_action_id
    and ar.registration_status = 'confirmed'
    and ap.id is null
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;

revoke all on function public.emit_action_result_notifications(uuid)
  from public, anon, authenticated;
grant execute on function public.emit_action_result_notifications(uuid)
  to service_role;

create or replace function public.emit_action_result_notifications_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.emit_action_result_notifications(new.id);
  return new;
end;
$$;

drop trigger if exists actions_action_result_notifications on public.actions;
create trigger actions_action_result_notifications
after insert or update of action_phase, published_at, status, moderation_visibility
on public.actions
for each row execute function public.emit_action_result_notifications_on_action();

revoke all on function public.emit_action_result_notifications_on_action()
  from public, anon, authenticated;
grant execute on function public.emit_action_result_notifications_on_action()
  to service_role;

create or replace function public.list_pending_action_result_prompts_for_recipient(
  p_recipient_id text
)
returns table (notification_id uuid, action_id uuid)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select n.id, a.id
  from public.app_notifications n
  join public.actions a
    on a.id::text = n.payload ->> 'actionId'
  join public.action_registrations ar
    on ar.action_id = a.id
   and ar.user_id = n.user_id
   and ar.registration_status = 'confirmed'
  left join public.action_participants ap
    on ap.action_id = a.id
   and ap.user_id = n.user_id
   and ap.participation_status = 'confirmed'
  where n.user_id = p_recipient_id
    and n.type = 'action_event'
    and n.payload ->> 'subtype' = 'action_result'
    and n.payload ->> 'decisionState' = 'pending'
    and a.status = 'approved'
    and a.action_phase = 'post_action_complete'
    and a.published_at is not null
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and ap.id is null
  order by n.created_at desc, n.id desc
  limit 100;
$$;

revoke all on function public.list_pending_action_result_prompts_for_recipient(text)
  from public, anon, authenticated;
grant execute on function public.list_pending_action_result_prompts_for_recipient(text)
  to service_role;

create or replace function public.list_pending_post_action_claims_for_reviewer(
  p_reviewer_id text
)
returns table (participation_id uuid, action_id uuid)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select ap.id, ap.action_id
  from public.action_participants ap
  join public.actions a on a.id = ap.action_id
  where ap.participation_source = 'post_action_claim'
    and ap.participation_status = 'pending'
    and a.status = 'approved'
    and a.action_phase = 'post_action_complete'
    and a.published_at is not null
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and exists (
      select 1
      from public.app_notifications n
      where n.user_id = p_reviewer_id
        and n.type = 'action_event'
        and n.payload ->> 'subtype' = 'post_action_claim'
        and n.payload ->> 'participationId' = ap.id::text
        and n.payload ->> 'decisionState' = 'pending'
    )
    and (
      a.created_by_clerk_id = p_reviewer_id
      or exists (
        select 1
        from public.action_organizers ao
        where ao.action_id = a.id
          and ao.organizer_clerk_id = p_reviewer_id
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = p_reviewer_id
          and p.active_role_label in ('admin', 'max')
      )
    )
  order by ap.created_at asc, ap.id asc
  limit 100;
$$;

revoke all on function public.list_pending_post_action_claims_for_reviewer(text)
  from public, anon, authenticated;
grant execute on function public.list_pending_post_action_claims_for_reviewer(text)
  to service_role;

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

create or replace function public.sync_action_post_action_claim_notifications()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_reviewer_id text;
  v_decision text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if new.participation_source = 'post_action_claim'
    and new.participation_status = 'pending'
    and (tg_op = 'INSERT'
      or (tg_op = 'UPDATE'
        and (old.participation_status is distinct from new.participation_status
          or old.participation_source is distinct from new.participation_source)))
    and exists (
      select 1
      from public.actions a
      where a.id = new.action_id
        and a.status = 'approved'
        and a.action_phase = 'post_action_complete'
        and a.published_at is not null
        and coalesce(a.moderation_visibility, 'visible') = 'visible'
    )
  then
    for v_reviewer_id in
      select distinct candidate.user_id
      from (
        select a.created_by_clerk_id as user_id
        from public.actions a
        where a.id = new.action_id
        union all
        select ao.organizer_clerk_id
        from public.action_organizers ao
        where ao.action_id = new.action_id
        union all
        select p.id
        from public.profiles p
        where p.active_role_label in ('admin', 'max')
      ) candidate
      where nullif(btrim(candidate.user_id), '') is not null
        and candidate.user_id <> new.user_id
    loop
      insert into public.app_notifications (user_id, type, title, content, payload)
      values (
        v_reviewer_id,
        'action_event',
        'Réclamation de participation à examiner',
        'Un inscrit demande à être rattaché à la participation finale de cette action.',
        jsonb_build_object(
          'eventType', 'action_event',
          'subtype', 'post_action_claim',
          'requestKind', 'post_action_claim',
          'actionId', new.action_id,
          'participationId', new.id,
          'decisionState', 'pending',
          'eventKey', 'post_action_claim:' || new.id::text,
          'href', '/sections/rejoindre-une-action?actionId=' || new.action_id
        )
      )
      on conflict do nothing;
    end loop;

    update public.app_notifications
    set read_at = coalesce(read_at, timezone('utc', now())),
        seen_at = coalesce(seen_at, timezone('utc', now())),
        payload = coalesce(payload, '{}'::jsonb) ||
          jsonb_build_object('decisionState', 'treated', 'decision', 'claim')
    where user_id = new.user_id
      and type = 'action_event'
      and payload ->> 'subtype' = 'action_result'
      and payload ->> 'actionId' = new.action_id::text
      and payload ->> 'decisionState' = 'pending';
  end if;

  if tg_op = 'UPDATE'
    and old.participation_source = 'post_action_claim'
    and old.participation_status = 'pending'
    and new.participation_status in ('confirmed', 'cancelled')
  then
    v_decision := case when new.participation_status = 'confirmed' then 'accepted' else 'rejected' end;

    update public.app_notifications
    set read_at = coalesce(read_at, timezone('utc', now())),
        seen_at = coalesce(seen_at, timezone('utc', now())),
        payload = coalesce(payload, '{}'::jsonb) ||
          jsonb_build_object('decisionState', 'treated', 'decision', case when v_decision = 'accepted' then 'accept' else 'reject' end)
    where user_id <> new.user_id
      and type = 'action_event'
      and payload ->> 'subtype' = 'post_action_claim'
      and payload ->> 'participationId' = new.id::text;

    insert into public.app_notifications (user_id, type, title, content, payload)
    values (
      new.user_id,
      'action_event',
      case when v_decision = 'accepted' then 'Participation confirmée' else 'Réclamation de participation refusée' end,
      case when v_decision = 'accepted'
        then 'Votre réclamation a été acceptée. Votre participation finale est maintenant prise en compte.'
        else 'Votre réclamation de participation n''a pas été acceptée.'
      end,
      jsonb_build_object(
        'eventType', 'action_event',
        'subtype', 'post_action_claim_decision',
        'requestKind', 'post_action_claim_decision',
        'actionId', new.action_id,
        'participationId', new.id,
        'decision', v_decision,
        'decisionState', 'informational',
        'eventKey', 'post_action_claim_decision:' || new.id::text || ':' || new.participation_status,
        'href', '/sections/rejoindre-une-action?actionId=' || new.action_id
      )
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists action_participants_post_action_claim_notifications
  on public.action_participants;
create trigger action_participants_post_action_claim_notifications
after insert or update of participation_status, participation_source
on public.action_participants
for each row execute function public.sync_action_post_action_claim_notifications();

revoke all on function public.sync_action_post_action_claim_notifications()
  from public, anon, authenticated;
grant execute on function public.sync_action_post_action_claim_notifications()
  to service_role;
