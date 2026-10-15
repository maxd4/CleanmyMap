-- SPOGOMI admission decisions: notify the authenticated requester privately.
--
-- PURPOSE: project approved, rejected and cancelled admission decisions into
--   the canonical in-app notification inbox.
-- CALLER: the existing service_role-only admission transition RPCs update the
--   request row; this AFTER UPDATE trigger observes their canonical status.
-- AUTHORIZATION_BOUNDARY: the trigger function is SECURITY DEFINER but refuses
--   direct non-service_role execution; the request table remains service-only.
-- IDEMPOTENCY: one stable eventKey per request and terminal status, protected
--   by a partial unique index and ON CONFLICT DO NOTHING.
-- ATOMICITY: the notification is committed or rolled back with the decision.
-- FAILURE_BEHAVIOR: disabled informational preferences and missing event rows
--   produce no notification; no-account participants are not recipients.
-- SEARCH_PATH: public, pg_catalog; GRANTS: service_role-only function access.

create unique index if not exists app_notifications_spogomi_admission_decision_event_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'eventKey')
  )
  where type = 'action_event'
    and payload ->> 'subtype' = 'spogomi_admission_decision'
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.emit_spogomi_admission_decision_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_informational_enabled boolean;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'SPOGOMI admission notifications require the server role';
  end if;

  if old.status <> 'pending'
     or new.status not in ('approved', 'rejected', 'cancelled')
     or nullif(btrim(coalesce(new.requester_clerk_id, '')), '') is null then
    return new;
  end if;

  select * into v_event
    from public.spogomi_events
   where id = new.event_id;
  if not found then
    return new;
  end if;

  select coalesce(preferences.informational_enabled, true)
    into v_informational_enabled
    from public.notification_preferences preferences
   where preferences.user_id = new.requester_clerk_id;
  if not coalesce(v_informational_enabled, true) then
    return new;
  end if;

  insert into public.app_notifications (
    user_id,
    type,
    title,
    content,
    payload
  ) values (
    new.requester_clerk_id,
    'action_event',
    case new.status
      when 'approved' then 'Demande SPOGOMI acceptée'
      when 'rejected' then 'Demande SPOGOMI refusée'
      else 'Demande SPOGOMI annulée'
    end,
    case new.status
      when 'approved' then format('Votre demande pour participer à « %s » a été acceptée.', v_event.name)
      when 'rejected' then format('Votre demande pour participer à « %s » a été refusée.', v_event.name)
      else format('Votre demande pour participer à « %s » a été annulée.', v_event.name)
    end,
    jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'spogomi_admission_decision',
      'requestKind', new.request_kind,
      'requestId', new.id,
      'eventId', new.event_id,
      'decision', new.status,
      'decisionState', 'informational',
      'eventKey', 'spogomi_admission_decision:' || new.id::text || ':' || new.status,
      'href', case
        when nullif(btrim(v_event.event_slug), '') is null then '/spogomi'
        else '/spogomi/' || v_event.event_slug
      end
    )
  )
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.emit_spogomi_admission_decision_notification()
  from public, anon, authenticated;
grant execute on function public.emit_spogomi_admission_decision_notification()
  to service_role;

drop trigger if exists spogomi_admission_decision_notification
  on public.spogomi_team_join_requests;
create trigger spogomi_admission_decision_notification
after update of status on public.spogomi_team_join_requests
for each row
when (old.status = 'pending' and new.status in ('approved', 'rejected', 'cancelled'))
execute function public.emit_spogomi_admission_decision_notification();
