-- Community subscription writes are server-only.
-- The HTTP routes authenticate the member, derive user_id from the session,
-- normalize the target with the canonical territory registry, and then use
-- the service-role server client. Keep SELECT available to authenticated
-- owners for the existing RLS contract, but do not let the Data API bypass
-- that server validation boundary for INSERT, UPDATE, or DELETE.
revoke insert, update, delete
  on table public.community_subscriptions
  from public, anon, authenticated;

grant select
  on table public.community_subscriptions
  to authenticated, service_role;

grant insert, update, delete
  on table public.community_subscriptions
  to service_role;
