-- 6C2 corrective migration: notify only the effective matched -> cancelled
-- transition. Preserve the existing event key, deduplication, payload and
-- server-only notification boundary.

create or replace function public.emit_action_buddy_request_cancellation_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event_key text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'action_buddy_notification_server_only' using errcode = '42501';
  end if;
  if new.status is distinct from 'cancelled'
     or old.status is not distinct from new.status
     or old.status is distinct from 'matched'
     or old.matched_mentor_user_id is null then
    return new;
  end if;

  v_event_key := format('action-buddy:request-cancelled:%s:%s', new.id, old.matched_mentor_user_id);
  perform pg_advisory_xact_lock(hashtextextended(v_event_key, 0));
  insert into public.app_notifications (user_id, type, title, content, payload)
  select
    old.matched_mentor_user_id,
    'community',
    'Binôme annulé',
    'Le binôme formé pour cette action a été annulé par le demandeur.',
    jsonb_build_object(
      'kind', 'action_buddy_request_cancelled',
      'eventKey', v_event_key,
      'actionId', new.action_id,
      'requestId', new.id,
      'href', '/sections/rejoindre-une-action?actionId=' || new.action_id
    )
  where not exists (
    select 1 from public.app_notifications n
    where n.user_id = old.matched_mentor_user_id
      and n.type = 'community'
      and n.payload ->> 'eventKey' = v_event_key
  );
  return new;
end;
$$;

revoke all on function public.emit_action_buddy_request_cancellation_notification() from public, anon, authenticated;
grant execute on function public.emit_action_buddy_request_cancellation_notification() to service_role;
