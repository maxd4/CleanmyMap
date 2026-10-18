-- PURPOSE: close owner-predicate and direct-DML gaps for private quiz/event data.
-- CALLER: authenticated browser clients retain only their documented owner reads/writes;
--         service_role remains the server-only writer for reliable progression and notifications.
-- AUTHORIZATION_BOUNDARY: a non-empty Clerk JWT sub must match the stored owner exactly.
-- IDEMPOTENCY: statements are safe to replay through the migration history once.
-- ATOMICITY: grants and policies are applied in one migration transaction.
-- FAILURE_BEHAVIOR: a failed privilege or policy change aborts the migration.
-- SEARCH_PATH: no SECURITY DEFINER function is introduced; policies qualify public tables.
-- GRANTS: anon is denied private-table access; quiz_srs remains browser-writable for its owner;
--         quiz_type_progress and notification producers remain server-controlled.

-- RSVP ownership remains a user capability, but never an anonymous or empty-owner capability.
revoke all privileges on table public.event_rsvps from public, anon;
grant select, insert, update, delete on table public.event_rsvps to authenticated;
grant select, insert, update, delete on table public.event_rsvps to service_role;

drop policy if exists event_rsvps_select_all on public.event_rsvps;
drop policy if exists event_rsvps_all_owner on public.event_rsvps;
drop policy if exists event_rsvps_authenticated_owner on public.event_rsvps;
drop policy if exists event_rsvps_service_role on public.event_rsvps;

create policy event_rsvps_authenticated_owner on public.event_rsvps
for all to authenticated
using (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(participant_clerk_id), '') is not null
  and participant_clerk_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
)
with check (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(participant_clerk_id), '') is not null
  and participant_clerk_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
);

create policy event_rsvps_service_role on public.event_rsvps
for all to service_role
using (true)
with check (true);

-- SRS is intentionally writable from the authenticated browser for the current user.
revoke all privileges on table public.quiz_srs from public, anon;
grant select, insert, update, delete on table public.quiz_srs to authenticated;
grant select, insert, update, delete on table public.quiz_srs to service_role;

drop policy if exists quiz_srs_owner_all on public.quiz_srs;
drop policy if exists quiz_srs_authenticated_owner on public.quiz_srs;
drop policy if exists quiz_srs_service_role on public.quiz_srs;

create policy quiz_srs_authenticated_owner on public.quiz_srs
for all to authenticated
using (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(user_id), '') is not null
  and user_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
)
with check (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(user_id), '') is not null
  and user_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
);

create policy quiz_srs_service_role on public.quiz_srs
for all to service_role
using (true)
with check (true);

-- Reliable progression counters are readable by the owner but only advanced by the server.
revoke all privileges on table public.quiz_type_progress from public, anon, authenticated;
grant select on table public.quiz_type_progress to authenticated;
grant select, insert, update, delete on table public.quiz_type_progress to service_role;

drop policy if exists quiz_type_progress_owner_all on public.quiz_type_progress;
drop policy if exists quiz_type_progress_authenticated_select on public.quiz_type_progress;
drop policy if exists quiz_type_progress_service_role on public.quiz_type_progress;

create policy quiz_type_progress_authenticated_select on public.quiz_type_progress
for select to authenticated
using (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(user_id), '') is not null
  and user_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
);

create policy quiz_type_progress_service_role on public.quiz_type_progress
for all to service_role
using (true)
with check (true);

-- Notification producers are server-only; authenticated users can acknowledge their own rows
-- through the three dedicated receipt columns only.
revoke all privileges on table public.app_notifications from public, anon, authenticated;
grant select on table public.app_notifications to authenticated;
grant update (read_at, seen_at, acknowledged_at) on table public.app_notifications to authenticated;
grant select, insert, update, delete on table public.app_notifications to service_role;

drop policy if exists "Users can read own notifications" on public.app_notifications;
drop policy if exists "Users can update own notifications" on public.app_notifications;
drop policy if exists "Service role can insert notifications" on public.app_notifications;
drop policy if exists app_notifications_authenticated_select on public.app_notifications;
drop policy if exists app_notifications_authenticated_update_read_state on public.app_notifications;
drop policy if exists app_notifications_service_role on public.app_notifications;

create policy app_notifications_authenticated_select on public.app_notifications
for select to authenticated
using (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(user_id), '') is not null
  and user_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
);

create policy app_notifications_authenticated_update_read_state on public.app_notifications
for update to authenticated
using (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(user_id), '') is not null
  and user_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
)
with check (
  nullif(btrim((select auth.jwt() ->> 'sub')), '') is not null
  and nullif(btrim(user_id), '') is not null
  and user_id = nullif(btrim((select auth.jwt() ->> 'sub')), '')
);

create policy app_notifications_service_role on public.app_notifications
for all to service_role
using (true)
with check (true);
