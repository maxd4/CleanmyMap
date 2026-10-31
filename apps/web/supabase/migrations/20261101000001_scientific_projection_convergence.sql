-- SCIENTIFIC-PROJECTION-CONVERGENCE-2026-11
-- PURPOSE: make statistical projections version-aware and rebuild the public
-- incremental state automatically when its calculation identity changes.
-- CALLER: server maintenance and server-side snapshot/reference readers.
-- AUTHORIZATION_BOUNDARY: reference RPCs remain SECURITY INVOKER and public
-- aggregate state remains service_role-only through SECURITY DEFINER RPCs.
-- IDEMPOTENCY: all definitions are replaced in place; rebuild/advance are
-- additive and may be retried after a failed transaction.
-- ATOMICITY: each rebuild runs in the caller transaction under the existing
-- public-impact advisory lock; aggregate counters are rebuilt from actions.
-- FAILURE_BEHAVIOR: incompatible or incomplete state is rebuilt before it is
-- exposed; invalid versions and backwards floor dates are rejected.
-- SEARCH_PATH: every function fixes pg_catalog/public explicitly.
-- GRANTS: reference reads keep anon/authenticated grants; state writes remain
-- restricted to service_role.

create or replace function public.current_public_impact_projection_version()
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select 'impact-terrain-public-2026.09-v3'::text;
$$;

revoke all on function public.current_public_impact_projection_version() from public, anon, authenticated;
grant execute on function public.current_public_impact_projection_version() to service_role;

alter table public.public_impact_action_contributions
  alter column methodology_version set default public.current_public_impact_projection_version();
alter table public.public_impact_action_aggregate_state
  alter column methodology_version set default public.current_public_impact_projection_version();

drop function if exists public.action_collection_reference_averages_v1();

create or replace function public.action_collection_reference_averages_v1()
returns table (
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
set search_path = pg_catalog
as $$
  with eligible_actions as (
    select
      a.waste_kg,
      a.cigarette_butts,
      a.volunteers_count::numeric as volunteers_count
    from public.actions as a
    where a.status = 'approved'
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
      and coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
      and a.action_date <= current_date
      and a.volunteers_count > 0
      and (
        (a.waste_kg is not null and a.waste_kg >= 0 and a.waste_kg <= 100000)
        or
        (a.cigarette_butts is not null and a.cigarette_butts >= 0 and a.cigarette_butts <= 5000000)
      )
  )
  select
    avg(waste_kg / volunteers_count)
      filter (where waste_kg is not null and waste_kg >= 0 and waste_kg <= 100000),
    avg(cigarette_butts::numeric / volunteers_count)
      filter (where cigarette_butts is not null and cigarette_butts >= 0 and cigarette_butts <= 5000000),
    count(*) filter (where waste_kg is not null and waste_kg >= 0 and waste_kg <= 100000)::integer,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0 and cigarette_butts <= 5000000)::integer,
    count(*)::integer,
    'action-collection-reference-averages-v1'::text,
    now()
  from eligible_actions;
$$;

revoke all on function public.action_collection_reference_averages_v1() from public;
grant execute on function public.action_collection_reference_averages_v1() to anon, authenticated;

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
set search_path = pg_catalog
as $$
  with eligible_actions as (
    select
      upper(nullif(trim(a.department_code), '')) as department_code,
      nullif(trim(a.department_name), '') as department_name,
      a.waste_kg,
      a.cigarette_butts,
      greatest(coalesce(a.volunteers_count, 0), 1)::numeric as volunteer_count
    from public.actions as a
    where a.status = 'approved'
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
  ),
  department_references as (
    select
      department_code,
      max(department_name) as department_name,
      max(waste_kg::numeric / volunteer_count)
        filter (where waste_kg is not null and waste_kg >= 0)
        as waste_per_volunteer,
      max(cigarette_butts::numeric / volunteer_count)
        filter (where cigarette_butts is not null and cigarette_butts >= 0)
        as butts_per_volunteer,
      count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer
        as waste_source_count,
      count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer
        as butts_source_count,
      count(*)::integer as eligible_action_count
    from eligible_actions
    where department_code is not null
    group by department_code
  )
  select
    'global'::text,
    null::text,
    null::text,
    max(waste_kg::numeric / volunteer_count)
      filter (where waste_kg is not null and waste_kg >= 0),
    max(cigarette_butts::numeric / volunteer_count)
      filter (where cigarette_butts is not null and cigarette_butts >= 0),
    count(*) filter (where waste_kg is not null and waste_kg >= 0)::integer,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0)::integer,
    count(*)::integer,
    'pollution-score-references-v2'::text,
    now()
  from eligible_actions
  union all
  select
    'department'::text,
    department_code,
    department_name,
    waste_per_volunteer,
    butts_per_volunteer,
    waste_source_count,
    butts_source_count,
    eligible_action_count,
    'pollution-score-references-v2'::text,
    now()
  from department_references;
$$;

revoke all on function public.action_pollution_score_references_v2() from public;
grant execute on function public.action_pollution_score_references_v2() to public;

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
    public.estimate_public_action_waste_kg(
      p_action.waste_kg,
      nullif((regexp_match(p_action.notes,
        '(?m)^\[cmm-meta\][^\r\n]*"megotsKg"\s*:\s*([-+]?[0-9]+(\.[0-9]+)?)'))[1], '')::numeric,
      p_action.cigarette_butts,
      nullif((regexp_match(p_action.notes,
        '(?m)"megotsCondition"\s*:\s*"(propre|humide|mouille)"'))[1], '')
    ) as waste_kg,
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
      and coalesce(s.action_phase, 'post_action_complete') <> 'pre_action'
      and s.action_date <= current_date
      and s.marker_text not like '%test%' and s.marker_text not like '%demo%' and s.marker_text not like '%seed%'
      and s.marker_text not like '%dummy%' and s.marker_text not like '%fake%' and s.marker_text not like '%exemple%') as eligible_non_temporal
  from source_action s
)
select action_id, source_updated_at, action_date, eligible_non_temporal, location_label, waste_kg, cigarette_butts,
  participants_total, duration_minutes, category_key, category_label, warning_code, butts_condition,
  case when butts_condition is null then 0 else cigarette_butts end as butts_condition_count,
  public.current_public_impact_projection_version() as methodology_version, now() as projected_at
from classified;
$$;

revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions)
  to service_role;

create or replace function public.rebuild_public_impact_action_state(
  p_floor_date date,
  p_methodology_version text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_contribution public.public_impact_action_contributions%rowtype;
begin
  if p_floor_date is null
     or p_methodology_version is null
     or p_methodology_version is distinct from public.current_public_impact_projection_version() then
    raise exception 'Invalid public Impact projection version or floor date';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));

  delete from public.public_impact_action_location_counts;
  delete from public.public_impact_action_distribution_counts;
  delete from public.public_impact_action_warning_counts;
  delete from public.public_impact_action_butt_condition_counts;
  delete from public.public_impact_action_contributions;
  update public.public_impact_action_aggregate_state
  set floor_date = p_floor_date,
      initialized_at = null,
      methodology_version = p_methodology_version,
      visible_actions = 0,
      distinct_locations = 0,
      waste_kg = 0,
      cigarette_butts = 0,
      participants_total = 0,
      total_duration_minutes = 0,
      updated_at = now()
  where state_id = true;

  insert into public.public_impact_action_contributions
  select (public.build_public_impact_action_contribution(a)).*
  from public.actions a;

  update public.public_impact_action_aggregate_state
  set initialized_at = now(), updated_at = now()
  where state_id = true;

  for v_contribution in
    select *
    from public.public_impact_action_contributions
    where eligible_non_temporal and action_date >= p_floor_date
  loop
    perform public.public_impact_adjust_contribution(v_contribution, 1);
  end loop;
end;
$$;

revoke all on function public.rebuild_public_impact_action_state(date, text) from public, anon, authenticated;
grant execute on function public.rebuild_public_impact_action_state(date, text) to service_role;

create or replace function public.advance_public_impact_action_state(
  p_floor_date date,
  p_methodology_version text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
  v_contribution public.public_impact_action_contributions%rowtype;
begin
  if p_floor_date is null
     or p_methodology_version is null
     or p_methodology_version is distinct from public.current_public_impact_projection_version() then
    raise exception 'Invalid public Impact projection version or floor date';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));
  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true
  for update;

  if not found
     or v_state.initialized_at is null
     or v_state.methodology_version is distinct from p_methodology_version then
    perform public.rebuild_public_impact_action_state(p_floor_date, p_methodology_version);
    return;
  end if;
  if p_floor_date < v_state.floor_date then
    raise exception 'Impact floor date cannot move backwards from % to %', v_state.floor_date, p_floor_date;
  end if;

  for v_contribution in
    select *
    from public.public_impact_action_contributions
    where eligible_non_temporal
      and action_date >= v_state.floor_date
      and action_date < p_floor_date
  loop
    perform public.public_impact_adjust_contribution(v_contribution, -1);
  end loop;

  update public.public_impact_action_aggregate_state
  set floor_date = p_floor_date, updated_at = now()
  where state_id = true;
end;
$$;

revoke all on function public.advance_public_impact_action_state(date, text) from public, anon, authenticated;
grant execute on function public.advance_public_impact_action_state(date, text) to service_role;

create or replace function public.rebuild_public_impact_action_state(p_floor_date date)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.rebuild_public_impact_action_state(
    p_floor_date,
    public.current_public_impact_projection_version()
  );
end;
$$;

create or replace function public.advance_public_impact_action_state(p_floor_date date)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.advance_public_impact_action_state(
    p_floor_date,
    public.current_public_impact_projection_version()
  );
end;
$$;

revoke all on function public.rebuild_public_impact_action_state(date) from public, anon, authenticated;
grant execute on function public.rebuild_public_impact_action_state(date) to service_role;
revoke all on function public.advance_public_impact_action_state(date) from public, anon, authenticated;
grant execute on function public.advance_public_impact_action_state(date) to service_role;

drop function if exists public.load_public_landing_action_summary_incremental();

create function public.load_public_landing_action_summary_incremental()
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  waste_source_count bigint,
  cigarette_butts bigint,
  volunteers bigint,
  participants_total bigint,
  total_duration_minutes bigint,
  action_distribution jsonb,
  classification_warnings jsonb,
  butts_by_condition jsonb,
  methodology_version text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
begin
  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true;
  if not found or v_state.initialized_at is null then
    raise exception 'Public Impact incremental state is not initialized; run rebuild=true';
  end if;

  return query
  select
    v_state.visible_actions,
    v_state.distinct_locations,
    v_state.waste_kg,
    (
      select count(*)::bigint
      from public.actions a
      where a.status = 'approved'
        and coalesce(a.moderation_visibility, 'visible') = 'visible'
        and coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'
        and a.action_date >= v_state.floor_date
        and a.action_date <= current_date
        and a.waste_kg is not null
        and a.waste_kg >= 0
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%test%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%demo%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%seed%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%dummy%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%fake%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%exemple%'
    ),
    v_state.cigarette_butts,
    v_state.participants_total,
    v_state.participants_total,
    v_state.total_duration_minutes,
    coalesce((
      select jsonb_agg(jsonb_build_object('key', d.category_key, 'category', d.category_label, 'count', d.action_count)
        order by case when d.category_key like 'spontaneous:%' then 1 else 2 end,
          case when d.category_key like 'spontaneous:%' then split_part(d.category_key, ':', 2)::bigint else 0::bigint end,
          d.category_label)
      from public.public_impact_action_distribution_counts d
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('code', w.warning_code, 'count', w.warning_count)
        order by w.warning_code)
      from public.public_impact_action_warning_counts w
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('condition', b.condition, 'count', b.cigarette_butts)
        order by b.condition)
      from public.public_impact_action_butt_condition_counts b
    ), '[]'::jsonb),
    v_state.methodology_version;
end;
$$;

revoke all on function public.load_public_landing_action_summary_incremental() from public, anon, authenticated;
grant execute on function public.load_public_landing_action_summary_incremental() to service_role;
