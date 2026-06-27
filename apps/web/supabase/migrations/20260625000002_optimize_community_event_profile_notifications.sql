create index if not exists idx_profiles_zone_name_normalized
  on public.profiles (lower(btrim(coalesce(metadata->>'zoneName', ''))));

create or replace function public.load_community_event_notification_profiles(
  p_excluded_profile_id text,
  p_arrondissement_ids integer[] default '{}'::integer[],
  p_zone_names text[] default '{}'::text[]
)
returns table (
  id text,
  paris_arrondissement integer,
  metadata jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
with normalized_zone_names as (
  select distinct lower(btrim(zone_name)) as zone_name
  from unnest(coalesce(p_zone_names, '{}'::text[])) as zone_name
  where btrim(zone_name) <> ''
),
arrondissement_matches as (
  select
    p.id::text,
    p.paris_arrondissement,
    p.metadata
  from public.profiles p
  where p.id <> p_excluded_profile_id
    and p.paris_arrondissement = any(coalesce(p_arrondissement_ids, '{}'::integer[]))
),
zone_matches as (
  select
    p.id::text,
    p.paris_arrondissement,
    p.metadata
  from public.profiles p
  join normalized_zone_names n
    on lower(btrim(coalesce(p.metadata->>'zoneName', ''))) = n.zone_name
  where p.id <> p_excluded_profile_id
)
select
  id,
  paris_arrondissement,
  metadata
from arrondissement_matches
union
select
  id,
  paris_arrondissement,
  metadata
from zone_matches;
$$;

revoke all on function public.load_community_event_notification_profiles(text, integer[], text[]) from public;
revoke all on function public.load_community_event_notification_profiles(text, integer[], text[]) from anon;
revoke all on function public.load_community_event_notification_profiles(text, integer[], text[]) from authenticated;
revoke all on function public.load_community_event_notification_profiles(text, integer[], text[]) from service_role;
grant execute on function public.load_community_event_notification_profiles(text, integer[], text[]) to service_role;
