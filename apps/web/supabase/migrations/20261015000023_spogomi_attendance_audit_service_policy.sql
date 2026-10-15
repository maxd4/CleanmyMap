-- Service-only audit table: keep RLS enabled and make the sole server policy
-- explicit so the linked security advisor can distinguish the contract.

create policy spogomi_attendance_audit_service_only
  on public.spogomi_attendance_audit
  for all
  to service_role
  using (true)
  with check (true);
