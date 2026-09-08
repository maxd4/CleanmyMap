-- ACTION-PUBLIC-2026-01: expose valid future pre-actions on the public map
-- without changing their persisted lifecycle status or Impact eligibility.

create or replace function public.actions_map_feed(
  p_south double precision default null,
  p_west double precision default null,
  p_north double precision default null,
  p_east double precision default null,
  p_zoom integer default null,
  p_status text default null,
  p_floor_date date default null,
  p_types text[] default null,
  p_impact text default null,
  p_limit integer default 80
)
returns table (
  source text,
  entity_type text,
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  created_by_clerk_id text,
  status text,
  observed_at date,
  location_label text,
  latitude double precision,
  longitude double precision,
  waste_kg numeric,
  cigarette_butts integer,
  volunteers_count integer,
  duration_minutes integer,
  notes text,
  derived_geometry_kind text,
  derived_geometry_geojson text,
  geometry_confidence numeric,
  geometry_source text
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(
    1,
    least(
      coalesce(p_limit, 80),
      case
        when coalesce(p_zoom, 12) <= 8 then 60
        when coalesce(p_zoom, 12) <= 10 then 120
        when coalesce(p_zoom, 12) <= 12 then 180
        else 300
      end
    )
  ) as value
), action_rows as (
  select
    'actions'::text as source,
    'action'::text as entity_type,
    a.id,
    a.created_at,
    a.updated_at,
    a.created_by_clerk_id,
    case
      when a.status = 'pending'
        and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'
        and a.action_date > current_date
        then 'approved'
      else a.status
    end::text as status,
    a.action_date as observed_at,
    a.location_label,
    a.latitude,
    a.longitude,
    a.waste_kg,
    a.cigarette_butts,
    a.volunteers_count,
    a.duration_minutes,
    a.notes,
    a.derived_geometry_kind::text,
    a.derived_geometry_geojson,
    a.geometry_confidence,
    a.geometry_source::text,
    case
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * 0.035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * 0.05 >= 80 then 'critique'
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * 0.035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * 0.05 >= 60 then 'fort'
      when coalesce(a.waste_kg, 0) * 5
        + coalesce(a.cigarette_butts, 0) * 0.035
        + coalesce(a.volunteers_count, 0) * 1.6
        + coalesce(a.duration_minutes, 0) * 0.05 >= 30 then 'moyen'
      else 'faible'
    end as impact_level
  from public.actions a
  where coalesce(a.moderation_visibility, 'visible') = 'visible'
    and (
      a.status = 'approved'
      or (
        a.status = 'pending'
        and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'
        and a.action_date > current_date
      )
    )
    and (p_floor_date is null or a.action_date >= p_floor_date)
    and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null
    and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north)
    and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select
    'trash_spotter_spots'::text as source,
    case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text as entity_type,
    s.id,
    s.created_at,
    null::timestamptz as updated_at,
    s.created_by_clerk_id,
    s.status,
    s.created_at::date as observed_at,
    s.label as location_label,
    s.latitude,
    s.longitude,
    null::numeric as waste_kg,
    null::integer as cigarette_butts,
    null::integer as volunteers_count,
    null::integer as duration_minutes,
    s.notes,
    null::text as derived_geometry_kind,
    null::text as derived_geometry_geojson,
    null::numeric as geometry_confidence,
    null::text as geometry_source,
    'faible'::text as impact_level
  from public.trash_spotter_spots s
  where s.status in ('validated', 'cleaned')
    and (p_floor_date is null or s.created_at::date >= p_floor_date)
    and (
      p_types is null
      or case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end = any(p_types)
    )
    and s.latitude is not null
    and s.longitude is not null
    and (p_south is null or p_north is null or s.latitude between p_south and p_north)
    and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select
  source, entity_type, id, created_at, updated_at, created_by_clerk_id, status,
  observed_at, location_label, latitude, longitude, waste_kg, cigarette_butts,
  volunteers_count, duration_minutes, notes, derived_geometry_kind,
  derived_geometry_geojson, geometry_confidence, geometry_source
from (
  select * from action_rows
  union all
  select * from spot_rows
) map_rows
where p_impact is null or map_rows.impact_level = p_impact
order by observed_at desc, created_at desc
limit (select value from effective_limit);
$$;

revoke all on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public;
grant execute on function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to anon, authenticated, service_role;

-- The full-scan RPC remains an oracle, but future actions never enter Impact.
create or replace function public.load_public_landing_action_summary(
  p_floor_date date
)
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  cigarette_butts bigint,
  volunteers bigint,
  participants_total bigint,
  total_duration_minutes bigint,
  action_distribution jsonb,
  classification_warnings jsonb,
  butts_by_condition jsonb
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
with source_actions as (
  select a.*,
    regexp_replace(regexp_replace(regexp_replace(coalesce(a.notes, ''),
      '(?mi)^\[cmm-meta\].*(\r?\n|$)', '', 'g'),
      '(?mi)^\[google-sheet-sync\][ \t]*(\r?\n|$)', '', 'g'),
      '(?mi)^association\s*:\s*.*(\r?\n|$)', '', 'g') as clean_notes
  from public.actions a
  where a.status = 'approved'
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and a.action_date >= p_floor_date
    and a.action_date <= current_date
), marked_actions as (
  select a.*, lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
    coalesce(a.actor_name, ''), coalesce(a.clean_notes, ''))) as marker_text
  from source_actions a
), eligible_actions as (
  select nullif(btrim(a.location_label), '') as location_label,
    greatest(0::numeric, coalesce(a.waste_kg, 0::numeric),
      coalesce(nullif((regexp_match(a.notes,
        '(?m)^\[cmm-meta\][^\r\n]*"megotsKg"\s*:\s*([-+]?[0-9]+(\.[0-9]+)?)'))[1], '')::numeric, 0::numeric),
      greatest(coalesce(a.cigarette_butts, 0), 0)::numeric / 2500::numeric) as waste_kg,
    greatest(coalesce(a.cigarette_butts, 0), 0)::bigint as cigarette_butts,
    greatest(coalesce(a.volunteers_count, 0), 0)::bigint as volunteers,
    greatest(coalesce(a.duration_minutes, 0), 0)::bigint as duration_minutes,
    nullif(btrim(a.organizer_type), '') as organizer_type,
    nullif((regexp_match(a.notes, '(?m)"megotsCondition"\s*:\s*"(propre|humide|mouille)"'))[1], '') as megots_condition
  from marked_actions a
  where a.marker_text not like '%test%'
    and a.marker_text not like '%demo%'
    and a.marker_text not like '%seed%'
    and a.marker_text not like '%dummy%'
    and a.marker_text not like '%fake%'
    and a.marker_text not like '%exemple%'
), classified_actions as (
  select a.*,
    case when a.organizer_type = 'spontaneous' and a.volunteers > 0 then 'spontaneous:' || a.volunteers::text
      when a.organizer_type in ('company','association','student_association','collective','other') then a.organizer_type
      else 'other' end as category_key,
    case when a.organizer_type = 'spontaneous' and a.volunteers = 1 then 'Solo'
      when a.organizer_type = 'spontaneous' and a.volunteers = 2 then 'Duo'
      when a.organizer_type = 'spontaneous' and a.volunteers = 3 then 'Trio'
      when a.organizer_type = 'spontaneous' and a.volunteers = 4 then 'Quatuor'
      when a.organizer_type = 'spontaneous' and a.volunteers = 5 then 'Quintet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 6 then 'Sextet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 7 then 'Septet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 8 then 'Octet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 9 then 'Nonet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 10 then 'Décet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 11 then 'Undécet'
      when a.organizer_type = 'spontaneous' and a.volunteers = 12 then 'Duodécet'
      when a.organizer_type = 'company' then 'Entreprise'
      when a.organizer_type = 'association' then 'Association'
      when a.organizer_type = 'student_association' then 'Association étudiante'
      when a.organizer_type = 'collective' then 'Collectif'
      else case when a.organizer_type = 'spontaneous' and a.volunteers > 12
        then 'Groupe de ' || a.volunteers::text || ' participants' else 'Autres' end
    end as category_label,
    case when a.organizer_type = 'spontaneous' then 1 else 2 end as category_family_sort,
    case when a.organizer_type = 'spontaneous' then a.volunteers else 0::bigint end as participant_sort,
    case when a.organizer_type is null then 'missing_organizer_type'
      when a.organizer_type not in ('spontaneous','company','association','student_association','collective','other') then 'invalid_organizer_type'
      when a.organizer_type = 'spontaneous' and a.volunteers < 1 then 'invalid_spontaneous_participant_count'
      else null end as warning_code
  from eligible_actions a
), distribution as (
  select category_key, max(category_label) as category_label, max(category_family_sort) as category_family_sort,
    max(participant_sort) as participant_sort, count(*)::bigint as action_count
  from classified_actions group by category_key
), warnings as (
  select warning_code, count(*)::bigint as warning_count from classified_actions
  where warning_code is not null group by warning_code
), butt_conditions as (
  select megots_condition as condition, sum(cigarette_butts)::bigint as count
  from classified_actions where megots_condition is not null and cigarette_butts > 0 group by megots_condition
)
select count(*)::bigint, count(distinct location_label)::bigint, coalesce(sum(waste_kg), 0::numeric),
  coalesce(sum(cigarette_butts), 0::bigint), coalesce(sum(volunteers), 0::bigint), coalesce(sum(volunteers), 0::bigint),
  coalesce(sum(duration_minutes), 0::bigint),
  coalesce((select jsonb_agg(jsonb_build_object('key', category_key, 'category', category_label, 'count', action_count)
    order by category_family_sort, participant_sort, category_label) from distribution), '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_build_object('code', warning_code, 'count', warning_count) order by warning_code) from warnings), '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_build_object('condition', condition, 'count', count) order by condition) from butt_conditions), '[]'::jsonb)
from classified_actions;
$$;

revoke all on function public.load_public_landing_action_summary(date) from public, anon, authenticated, service_role;
grant execute on function public.load_public_landing_action_summary(date) to service_role;

-- Keep approved future rows in the projection for reversible deltas, but never
-- mark them Impact-eligible until their action date is no longer in the future.
create or replace function public.build_public_impact_action_contribution(
  p_action public.actions
)
returns public.public_impact_action_contributions
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
with source_action as (
  select p_action.id as action_id, p_action.updated_at as source_updated_at, p_action.action_date,
    p_action.status, p_action.moderation_visibility, p_action.action_phase,
    nullif(btrim(p_action.location_label), '') as location_label,
    greatest(0::numeric, coalesce(p_action.waste_kg, 0::numeric),
      coalesce(nullif((regexp_match(p_action.notes,
        '(?m)^\[cmm-meta\][^\r\n]*"megotsKg"\s*:\s*([-+]?[0-9]+(\.[0-9]+)?)'))[1], '')::numeric, 0::numeric),
      greatest(coalesce(p_action.cigarette_butts, 0), 0)::numeric / 2500::numeric) as waste_kg,
    greatest(coalesce(p_action.cigarette_butts, 0), 0)::bigint as cigarette_butts,
    greatest(coalesce(p_action.volunteers_count, 0), 0)::bigint as participants_total,
    greatest(coalesce(p_action.duration_minutes, 0), 0)::bigint as duration_minutes,
    nullif(btrim(p_action.organizer_type), '') as organizer_type,
    nullif((regexp_match(p_action.notes, '(?m)"megotsCondition"\s*:\s*"(propre|humide|mouille)"'))[1], '') as butts_condition,
    lower(concat_ws(' ', p_action.id::text, 'actions', coalesce(p_action.location_label, ''), coalesce(p_action.actor_name, ''),
      coalesce(regexp_replace(regexp_replace(regexp_replace(coalesce(p_action.notes, ''),
        '(?mi)^\[cmm-meta\].*(\r?\n|$)', '', 'g'), '(?mi)^\[google-sheet-sync\][ \t]*(\r?\n|$)', '', 'g'),
        '(?mi)^association\s*:\s*.*(\r?\n|$)', '', 'g'), ''))) as marker_text
), classified as (
  select s.*,
    case when s.organizer_type = 'spontaneous' and s.participants_total > 0 then 'spontaneous:' || s.participants_total::text
      when s.organizer_type in ('company','association','student_association','collective','other') then s.organizer_type
      else 'other' end as category_key,
    case when s.organizer_type = 'spontaneous' and s.participants_total = 1 then 'Solo'
      when s.organizer_type = 'spontaneous' and s.participants_total = 2 then 'Duo'
      when s.organizer_type = 'spontaneous' and s.participants_total = 3 then 'Trio'
      when s.organizer_type = 'spontaneous' and s.participants_total = 4 then 'Quatuor'
      when s.organizer_type = 'spontaneous' and s.participants_total = 5 then 'Quintet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 6 then 'Sextet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 7 then 'Septet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 8 then 'Octet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 9 then 'Nonet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 10 then 'Décet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 11 then 'Undécet'
      when s.organizer_type = 'spontaneous' and s.participants_total = 12 then 'Duodécet'
      when s.organizer_type = 'company' then 'Entreprise'
      when s.organizer_type = 'association' then 'Association'
      when s.organizer_type = 'student_association' then 'Association étudiante'
      when s.organizer_type = 'collective' then 'Collectif'
      else case when s.organizer_type = 'spontaneous' and s.participants_total > 12
        then 'Groupe de ' || s.participants_total::text || ' participants' else 'Autres' end
    end as category_label,
    case when s.organizer_type is null then 'missing_organizer_type'
      when s.organizer_type not in ('spontaneous','company','association','student_association','collective','other') then 'invalid_organizer_type'
      when s.organizer_type = 'spontaneous' and s.participants_total < 1 then 'invalid_spontaneous_participant_count'
      else null end as warning_code,
    (s.status = 'approved' and coalesce(s.moderation_visibility, 'visible') = 'visible'
      and s.action_date <= current_date
      and s.marker_text not like '%test%' and s.marker_text not like '%demo%' and s.marker_text not like '%seed%'
      and s.marker_text not like '%dummy%' and s.marker_text not like '%fake%' and s.marker_text not like '%exemple%') as eligible_non_temporal
  from source_action s
)
select action_id, source_updated_at, action_date, eligible_non_temporal, location_label, waste_kg, cigarette_butts,
  participants_total, duration_minutes, category_key, category_label, warning_code, butts_condition,
  case when butts_condition is null then 0 else cigarette_butts end as butts_condition_count,
  'impact-terrain-public-2026.09-v2' as methodology_version, now() as projected_at
from classified;
$$;

revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions) to service_role;
