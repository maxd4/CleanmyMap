-- Keep a mobile mission creation retry bound to one owner and one operation.
-- The key is server-owned: native clients may request it through the Clerk
-- bearer route, but cannot write or change it through the direct Supabase path.
alter table public.missions
  add column if not exists idempotency_key text;

create unique index if not exists missions_volunteer_idempotency_key_idx
  on public.missions(volunteer_id, idempotency_key)
  where idempotency_key is not null;

revoke insert (idempotency_key) on public.missions from authenticated;
revoke update (idempotency_key) on public.missions from authenticated;
grant all privileges on table public.missions to service_role;
