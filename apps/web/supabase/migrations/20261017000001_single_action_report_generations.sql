-- Forward-only extension of the canonical report generation contract.
-- Single-action snapshots are resolved server-side and are immutable history.

alter table public.report_generations
  drop constraint if exists report_generations_scope_kind_check;

alter table public.report_generations
  add constraint report_generations_scope_kind_check
  check (scope_kind in ('global', 'account', 'association', 'arrondissement', 'single_action'));

revoke update, delete on table public.report_generations from service_role;
grant select, insert on table public.report_generations to service_role;
