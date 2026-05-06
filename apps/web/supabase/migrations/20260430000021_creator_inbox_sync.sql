-- 20260430000021_creator_inbox_sync.sql

create table if not exists public.community_bug_reports (
  id uuid primary key,
  created_at timestamptz not null default now(),
  submitted_by_user_id text not null,
  submitted_by_display_name text not null,
  submitted_by_email text,
  submitted_by_role text,
  report_type text not null check (report_type in ('bug', 'idea', 'improvement', 'collaboration')),
  title text not null,
  description text not null,
  page_path text,
  source text not null default 'discussion_form' check (source in ('discussion_form', 'feedback_section', 'feedback_discussion')),
  status text not null default 'open' check (status in ('open', 'treated', 'archived')),
  creator_state text not null default 'new' check (creator_state in ('new', 'pending', 'responded', 'treated', 'archived'))
);

create index if not exists idx_community_bug_reports_created_at_desc
  on public.community_bug_reports(created_at desc);
create index if not exists idx_community_bug_reports_status
  on public.community_bug_reports(status);

alter table public.community_bug_reports enable row level security;

drop policy if exists community_bug_reports_service_only on public.community_bug_reports;
create policy community_bug_reports_service_only on public.community_bug_reports
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.promotion_requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  submitted_by_user_id text not null,
  submitted_by_display_name text not null,
  submitted_by_email text,
  submitted_by_role text not null check (submitted_by_role in ('benevole', 'coordinateur', 'scientifique', 'elu', 'admin', 'max')),
  requested_role text not null check (requested_role in ('elu', 'admin')),
  motivation text not null,
  status text not null default 'pending_owner_review' check (status in ('pending_owner_review', 'accepted', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by_user_id text,
  reviewed_by_role text,
  creator_state text not null default 'new' check (creator_state in ('new', 'pending', 'responded', 'treated', 'archived', 'accepted', 'rejected'))
);

create index if not exists idx_promotion_requests_created_at_desc
  on public.promotion_requests(created_at desc);
create index if not exists idx_promotion_requests_status
  on public.promotion_requests(status);

alter table public.promotion_requests enable row level security;

drop policy if exists promotion_requests_service_only on public.promotion_requests;
create policy promotion_requests_service_only on public.promotion_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create table if not exists public.partner_onboarding_requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  submitted_by_user_id text not null,
  submitted_by_email text,
  organization_name text not null,
  organization_type text not null check (organization_type in ('association', 'commerce', 'entreprise', 'collectif')),
  legal_identity text not null,
  coverage jsonb not null default '{}'::jsonb,
  contribution_types text[] not null default '{}'::text[],
  availability jsonb not null default '{}'::jsonb,
  contact_name text not null,
  contact_channel text not null,
  contact_details text not null,
  motivation text not null,
  status text not null default 'pending_admin_review' check (status in ('pending_admin_review', 'accepted', 'rejected')),
  creator_state text not null default 'new' check (creator_state in ('new', 'pending', 'responded', 'treated', 'archived', 'accepted', 'rejected'))
);

create index if not exists idx_partner_onboarding_requests_created_at_desc
  on public.partner_onboarding_requests(created_at desc);
create index if not exists idx_partner_onboarding_requests_status
  on public.partner_onboarding_requests(status);

alter table public.partner_onboarding_requests enable row level security;

drop policy if exists partner_onboarding_requests_service_only on public.partner_onboarding_requests;
create policy partner_onboarding_requests_service_only on public.partner_onboarding_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
