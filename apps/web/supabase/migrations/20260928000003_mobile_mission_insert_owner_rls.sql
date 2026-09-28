-- Allow the authenticated mobile client to create a pending GPS mission for
-- its own Clerk identity. No derived metric or server-owned provenance column
-- is part of the insert surface.

drop policy if exists "volunteer_insert_missions" on public.missions;

create policy "volunteer_insert_missions" on public.missions
  for insert
  to authenticated
  with check (
    coalesce((select auth.jwt()) ->> 'sub', '') <> ''
    and volunteer_id = coalesce((select auth.jwt()) ->> 'sub', '')
  );

grant insert (volunteer_id, label) on table public.missions to authenticated;
