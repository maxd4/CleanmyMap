-- PURPOSE: extend the existing action_event delivery contract to meaningful
--          published safety and equipment changes.
-- CALLER: server-side action update post-processing only.
-- AUTHORIZATION_BOUNDARY: service_role RPC; recipients remain the creator,
--                         canonical organizers and confirmed registrants.
-- IDEMPOTENCY: eventKey remains unique per recipient and persisted revision;
--               unread rows retain a bounded event trace.
-- ATOMICITY: recipient delivery and unread grouping remain transactional per
--            RPC call, with an advisory lock per action/recipient pair.
-- FAILURE_BEHAVIOR: a rejected or non-published action returns zero; retries
--                   use the same event key and do not duplicate rows.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: execute remains restricted to service_role.

create or replace function public.emit_action_update_notifications(
  p_action_id uuid,
  p_actor_id text,
  p_change_kinds text[],
  p_event_key text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_recipient_id text;
  v_notification_id uuid;
  v_payload jsonb;
  v_existing_kinds text[];
  v_next_kinds text[];
  v_labels text[];
  v_event jsonb;
  v_next_events jsonb;
  v_next_event_keys jsonb;
  v_title text;
  v_content text;
  v_now timestamptz := timezone('utc', now());
  v_delivered_count integer := 0;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if nullif(btrim(p_actor_id), '') is null
    or nullif(btrim(p_event_key), '') is null
    or p_change_kinds is null
    or cardinality(p_change_kinds) = 0
    or exists (
      select 1
      from unnest(p_change_kinds) as requested(kind)
      where kind not in (
        'meeting_point', 'schedule', 'route', 'safety', 'materials', 'cancellation'
      )
    )
  then
    raise exception 'Invalid action update notification payload';
  end if;

  select a.*
  into v_action
  from public.actions a
  where a.id = p_action_id;

  if not found
    or v_action.published_at is null
    or v_action.action_phase <> 'pre_action'
    or coalesce(v_action.moderation_visibility, 'visible') <> 'visible'
  then
    return 0;
  end if;

  if 'cancellation' = any(p_change_kinds) then
    if v_action.status <> 'cancelled' then
      return 0;
    end if;
  elsif v_action.status not in ('pending', 'approved') then
    return 0;
  end if;

  for v_recipient_id in
    select distinct candidate.user_id
    from (
      select v_action.created_by_clerk_id as user_id
      union all
      select ao.organizer_clerk_id
      from public.action_organizers ao
      where ao.action_id = p_action_id
      union all
      select ar.user_id
      from public.action_registrations ar
      where ar.action_id = p_action_id
        and ar.registration_status = 'confirmed'
    ) candidate
    where nullif(btrim(candidate.user_id), '') is not null
      and candidate.user_id <> p_actor_id
  loop
    perform pg_advisory_xact_lock(
      hashtextextended(p_action_id::text || ':' || v_recipient_id, 0)
    );

    if exists (
      select 1
      from public.app_notifications n
      where n.user_id = v_recipient_id
        and n.type = 'action_event'
        and n.payload ->> 'subtype' = 'action_update'
        and (
          n.payload ->> 'eventKey' = p_event_key
          or (
            jsonb_typeof(n.payload -> 'eventKeys') = 'array'
            and (n.payload -> 'eventKeys') ? p_event_key
          )
          or (
            jsonb_typeof(n.payload -> 'changeEvents') = 'array'
            and exists (
              select 1
              from jsonb_array_elements(n.payload -> 'changeEvents') as event_item
              where event_item ->> 'eventKey' = p_event_key
            )
          )
        )
    ) then
      continue;
    end if;

    select n.id, coalesce(n.payload, '{}'::jsonb)
    into v_notification_id, v_payload
    from public.app_notifications n
    where n.user_id = v_recipient_id
      and n.type = 'action_event'
      and n.payload ->> 'subtype' = 'action_update'
      and n.payload ->> 'actionId' = p_action_id::text
      and n.read_at is null
    order by n.created_at desc, n.id desc
    limit 1
    for update;

    v_existing_kinds := case
      when jsonb_typeof(v_payload -> 'changeKinds') = 'array'
        then array(select jsonb_array_elements_text(v_payload -> 'changeKinds'))
      when nullif(v_payload ->> 'changeKind', '') is not null
        then array[v_payload ->> 'changeKind']
      else array[]::text[]
    end;
    select array_agg(distinct kind order by kind)
    into v_next_kinds
    from unnest(v_existing_kinds || p_change_kinds) as requested(kind);

    select array_agg(
      case kind
        when 'meeting_point' then 'Rendez-vous modifié'
        when 'schedule' then 'Horaire modifié'
        when 'route' then 'Parcours actualisé'
        when 'safety' then 'Consignes de sécurité modifiées'
        when 'materials' then 'Matériel à prévoir modifié'
        when 'cancellation' then 'Action annulée'
      end
      order by kind
    )
    into v_labels
    from unnest(v_next_kinds) as requested(kind);

    v_title := case
      when 'cancellation' = any(v_next_kinds) then 'Action annulée'
      when cardinality(v_next_kinds) = 1 then v_labels[1]
      else 'Action modifiée'
    end;
    v_content := 'Les informations pratiques ou opérationnelles de cette action ont changé : '
      || array_to_string(v_labels, ', ')
      || '. Consultez l’action pour voir les informations actuelles.';
    v_event := jsonb_build_object(
      'eventKey', p_event_key,
      'changeKinds', to_jsonb(p_change_kinds),
      'occurredAt', v_now
    );

    if v_notification_id is not null then
      v_next_events := case
        when jsonb_typeof(v_payload -> 'changeEvents') = 'array'
          then (v_payload -> 'changeEvents') || jsonb_build_array(v_event)
        else jsonb_build_array(v_event)
      end;
      select coalesce(jsonb_agg(item order by ordinal), '[]'::jsonb)
      into v_next_events
      from jsonb_array_elements(v_next_events) with ordinality as entries(item, ordinal)
      where ordinal > greatest(jsonb_array_length(v_next_events) - 50, 0);

      v_next_event_keys := case
        when jsonb_typeof(v_payload -> 'eventKeys') = 'array'
          then (v_payload -> 'eventKeys') || to_jsonb(p_event_key)
        when nullif(v_payload ->> 'eventKey', '') is not null
          then jsonb_build_array(v_payload ->> 'eventKey', p_event_key)
        else jsonb_build_array(p_event_key)
      end;
      select coalesce(jsonb_agg(item order by ordinal), '[]'::jsonb)
      into v_next_event_keys
      from jsonb_array_elements(v_next_event_keys) with ordinality as entries(item, ordinal)
      where ordinal > greatest(jsonb_array_length(v_next_event_keys) - 50, 0);

      update public.app_notifications
      set title = v_title,
          content = v_content,
          created_at = v_now,
          payload = v_payload || jsonb_build_object(
            'eventType', 'action_event',
            'subtype', 'action_update',
            'actionId', p_action_id,
            'eventKey', p_event_key,
            'eventKeys', v_next_event_keys,
            'latestEventKey', p_event_key,
            'changeKinds', to_jsonb(v_next_kinds),
            'changeEvents', v_next_events,
            'href', '/sections/rejoindre-une-action?actionId=' || p_action_id
          )
      where id = v_notification_id;
    else
      insert into public.app_notifications (user_id, type, title, content, payload)
      values (
        v_recipient_id,
        'action_event',
        v_title,
        v_content,
        jsonb_build_object(
          'eventType', 'action_event',
          'subtype', 'action_update',
          'actionId', p_action_id,
          'eventKey', p_event_key,
          'eventKeys', jsonb_build_array(p_event_key),
          'latestEventKey', p_event_key,
          'changeKinds', to_jsonb(p_change_kinds),
          'changeEvents', jsonb_build_array(v_event),
          'href', '/sections/rejoindre-une-action?actionId=' || p_action_id
        )
      )
      on conflict do nothing;
    end if;

    v_delivered_count := v_delivered_count + 1;
  end loop;

  return v_delivered_count;
end;
$$;

revoke all on function public.emit_action_update_notifications(uuid, text, text[], text)
  from public, anon, authenticated;
grant execute on function public.emit_action_update_notifications(uuid, text, text[], text)
  to service_role;
