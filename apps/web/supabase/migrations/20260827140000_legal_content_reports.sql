-- DSA-01: dedicated, server-only storage for electronic content notifications.
create table if not exists public.legal_content_reports (
  id uuid primary key,
  created_at timestamptz not null default now(),
  submitted_by_user_id text,
  notifier_name text,
  notifier_email text,
  identity_exception_reason text,
  content_url text not null,
  content_type text,
  content_id text,
  allegation_reason text not null,
  good_faith_confirmed boolean not null default false,
  status text not null default 'open',
  creator_state text not null default 'new',
  constraint legal_content_reports_good_faith_check check (good_faith_confirmed = true),
  constraint legal_content_reports_text_lengths_check check (
    char_length(coalesce(notifier_name, '')) <= 160
    and char_length(coalesce(notifier_email, '')) <= 254
    and char_length(coalesce(identity_exception_reason, '')) <= 1000
    and char_length(content_url) <= 2048
    and char_length(coalesce(content_type, '')) <= 120
    and char_length(coalesce(content_id, '')) <= 160
    and char_length(allegation_reason) <= 5000
  ),
  constraint legal_content_reports_status_check check (status in ('open', 'treated', 'archived')),
  constraint legal_content_reports_creator_state_check check (creator_state in ('new', 'responded', 'treated', 'archived'))
);

create index if not exists legal_content_reports_created_at_idx
  on public.legal_content_reports (created_at desc);
create index if not exists legal_content_reports_creator_state_idx
  on public.legal_content_reports (creator_state, created_at desc);

revoke all privileges on table public.legal_content_reports from anon, authenticated;
revoke all privileges on table public.legal_content_reports from service_role;
grant all privileges on table public.legal_content_reports to service_role;

alter table public.legal_content_reports enable row level security;
drop policy if exists legal_content_reports_service_only on public.legal_content_reports;
create policy legal_content_reports_service_only
on public.legal_content_reports
for all
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');
