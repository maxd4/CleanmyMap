-- Interactive invitations for future actions.
-- Prepared manual_add registrations remain inert until the action is published.

alter table public.app_notifications
  drop constraint if exists app_notifications_type_check;

alter table public.app_notifications
  add constraint app_notifications_type_check
  check (type in (
    'validation', 'community', 'system', 'security', 'chat',
    'action_discussion', 'gamification_reconciliation', 'action_event'
  ));

-- One in-app invitation event per action, recipient and event subtype. This
-- also prevents repeated edits or retries from becoming invitation spam.
create unique index if not exists app_notifications_action_invitation_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'actionId'),
    (payload ->> 'subtype')
  )
  where type = 'action_event'
    and payload ->> 'subtype' = 'invitation';

create or replace function public.emit_action_invitation_notifications(
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

  -- Publication is the lifecycle boundary. Draft saves cannot fan out here.
  if not exists (
    select 1
    from public.actions a
    where a.id = p_action_id
      and a.published_at is not null
      and a.action_phase = 'pre_action'
      and a.status in ('pending', 'approved')
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
  ) then
    return 0;
  end if;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select
    ar.user_id,
    'action_event',
    'Invitation à une action future',
    'Vous êtes invité(e) à rejoindre une action planifiée. Répondez à cette invitation pour confirmer votre inscription.',
    jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'invitation',
      'actionId', ar.action_id,
      'registrationId', ar.id,
      'decisionState', 'pending',
      'href', '/sections/rejoindre-une-action?actionId=' || ar.action_id
    )
  from public.action_registrations ar
  join public.profiles p on p.id = ar.user_id
  where ar.action_id = p_action_id
    and ar.registration_source = 'manual_add'
    and ar.registration_status = 'pending'
    and nullif(btrim(ar.user_id), '') is not null
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;

revoke all on function public.emit_action_invitation_notifications(uuid)
  from public, anon, authenticated;
grant execute on function public.emit_action_invitation_notifications(uuid)
  to service_role;

create or replace function public.emit_action_invitations_on_action_publish()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.published_at is not null
    and (tg_op = 'INSERT' or old.published_at is distinct from new.published_at)
  then
    perform public.emit_action_invitation_notifications(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists actions_action_invitations_on_publish on public.actions;
create trigger actions_action_invitations_on_publish
after insert or update of published_at on public.actions
for each row execute function public.emit_action_invitations_on_action_publish();

create or replace function public.emit_action_invitations_on_registration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.emit_action_invitation_notifications(
    case when tg_op = 'DELETE' then old.action_id else new.action_id end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists action_registrations_action_invitations on public.action_registrations;
create trigger action_registrations_action_invitations
after insert or update of action_id, registration_status, registration_source or delete
on public.action_registrations
for each row execute function public.emit_action_invitations_on_registration();

revoke all on function public.emit_action_invitations_on_action_publish()
  from public, anon, authenticated;
revoke all on function public.emit_action_invitations_on_registration()
  from public, anon, authenticated;
grant execute on function public.emit_action_invitations_on_action_publish()
  to service_role;
grant execute on function public.emit_action_invitations_on_registration()
  to service_role;

create or replace function public.list_pending_action_invitations_for_recipient(
  p_recipient_id text
)
returns table (registration_id uuid, action_id uuid)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select ar.id, ar.action_id
  from public.action_registrations ar
  join public.actions a on a.id = ar.action_id
  where ar.user_id = p_recipient_id
    and ar.registration_source = 'manual_add'
    and ar.registration_status = 'pending'
    and a.published_at is not null
    and a.action_phase = 'pre_action'
    and a.status in ('pending', 'approved')
    and coalesce(a.moderation_visibility, 'visible') = 'visible';
$$;

revoke all on function public.list_pending_action_invitations_for_recipient(text)
  from public, anon, authenticated;
grant execute on function public.list_pending_action_invitations_for_recipient(text)
  to service_role;

create or replace function public.respond_to_action_invitation(
  p_registration_id uuid,
  p_recipient_id text,
  p_decision text
)
returns table (status text, registration_id uuid, action_id uuid)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_registration public.action_registrations%rowtype;
  v_action public.actions%rowtype;
  v_next_status text;
  v_now timestamptz := timezone('utc', now());
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if p_decision not in ('accept', 'reject') then
    raise exception 'Invalid invitation decision';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(coalesce(p_registration_id::text, '') || ':' || coalesce(p_recipient_id, ''), 0)
  );

  select ar.* into v_registration
  from public.action_registrations ar
  where ar.id = p_registration_id
    and ar.user_id = p_recipient_id
    and ar.registration_source = 'manual_add'
  for update;

  if not found then
    return query select 'unavailable', p_registration_id, null::uuid;
    return;
  end if;

  select a.* into v_action
  from public.actions a
  where a.id = v_registration.action_id;

  if not found
    or v_action.published_at is null
    or v_action.action_phase <> 'pre_action'
    or v_action.status not in ('pending', 'approved')
    or coalesce(v_action.moderation_visibility, 'visible') <> 'visible'
  then
    return query select 'unavailable', v_registration.id, v_registration.action_id;
    return;
  end if;

  if v_registration.registration_status = 'confirmed' then
    return query select 'accepted', v_registration.id, v_registration.action_id;
    return;
  end if;
  if v_registration.registration_status = 'cancelled' then
    return query select 'rejected', v_registration.id, v_registration.action_id;
    return;
  end if;

  v_next_status := case when p_decision = 'accept' then 'confirmed' else 'cancelled' end;
  update public.action_registrations
  set registration_status = v_next_status,
      updated_at = v_now
  where id = v_registration.id;

  update public.app_notifications n
  set read_at = coalesce(n.read_at, v_now),
      seen_at = coalesce(n.seen_at, v_now),
      payload = jsonb_set(
        jsonb_set(coalesce(n.payload, '{}'::jsonb), '{decisionState}', '"treated"'::jsonb),
        '{decision}', to_jsonb(p_decision), true
      )
  where n.user_id = p_recipient_id
    and n.type = 'action_event'
    and n.payload ->> 'subtype' = 'invitation'
    and n.payload ->> 'registrationId' = v_registration.id::text;

  return query select
    case when p_decision = 'accept' then 'accepted' else 'rejected' end,
    v_registration.id,
    v_registration.action_id;
end;
$$;

revoke all on function public.respond_to_action_invitation(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.respond_to_action_invitation(uuid, text, text)
  to service_role;

-- Pending manual invitations must not grant action-discussion membership.
create or replace function public.get_action_notification_audience(
  p_action_id uuid
)
returns table (user_id text, audience_source text)
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
with action_context as (
  select a.*
  from public.actions a
  where a.id = p_action_id
    and public.is_action_discussion_available(
      a.action_phase, a.published_at, a.moderation_visibility,
      a.status, a.action_date, a.event_start_time
    )
), candidate_audience as (
  select a.created_by_clerk_id as user_id, 'owner'::text as audience_source, 10 as source_priority from action_context a
  join public.profiles p on p.id = a.created_by_clerk_id
  union all
  select ao.organizer_clerk_id as user_id, 'organizer'::text as audience_source, 20 as source_priority from action_context a
  join public.action_organizers ao on ao.action_id = a.id
  join public.profiles p on p.id = ao.organizer_clerk_id
  union all
  select ar.user_id as user_id, 'future_registration'::text as audience_source, 30 as source_priority from action_context a
  join public.action_registrations ar on ar.action_id = a.id
  join public.profiles p on p.id = ar.user_id
  where coalesce(a.action_phase, 'post_action_complete') <> 'post_action_complete'
    and ar.registration_status = 'confirmed'
  union all
  select ap.user_id as user_id, 'final_participant'::text as audience_source, 40 as source_priority from action_context a
  join public.action_participants ap on ap.action_id = a.id
  join public.profiles p on p.id = ap.user_id
  where coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
    and ap.participation_status = 'confirmed'
), deduplicated_audience as (
  select distinct on (ca.user_id) ca.user_id, ca.audience_source, ca.source_priority
  from candidate_audience ca
  where nullif(btrim(ca.user_id), '') is not null
  order by ca.user_id, ca.source_priority
)
select user_id, audience_source from deduplicated_audience;
$$;

revoke all on function public.get_action_notification_audience(uuid)
  from public, anon, authenticated;
grant execute on function public.get_action_notification_audience(uuid)
  to service_role;

-- Keep the public request counter separate from pending manual invitations.
-- total_count remains the confirmed roster plus pending group_form requests.
create or replace function public.load_action_participant_summaries(
  p_action_ids uuid[],
  p_user_id text default null
)
returns table (
  action_id uuid,
  active_count bigint,
  total_count bigint,
  my_participation_status text,
  my_participation_source text,
  my_joined_at timestamptz,
  my_updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
with requested_actions as (
  select distinct on (action_id) action_id, ordinality
  from unnest(coalesce(p_action_ids, '{}'::uuid[])) with ordinality as input(action_id, ordinality)
  order by action_id, ordinality
), action_totals as (
  select ar.action_id,
    count(*) filter (where ar.registration_status = 'confirmed')::bigint as active_count,
    count(*) filter (where ar.registration_status = 'confirmed'
      or (ar.registration_status = 'pending' and ar.registration_source = 'group_form'))::bigint as total_count
  from public.action_registrations ar
  join public.actions a on a.id = ar.action_id
  join requested_actions ra on ra.action_id = ar.action_id
  where coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft')
  group by ar.action_id
  union all
  select ap.action_id,
    count(*) filter (where ap.participation_status = 'confirmed')::bigint,
    count(*)::bigint
  from public.action_participants ap
  join public.actions a on a.id = ap.action_id
  join requested_actions ra on ra.action_id = ap.action_id
  where coalesce(a.action_phase, 'post_action_complete') not in ('pre_action', 'post_action_draft')
  group by ap.action_id
), user_participation as (
  select ar.action_id, ar.registration_status, ar.registration_source,
    ar.registered_at, ar.updated_at
  from public.action_registrations ar
  join public.actions a on a.id = ar.action_id
  where p_user_id is not null and ar.user_id = p_user_id
    and ar.action_id = any(coalesce(p_action_ids, '{}'::uuid[]))
    and coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft')
  union all
  select ap.action_id, ap.participation_status, ap.participation_source,
    ap.joined_at, ap.updated_at
  from public.action_participants ap
  join public.actions a on a.id = ap.action_id
  where p_user_id is not null and ap.user_id = p_user_id
    and ap.action_id = any(coalesce(p_action_ids, '{}'::uuid[]))
    and coalesce(a.action_phase, 'post_action_complete') not in ('pre_action', 'post_action_draft')
)
select ra.action_id,
  coalesce(totals.active_count, 0)::bigint,
  coalesce(totals.total_count, 0)::bigint,
  ur.registration_status,
  ur.registration_source,
  ur.registered_at,
  ur.updated_at
from requested_actions ra
left join action_totals totals on totals.action_id = ra.action_id
left join user_participation ur on ur.action_id = ra.action_id
order by ra.ordinality;
$$;

revoke all on function public.load_action_participant_summaries(uuid[], text)
  from public, anon, authenticated, service_role;
grant execute on function public.load_action_participant_summaries(uuid[], text)
  to service_role;
