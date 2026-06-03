-- 20260601000002_referral_invites.sql

-- Persist the referral chain directly on profiles so we can reconnect users
-- that know each other without introducing a separate anonymous cache.
alter table if exists public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by_profile_id text,
  add column if not exists referred_at timestamptz;

alter table if exists public.profiles
  add constraint profiles_referred_by_profile_id_fkey
  foreign key (referred_by_profile_id) references public.profiles(id) on delete set null;

create unique index if not exists idx_profiles_referral_code
  on public.profiles(referral_code)
  where referral_code is not null;

create index if not exists idx_profiles_referred_by_profile_id
  on public.profiles(referred_by_profile_id);

