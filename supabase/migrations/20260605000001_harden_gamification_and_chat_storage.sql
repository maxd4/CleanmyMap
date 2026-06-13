-- Harden gamification helpers and remove broad storage listing access.

-- Ensure the RPC cannot inherit a mutable search_path.
alter function public.notify_gamification(text, jsonb)
  set search_path = public, pg_temp;

-- Keep the daily XP aggregate available to server-side admin code only.
revoke select on table public.xp_audit_daily from anon, authenticated;
grant select on table public.xp_audit_daily to service_role;

-- Public bucket access should rely on object URLs, not object listing.
drop policy if exists "chat attachments public read" on storage.objects;
