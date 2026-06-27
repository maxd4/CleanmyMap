create index if not exists idx_admin_operations_audit_target_at_desc
  on public.admin_operations_audit(target_id, at desc);
