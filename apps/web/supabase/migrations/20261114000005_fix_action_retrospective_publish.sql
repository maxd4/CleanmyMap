-- PURPOSE: qualify retrospective columns in the publication RPC.
-- CALLER: the existing service-role retrospective publication RPC.
-- AUTHORIZATION_BOUNDARY: preserve the existing service_role-only execution
--   and actor/action-organizer checks.
-- ATOMICITY: preserve the row locks, notification insert and completion mark.
-- FORWARD_ONLY: replace the already-published function without rewriting its
--   historical migration.

create or replace function public.publish_action_retrospective(
  p_action_id uuid,
  p_actor_user_id text
)
returns table (
  action_id uuid,
  thanks_message text,
  worked_well text,
  blockers text,
  improve_next_time text,
  published_at timestamptz,
  updated_at timestamptz,
  notified_at timestamptz
)
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_retrospective public.action_retrospectives%rowtype;
  v_author text := nullif(btrim(p_actor_user_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_action_id is null or v_author is null then
    raise exception 'Invalid retrospective actor or action';
  end if;

  select * into v_action
  from public.actions
  where id = p_action_id
  for update;
  if not found then
    raise exception 'Action not found';
  end if;
  if v_action.created_by_clerk_id <> v_author
     and not exists (
       select 1 from public.action_organizers ao
       where ao.action_id = p_action_id
         and ao.organizer_clerk_id = v_author
     ) then
    raise exception 'Forbidden';
  end if;

  select * into v_retrospective
  from public.action_retrospectives as ar
  where ar.action_id = p_action_id
  for update;
  if not found then
    raise exception 'Retrospective draft not found';
  end if;
  if v_retrospective.published_at is not null then
    return query
    select v_retrospective.action_id, v_retrospective.thanks_message,
      v_retrospective.worked_well, v_retrospective.blockers,
      v_retrospective.improve_next_time, v_retrospective.published_at,
      v_retrospective.updated_at, v_retrospective.notified_at;
    return;
  end if;
  if v_action.action_phase <> 'post_action_complete'
     or v_action.status <> 'approved'
     or v_action.published_at is null
     or coalesce(v_action.moderation_visibility, 'visible') <> 'visible'
     or coalesce(v_action.access_mode, 'public') <> 'public'
     or coalesce(v_action.review_state, 'not_required') not in ('not_required', 'approved') then
    raise exception 'Action is not eligible for retrospective publication';
  end if;
  if v_retrospective.thanks_message is null
     and v_retrospective.worked_well is null
     and v_retrospective.blockers is null
     and v_retrospective.improve_next_time is null then
    raise exception 'Retrospective requires content';
  end if;

  update public.action_retrospectives as ar
  set published_at = timezone('utc', now())
  where ar.action_id = p_action_id;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select ap.user_id,
    'community',
    'Merci pour votre participation',
    left(coalesce(v_retrospective.thanks_message, 'Le retour d’expérience de cette action est disponible.'), 1000),
    jsonb_build_object(
      'eventType', 'action_retrospective_published',
      'actionId', p_action_id
    )
  from public.action_participants ap
  where ap.action_id = p_action_id
    and ap.participation_status = 'confirmed'
    and ap.user_id <> v_retrospective.authored_by_clerk_id
  on conflict do nothing;

  update public.action_retrospectives as ar
  set notified_at = timezone('utc', now())
  where ar.action_id = p_action_id;

  return query
  select r.action_id, r.thanks_message, r.worked_well, r.blockers,
    r.improve_next_time, r.published_at, r.updated_at, r.notified_at
  from public.action_retrospectives r
  where r.action_id = p_action_id;
end;
$$;
