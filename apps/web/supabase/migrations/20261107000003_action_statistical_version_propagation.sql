-- PURPOSE: make every statistical projection follow the latest approved and
--          published form version, including direct edits after publication.
-- CALLER: action publication trigger, contribution projection trigger and
--         public reference RPCs.
-- AUTHORIZATION_BOUNDARY: statistical snapshots and application audit are
--                         service-only; the pollution reference reads only a
--                         public aggregate projection.
-- IDEMPOTENCY: unchanged published payloads do not create a new snapshot;
--              each source version is applied once by a unique audit key.
-- ATOMICITY: the snapshot transition, contribution delta and application
--            audit execute in the same action transaction.
-- FAILURE_BEHAVIOR: a failed projection rolls back the snapshot and audit;
--                   the next action mutation or rebuild can replay it.
-- SEARCH_PATH: every function pins pg_catalog and public explicitly.
-- GRANTS: service_role mutates snapshots/projections; public reference reads
--         expose aggregate values only.

alter table public.action_statistical_versions
  add column if not exists department_code text,
  add column if not exists department_name text;

comment on column public.action_statistical_versions.department_code is
  'Department attribution captured with the approved and published form revision; NULL remains unknown.';
comment on column public.action_statistical_versions.department_name is
  'Department label captured with the approved and published form revision; NULL remains unknown.';

-- Backfill only rows whose source timestamp still matches the canonical action.
-- A pending edit has a newer actions.updated_at and therefore cannot rewrite a
-- previously published statistical snapshot.
update public.action_statistical_versions v
set department_code = a.department_code,
    department_name = a.department_name
from public.actions a
where v.is_current
  and v.action_id = a.id
  and v.source_updated_at = a.updated_at;

create table if not exists public.public_impact_action_contribution_applications (
  action_id uuid not null references public.actions(id) on delete cascade,
  source_version_id uuid not null references public.action_statistical_versions(id) on delete cascade,
  previous_source_version_id uuid references public.action_statistical_versions(id) on delete set null,
  source_updated_at timestamptz not null,
  changed_fields jsonb not null default '{}'::jsonb
    check (jsonb_typeof(changed_fields) = 'object'),
  applied_at timestamptz not null default timezone('utc', now()),
  primary key (action_id, source_version_id)
);

create index if not exists public_impact_action_contribution_applications_source_idx
  on public.public_impact_action_contribution_applications(source_version_id);

comment on table public.public_impact_action_contribution_applications is
  'Service-only idempotency and audit ledger for applying each statistical source version to public Impact.';

alter table public.public_impact_action_contribution_applications enable row level security;
drop policy if exists public_impact_action_contribution_applications_service_only
  on public.public_impact_action_contribution_applications;
create policy public_impact_action_contribution_applications_service_only
on public.public_impact_action_contribution_applications
for all
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

revoke all on table public.public_impact_action_contribution_applications
  from public, anon, authenticated;
grant all on table public.public_impact_action_contribution_applications
  to service_role;

-- Existing contribution rows predate the ledger. They are linked to the
-- currently authoritative snapshot without changing their counters.
insert into public.public_impact_action_contribution_applications (
  action_id, source_version_id, previous_source_version_id,
  source_updated_at, changed_fields, applied_at
)
select
  c.action_id,
  current_version.id,
  previous_version.id,
  current_version.source_updated_at,
  '{}'::jsonb,
  c.projected_at
from public.public_impact_action_contributions c
join public.action_statistical_versions current_version
  on current_version.action_id = c.action_id
 and current_version.is_current
left join public.action_statistical_versions previous_version
  on previous_version.action_id = current_version.action_id
 and previous_version.version_number = current_version.version_number - 1
on conflict (action_id, source_version_id) do nothing;

create or replace function public.capture_action_statistical_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current public.action_statistical_versions%rowtype;
  v_version_number bigint;
  v_is_admissible boolean;
  v_same_payload boolean;
begin
  v_is_admissible := new.status = 'approved'
    and coalesce(new.action_phase, 'post_action_complete') = 'post_action_complete'
    and coalesce(new.access_mode, 'public') = 'public'
    and coalesce(new.moderation_visibility, 'visible') = 'visible'
    and coalesce(new.review_state, 'not_required') in ('not_required', 'approved')
    and new.published_at is not null
    and coalesce(new.data_provenance, 'unknown') <> 'test';

  if not v_is_admissible then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('cleanmymap.action-statistical-version:' || new.id::text, 0)
  );

  select * into v_current
  from public.action_statistical_versions
  where action_id = new.id and is_current
  for update;

  v_same_payload := found
    and v_current.publication_kind = 'approved_published'
    and v_current.published_at is not distinct from new.published_at
    and v_current.status is not distinct from new.status
    and v_current.action_phase is not distinct from coalesce(new.action_phase, 'post_action_complete')
    and v_current.review_state is not distinct from coalesce(new.review_state, 'not_required')
    and v_current.access_mode is not distinct from coalesce(new.access_mode, 'public')
    and v_current.moderation_visibility is not distinct from coalesce(new.moderation_visibility, 'visible')
    and v_current.data_provenance is not distinct from coalesce(new.data_provenance, 'unknown')
    and v_current.action_date is not distinct from new.action_date
    and v_current.location_label is not distinct from new.location_label
    and v_current.actor_name is not distinct from new.actor_name
    and v_current.organizer_type is not distinct from new.organizer_type
    and v_current.action_context is not distinct from new.action_context
    and v_current.department_code is not distinct from new.department_code
    and v_current.department_name is not distinct from new.department_name
    and v_current.waste_kg is not distinct from new.waste_kg
    and v_current.cigarette_butts is not distinct from new.cigarette_butts
    and v_current.volunteers_count is not distinct from new.volunteers_count
    and v_current.children_count is not distinct from new.children_count
    and v_current.adult_count is not distinct from new.adult_count
    and v_current.retired_count is not distinct from new.retired_count
    and v_current.duration_minutes is not distinct from new.duration_minutes
    and v_current.notes is not distinct from new.notes
    and v_current.preparation_data is not distinct from coalesce(new.preparation_data, '{}'::jsonb);

  if v_same_payload then
    return new;
  end if;

  update public.action_statistical_versions
  set is_current = false
  where action_id = new.id and is_current;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
  from public.action_statistical_versions
  where action_id = new.id;

  insert into public.action_statistical_versions (
    action_id, version_number, source_updated_at, approved_at, published_at,
    publication_kind, status, action_phase, review_state, access_mode,
    moderation_visibility, data_provenance, action_date, location_label,
    department_code, department_name, actor_name, organizer_type,
    action_context, waste_kg, cigarette_butts, volunteers_count,
    children_count, adult_count, retired_count, duration_minutes, notes,
    preparation_data, is_current
  ) values (
    new.id, v_version_number, new.updated_at, new.review_decided_at,
    new.published_at, 'approved_published', new.status,
    coalesce(new.action_phase, 'post_action_complete'),
    coalesce(new.review_state, 'not_required'), coalesce(new.access_mode, 'public'),
    coalesce(new.moderation_visibility, 'visible'),
    coalesce(new.data_provenance, 'unknown'), new.action_date, new.location_label,
    new.department_code, new.department_name, new.actor_name,
    new.organizer_type, new.action_context, new.waste_kg,
    new.cigarette_butts, new.volunteers_count, new.children_count,
    new.adult_count, new.retired_count, new.duration_minutes, new.notes,
    coalesce(new.preparation_data, '{}'::jsonb), true
  );

  return new;
end;
$$;

revoke all on function public.capture_action_statistical_version() from public, anon, authenticated;
grant execute on function public.capture_action_statistical_version() to service_role;

create or replace function public.record_public_impact_action_contribution_application()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current public.action_statistical_versions%rowtype;
  v_previous public.action_statistical_versions%rowtype;
begin
  select * into v_current
  from public.action_statistical_versions
  where action_id = new.action_id and is_current;

  if not found then
    return new;
  end if;

  select * into v_previous
  from public.action_statistical_versions
  where action_id = v_current.action_id
    and version_number = v_current.version_number - 1;

  insert into public.public_impact_action_contribution_applications (
    action_id, source_version_id, previous_source_version_id,
    source_updated_at, changed_fields
  ) values (
    new.action_id,
    v_current.id,
    v_previous.id,
    v_current.source_updated_at,
    jsonb_strip_nulls(jsonb_build_object(
      'participants', case when v_previous.id is null or v_previous.volunteers_count is distinct from v_current.volunteers_count
        then jsonb_build_object('from', v_previous.volunteers_count, 'to', v_current.volunteers_count) end,
      'composition', case when v_previous.id is null
          or v_previous.children_count is distinct from v_current.children_count
          or v_previous.adult_count is distinct from v_current.adult_count
          or v_previous.retired_count is distinct from v_current.retired_count
        then jsonb_build_object(
          'children', jsonb_build_object('from', v_previous.children_count, 'to', v_current.children_count),
          'adults', jsonb_build_object('from', v_previous.adult_count, 'to', v_current.adult_count),
          'retired', jsonb_build_object('from', v_previous.retired_count, 'to', v_current.retired_count)
        ) end,
      'waste_kg', case when v_previous.id is null or v_previous.waste_kg is distinct from v_current.waste_kg
        then jsonb_build_object('from', v_previous.waste_kg, 'to', v_current.waste_kg) end,
      'cigarette_butts', case when v_previous.id is null or v_previous.cigarette_butts is distinct from v_current.cigarette_butts
        then jsonb_build_object('from', v_previous.cigarette_butts, 'to', v_current.cigarette_butts) end,
      'duration_minutes', case when v_previous.id is null or v_previous.duration_minutes is distinct from v_current.duration_minutes
        then jsonb_build_object('from', v_previous.duration_minutes, 'to', v_current.duration_minutes) end,
      'context', case when v_previous.id is null or v_previous.action_context is distinct from v_current.action_context
        then jsonb_build_object('from', v_previous.action_context, 'to', v_current.action_context) end,
      'department', case when v_previous.id is null
          or v_previous.department_code is distinct from v_current.department_code
          or v_previous.department_name is distinct from v_current.department_name
        then jsonb_build_object(
          'code', jsonb_build_object('from', v_previous.department_code, 'to', v_current.department_code),
          'name', jsonb_build_object('from', v_previous.department_name, 'to', v_current.department_name)
        ) end,
      'location', case when v_previous.id is null or v_previous.location_label is distinct from v_current.location_label
        then jsonb_build_object('from', v_previous.location_label, 'to', v_current.location_label) end,
      'publication', case when v_previous.id is null
          or v_previous.published_at is distinct from v_current.published_at
          or v_previous.publication_kind is distinct from v_current.publication_kind
        then jsonb_build_object(
          'from', v_previous.publication_kind, 'to', v_current.publication_kind,
          'publishedAt', jsonb_build_object('from', v_previous.published_at, 'to', v_current.published_at)
        ) end
    ))
  )
  on conflict (action_id, source_version_id) do nothing;

  return new;
end;
$$;

revoke all on function public.record_public_impact_action_contribution_application()
  from public, anon, authenticated;
grant execute on function public.record_public_impact_action_contribution_application()
  to service_role;

drop trigger if exists trg_public_impact_action_contribution_application_audit
  on public.public_impact_action_contributions;
create trigger trg_public_impact_action_contribution_application_audit
after insert or update on public.public_impact_action_contributions
for each row execute function public.record_public_impact_action_contribution_application();

-- A public-safe aggregate view lets the RPC remain SECURITY INVOKER while the
-- detailed snapshot table remains service-only.
create or replace view public.action_pollution_score_reference_population
with (security_barrier = true)
as
with eligible_versions as (
  select
    upper(nullif(trim(v.department_code), '')) as department_code,
    nullif(trim(v.department_name), '') as department_name,
    v.waste_kg,
    v.cigarette_butts,
    v.volunteers_count::numeric as volunteer_count
  from public.action_statistical_versions v
  where v.is_current
    and public.is_action_statistical_version_admissible(
      v.status, v.action_phase, v.access_mode, v.moderation_visibility,
      v.review_state, v.action_date, v.data_provenance, v.publication_kind,
      current_date
    )
    and v.volunteers_count >= 1
    and v.duration_minutes > 0
), department_references as (
  select
    department_code,
    max(department_name) as department_name,
    max(waste_kg::numeric / volunteer_count)
      filter (where waste_kg is not null and waste_kg >= 0) as waste_per_volunteer,
    max(cigarette_butts::numeric / volunteer_count)
      filter (where cigarette_butts is not null and cigarette_butts >= 0) as butts_per_volunteer,
    count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer as waste_source_count,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer as butts_source_count,
    count(*)::integer as eligible_action_count
  from eligible_versions
  where department_code is not null
  group by department_code
)
select
  'global'::text as scope,
  null::text as department_code,
  null::text as department_name,
  max(waste_kg::numeric / volunteer_count)
    filter (where waste_kg is not null and waste_kg >= 0) as waste_per_volunteer,
  max(cigarette_butts::numeric / volunteer_count)
    filter (where cigarette_butts is not null and cigarette_butts >= 0) as butts_per_volunteer,
  count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer as waste_source_count,
  count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer as butts_source_count,
  count(*)::integer as eligible_action_count
from eligible_versions
union all
select
  'department'::text, department_code, department_name,
  waste_per_volunteer, butts_per_volunteer, waste_source_count,
  butts_source_count, eligible_action_count
from department_references;

revoke all on public.action_pollution_score_reference_population from public, anon, authenticated;
grant select on public.action_pollution_score_reference_population to public, anon, authenticated;

drop function if exists public.action_pollution_score_references_v2();
create function public.action_pollution_score_references_v2()
returns table (
  scope text,
  department_code text,
  department_name text,
  waste_per_volunteer numeric,
  butts_per_volunteer numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select
    p.scope, p.department_code, p.department_name,
    p.waste_per_volunteer, p.butts_per_volunteer,
    p.waste_source_count, p.butts_source_count,
    p.eligible_action_count,
    'pollution-score-references-v2'::text,
    now()
  from public.action_pollution_score_reference_population p;
$$;

revoke all on function public.action_pollution_score_references_v2() from public;
grant execute on function public.action_pollution_score_references_v2() to public;

-- The dated contextual RPC is the maintenance input for monthly snapshots. It
-- now selects the latest snapshot known at the requested date, never actions.
create or replace function public.action_collection_context_reference_averages_v1(
  p_as_of_date date
)
returns table (
  action_context text,
  waste_per_effective_unit numeric,
  butts_per_effective_unit numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with bounded as (
  select least(coalesce(p_as_of_date, current_date), current_date) as as_of_date
), versions_at_date as (
  select distinct on (v.action_id) v.*
  from public.action_statistical_versions v
  cross join bounded b
  where timezone('utc', v.source_updated_at)::date <= b.as_of_date
  order by v.action_id, v.version_number desc
), eligible as (
  select
    v.action_context,
    v.waste_kg,
    v.cigarette_butts,
    case
      when v.action_context in ('citizen', 'company')
        then v.adult_count + 0.5 * v.children_count + 0.5 * v.retired_count
      when v.action_context = 'school'
        then v.adult_count + 0.45 * v.children_count
      else null
    end as waste_units,
    case
      when v.action_context in ('citizen', 'company')
        then v.adult_count + 0.5 * v.children_count + 0.5 * v.retired_count
      when v.action_context = 'school'
        then v.adult_count
      else null
    end as butts_units
  from versions_at_date v
  cross join bounded b
  where public.is_action_statistical_version_admissible(
      v.status, v.action_phase, v.access_mode, v.moderation_visibility,
      v.review_state, v.action_date, v.data_provenance, v.publication_kind,
      b.as_of_date
    )
    and v.action_context is not null
    and v.children_count is not null
    and v.adult_count is not null
    and v.retired_count is not null
    and v.children_count + v.adult_count + v.retired_count = v.volunteers_count
    and (v.action_context <> 'school' or v.retired_count = 0)
), grouped as (
  select
    action_context,
    avg(waste_kg / nullif(waste_units, 0)) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    ) as waste_average,
    avg(cigarette_butts::numeric / nullif(butts_units, 0)) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    ) as butts_average,
    count(*) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    )::integer as waste_count,
    count(*) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    )::integer as butts_count,
    count(*) filter (
      where (waste_kg is not null and waste_kg >= 0 and waste_units > 0)
         or (cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0)
    )::integer as eligible_count
  from eligible
  group by action_context
)
select
  action_context,
  case when waste_count >= 2 then waste_average else null end,
  case when butts_count >= 2 then butts_average else null end,
  waste_count,
  butts_count,
  eligible_count,
  'contextual-effective-units-v1'::text,
  now()
from grouped
order by action_context;
$$;

revoke all on function public.action_collection_context_reference_averages_v1(date)
  from public, anon, authenticated;
grant execute on function public.action_collection_context_reference_averages_v1(date)
  to service_role;

-- Map visibility remains owned by the existing map RPC. Its numeric impact
-- inputs are served from the latest statistical snapshot when one exists;
-- future pre-action rows remain visible but expose no unvalidated measures.
create or replace view public.action_map_statistical_source
with (security_barrier = true)
as
select
  v.action_id,
  v.action_date,
  v.location_label,
  v.action_context,
  v.waste_kg,
  v.cigarette_butts,
  v.volunteers_count,
  v.duration_minutes
from public.action_statistical_versions v
where v.is_current
  and v.status = 'approved'
  and coalesce(v.action_phase, 'post_action_complete') = 'post_action_complete'
  and coalesce(v.access_mode, 'public') = 'public'
  and coalesce(v.moderation_visibility, 'visible') = 'visible'
  and coalesce(v.review_state, 'not_required') in ('not_required', 'approved')
  and coalesce(v.data_provenance, 'unknown') <> 'test';

revoke all on public.action_map_statistical_source from public, anon, authenticated;
grant select on public.action_map_statistical_source to public, anon, authenticated;

alter function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) rename to actions_map_feed_unversioned;

revoke all on function public.actions_map_feed_unversioned(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) from public, anon, authenticated;
grant execute on function public.actions_map_feed_unversioned(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
) to service_role;

create function public.actions_map_feed(
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
  source text, entity_type text, id uuid, created_at timestamptz,
  updated_at timestamptz, status text, observed_at date,
  location_label text, latitude double precision, longitude double precision,
  waste_kg numeric, cigarette_butts integer, volunteers_count integer,
  duration_minutes integer, notes text, derived_geometry_kind text,
  derived_geometry_geojson text, geometry_confidence numeric,
  geometry_source text, action_context text, action_context_source text,
  school_context_confirmed boolean, observed_coverage jsonb,
  public_preparation_data jsonb
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
), raw_rows as (
  select r.*, a.data_provenance, s.action_date as statistical_action_date,
    s.location_label as statistical_location_label,
    s.action_context as statistical_action_context,
    s.waste_kg as statistical_waste_kg,
    s.cigarette_butts as statistical_cigarette_butts,
    s.volunteers_count as statistical_volunteers_count,
    s.duration_minutes as statistical_duration_minutes
  from public.actions_map_feed_unversioned(
    p_south, p_west, p_north, p_east, p_zoom, p_status, null,
    p_types, null, 300
  ) r
  left join public.actions a
    on r.source = 'actions' and a.id = r.id
  left join public.action_map_statistical_source s
    on r.source = 'actions' and s.action_id = r.id
  where r.source <> 'actions'
    or coalesce(a.data_provenance, 'unknown') <> 'test'
), normalized_rows as (
  select
    r.source, r.entity_type, r.id, r.created_at, r.updated_at, r.status,
    case when r.source = 'actions' and r.statistical_action_date is not null
      then r.statistical_action_date else r.observed_at end as observed_at,
    case when r.source = 'actions' and r.statistical_location_label is not null
      then r.statistical_location_label else r.location_label end as location_label,
    r.latitude, r.longitude,
    case when r.source = 'actions' and r.statistical_action_date is not null
      then r.statistical_waste_kg else null end as waste_kg,
    case when r.source = 'actions' and r.statistical_action_date is not null
      then r.statistical_cigarette_butts else null end as cigarette_butts,
    case when r.source = 'actions' and r.statistical_action_date is not null
      then r.statistical_volunteers_count else null end as volunteers_count,
    case when r.source = 'actions' and r.statistical_action_date is not null
      then r.statistical_duration_minutes else null end as duration_minutes,
    r.notes, r.derived_geometry_kind, r.derived_geometry_geojson,
    r.geometry_confidence, r.geometry_source,
    case when r.source = 'actions' and r.statistical_action_context is not null
      then r.statistical_action_context else r.action_context end as action_context,
    r.action_context_source, r.school_context_confirmed, r.observed_coverage,
    r.public_preparation_data
  from raw_rows r
), scored_rows as (
  select n.*,
    case
      when coalesce(n.waste_kg, 0) * 5
        + coalesce(n.cigarette_butts, 0) * .035
        + coalesce(n.volunteers_count, 0) * 1.6
        + coalesce(n.duration_minutes, 0) * .05 >= 80 then 'critique'
      when coalesce(n.waste_kg, 0) * 5
        + coalesce(n.cigarette_butts, 0) * .035
        + coalesce(n.volunteers_count, 0) * 1.6
        + coalesce(n.duration_minutes, 0) * .05 >= 60 then 'fort'
      when coalesce(n.waste_kg, 0) * 5
        + coalesce(n.cigarette_butts, 0) * .035
        + coalesce(n.volunteers_count, 0) * 1.6
        + coalesce(n.duration_minutes, 0) * .05 >= 30 then 'moyen'
      else 'faible'
    end as impact_level
  from normalized_rows n
)
select
  s.source, s.entity_type, s.id, s.created_at, s.updated_at, s.status,
  s.observed_at, s.location_label, s.latitude, s.longitude, s.waste_kg,
  s.cigarette_butts, s.volunteers_count, s.duration_minutes, s.notes,
  s.derived_geometry_kind, s.derived_geometry_geojson, s.geometry_confidence,
  s.geometry_source, s.action_context, s.action_context_source,
  s.school_context_confirmed, s.observed_coverage, s.public_preparation_data
from scored_rows s
where (p_floor_date is null or s.observed_at >= p_floor_date)
  and (p_impact is null or s.impact_level = p_impact)
order by s.observed_at desc, s.created_at desc
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

-- Replace the temporary compatibility wrapper above with the final invoker
-- definition. The old map predicate remains local to this owner; only the
-- statistical inputs are sourced from the public-safe snapshot projection.
drop function public.actions_map_feed(
  double precision, double precision, double precision, double precision,
  integer, text, date, text[], text, integer
);

create function public.actions_map_feed(
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
  source text, entity_type text, id uuid, created_at timestamptz,
  updated_at timestamptz, status text, observed_at date,
  location_label text, latitude double precision, longitude double precision,
  waste_kg numeric, cigarette_butts integer, volunteers_count integer,
  duration_minutes integer, notes text, derived_geometry_kind text,
  derived_geometry_geojson text, geometry_confidence numeric,
  geometry_source text, action_context text, action_context_source text,
  school_context_confirmed boolean, observed_coverage jsonb,
  public_preparation_data jsonb
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
with effective_limit as (
  select greatest(1, least(coalesce(p_limit, 80), case
    when coalesce(p_zoom, 12) <= 8 then 60
    when coalesce(p_zoom, 12) <= 10 then 120
    when coalesce(p_zoom, 12) <= 12 then 180
    else 300 end)) as value
), action_rows as (
  select 'actions'::text as source, 'action'::text as entity_type, a.id,
    a.created_at, a.updated_at, a.status,
    case when v.action_id is not null then v.action_date else a.action_date end as observed_at,
    case when v.action_id is not null then v.location_label else a.location_label end as location_label,
    a.latitude, a.longitude, v.waste_kg, v.cigarette_butts,
    v.volunteers_count, v.duration_minutes, a.notes,
    a.derived_geometry_kind::text, a.derived_geometry_geojson,
    a.geometry_confidence, a.geometry_source::text,
    case when v.action_id is not null then v.action_context else a.action_context end as action_context,
    a.action_context_source, a.school_context_confirmed,
    case when jsonb_typeof(a.preparation_data -> 'observedCoverage') = 'object'
      and a.preparation_data -> 'observedCoverage' ->> 'type' = 'MultiLineString'
      then a.preparation_data -> 'observedCoverage' else null end as observed_coverage,
    public.public_action_map_preparation(a.preparation_data) as public_preparation_data,
    case
      when coalesce(v.waste_kg, 0) * 5 + coalesce(v.cigarette_butts, 0) * .035
        + coalesce(v.volunteers_count, 0) * 1.6 + coalesce(v.duration_minutes, 0) * .05 >= 80 then 'critique'
      when coalesce(v.waste_kg, 0) * 5 + coalesce(v.cigarette_butts, 0) * .035
        + coalesce(v.volunteers_count, 0) * 1.6 + coalesce(v.duration_minutes, 0) * .05 >= 60 then 'fort'
      when coalesce(v.waste_kg, 0) * 5 + coalesce(v.cigarette_butts, 0) * .035
        + coalesce(v.volunteers_count, 0) * 1.6 + coalesce(v.duration_minutes, 0) * .05 >= 30 then 'moyen'
      else 'faible' end as impact_level
  from public.actions a
  left join public.action_map_statistical_source v on v.action_id = a.id
  where coalesce(a.access_mode, 'public') = 'public'
    and coalesce(a.moderation_visibility, 'visible') = 'visible'
    and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
    and coalesce(a.data_provenance, 'unknown') <> 'test'
    and (a.status = 'approved' or (a.status = 'pending' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action'))
    and (coalesce(a.action_phase, 'post_action_complete') <> 'pre_action' or public.is_public_future_pre_action_reviewed(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.review_state, a.action_date, a.event_start_time))
    and not (coalesce(a.action_context, '') = 'school' and coalesce(a.action_phase, 'post_action_complete') = 'pre_action' and public.is_public_future_pre_action_reviewed(a.action_phase, a.published_at, a.moderation_visibility, a.status, a.review_state, a.action_date, a.event_start_time))
    and (p_floor_date is null or (case when v.action_id is not null then v.action_date else a.action_date end) >= p_floor_date)
    and (p_types is null or 'action' = any(p_types))
    and a.latitude is not null and a.longitude is not null
    and (p_south is null or p_north is null or a.latitude between p_south and p_north)
    and (p_west is null or p_east is null or a.longitude between p_west and p_east)
), spot_rows as (
  select 'trash_spotter_spots'::text as source,
    case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end::text as entity_type,
    s.id, s.created_at, null::timestamptz as updated_at, s.status,
    s.created_at::date as observed_at, s.label as location_label, s.latitude, s.longitude,
    null::numeric as waste_kg, null::integer as cigarette_butts, null::integer as volunteers_count,
    null::integer as duration_minutes, s.notes, null::text as derived_geometry_kind,
    null::text as derived_geometry_geojson, null::numeric as geometry_confidence,
    null::text as geometry_source, null::text as action_context, null::text as action_context_source,
    null::boolean as school_context_confirmed, null::jsonb as observed_coverage,
    null::jsonb as public_preparation_data, 'faible'::text as impact_level
  from public.trash_spotter_spots s
  where s.status in ('validated', 'cleaned')
    and (p_floor_date is null or s.created_at::date >= p_floor_date)
    and (p_types is null or (case when lower(coalesce(s.spot_type, '')) = 'spot' then 'spot' else 'clean_place' end) = any(p_types))
    and s.latitude is not null and s.longitude is not null
    and (p_south is null or p_north is null or s.latitude between p_south and p_north)
    and (p_west is null or p_east is null or s.longitude between p_west and p_east)
)
select source, entity_type, id, created_at, updated_at, status, observed_at,
  location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count,
  duration_minutes, notes, derived_geometry_kind, derived_geometry_geojson,
  geometry_confidence, geometry_source, action_context, action_context_source,
  school_context_confirmed, observed_coverage, public_preparation_data
from (select * from action_rows union all select * from spot_rows) map_rows
where p_impact is null or impact_level = p_impact
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
