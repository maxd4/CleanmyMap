-- 20260531000005_create_chat_attachments_bucket.sql

-- Chat attachments need a public bucket because the chat composer stores
-- public URLs returned by getPublicUrl().
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/x-7z-compressed',
    'application/x-rar-compressed',
    'application/x-zip-compressed',
    'application/zip',
    'text/csv',
    'text/markdown',
    'text/plain',
    'image/avif',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "chat attachments public read" on storage.objects;
create policy "chat attachments public read"
on storage.objects
for select
using (bucket_id = 'chat-attachments');

drop policy if exists "chat attachments authenticated upload" on storage.objects;
create policy "chat attachments authenticated upload"
on storage.objects
for insert
with check (
  bucket_id = 'chat-attachments'
  and auth.role() = 'authenticated'
);

drop policy if exists "chat attachments owner update" on storage.objects;
create policy "chat attachments owner update"
on storage.objects
for update
using (
  bucket_id = 'chat-attachments'
  and (auth.role() = 'service_role' or owner = auth.uid())
)
with check (
  bucket_id = 'chat-attachments'
  and (auth.role() = 'service_role' or owner = auth.uid())
);

drop policy if exists "chat attachments owner delete" on storage.objects;
create policy "chat attachments owner delete"
on storage.objects
for delete
using (
  bucket_id = 'chat-attachments'
  and (auth.role() = 'service_role' or owner = auth.uid())
);
