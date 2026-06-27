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

drop policy if exists "reports service insert" on storage.objects;
create policy "reports service insert"
on storage.objects
for insert
with check (
  bucket_id = 'reports'
  and auth.role() = 'service_role'
);

drop policy if exists "reports service update" on storage.objects;
create policy "reports service update"
on storage.objects
for update
using (
  bucket_id = 'reports'
  and auth.role() = 'service_role'
)
with check (
  bucket_id = 'reports'
  and auth.role() = 'service_role'
);

drop policy if exists "reports service delete" on storage.objects;
create policy "reports service delete"
on storage.objects
for delete
using (
  bucket_id = 'reports'
  and auth.role() = 'service_role'
);
