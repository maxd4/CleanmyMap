-- PURPOSE: emit and project group_form review events through app_notifications.
-- CALLER: server-side service_role triggers fan out events; authenticated web
-- routes call only the reviewer-scoped projection or the existing review path.
-- AUTHORIZATION_BOUNDARY: recipients are creator/organizers/admin|max; each
-- decision is authorized again by the existing server-side review resolver.
-- IDEMPOTENCY: stable registration/request and registration/status event keys
-- plus conditional pending updates prevent duplicate fan-out or decisions.
-- ATOMICITY: the registration status transition and its decision trigger share
-- the same transaction; losing concurrent reviewers reread canonical state.
-- FAILURE_BEHAVIOR: an unavailable/cancelled action is not projected as a
-- pending request and does not manufacture a decision notification.
-- SEARCH_PATH: every SECURITY DEFINER function below pins public, pg_catalog.
-- GRANTS: trigger helpers and RPCs are executable only by service_role.
-- La table app_notifications reste la boîte de réception unique : la RPC de
-- lecture ne fait que projeter les demandes encore pendantes déjà notifiées.

create unique index if not exists app_notifications_action_registration_event_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventKey')
  )
  where type = 'action_event'
    and payload ->> 'subtype' in ('registration_request', 'registration_decision')
    and nullif(payload ->> 'eventKey', '') is not null;

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

  -- Une demande ne devient notifiable qu'après publication effective. Les
  -- brouillons et les actions annulées restent hors du centre de notifications.
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
    join public.profiles reviewer on reviewer.id = candidate.user_id
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

create or replace function public.emit_action_registration_requests_on_registration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.emit_action_registration_request_notifications(
    new.action_id,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists action_registrations_registration_requests on public.action_registrations;
create trigger action_registrations_registration_requests
after insert or update of action_id, registration_status, registration_source
on public.action_registrations
for each row execute function public.emit_action_registration_requests_on_registration();

create or replace function public.emit_action_registration_requests_on_organizer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform public.emit_action_registration_request_notifications(new.action_id);
  return new;
end;
$$;

drop trigger if exists action_organizers_registration_requests on public.action_organizers;
create trigger action_organizers_registration_requests
after insert or update of action_id, organizer_clerk_id
on public.action_organizers
for each row execute function public.emit_action_registration_requests_on_organizer();

create or replace function public.emit_action_registration_requests_on_action_publish()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.published_at is not null
    and (tg_op = 'INSERT' or old.published_at is distinct from new.published_at)
  then
    perform public.emit_action_registration_request_notifications(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists actions_action_registration_requests_on_publish on public.actions;
create trigger actions_action_registration_requests_on_publish
after insert or update of published_at on public.actions
for each row execute function public.emit_action_registration_requests_on_action_publish();

revoke all on function public.emit_action_registration_requests_on_registration()
  from public, anon, authenticated;
revoke all on function public.emit_action_registration_requests_on_organizer()
  from public, anon, authenticated;
revoke all on function public.emit_action_registration_requests_on_action_publish()
  from public, anon, authenticated;
grant execute on function public.emit_action_registration_requests_on_registration()
  to service_role;
grant execute on function public.emit_action_registration_requests_on_organizer()
  to service_role;
grant execute on function public.emit_action_registration_requests_on_action_publish()
  to service_role;

create or replace function public.notify_action_registration_decision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Seule la transition d'une demande group_form pendante est une décision
  -- de review. Une annulation globale de l'action ne fabrique pas un refus.
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
    and exists (
      select 1 from public.profiles p where p.id = new.user_id
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

drop trigger if exists action_registrations_decision_notification on public.action_registrations;
create trigger action_registrations_decision_notification
after update of registration_status, registration_source on public.action_registrations
for each row execute function public.notify_action_registration_decision();

revoke all on function public.notify_action_registration_decision()
  from public, anon, authenticated;
grant execute on function public.notify_action_registration_decision()
  to service_role;

create or replace function public.list_pending_action_registration_requests_for_reviewer(
  p_reviewer_id text
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
  where ar.registration_source = 'group_form'
    and ar.registration_status = 'pending'
    and a.published_at is not null
    and a.action_phase = 'pre_action'
    and a.status in ('pending', 'approved')
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and exists (
      select 1
      from public.app_notifications n
      where n.user_id = p_reviewer_id
        and n.type = 'action_event'
        and n.payload ->> 'subtype' = 'registration_request'
        and n.payload ->> 'registrationId' = ar.id::text
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
    );
$$;

revoke all on function public.list_pending_action_registration_requests_for_reviewer(text)
  from public, anon, authenticated;
grant execute on function public.list_pending_action_registration_requests_for_reviewer(text)
  to service_role;
