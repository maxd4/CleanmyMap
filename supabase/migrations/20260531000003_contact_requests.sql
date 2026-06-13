-- 20260531000003_contact_requests.sql

create table if not exists public.contact_requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  submitted_by_user_id text,
  submitted_by_email text not null,
  request_type text not null check (request_type in ('access', 'rectification', 'erasure', 'portability', 'other')),
  subject text not null,
  message text not null,
  page_path text,
  source text not null default 'contact_page' check (source in ('contact_page')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  notification_error text
);

create index if not exists idx_contact_requests_created_at_desc
  on public.contact_requests(created_at desc);
create index if not exists idx_contact_requests_status
  on public.contact_requests(status);

alter table public.contact_requests enable row level security;

drop policy if exists contact_requests_service_only on public.contact_requests;
create policy contact_requests_service_only on public.contact_requests
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
