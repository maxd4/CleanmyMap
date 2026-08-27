-- DSA-02: traceable administrative decisions for legal content notifications.
alter table public.legal_content_reports
  drop constraint if exists legal_content_reports_creator_state_check;

alter table public.legal_content_reports
  add constraint legal_content_reports_creator_state_check check (
    creator_state in (
      'new', 'responded', 'treated', 'archived', 'reviewing', 'no_action',
      'content_restricted', 'content_removed', 'closed'
    )
  );

create table if not exists public.legal_content_report_decisions (
  id uuid primary key,
  report_id uuid not null references public.legal_content_reports(id) on delete restrict,
  created_at timestamptz not null default now(),
  actor_admin_user_id text not null,
  action text not null,
  decision_origin text not null,
  reason text not null,
  automated_means_used boolean not null default false,
  legal_basis text,
  terms_basis text,
  content_url text not null,
  content_id text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  execution_status text not null default 'not_applicable',
  execution_error_code text,
  audit_operation_id uuid not null,
  notifier_notification_status text not null default 'not_requested',
  author_notification_status text not null default 'not_requested',
  notification_error text,
  constraint legal_content_report_decisions_action_check check (
    action in ('reviewing', 'no_action', 'content_restricted', 'content_removed', 'closed')
  ),
  constraint legal_content_report_decisions_origin_check check (
    decision_origin in ('received_notification', 'internal_initiative')
  ),
  constraint legal_content_report_decisions_basis_check check (
    action not in ('content_restricted', 'content_removed')
    or ((legal_basis is not null) <> (terms_basis is not null))
  ),
  constraint legal_content_report_decisions_execution_status_check check (
    execution_status in ('not_applicable', 'pending', 'applied', 'failed')
  ),
  constraint legal_content_report_decisions_execution_error_code_check check (
    execution_error_code is null
    or execution_error_code in (
      'capability_unavailable', 'content_not_found', 'mutation_failed',
      'projection_failed', 'legacy_execution_unknown'
    )
  ),
  constraint legal_content_report_decisions_execution_consistency_check check (
    (
      action in ('content_restricted', 'content_removed')
      and execution_status in ('pending', 'applied', 'failed')
    )
    or (
      action in ('reviewing', 'no_action', 'closed')
      and execution_status = 'not_applicable'
    )
  ),
  constraint legal_content_report_decisions_execution_error_presence_check check (
    (execution_status = 'failed' and execution_error_code is not null)
    or (execution_status <> 'failed' and execution_error_code is null)
  ),
  constraint legal_content_report_decisions_lengths_check check (
    char_length(reason) between 5 and 2000
    and char_length(coalesce(legal_basis, '')) <= 1000
    and char_length(coalesce(terms_basis, '')) <= 1000
    and char_length(content_url) <= 2048
    and char_length(coalesce(content_id, '')) <= 160
    and octet_length(before_state::text) <= 4000
    and octet_length(after_state::text) <= 4000
    and char_length(coalesce(execution_error_code, '')) <= 80
    and char_length(coalesce(notification_error, '')) <= 500
  ),
  constraint legal_content_report_decisions_notification_status_check check (
    notifier_notification_status in ('not_requested', 'sent', 'failed')
    and author_notification_status in ('not_requested', 'sent', 'failed')
  )
);

create index if not exists legal_content_report_decisions_report_idx
  on public.legal_content_report_decisions (report_id, created_at desc);

revoke all privileges on table public.legal_content_report_decisions from anon, authenticated;
revoke all privileges on table public.legal_content_report_decisions from service_role;
grant select, insert, update, delete on table public.legal_content_report_decisions to service_role;

alter table public.legal_content_report_decisions enable row level security;
drop policy if exists legal_content_report_decisions_service_only
  on public.legal_content_report_decisions;
