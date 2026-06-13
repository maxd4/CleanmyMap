-- 20260528000001_gamification_xp_decimal_and_triangular_levels.sql
--
-- Switch XP storage to numeric to allow half XP (0.5).
-- Keep existing data by casting integers to numeric.
--
-- Notes:
-- - RLS policies remain service_role only as previously defined.
-- - We keep columns names unchanged; only types/constraints evolve.

alter table if exists public.progression_events
  alter column xp_base type numeric using xp_base::numeric,
  alter column xp_awarded type numeric using xp_awarded::numeric;

alter table if exists public.progression_profiles
  alter column xp_total type numeric using xp_total::numeric,
  alter column xp_validated type numeric using xp_validated::numeric,
  alter column xp_pending type numeric using xp_pending::numeric;

-- Ensure XP stays non-negative.
alter table if exists public.progression_events
  drop constraint if exists progression_events_xp_base_check,
  drop constraint if exists progression_events_xp_awarded_check;

alter table if exists public.progression_events
  add constraint progression_events_xp_base_check check (xp_base >= 0),
  add constraint progression_events_xp_awarded_check check (xp_awarded >= 0);

alter table if exists public.progression_profiles
  drop constraint if exists progression_profiles_xp_total_check,
  drop constraint if exists progression_profiles_xp_validated_check,
  drop constraint if exists progression_profiles_xp_pending_check;

alter table if exists public.progression_profiles
  add constraint progression_profiles_xp_total_check check (xp_total >= 0),
  add constraint progression_profiles_xp_validated_check check (xp_validated >= 0),
  add constraint progression_profiles_xp_pending_check check (xp_pending >= 0);

