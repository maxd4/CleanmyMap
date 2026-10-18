-- PURPOSE: make the public newsletter route the only application write boundary.
-- CALLER: /api/newsletter/subscribe after BotID, rate limiting, honeypot,
--         timestamp, schema and consent validation.
-- AUTHORIZATION_BOUNDARY: application roles cannot INSERT through PostgREST;
--                         only the server's service_role client retains INSERT.
-- IDEMPOTENCY: the existing email UNIQUE constraint and server upsert contract
--              remain unchanged.
-- ATOMICITY: privilege and policy changes are applied atomically by migration.
-- FAILURE_BEHAVIOR: direct anonymous/authenticated writes fail closed; the
--                   route keeps its existing HTTP validation responses.
-- SEARCH_PATH: no function, trigger or SECURITY DEFINER object is introduced.
-- GRANTS: public, anon and authenticated lose INSERT; service_role retains it.

drop policy if exists "Allow anonymous subscription"
  on public.newsletter_subscriptions;

revoke insert on table public.newsletter_subscriptions
  from public, anon, authenticated;

grant insert on table public.newsletter_subscriptions to service_role;
