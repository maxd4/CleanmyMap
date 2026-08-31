-- Keep profile self-service writes column-scoped.
-- Clerk remains the authority for role_label; referral lineage is server-owned.

revoke insert, update on table public.profiles from anon, authenticated;

grant insert (
  id,
  display_name,
  display_name_mode,
  avatar_url,
  handle,
  paris_arrondissement,
  metadata,
  updated_at
)
on table public.profiles
to authenticated;

grant update (
  display_name,
  display_name_mode,
  avatar_url,
  handle,
  paris_arrondissement,
  metadata,
  updated_at
)
on table public.profiles
to authenticated;

-- Server synchronization and server-owned referral operations retain full writes.
grant insert, update on table public.profiles to service_role;
