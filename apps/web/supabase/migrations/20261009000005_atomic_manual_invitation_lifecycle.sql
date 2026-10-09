-- Preserve manual invitation identity and synchronize participant edits atomically.
-- This migration is append-only: 20261009000002 and 20261009000003 are historical.

alter table public.action_registrations
  add column if not exists registration_cancellation_reason text,
  add column if not exists manual_invitation_version integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_registrations_cancellation_reason_check'
      and conrelid = 'public.action_registrations'::regclass
  ) then
    alter table public.action_registrations
      add constraint action_registrations_cancellation_reason_check
      check (
        registration_cancellation_reason is null
        or registration_cancellation_reason in (
          'recipient_rejected',
          'organizer_withdrawn',
          'accepted_cancelled'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'action_registrations_manual_invitation_version_check'
      and conrelid = 'public.action_registrations'::regclass
  ) then
    alter table public.action_registrations
      add constraint action_registrations_manual_invitation_version_check
      check (manual_invitation_version >= 1);
  end if;
end;
$$;

-- Historical invitation rows did not carry an event identity. Give them the
-- identity of their existing registration without creating a new event.
update public.app_notifications
set payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
  'eventKey', 'invitation:' || (payload ->> 'registrationId') || ':1',
  'invitationVersion', 1
)
where type = 'action_event'
  and payload ->> 'subtype' = 'invitation'
  and nullif(payload ->> 'registrationId', '') is not null
  and nullif(payload ->> 'eventKey', '') is null;

drop index if exists public.app_notifications_action_invitation_unique_idx;
create unique index if not exists app_notifications_action_invitation_event_unique_idx
  on public.app_notifications (
    user_id,
    (payload ->> 'actionId'),
    (payload ->> 'subtype'),
    (payload ->> 'eventKey')
  )
  where type = 'action_event'
    and payload ->> 'subtype' = 'invitation'
    and nullif(payload ->> 'eventKey', '') is not null;

-- The application user id is the Clerk id. A profiles row is not required for
-- an invitation and must not be used as an accidental delivery filter.
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
      'invitationVersion', ar.manual_invitation_version,
      'eventKey', 'invitation:' || ar.id::text || ':' || ar.manual_invitation_version,
      'decisionState', 'pending',
      'href', '/sections/rejoindre-une-action?actionId=' || ar.action_id
    )
  from public.action_registrations ar
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

create or replace function public.emit_action_invitations_on_registration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_registration_id uuid;
  v_user_id text;
  v_action_id uuid;
  v_event_key text;
begin
  if tg_op = 'DELETE' then
    v_registration_id := old.id;
    v_user_id := old.user_id;
    v_action_id := old.action_id;
    v_event_key := 'invitation:' || old.id::text || ':' || coalesce(old.manual_invitation_version, 1);
  else
    v_registration_id := new.id;
    v_user_id := new.user_id;
    v_action_id := new.action_id;
    v_event_key := 'invitation:' || new.id::text || ':' || coalesce(new.manual_invitation_version, 1);
  end if;

  perform public.emit_action_invitation_notifications(v_action_id);

  if tg_op = 'UPDATE'
    and old.registration_source = 'manual_add'
    and old.registration_status = 'pending'
    and new.registration_status = 'cancelled'
    and new.registration_cancellation_reason in ('organizer_withdrawn', 'recipient_rejected')
  then
    update public.app_notifications n
    set read_at = coalesce(n.read_at, timezone('utc', now())),
        seen_at = coalesce(n.seen_at, timezone('utc', now())),
        payload = jsonb_set(
          jsonb_set(
            coalesce(n.payload, '{}'::jsonb),
            '{decisionState}',
            case when new.registration_cancellation_reason = 'recipient_rejected'
              then '"treated"'::jsonb else '"unavailable"'::jsonb end
          ),
          '{decision}',
          case when new.registration_cancellation_reason = 'recipient_rejected'
            then '"reject"'::jsonb else '"withdrawn"'::jsonb end,
          true
        )
    where n.user_id = v_user_id
      and n.type = 'action_event'
      and n.payload ->> 'subtype' = 'invitation'
      and n.payload ->> 'eventKey' = v_event_key;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists action_registrations_action_invitations on public.action_registrations;
create trigger action_registrations_action_invitations
after insert or update of action_id, registration_status, registration_source,
  registration_cancellation_reason, manual_invitation_version or delete
on public.action_registrations
for each row execute function public.emit_action_invitations_on_registration();

revoke all on function public.emit_action_invitations_on_registration()
  from public, anon, authenticated;
grant execute on function public.emit_action_invitations_on_registration()
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
  v_reason text;
  v_event_key text;
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

  if v_registration.registration_status = 'confirmed' then
    return query select 'accepted', v_registration.id, v_registration.action_id;
    return;
  end if;
  if v_registration.registration_status = 'cancelled' then
    return query select
      case when v_registration.registration_cancellation_reason = 'recipient_rejected'
        then 'rejected' else 'unavailable' end,
      v_registration.id,
      v_registration.action_id;
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

  v_next_status := case when p_decision = 'accept' then 'confirmed' else 'cancelled' end;
  v_reason := case when p_decision = 'reject' then 'recipient_rejected' else null end;
  v_event_key := 'invitation:' || v_registration.id::text || ':' || coalesce(v_registration.manual_invitation_version, 1);

  update public.action_registrations
  set registration_status = v_next_status,
      registration_cancellation_reason = v_reason,
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
    and n.payload ->> 'eventKey' = v_event_key;

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

-- A participant edit is one transaction. It preserves confirmed registrations,
-- records organizer withdrawal instead of deleting rows, and only permits a
-- new invitation event after that explicit withdrawal. Recipient rejection is
-- terminal for this action and cannot be reactivated by an ordinary save.
create or replace function public.sync_action_manual_participants(
  p_action_id uuid,
  p_participant_user_ids text[]
)
returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_registration public.action_registrations%rowtype;
  v_target text;
  v_has_action boolean;
begin
  if p_participant_user_ids is null then
    raise exception 'participant user ids are required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_participant_user_ids) as requested(user_id)
    where nullif(btrim(requested.user_id), '') is null
  ) then
    raise exception 'participant user ids must not be blank' using errcode = '22023';
  end if;

  if exists (
    select 1
    from (
      select btrim(user_id) as user_id, count(*) as occurrences
      from unnest(p_participant_user_ids) as requested(user_id)
      group by btrim(user_id)
    ) duplicates
    where duplicates.occurrences > 1
  ) then
    raise exception 'participant user ids must be unique' using errcode = '23505';
  end if;

  select exists(select 1 from public.actions where id = p_action_id)
    into v_has_action;
  if not v_has_action then
    raise exception 'action does not exist' using errcode = '23503';
  end if;

  -- Serialize every participant replacement for this action, including two
  -- concurrent saves with different target sets.
  perform 1 from public.actions where id = p_action_id for update;
  perform 1 from public.action_registrations where action_id = p_action_id for update;

  for v_registration in
    select ar.*
    from public.action_registrations ar
    where ar.action_id = p_action_id
      and ar.registration_source = 'manual_add'
      and ar.registration_status = 'pending'
      and not exists (
        select 1
        from unnest(p_participant_user_ids) as requested(user_id)
        where btrim(requested.user_id) = ar.user_id
      )
    for update
  loop
    update public.action_registrations
    set registration_status = 'cancelled',
        registration_cancellation_reason = 'organizer_withdrawn'
    where id = v_registration.id;
  end loop;

  foreach v_target in array p_participant_user_ids
  loop
    v_target := btrim(v_target);

    select ar.* into v_registration
    from public.action_registrations ar
    where ar.action_id = p_action_id
      and ar.user_id = v_target
    for update;

    if not found then
      insert into public.action_registrations (
        action_id,
        user_id,
        registered_at,
        registration_status,
        registration_source,
        registration_cancellation_reason,
        manual_invitation_version
      ) values (
        p_action_id,
        v_target,
        timezone('utc', now()),
        'pending',
        'manual_add',
        null,
        1
      );
    elsif v_registration.registration_source = 'manual_add'
      and v_registration.registration_status = 'cancelled'
    then
      if v_registration.registration_cancellation_reason = 'organizer_withdrawn' then
        update public.action_registrations
        set registration_status = 'pending',
            registration_cancellation_reason = null,
            manual_invitation_version = coalesce(manual_invitation_version, 1) + 1,
            registered_at = timezone('utc', now())
        where id = v_registration.id;
      elsif v_registration.registration_cancellation_reason = 'recipient_rejected' then
        raise exception 'manual invitation was rejected by recipient: %', v_target
          using errcode = 'P0001';
      else
        raise exception 'manual invitation cannot be reactivated: %', v_target
          using errcode = 'P0001';
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.sync_action_manual_participants(uuid, text[])
  from public, anon, authenticated;
grant execute on function public.sync_action_manual_participants(uuid, text[])
  to service_role;
