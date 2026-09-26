-- The organizer directory is read and written by the server with service_role.
-- No browser role needs direct table access or visibility of created_by_clerk_id.
alter table public.organizer_directory_entries enable row level security;

drop policy if exists organizer_directory_entries_select_authenticated
  on public.organizer_directory_entries;

revoke all privileges on table public.organizer_directory_entries
  from public, anon, authenticated, service_role;
grant select, insert on table public.organizer_directory_entries to service_role;
