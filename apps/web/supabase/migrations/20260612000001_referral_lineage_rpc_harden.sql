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
with recursive
  normalized_limit as (
    select 20::integer as depth_limit
  ),
  ancestors as (
    select
      p.id::text,
      p.display_name::text,
      p.referral_code::text,
      p.referred_by_profile_id::text,
      p.referred_at::text,
      p.created_at::text,
      0::integer as depth,
      array[p.id::text]::text[] as path
    from public.profiles p
    where p.id = focus_profile_id

    union all

    select
      p.id::text,
      p.display_name::text,
      p.referral_code::text,
      p.referred_by_profile_id::text,
      p.referred_at::text,
      p.created_at::text,
      a.depth + 1 as depth,
      a.path || p.id::text as path
    from public.profiles p
    join ancestors a on p.id = a.referred_by_profile_id
    cross join normalized_limit nl
    where a.depth < nl.depth_limit
      and not (p.id::text = any(a.path))
  ),
  descendants as (
    select
      p.id::text,
      p.display_name::text,
      p.referral_code::text,
      p.referred_by_profile_id::text,
      p.referred_at::text,
      p.created_at::text,
      0::integer as depth,
      array[p.id::text]::text[] as path
    from public.profiles p
    where p.id = focus_profile_id

    union all

    select
      p.id::text,
      p.display_name::text,
      p.referral_code::text,
      p.referred_by_profile_id::text,
      p.referred_at::text,
      p.created_at::text,
      d.depth + 1 as depth,
      d.path || p.id::text as path
    from public.profiles p
    join descendants d on p.referred_by_profile_id = d.id
    cross join normalized_limit nl
    where d.depth < nl.depth_limit
      and not (p.id::text = any(d.path))
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

revoke all on function public.load_referral_lineage_profiles(text) from public;
revoke all on function public.load_referral_lineage_profiles(text) from anon;
revoke all on function public.load_referral_lineage_profiles(text) from authenticated;
revoke all on function public.load_referral_lineage_profiles(text) from service_role;
grant execute on function public.load_referral_lineage_profiles(text) to anon;
grant execute on function public.load_referral_lineage_profiles(text) to authenticated;
grant execute on function public.load_referral_lineage_profiles(text) to service_role;
