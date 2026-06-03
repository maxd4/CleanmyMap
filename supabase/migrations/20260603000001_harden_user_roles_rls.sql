-- Harden user_roles so admin role lookups stay server-only.

alter table if exists public.user_roles
  enable row level security;

drop policy if exists system_can_manage_roles on public.user_roles;
drop policy if exists user_roles_service_only on public.user_roles;

create policy user_roles_service_only on public.user_roles
  for select
  using (auth.role() = 'service_role');

revoke all on table public.user_roles from anon, authenticated;
grant select, insert, update, delete on table public.user_roles to service_role;
