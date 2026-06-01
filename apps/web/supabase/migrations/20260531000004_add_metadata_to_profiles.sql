-- 20260531000004_add_metadata_to_profiles.sql

-- Profiles need a lightweight metadata mirror so chat and community filters
-- can read the user's persisted zone preferences from Supabase.
alter table if exists public.profiles
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.profiles
set metadata = coalesce(metadata, '{}'::jsonb)
where metadata is null;
