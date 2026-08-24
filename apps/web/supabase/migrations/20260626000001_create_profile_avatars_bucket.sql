-- 20260626000001_create_profile_avatars_bucket.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array[
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

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert"
on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and coalesce((select auth.jwt() ->> 'sub'), '') <> ''
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update"
on storage.objects
for update
using (
  bucket_id = 'avatars'
  and coalesce((select auth.jwt() ->> 'sub'), '') <> ''
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = (select auth.jwt() ->> 'sub')
)
with check (
  bucket_id = 'avatars'
  and coalesce((select auth.jwt() ->> 'sub'), '') <> ''
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = (select auth.jwt() ->> 'sub')
);

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete"
on storage.objects
for delete
using (
  bucket_id = 'avatars'
  and coalesce((select auth.jwt() ->> 'sub'), '') <> ''
  and (storage.foldername(name))[1] = 'profiles'
  and (storage.foldername(name))[2] = (select auth.jwt() ->> 'sub')
);
