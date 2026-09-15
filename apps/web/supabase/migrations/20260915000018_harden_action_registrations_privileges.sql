-- Keep planned registrations server-owned after the registration/final-
-- participation split. This migration is append-only; 00014 is already applied.

alter table public.action_registrations enable row level security;

-- No browser role may access planned registrations directly. The explicit
-- PUBLIC revoke also removes any inherited default table privilege.
revoke all on table public.action_registrations from public;
revoke all on table public.action_registrations from anon, authenticated;

-- The old role-check policy is unnecessary for a table with no browser
-- grants: service_role bypasses RLS and is granted the server CRUD privileges
-- explicitly below.
drop policy if exists action_registrations_service_only on public.action_registrations;

grant select, insert, update, delete on table public.action_registrations
  to service_role;
