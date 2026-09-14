-- Keep the public future-pre-action contract in one SQL predicate.
-- Action dates and times are entered in Europe/Paris; `future` is derived
-- from the local start and is never persisted as a status.
create or replace function public.is_public_future_pre_action(
  p_action_phase text,
  p_published_at timestamptz,
  p_moderation_visibility text,
  p_status text,
  p_action_date date,
  p_event_start_time time
)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select p_action_phase = 'pre_action'
    and p_published_at is not null
    and p_moderation_visibility = 'visible'
    and p_status in ('pending', 'approved')
    and p_action_date is not null
    and (
      p_action_date::timestamp + coalesce(p_event_start_time, time '00:00')
    ) > (now() at time zone 'Europe/Paris');
$$;

revoke all on function public.is_public_future_pre_action(
  text, timestamptz, text, text, date, time
) from public;
grant execute on function public.is_public_future_pre_action(
  text, timestamptz, text, text, date, time
) to public;

-- Replace the already-applied publication policy without rewriting its
-- migration. Owners and service-role callers keep their existing access;
-- public reads use the canonical temporal predicate above.
drop policy if exists actions_select_public_or_owner on public.actions;
create policy actions_select_public_or_owner on public.actions
for select using (
  (select auth.role()) = 'service_role'
  or created_by_clerk_id = coalesce((select auth.jwt()) ->> 'sub', '')
  or (
    coalesce(moderation_visibility, 'visible') = 'visible'
    and (
      (
        status = 'approved'
        and coalesce(action_phase, 'post_action_complete') <> 'pre_action'
      )
      or public.is_public_future_pre_action(
        action_phase,
        published_at,
        moderation_visibility,
        status,
        action_date,
        event_start_time
      )
    )
  )
);

-- Keep the public map feed aligned with the same publication and Paris-time
-- boundary. Completed approved actions retain their existing projection.
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
    'approved'::text as status,
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
      or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action')
    )
    and (
      coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'
      or public.is_public_future_pre_action(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
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

-- External action shares use the same public-future boundary as reads.
create or replace function public.can_insert_action_message_reference(p_action_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.actions a
    where a.id = p_action_id
      and public.is_public_future_pre_action(
        a.action_phase,
        a.published_at,
        a.moderation_visibility,
        a.status,
        a.action_date,
        a.event_start_time
      )
  );
$$;
