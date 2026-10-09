-- J-1 in-app reminders and user-owned notification preferences.
-- The daily maintenance job is deliberately the only scheduler. The reminder
-- event key is stable for an action/user, so a date edit cannot re-emit a
-- reminder that was already delivered.

create table if not exists public.notification_preferences (
  user_id text primary key,
  informational_enabled boolean not null default true,
  action_reminders_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select_own on public.notification_preferences;
create policy notification_preferences_select_own
  on public.notification_preferences for select
  using ((select auth.role()) = 'service_role' or user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

drop policy if exists notification_preferences_insert_own on public.notification_preferences;
create policy notification_preferences_insert_own
  on public.notification_preferences for insert
  with check ((select auth.role()) = 'service_role' or user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

drop policy if exists notification_preferences_update_own on public.notification_preferences;
create policy notification_preferences_update_own
  on public.notification_preferences for update
  using ((select auth.role()) = 'service_role' or user_id = coalesce((select auth.jwt()) ->> 'sub', ''))
  with check ((select auth.role()) = 'service_role' or user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

drop trigger if exists notification_preferences_updated_at on public.notification_preferences;
create trigger notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

revoke all on public.notification_preferences from public, anon;
grant select, insert, update on public.notification_preferences to authenticated, service_role;

create table if not exists public.notification_information_mutes (
  user_id text not null,
  action_id uuid not null references public.actions(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, action_id)
);

alter table public.notification_information_mutes enable row level security;

drop policy if exists notification_information_mutes_select_own on public.notification_information_mutes;
create policy notification_information_mutes_select_own
  on public.notification_information_mutes for select
  using ((select auth.role()) = 'service_role' or user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

drop policy if exists notification_information_mutes_insert_own on public.notification_information_mutes;
create policy notification_information_mutes_insert_own
  on public.notification_information_mutes for insert
  with check ((select auth.role()) = 'service_role' or user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

drop policy if exists notification_information_mutes_delete_own on public.notification_information_mutes;
create policy notification_information_mutes_delete_own
  on public.notification_information_mutes for delete
  using ((select auth.role()) = 'service_role' or user_id = coalesce((select auth.jwt()) ->> 'sub', ''));

revoke all on public.notification_information_mutes from public, anon;
grant select, insert, delete on public.notification_information_mutes to authenticated, service_role;

create index if not exists actions_j1_reminder_due_idx
  on public.actions (action_date)
  where action_phase = 'pre_action'
    and published_at is not null
    and status in ('pending', 'approved')
    and coalesce(moderation_visibility, 'visible') = 'visible';

create index if not exists action_registrations_confirmed_action_user_idx
  on public.action_registrations (action_id, user_id)
  where registration_status = 'confirmed';

create unique index if not exists app_notifications_action_reminder_unique_idx
  on public.app_notifications (user_id, (payload ->> 'eventKey'))
  where type = 'action_event'
    and payload ->> 'subtype' = 'action_reminder'
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.emit_action_j1_reminders(
  p_now timestamptz default timezone('utc', now())
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_inserted_count integer := 0;
  v_reminder_date date := (p_now at time zone 'Europe/Paris')::date + 1;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  -- The business date is Europe/Paris, while the scheduler remains UTC.
  -- Pending and cancelled registrations are intentionally absent from the
  -- audience; a confirmed inscription is the only source of a reminder.
  insert into public.app_notifications (user_id, type, title, content, payload)
  select
    ar.user_id,
    'action_event',
    'Rappel — action demain',
    'Votre inscription est confirmée pour demain : '
      || to_char(a.action_date, 'DD/MM/YYYY')
      || case when a.event_start_time is not null
        then ' à ' || to_char(a.event_start_time, 'HH24:MI')
        else '' end
      || ' · rendez-vous : ' || a.location_label
      || '. Ouvrez l’action pour consulter les horaires et le rendez-vous.',
    jsonb_strip_nulls(jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'action_reminder',
      'actionId', a.id,
      'registrationId', ar.id,
      'actionDate', a.action_date,
      'eventStartTime', a.event_start_time,
      'eventEndTime', a.event_end_time,
      'locationLabel', a.location_label,
      'timezone', 'Europe/Paris',
      'reminderKind', 'j-1',
      'decisionState', 'informational',
      'optional', false,
      'eventKey', 'action_reminder:j-1:' || a.id::text,
      'href', '/sections/rejoindre-une-action?actionId=' || a.id::text
    ))
  from public.actions a
  join public.action_registrations ar on ar.action_id = a.id
  left join public.notification_preferences np on np.user_id = ar.user_id
  where a.action_phase = 'pre_action'
    and a.published_at is not null
    and a.status in ('pending', 'approved')
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and a.action_date = v_reminder_date
    and ar.registration_status = 'confirmed'
    and coalesce(np.action_reminders_enabled, true)
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;
  return v_inserted_count;
end;
$$;

revoke all on function public.emit_action_j1_reminders(timestamptz)
  from public, anon, authenticated;
grant execute on function public.emit_action_j1_reminders(timestamptz)
  to service_role;
