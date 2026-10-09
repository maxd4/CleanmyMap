-- Keep moderation decisions and administrative reminders in the existing
-- app_notifications inbox. Both contracts are append-only and idempotent.

create unique index if not exists app_notifications_moderation_event_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventKey')
  )
  where type = 'validation'
    and nullif(payload ->> 'eventKey', '') is not null;

create unique index if not exists app_notifications_administrative_requirement_event_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventKey')
  )
  where type = 'action_event'
    and payload ->> 'subtype' = 'administrative_requirements'
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.emit_action_administrative_requirement_notifications(
  p_action_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_inserted_count integer := 0;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  select a.*
  into v_action
  from public.actions a
  where a.id = p_action_id;

  if not found
    or not public.is_public_future_pre_action(
      v_action.action_phase,
      v_action.published_at,
      coalesce(v_action.moderation_visibility, 'visible'),
      v_action.status,
      v_action.action_date,
      v_action.event_start_time
    )
    or coalesce(v_action.preparation_data #>> '{administrativeRequirements,status}', 'pending') <> 'pending'
  then
    return 0;
  end if;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select distinct
    candidate.user_id,
    'action_event',
    'Démarches administratives à finaliser',
    'Les démarches administratives de cette action nécessitent votre intervention avant son déroulement.',
    jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'administrative_requirements',
      'actionId', p_action_id,
      'decisionState', 'informational',
      'eventKey', 'administrative_requirements:' || p_action_id::text,
      'href', '/sections/rejoindre-une-action?actionId=' || p_action_id
    )
  from (
    select v_action.created_by_clerk_id as user_id
    union all
    select ao.organizer_clerk_id
    from public.action_organizers ao
    where ao.action_id = p_action_id
  ) candidate
  where nullif(btrim(candidate.user_id), '') is not null
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;

revoke all on function public.emit_action_administrative_requirement_notifications(uuid)
  from public, anon, authenticated;
grant execute on function public.emit_action_administrative_requirement_notifications(uuid)
  to service_role;
