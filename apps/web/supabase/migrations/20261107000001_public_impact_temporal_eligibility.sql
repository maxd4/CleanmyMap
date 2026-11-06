-- PURPOSE: separate permanent eligibility from the current public KPI window.
-- CALLER: service-role action triggers, maintenance advancement and rebuild RPCs.
-- AUTHORIZATION_BOUNDARY: browser roles cannot execute the contribution mutators.
-- IDEMPOTENCY: temporal membership is persisted and every +/- adjustment is a
-- no-op when the requested transition is already represented by that state.
-- ATOMICITY: the aggregate advisory lock and aggregate row lock serialize the
-- contribution transition with action-trigger synchronization.
-- FAILURE_BEHAVIOR: an invalid transition raises before counters are changed;
-- future contributions remain stored but inactive until a later advance.
-- SEARCH_PATH: every definer function fixes pg_catalog, public.
-- GRANTS: service_role only for all mutating helpers and RPCs.

alter table public.public_impact_action_contributions
  add column if not exists eligible_temporal boolean not null default false;

comment on column public.public_impact_action_contributions.eligible_temporal is
  'True only while the permanently eligible contribution is inside the current public aggregate window.';

create or replace function public.is_action_statistical_version_permanently_admissible(
  p_status text,
  p_action_phase text,
  p_access_mode text,
  p_moderation_visibility text,
  p_review_state text,
  p_data_provenance text,
  p_publication_kind text
)
returns boolean
language sql
stable
parallel safe
set search_path = pg_catalog, public
as $$
  select p_status = 'approved'
    and coalesce(p_action_phase, 'post_action_complete') = 'post_action_complete'
    and coalesce(p_access_mode, 'public') = 'public'
    and coalesce(p_moderation_visibility, 'visible') = 'visible'
    and coalesce(p_review_state, 'not_required') in ('not_required', 'approved')
    and coalesce(p_data_provenance, 'unknown') <> 'test'
    and p_publication_kind in ('approved_published', 'legacy_approved_unpublished');
$$;

revoke all on function public.is_action_statistical_version_permanently_admissible(
  text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.is_action_statistical_version_permanently_admissible(
  text, text, text, text, text, text, text
) to service_role;

create or replace function public.build_public_impact_action_contribution_from_historical(
  p_action public.actions
)
returns public.public_impact_action_contributions
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
with metadata_source as (
  select
    p_action.id as action_id,
    public.extract_action_cigarette_butts_metadata(p_action.notes) as metadata
), source_action as (
  select
    p_action.id as action_id,
    p_action.updated_at as source_updated_at,
    p_action.action_date,
    p_action.status,
    p_action.moderation_visibility,
    p_action.action_phase,
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
    nullif((regexp_match(p_action.notes,
      '(?m)"megotsCondition"\s*:\s*"(propre|humide|mouille)"'))[1], '') as legacy_butts_condition,
    case
      when jsonb_typeof(m.metadata->'cigaretteButtsMeasurements'->'cigaretteButtsLotResults') = 'array'
        then m.metadata->'cigaretteButtsMeasurements'->'cigaretteButtsLotResults'
      else '[]'::jsonb
    end as lot_results,
    case
      when jsonb_typeof(m.metadata->'cigaretteButtsMeasurements'->'cigaretteButtsLotResults') = 'array'
        then jsonb_array_length(m.metadata->'cigaretteButtsMeasurements'->'cigaretteButtsLotResults') > 0
      else false
    end as has_lot_results,
    case
      when (m.metadata->'cigaretteButtsMeasurements'->>'cigaretteButtsMassKg') ~ '^[0-9]+(\.[0-9]+)?$'
        then (m.metadata->'cigaretteButtsMeasurements'->>'cigaretteButtsMassKg')::numeric
      else null
    end as legacy_mass_kg,
    case
      when coalesce((m.metadata->'cigaretteButtsMeasurements'->>'cigaretteButtsMassKg') ~ '^[0-9]+(\.[0-9]+)?$', false) = false then 'unknown'
      when m.metadata->'cigaretteButtsMeasurements'->>'cigaretteButtsMassProvenance' = 'measured' then 'measured'
      else 'estimated'
    end as legacy_mass_provenance,
    case
      when jsonb_typeof(m.metadata->'cigaretteButtsMeasurements') = 'object'
        then nullif(m.metadata->'cigaretteButtsMeasurements'->>'cigaretteButtsConversionFormulaVersion', '')
      else 'impact-terrain-2026-butts-mass-v1'
    end as legacy_mass_conversion_version,
    lower(concat_ws(' ', p_action.id::text, 'actions', coalesce(p_action.location_label, ''),
      coalesce(p_action.actor_name, ''), coalesce(regexp_replace(regexp_replace(regexp_replace(
        coalesce(p_action.notes, ''), '(?mi)^\[cmm-meta\].*(\r?\n|$)', '', 'g'),
        '(?mi)^\[google-sheet-sync\][ \t]*(\r?\n|$)', '', 'g'),
        '(?mi)^association\s*:\s*.*(\r?\n|$)', '', 'g'), ''))) as marker_text
  from metadata_source m
), lot_counts as (
  select
    s.action_id,
    coalesce(sum(case when lot->>'condition' = 'propre'
      and (lot->>'count') ~ '^[0-9]+(\.[0-9]+)?$'
      then round((lot->>'count')::numeric)::bigint else 0::bigint end), 0)::bigint as butts_propre_count,
    coalesce(sum(case when lot->>'condition' = 'humide'
      and (lot->>'count') ~ '^[0-9]+(\.[0-9]+)?$'
      then round((lot->>'count')::numeric)::bigint else 0::bigint end), 0)::bigint as butts_humide_count,
    coalesce(sum(case when lot->>'condition' = 'mouille'
      and (lot->>'count') ~ '^[0-9]+(\.[0-9]+)?$'
      then round((lot->>'count')::numeric)::bigint else 0::bigint end), 0)::bigint as butts_mouille_count
  from source_action s
  cross join lateral jsonb_array_elements(s.lot_results) as lot
  where jsonb_typeof(lot) = 'object'
    and lot->>'condition' in ('propre', 'humide', 'mouille')
    and (lot->>'count') ~ '^[0-9]+(\.[0-9]+)?$'
  group by s.action_id
), lot_mass_by_condition as (
  select
    s.action_id,
    coalesce(jsonb_object_agg(m.condition, m.contributions), '{}'::jsonb) as butts_mass_by_condition
  from source_action s
  cross join lateral (
    select
      lot->>'condition' as condition,
      jsonb_agg(
        jsonb_build_object(
          'count', round((lot->>'count')::numeric)::bigint,
          'massKg', case when (lot->>'massKg') ~ '^[0-9]+(\.[0-9]+)?$'
            then (lot->>'massKg')::numeric else null end,
          'massProvenance', case
            when coalesce((lot->>'massKg') ~ '^[0-9]+(\.[0-9]+)?$', false) = false then 'unknown'
            when lot->>'massProvenance' = 'measured' then 'measured'
            else 'estimated' end,
          'conversionVersion', nullif(coalesce(lot->>'massConversionFormulaVersion', lot->>'volumeConversionFormulaVersion'), '')
        )
        order by lot->>'id'
      ) as contributions
    from jsonb_array_elements(s.lot_results) as lot
    where jsonb_typeof(lot) = 'object'
      and lot->>'condition' in ('propre', 'humide', 'mouille')
      and (lot->>'count') ~ '^[0-9]+(\.[0-9]+)?$'
    group by lot->>'condition'
  ) as m
  group by s.action_id
), classified as (
  select
    s.*,
    coalesce(l.butts_propre_count, 0)::bigint as butts_propre_count,
    coalesce(l.butts_humide_count, 0)::bigint as butts_humide_count,
    coalesce(l.butts_mouille_count, 0)::bigint as butts_mouille_count,
    case when s.has_lot_results then null else s.legacy_butts_condition end as butts_condition,
    case when s.has_lot_results then 0
      when s.legacy_butts_condition is null then 0
      else s.cigarette_butts end::bigint as butts_condition_count,
    case when s.has_lot_results then coalesce(lm.butts_mass_by_condition, '{}'::jsonb)
      when s.legacy_butts_condition is null or s.cigarette_butts <= 0 then '{}'::jsonb
      else jsonb_build_object(
        s.legacy_butts_condition,
        jsonb_build_array(jsonb_build_object(
          'count', s.cigarette_butts,
          'massKg', s.legacy_mass_kg,
          'massProvenance', s.legacy_mass_provenance,
          'conversionVersion', s.legacy_mass_conversion_version
        ))
      ) end as butts_mass_by_condition,
    case when s.organizer_type = 'spontaneous' and s.participants_total > 0
      then 'spontaneous:' || s.participants_total::text
      when s.organizer_type in ('company','association','student_association','collective','other')
      then s.organizer_type else 'other' end as category_key,
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
      when s.organizer_type not in ('spontaneous','company','association','student_association','collective','other')
        then 'invalid_organizer_type'
      when s.organizer_type = 'spontaneous' and s.participants_total < 1
        then 'invalid_spontaneous_participant_count' else null end as warning_code,
    (s.status = 'approved' and coalesce(s.moderation_visibility, 'visible') = 'visible'
      and coalesce(s.action_phase, 'post_action_complete') <> 'pre_action'
      and s.action_date <= current_date
      and s.marker_text not like '%test%' and s.marker_text not like '%demo%'
      and s.marker_text not like '%seed%' and s.marker_text not like '%dummy%'
      and s.marker_text not like '%fake%' and s.marker_text not like '%exemple%') as eligible_non_temporal
  from source_action s
  left join lot_counts l on l.action_id = s.action_id
  left join lot_mass_by_condition lm on lm.action_id = s.action_id
)
select
  action_id, source_updated_at, action_date, eligible_non_temporal, location_label,
  waste_kg, cigarette_butts, participants_total, duration_minutes, category_key,
  category_label, warning_code, butts_condition, butts_condition_count,
  public.current_public_impact_projection_version() as methodology_version,
  now() as projected_at, butts_propre_count, butts_humide_count, butts_mouille_count,
  butts_mass_by_condition,
  false as eligible_temporal
from classified;
$$;

-- The historical reference RPCs keep their date-aware predicate. This builder
-- instead retains a future snapshot as permanently eligible and lets the
-- contribution transition below decide whether it is currently in-window.
create or replace function public.build_public_impact_action_contribution(
  p_action public.actions
)
returns public.public_impact_action_contributions
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_snapshot public.action_statistical_versions%rowtype;
  v_effective public.actions;
  v_contribution public.public_impact_action_contributions;
  v_eligible boolean := false;
begin
  select * into v_snapshot
  from public.action_statistical_versions v
  where v.action_id = p_action.id
    and v.is_current
    and public.is_action_statistical_version_permanently_admissible(
      v.status, v.action_phase, v.access_mode, v.moderation_visibility,
      v.review_state, v.data_provenance, v.publication_kind
    );

  if found then
    v_effective := jsonb_populate_record(p_action, jsonb_build_object(
      'updated_at', v_snapshot.source_updated_at,
      'action_date', v_snapshot.action_date,
      'location_label', v_snapshot.location_label,
      'actor_name', v_snapshot.actor_name,
      'organizer_type', v_snapshot.organizer_type,
      'action_context', v_snapshot.action_context,
      'waste_kg', v_snapshot.waste_kg,
      'cigarette_butts', v_snapshot.cigarette_butts,
      'volunteers_count', v_snapshot.volunteers_count,
      'children_count', v_snapshot.children_count,
      'adult_count', v_snapshot.adult_count,
      'retired_count', v_snapshot.retired_count,
      'duration_minutes', v_snapshot.duration_minutes,
      'notes', v_snapshot.notes,
      'preparation_data', v_snapshot.preparation_data,
      'status', v_snapshot.status,
      'action_phase', v_snapshot.action_phase,
      'review_state', v_snapshot.review_state,
      'access_mode', v_snapshot.access_mode,
      'moderation_visibility', v_snapshot.moderation_visibility,
      'data_provenance', v_snapshot.data_provenance,
      'published_at', v_snapshot.published_at
    ));
    v_eligible := p_action.status in ('approved', 'pending')
      and coalesce(p_action.action_phase, 'post_action_complete') in ('post_action_complete', 'post_action_draft')
      and coalesce(p_action.access_mode, 'public') = 'public'
      and coalesce(p_action.moderation_visibility, 'visible') = 'visible'
      and coalesce(p_action.review_state, 'not_required') <> 'rejected'
      and coalesce(p_action.data_provenance, 'unknown') <> 'test';
  else
    v_effective := p_action;
  end if;

  select * into v_contribution
  from public.build_public_impact_action_contribution_unversioned(v_effective);
  v_contribution.eligible_non_temporal := v_eligible;
  v_contribution.eligible_temporal := false;
  return v_contribution;
end;
$$;

revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions)
  to service_role;

-- Existing rows were built before the stable/temporal split. Refresh their
-- snapshot-derived payload without changing aggregate counters: active rows
-- keep their already-counted temporal state, while future rows stay inactive.
do $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
  v_previous public.public_impact_action_contributions%rowtype;
  v_next public.public_impact_action_contributions%rowtype;
  v_action public.actions%rowtype;
begin
  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true;

  for v_action in
    select a.*
    from public.actions a
    join public.public_impact_action_contributions c on c.action_id = a.id
  loop
    select * into v_previous
    from public.public_impact_action_contributions
    where action_id = v_action.id;

    select * into v_next
    from public.build_public_impact_action_contribution(v_action);

    v_next.eligible_temporal := coalesce(v_previous.eligible_temporal, false)
      and coalesce(v_state.initialized_at is not null, false)
      and v_next.eligible_non_temporal
      and v_next.action_date >= v_state.floor_date
      and v_next.action_date <= current_date;

    update public.public_impact_action_contributions
    set source_updated_at = v_next.source_updated_at,
        action_date = v_next.action_date,
        eligible_non_temporal = v_next.eligible_non_temporal,
        eligible_temporal = v_next.eligible_temporal,
        location_label = v_next.location_label,
        waste_kg = v_next.waste_kg,
        cigarette_butts = v_next.cigarette_butts,
        participants_total = v_next.participants_total,
        duration_minutes = v_next.duration_minutes,
        category_key = v_next.category_key,
        category_label = v_next.category_label,
        warning_code = v_next.warning_code,
        butts_condition = v_next.butts_condition,
        butts_condition_count = v_next.butts_condition_count,
        methodology_version = v_next.methodology_version,
        projected_at = v_next.projected_at
    where action_id = v_action.id;
  end loop;
end;
$$;

alter function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) rename to public_impact_adjust_contribution_historical;

create function public.public_impact_adjust_contribution(
  p_contribution public.public_impact_action_contributions,
  p_sign integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
begin
  if p_sign not in (-1, 1) then
    raise exception 'Invalid public Impact contribution delta sign: %', p_sign;
  end if;

  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true
  for update;

  if not found or v_state.initialized_at is null then
    return;
  end if;
  if not p_contribution.eligible_non_temporal
     or p_contribution.action_date < v_state.floor_date
     or p_contribution.action_date > current_date then
    return;
  end if;
  if p_sign = 1 and p_contribution.eligible_temporal then
    return;
  end if;
  if p_sign = -1 and not p_contribution.eligible_temporal then
    return;
  end if;

  perform public.public_impact_adjust_contribution_historical(p_contribution, p_sign);

  update public.public_impact_action_contributions
  set eligible_temporal = (p_sign = 1)
  where action_id = p_contribution.action_id;
end;
$$;

revoke all on function public.public_impact_adjust_contribution_historical(
  public.public_impact_action_contributions, integer
) from public, anon, authenticated, service_role;
revoke all on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) from public, anon, authenticated;
grant execute on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) to service_role;

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

  perform public.assert_public_impact_current_butt_projections();
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
    where eligible_temporal
      and action_date >= v_state.floor_date
      and action_date < p_floor_date
  loop
    perform public.public_impact_adjust_contribution(v_contribution, -1);
  end loop;

  update public.public_impact_action_aggregate_state
  set floor_date = p_floor_date, updated_at = now()
  where state_id = true;

  for v_contribution in
    select *
    from public.public_impact_action_contributions
    where eligible_non_temporal
      and not eligible_temporal
      and action_date >= p_floor_date
      and action_date <= current_date
  loop
    perform public.public_impact_adjust_contribution(v_contribution, 1);
  end loop;
end;
$$;

revoke all on function public.advance_public_impact_action_state(date, text)
  from public, anon, authenticated;
grant execute on function public.advance_public_impact_action_state(date, text)
  to service_role;

create or replace function public.load_public_landing_action_summary_incremental()
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
  select v_state.visible_actions, v_state.distinct_locations, v_state.waste_kg,
    (
      select count(*)::bigint
      from public.public_impact_action_contributions c
      join public.action_statistical_versions v
        on v.action_id = c.action_id and v.is_current
      where c.eligible_temporal
        and v.waste_kg is not null
        and v.waste_kg >= 0
    ),
    v_state.cigarette_butts, v_state.participants_total, v_state.participants_total,
    v_state.total_duration_minutes,
    coalesce((select jsonb_agg(jsonb_build_object('key', d.category_key, 'category', d.category_label, 'count', d.action_count)
      order by case when d.category_key like 'spontaneous:%' then 1 else 2 end,
        case when d.category_key like 'spontaneous:%' then split_part(d.category_key, ':', 2)::bigint else 0::bigint end,
        d.category_label) from public.public_impact_action_distribution_counts d), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('code', w.warning_code, 'count', w.warning_count)
      order by w.warning_code) from public.public_impact_action_warning_counts w), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('condition', b.condition, 'count', b.cigarette_butts, 'massContributions', b.mass_contributions)
      order by b.condition) from public.public_impact_action_butt_condition_counts b), '[]'::jsonb),
    v_state.methodology_version;
end;
$$;

revoke all on function public.load_public_landing_action_summary_incremental()
  from public, anon, authenticated;
grant execute on function public.load_public_landing_action_summary_incremental()
  to service_role;
