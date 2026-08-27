-- Close the rls_enabled_no_policy advisor for the three legacy/server-only tables.
--
-- The current runtime only reads forms for server-side progression data and
-- reads the two legacy spot tables from the service-role archive export. No
-- application write path remains for these tables, so service_role keeps
-- SELECT only and public API roles receive no table privileges.

revoke all privileges on table public.forms from anon, authenticated;
revoke all privileges on table public.forms from service_role;
grant select on table public.forms to service_role;

alter table public.forms enable row level security;
drop policy if exists forms_service_select on public.forms;
create policy forms_service_select
on public.forms
for select
using (auth.role() = 'service_role');

revoke all privileges on table public.legacy_spot_migrations from anon, authenticated;
revoke all privileges on table public.legacy_spot_migrations from service_role;
grant select on table public.legacy_spot_migrations to service_role;

alter table public.legacy_spot_migrations enable row level security;
drop policy if exists legacy_spot_migrations_service_select on public.legacy_spot_migrations;
create policy legacy_spot_migrations_service_select
on public.legacy_spot_migrations
for select
using (auth.role() = 'service_role');

revoke all privileges on table public.spots from anon, authenticated;
revoke all privileges on table public.spots from service_role;
grant select on table public.spots to service_role;

alter table public.spots enable row level security;
drop policy if exists spots_service_select on public.spots;
create policy spots_service_select
on public.spots
for select
using (auth.role() = 'service_role');
