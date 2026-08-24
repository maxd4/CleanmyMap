-- 20260626000002_create_reports_bucket.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reports',
  'reports',
  false,
  52428800,
  array[
    'application/json',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/markdown'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Reports are private and are accessed through server-only clients after the
-- application-level admin check. No client storage policy is granted here;
-- the service role bypasses object RLS for the server-side upload/download.
drop policy if exists "reports service insert" on storage.objects;
drop policy if exists "reports service update" on storage.objects;
drop policy if exists "reports service delete" on storage.objects;
