-- Keep profiles readable by the app, but split write access into explicit policies.

drop policy if exists profiles_all_owner on public.profiles;

drop policy if exists profiles_insert_owner on public.profiles;
create policy profiles_insert_owner
on public.profiles
for insert
with check (
  auth.role() = 'service_role'
  or id = coalesce(auth.jwt() ->> 'sub', '')
);

drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner
on public.profiles
for update
using (
  auth.role() = 'service_role'
  or id = coalesce(auth.jwt() ->> 'sub', '')
)
with check (
  auth.role() = 'service_role'
  or id = coalesce(auth.jwt() ->> 'sub', '')
);

drop policy if exists profiles_delete_owner on public.profiles;
create policy profiles_delete_owner
on public.profiles
for delete
using (
  auth.role() = 'service_role'
  or id = coalesce(auth.jwt() ->> 'sub', '')
);
