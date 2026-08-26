-- Extend the canonical admin audit contract for generic administrative commands.
-- This migration is idempotent and preserves every previously supported type.
do $$
declare
  constraint_name text;
begin
  if to_regclass('public.admin_operations_audit') is null then
    raise exception 'public.admin_operations_audit must exist before extending its contract';
  end if;

  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.admin_operations_audit'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%operation_type%'
  loop
    execute format(
      'alter table public.admin_operations_audit drop constraint %I',
      constraint_name
    );
  end loop;

  alter table public.admin_operations_audit
    add constraint admin_operations_audit_operation_type_check
    check (
      operation_type in (
        'moderation',
        'import_dry_run',
        'import_confirm',
        'role_management',
        'admin_operation'
      )
    );
end;
$$;
