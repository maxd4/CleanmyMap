-- Harden xp_audit so writes and reads stay server-side only.
alter table public.xp_audit enable row level security;

drop policy if exists xp_audit_service_only on public.xp_audit;
create policy xp_audit_service_only on public.xp_audit
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
