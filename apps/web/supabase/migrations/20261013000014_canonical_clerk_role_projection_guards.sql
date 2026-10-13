-- Clerk Production publicMetadata.role is the only user-role authority.
-- These columns remain server projections for bounded SQL/RLS compatibility;
-- they are never client-writable and must not be treated as role attribution.

alter table public.profiles
  add column if not exists role_projection_source text,
  add column if not exists role_projection_synced_at timestamptz;

do $$
begin
  alter table public.profiles
    add constraint profiles_role_projection_source_check
    check (
      role_projection_source is null
      or role_projection_source = 'clerk_public_metadata_role'
    );
exception
  when duplicate_object then null;
end $$;

revoke insert (
  role_label,
  active_role_label,
  role_projection_source,
  role_projection_synced_at
) on table public.profiles from anon, authenticated;

revoke update (
  role_label,
  active_role_label,
  role_projection_source,
  role_projection_synced_at
) on table public.profiles from anon, authenticated;

grant insert (
  role_label,
  active_role_label,
  role_projection_source,
  role_projection_synced_at
) on table public.profiles to service_role;

grant update (
  role_label,
  active_role_label,
  role_projection_source,
  role_projection_synced_at
) on table public.profiles to service_role;

comment on column public.profiles.role_label is
  'Server projection of Clerk publicMetadata.role; never a client authority.';
comment on column public.profiles.active_role_label is
  'Server projection of Clerk activeRole; bounded capability projection only.';
comment on column public.profiles.role_projection_synced_at is
  'Server-owned timestamp of the last successful Clerk role projection.';
