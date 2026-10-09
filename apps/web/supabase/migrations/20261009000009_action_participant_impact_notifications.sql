-- PURPOSE: notify confirmed final participants when the canonical personal
--           impact projection becomes available or changes.
-- OWNER: action participant projection in the web domain. This migration only
--        persists action_event delivery; it never allocates a quote-part.
-- IDEMPOTENCY: the base event is unique per action/recipient and projection
--              refreshes use versioned event keys from the canonical TS projection.
-- AUTHORIZATION: service_role-only trigger functions; recipient is always the
--                confirmed action_participants row being projected.

create unique index if not exists app_notifications_action_result_impact_event_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventKey')
  )
  where type = 'action_event'
    and payload ->> 'subtype' = 'action_result_impact'
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.emit_action_result_impact_notification_for_participant(
  p_action_id uuid,
  p_user_id text
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

  insert into public.app_notifications (user_id, type, title, content, payload)
  select
    ap.user_id,
    'action_event',
    'Participation confirmée et résultats disponibles',
    'Votre participation finale est confirmée. Consultez le détail de l’action pour voir les résultats et votre impact personnel à jour.',
    jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'action_result_impact',
      'requestKind', 'action_result_impact',
      'actionId', ap.action_id,
      'decisionState', 'informational',
      'eventKey', 'action_result_impact:' || ap.action_id::text || ':' || ap.user_id || ':available',
      'href', '/sections/rejoindre-une-action?tab=past&actionId=' || ap.action_id
    )
  from public.action_participants ap
  join public.actions a on a.id = ap.action_id
  where ap.action_id = p_action_id
    and ap.user_id = p_user_id
    and ap.participation_status = 'confirmed'
    and a.status = 'approved'
    and a.action_phase = 'post_action_complete'
    and a.published_at is not null
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;

  update public.app_notifications
  set read_at = coalesce(read_at, timezone('utc', now())),
      seen_at = coalesce(seen_at, timezone('utc', now())),
      payload = coalesce(payload, '{}'::jsonb) ||
        jsonb_build_object('decisionState', 'treated', 'decision', 'confirmed')
  where user_id = p_user_id
    and type = 'action_event'
    and payload ->> 'subtype' = 'action_result'
    and payload ->> 'actionId' = p_action_id::text
    and payload ->> 'decisionState' = 'pending';

  return v_inserted_count;
end;
$$;

revoke all on function public.emit_action_result_impact_notification_for_participant(uuid, text)
  from public, anon, authenticated;
grant execute on function public.emit_action_result_impact_notification_for_participant(uuid, text)
  to service_role;

create or replace function public.emit_action_result_impact_notifications_on_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  for v_user_id in
    select ap.user_id
    from public.action_participants ap
    where ap.action_id = new.id
      and ap.participation_status = 'confirmed'
  loop
    perform public.emit_action_result_impact_notification_for_participant(new.id, v_user_id);
  end loop;

  return new;
end;
$$;

drop trigger if exists actions_action_result_impact_notifications
  on public.actions;
create trigger actions_action_result_impact_notifications
after insert or update of action_phase, published_at, status, moderation_visibility
on public.actions
for each row execute function public.emit_action_result_impact_notifications_on_action();

revoke all on function public.emit_action_result_impact_notifications_on_action()
  from public, anon, authenticated;
grant execute on function public.emit_action_result_impact_notifications_on_action()
  to service_role;

create or replace function public.emit_action_result_impact_notification_on_participant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if new.participation_status = 'confirmed' then
    perform public.emit_action_result_impact_notification_for_participant(
      new.action_id,
      new.user_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists action_participants_action_result_impact_notifications
  on public.action_participants;
create trigger action_participants_action_result_impact_notifications
after insert or update of participation_status, participation_source
on public.action_participants
for each row execute function public.emit_action_result_impact_notification_on_participant();

revoke all on function public.emit_action_result_impact_notification_on_participant()
  from public, anon, authenticated;
grant execute on function public.emit_action_result_impact_notification_on_participant()
  to service_role;

-- Replace only the claimant outcome branch from 20261009000008: an accepted
-- claim is now consolidated with the result/impact notification instead of
-- creating a second informational confirmation for the same action.
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
          'href', '/sections/rejoindre-une-action?tab=past&actionId=' || new.action_id
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
      case when v_decision = 'accepted'
        then 'Participation confirmée et résultats disponibles'
        else 'Réclamation de participation refusée'
      end,
      case when v_decision = 'accepted'
        then 'Votre participation finale est confirmée. Consultez le détail de l’action pour voir les résultats et votre impact personnel à jour.'
        else 'Votre réclamation de participation n''a pas été acceptée.'
      end,
      jsonb_build_object(
        'eventType', 'action_event',
        'subtype', case when v_decision = 'accepted' then 'action_result_impact' else 'post_action_claim_decision' end,
        'requestKind', case when v_decision = 'accepted' then 'action_result_impact' else 'post_action_claim_decision' end,
        'actionId', new.action_id,
        'participationId', new.id,
        'decision', v_decision,
        'decisionState', 'informational',
        'eventKey', case when v_decision = 'accepted'
          then 'action_result_impact:' || new.action_id::text || ':' || new.user_id || ':available'
          else 'post_action_claim_decision:' || new.id::text || ':' || new.participation_status
        end,
        'href', '/sections/rejoindre-une-action?tab=past&actionId=' || new.action_id
      )
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_action_post_action_claim_notifications()
  from public, anon, authenticated;
grant execute on function public.sync_action_post_action_claim_notifications()
  to service_role;
