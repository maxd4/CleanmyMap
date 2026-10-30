-- 6C2: the accepted buddy match is the existing consent boundary for a
-- private conversation. No second contact-consent table is introduced.
create unique index if not exists app_notifications_action_buddy_event_unique_idx
  on public.app_notifications (user_id, (payload ->> 'eventKey'))
  where type = 'community'
    and payload ->> 'kind' in (
      'action_buddy_proposal_created',
      'action_buddy_proposal_accepted',
      'action_buddy_request_cancelled'
    )
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.emit_action_buddy_proposal_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_request public.action_buddy_requests%rowtype;
  v_recipient_id text;
  v_kind text;
  v_event_key text;
  v_title text;
  v_content text;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'action_buddy_notification_server_only' using errcode = '42501';
  end if;

  select * into v_request
  from public.action_buddy_requests
  where id = new.request_id;
  if not found then
    return new;
  end if;

  if tg_op = 'INSERT' and new.status = 'pending' then
    v_recipient_id := v_request.requester_user_id;
    v_kind := 'action_buddy_proposal_created';
    v_event_key := format('action-buddy:proposal-created:%s:%s', new.id, v_recipient_id);
    v_title := 'Nouvelle proposition de binôme';
    v_content := 'Une personne inscrite vous propose de former un binôme pour cette action.';
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from new.status then
    v_recipient_id := new.mentor_user_id;
    v_kind := 'action_buddy_proposal_accepted';
    v_event_key := format('action-buddy:proposal-accepted:%s:%s', new.id, v_recipient_id);
    v_title := 'Proposition de binôme acceptée';
    v_content := 'Votre proposition de binôme a été acceptée pour cette action.';
  else
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_event_key, 0));
  insert into public.app_notifications (user_id, type, title, content, payload)
  select
    v_recipient_id,
    'community',
    v_title,
    v_content,
    jsonb_build_object(
      'kind', v_kind,
      'eventKey', v_event_key,
      'actionId', v_request.action_id,
      'requestId', v_request.id,
      'proposalId', new.id,
      'href', '/sections/rejoindre-une-action?actionId=' || v_request.action_id
    )
  where not exists (
    select 1 from public.app_notifications n
    where n.user_id = v_recipient_id
      and n.type = 'community'
      and n.payload ->> 'eventKey' = v_event_key
  );
  return new;
end;
$$;

revoke all on function public.emit_action_buddy_proposal_notification() from public, anon, authenticated;
grant execute on function public.emit_action_buddy_proposal_notification() to service_role;

drop trigger if exists action_buddy_proposal_notifications on public.action_buddy_proposals;
create trigger action_buddy_proposal_notifications
after insert or update of status on public.action_buddy_proposals
for each row execute function public.emit_action_buddy_proposal_notification();

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
  if new.status <> 'cancelled'
     or old.status is distinct from new.status
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

drop trigger if exists action_buddy_request_cancellation_notification on public.action_buddy_requests;
create trigger action_buddy_request_cancellation_notification
after update of status on public.action_buddy_requests
for each row execute function public.emit_action_buddy_request_cancellation_notification();
