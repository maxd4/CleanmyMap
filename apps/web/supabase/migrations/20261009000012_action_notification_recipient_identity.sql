-- PURPOSE: deliver action notifications to canonical Clerk identities without
-- requiring an unrelated public.profiles row for ordinary recipients.
-- CALLER: replaces the effective functions from 20261009000003/00004; trigger
-- callers and service-role RPC callers remain unchanged.
-- AUTHORIZATION_BOUNDARY: creator and organizer membership comes from actions
-- and action_organizers; profiles remains authoritative for admin/max roles.
-- IDEMPOTENCY: existing event keys, unique index and distinct audience query
-- are preserved; retries remain no-ops for already emitted events.
-- ATOMICITY: trigger fan-out remains in the originating transaction.
-- FAILURE_BEHAVIOR: unpublished, unavailable, pending or unconfirmed records
-- remain excluded exactly as before.
-- SEARCH_PATH: SECURITY DEFINER functions pin public, pg_catalog.
-- GRANTS: service_role-only execution is preserved.

create or replace function public.emit_action_registration_request_notifications(
  p_action_id uuid,
  p_registration_id uuid default null
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
      and a.published_at is not null
      and a.action_phase = 'pre_action'
      and a.status in ('pending', 'approved')
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
  ) then
    return 0;
  end if;

  insert into public.app_notifications (user_id, type, title, content, payload)
  select
    reviewers.user_id,
    'action_event',
    'Demande d''inscription à examiner',
    'Un bénévole demande à rejoindre une action future. Vérifiez la demande avant de l''accepter ou de la refuser.',
    jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'registration_request',
      'requestKind', 'registration_request',
      'actionId', ar.action_id,
      'registrationId', ar.id,
      'decisionState', 'pending',
      'eventKey', 'registration_request:' || ar.id::text,
      'href', '/sections/rejoindre-une-action?actionId=' || ar.action_id
    )
  from public.action_registrations ar
  join public.actions a on a.id = ar.action_id
  cross join lateral (
    select distinct candidate.user_id
    from (
      select a.created_by_clerk_id as user_id
      where nullif(btrim(a.created_by_clerk_id), '') is not null
      union all
      select ao.organizer_clerk_id
      from public.action_organizers ao
      where ao.action_id = a.id
      union all
      select p.id
      from public.profiles p
      where p.active_role_label in ('admin', 'max')
    ) candidate
    where nullif(btrim(candidate.user_id), '') is not null
      and candidate.user_id <> ar.user_id
  ) reviewers
  where ar.action_id = p_action_id
    and (p_registration_id is null or ar.id = p_registration_id)
    and ar.registration_source = 'group_form'
    and ar.registration_status = 'pending'
    and nullif(btrim(ar.user_id), '') is not null
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;

revoke all on function public.emit_action_registration_request_notifications(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.emit_action_registration_request_notifications(uuid, uuid)
  to service_role;

create or replace function public.notify_action_registration_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if old.registration_source = 'group_form'
    and old.registration_status = 'pending'
    and new.registration_status in ('confirmed', 'cancelled')
    and exists (
      select 1
      from public.actions a
      where a.id = new.action_id
        and a.status in ('pending', 'approved')
        and a.action_phase = 'pre_action'
        and a.published_at is not null
    )
  then
    insert into public.app_notifications (user_id, type, title, content, payload)
    values (
      new.user_id,
      'action_event',
      case when new.registration_status = 'confirmed'
        then 'Demande d''inscription acceptée'
        else 'Demande d''inscription refusée'
      end,
      case when new.registration_status = 'confirmed'
        then 'Votre demande pour rejoindre cette action a été acceptée.'
        else 'Votre demande pour rejoindre cette action a été refusée.'
      end,
      jsonb_build_object(
        'eventType', 'action_event',
        'subtype', 'registration_decision',
        'requestKind', 'registration_decision',
        'actionId', new.action_id,
        'registrationId', new.id,
        'decision', case when new.registration_status = 'confirmed' then 'accepted' else 'rejected' end,
        'decisionState', 'informational',
        'eventKey', 'registration_decision:' || new.id::text || ':' || new.registration_status,
        'href', '/sections/rejoindre-une-action?actionId=' || new.action_id
      )
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_action_registration_decision()
  from public, anon, authenticated;
grant execute on function public.notify_action_registration_decision()
  to service_role;

-- Canonical discussion membership is established by the action relations and
-- confirmed lifecycle states. A profile is not a delivery prerequisite.
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
  select a.created_by_clerk_id as user_id, 'owner'::text as audience_source, 10 as source_priority
  from action_context a
  union all
  select ao.organizer_clerk_id as user_id, 'organizer'::text as audience_source, 20 as source_priority
  from action_context a
  join public.action_organizers ao on ao.action_id = a.id
  union all
  select ar.user_id as user_id, 'future_registration'::text as audience_source, 30 as source_priority
  from action_context a
  join public.action_registrations ar on ar.action_id = a.id
  where coalesce(a.action_phase, 'post_action_complete') <> 'post_action_complete'
    and ar.registration_status = 'confirmed'
  union all
  select ap.user_id as user_id, 'final_participant'::text as audience_source, 40 as source_priority
  from action_context a
  join public.action_participants ap on ap.action_id = a.id
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
