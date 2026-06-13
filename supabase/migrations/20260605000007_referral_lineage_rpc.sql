create or replace function public.load_referral_lineage_profiles(focus_profile_id text)
returns table (
  id text,
  display_name text,
  referral_code text,
  referred_by_profile_id text,
  referred_at text,
  created_at text
)
language sql
stable
security invoker
set search_path = public
as $$
with recursive ancestors as (
  select
    p.id::text,
    p.display_name::text,
    p.referral_code::text,
    p.referred_by_profile_id::text,
    p.referred_at::text,
    p.created_at::text
  from public.profiles p
  where p.id = focus_profile_id

  union all

  select
    p.id::text,
    p.display_name::text,
    p.referral_code::text,
    p.referred_by_profile_id::text,
    p.referred_at::text,
    p.created_at::text
  from public.profiles p
  join ancestors a on p.id = a.referred_by_profile_id
),
descendants as (
  select
    p.id::text,
    p.display_name::text,
    p.referral_code::text,
    p.referred_by_profile_id::text,
    p.referred_at::text,
    p.created_at::text
  from public.profiles p
  where p.id = focus_profile_id

  union all

  select
    p.id::text,
    p.display_name::text,
    p.referral_code::text,
    p.referred_by_profile_id::text,
    p.referred_at::text,
    p.created_at::text
  from public.profiles p
  join descendants d on p.referred_by_profile_id = d.id
)
select distinct
  id,
  display_name,
  referral_code,
  referred_by_profile_id,
  referred_at,
  created_at
from ancestors
union
select distinct
  id,
  display_name,
  referral_code,
  referred_by_profile_id,
  referred_at,
  created_at
from descendants;
$$;
