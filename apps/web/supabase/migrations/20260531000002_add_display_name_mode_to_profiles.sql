-- 20260531000002_add_display_name_mode_to_profiles.sql

-- Clerk sync and account preferences rely on this column to preserve the
-- user's display name mode across profile refreshes.
alter table if exists public.profiles
  add column if not exists display_name_mode text not null default 'full_name';

update public.profiles
set display_name_mode = coalesce(display_name_mode, 'full_name')
where display_name_mode is null;
