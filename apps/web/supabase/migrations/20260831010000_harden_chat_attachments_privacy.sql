-- Chat attachments can be referenced by private conversations; object access
-- must not bypass app_messages RLS through a public bucket URL.
update storage.buckets
set public = false
where id = 'chat-attachments';

drop policy if exists "chat attachments public read" on storage.objects;
drop policy if exists "chat attachments authenticated upload" on storage.objects;
drop policy if exists "chat attachments owner update" on storage.objects;
drop policy if exists "chat attachments owner delete" on storage.objects;

create policy "chat attachments owner read"
on storage.objects
for select
using (
  bucket_id = 'chat-attachments'
  and (
    (select auth.role()) = 'service_role'
    or owner_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
);

create policy "chat attachments authenticated upload"
on storage.objects
for insert
with check (
  bucket_id = 'chat-attachments'
  and (select auth.role()) = 'authenticated'
  and split_part(name, '/', 1) in ('community', 'dm', 'admin_elu', 'territory', 'bug_report')
  and left(
    split_part(name, '/', 2),
    length(coalesce((select auth.jwt()) ->> 'sub', '')) + 1
  ) = coalesce((select auth.jwt()) ->> 'sub', '') || '-'
);

create policy "chat attachments owner update"
on storage.objects
for update
using (
  bucket_id = 'chat-attachments'
  and (
    (select auth.role()) = 'service_role'
    or owner_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
)
with check (
  bucket_id = 'chat-attachments'
  and (
    (select auth.role()) = 'service_role'
    or owner_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
);

create policy "chat attachments owner delete"
on storage.objects
for delete
using (
  bucket_id = 'chat-attachments'
  and (
    (select auth.role()) = 'service_role'
    or owner_id = coalesce((select auth.jwt()) ->> 'sub', '')
  )
);
