-- SECURITY-01 corrective migration: restore only the UPDATE capability required
-- by the two existing server-side ON CONFLICT DO UPDATE paths.
--
-- PURPOSE: make newsletter reactivation and action-notification mute upserts
-- executable by the already-authorized service_role client.
-- CALLER: server routes after their existing validation and rate-limit guards.
-- AUTHORIZATION_BOUNDARY: service_role is technical authority only; the HTTP
-- routes remain responsible for AuthN/AuthZ and ownership before this client
-- is used.
-- IDEMPOTENCY: GRANT/REVOKE statements are safe to replay.
-- ATOMICITY: PostgreSQL applies each privilege change atomically.
-- FAILURE_BEHAVIOR: any failed privilege change aborts the migration.
-- SEARCH_PATH: no function or SECURITY DEFINER object is introduced.
-- GRANTS: only service_role receives UPDATE; anon/authenticated remain denied.

revoke update on table public.newsletter_subscriptions from public, anon, authenticated;
grant update on table public.newsletter_subscriptions to service_role;

revoke update on table public.notification_information_mutes from public, anon, authenticated;
grant update on table public.notification_information_mutes to service_role;
