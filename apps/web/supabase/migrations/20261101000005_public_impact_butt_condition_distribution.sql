-- PUBLIC-IMPACT-BUTT-CONDITION-DISTRIBUTION-2026-11
-- PURPOSE: keep the public incremental projection aligned with the canonical
-- per-lot cigarette-butt results instead of attributing an entire action to
-- one historical condition.
-- CALLER: service_role trigger maintenance, rebuild and public aggregate RPCs.
-- AUTHORIZATION_BOUNDARY: raw actions remain canonical; projection tables and
-- SECURITY DEFINER maintenance functions remain service_role-only.
-- IDEMPOTENCY: contribution rows are replaced by action_id and rebuilds clear
-- and repopulate the existing projection under the advisory lock.
-- ATOMICITY: condition counters are adjusted in the same transaction as the
-- action contribution and use the existing public-impact lock.
-- FAILURE_BEHAVIOR: an invalid or partial update aborts its transaction; the
-- previous projection is not silently mixed with the replacement.
-- SEARCH_PATH: every function fixes pg_catalog/public explicitly.
-- GRANTS: no public read access is added to the service-only state tables.

alter table public.public_impact_action_contributions
  add column if not exists butts_propre_count bigint not null default 0
    check (butts_propre_count >= 0),
  add column if not exists butts_humide_count bigint not null default 0
    check (butts_humide_count >= 0),
  add column if not exists butts_mouille_count bigint not null default 0
    check (butts_mouille_count >= 0);

comment on column public.public_impact_action_contributions.butts_propre_count is
  'Qualified cigarette-butt count from persisted per-lot results for the propre condition.';
comment on column public.public_impact_action_contributions.butts_humide_count is
  'Qualified cigarette-butt count from persisted per-lot results for the humide condition.';
comment on column public.public_impact_action_contributions.butts_mouille_count is
  'Qualified cigarette-butt count from persisted per-lot results for the mouille condition.';

create or replace function public.current_public_impact_projection_version()
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select 'impact-terrain-public-2026.09-v5'::text;
$$;

revoke all on function public.current_public_impact_projection_version() from public, anon, authenticated;
grant execute on function public.current_public_impact_projection_version() to service_role;

create or replace function public.extract_action_cigarette_butts_metadata(
  p_notes text
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_match text[];
begin
  v_match := regexp_match(coalesce(p_notes, ''), '(?m)^\[cmm-meta\]([^\r\n]*)');
  if v_match is null or v_match[1] is null or btrim(v_match[1]) = '' then
    return null;
  end if;

  begin
    return v_match[1]::jsonb;
  exception when others then
    return null;
  end;
end;
$$;

revoke all on function public.extract_action_cigarette_butts_metadata(text)
  from public, anon, authenticated;
grant execute on function public.extract_action_cigarette_butts_metadata(text)
  to service_role;

create or replace function public.build_public_impact_action_contribution(
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
)
select
  action_id, source_updated_at, action_date, eligible_non_temporal, location_label,
  waste_kg, cigarette_butts, participants_total, duration_minutes, category_key,
  category_label, warning_code, butts_condition, butts_condition_count,
  public.current_public_impact_projection_version() as methodology_version,
  now() as projected_at, butts_propre_count, butts_humide_count, butts_mouille_count
from classified;
$$;

revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions)
  to service_role;

create or replace function public.public_impact_butt_condition_counts(
  p_contribution public.public_impact_action_contributions
)
returns table (condition text, cigarette_butts bigint)
language sql
immutable
set search_path = pg_catalog, public
as $$
with explicit_counts as (
  select
    coalesce(p_contribution.butts_propre_count, 0)::bigint as propre,
    coalesce(p_contribution.butts_humide_count, 0)::bigint as humide,
    coalesce(p_contribution.butts_mouille_count, 0)::bigint as mouille
)
select state.condition, state.cigarette_butts
from explicit_counts
cross join lateral (values
  ('propre', case when explicit_counts.propre + explicit_counts.humide + explicit_counts.mouille > 0
    then explicit_counts.propre else case when p_contribution.butts_condition = 'propre'
      then p_contribution.butts_condition_count else 0 end end),
  ('humide', case when explicit_counts.propre + explicit_counts.humide + explicit_counts.mouille > 0
    then explicit_counts.humide else case when p_contribution.butts_condition = 'humide'
      then p_contribution.butts_condition_count else 0 end end),
  ('mouille', case when explicit_counts.propre + explicit_counts.humide + explicit_counts.mouille > 0
    then explicit_counts.mouille else case when p_contribution.butts_condition = 'mouille'
      then p_contribution.butts_condition_count else 0 end end)
) as state(condition, cigarette_butts)
where state.cigarette_butts > 0;
$$;

revoke all on function public.public_impact_butt_condition_counts(
  public.public_impact_action_contributions
) from public, anon, authenticated;
grant execute on function public.public_impact_butt_condition_counts(
  public.public_impact_action_contributions
) to service_role;

create or replace function public.public_impact_adjust_contribution(
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
  v_location_count bigint;
  v_location_delta bigint := 0;
  v_condition record;
begin
  if p_sign not in (-1, 1) then
    raise exception 'Invalid public Impact contribution delta sign: %', p_sign;
  end if;

  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true
  for update;

  if not found or v_state.initialized_at is null then return; end if;
  if not p_contribution.eligible_non_temporal
     or p_contribution.action_date < v_state.floor_date then return; end if;

  if v_state.visible_actions + p_sign < 0
     or v_state.waste_kg + (p_sign * p_contribution.waste_kg) < 0
     or v_state.cigarette_butts + (p_sign * p_contribution.cigarette_butts) < 0
     or v_state.participants_total + (p_sign * p_contribution.participants_total) < 0
     or v_state.total_duration_minutes + (p_sign * p_contribution.duration_minutes) < 0 then
    raise exception 'Public Impact aggregate would become negative for action %', p_contribution.action_id;
  end if;

  if p_contribution.location_label is not null then
    select action_count into v_location_count
    from public.public_impact_action_location_counts
    where location_label = p_contribution.location_label for update;
    if p_sign = 1 then
      if v_location_count is null then
        insert into public.public_impact_action_location_counts(location_label, action_count)
        values (p_contribution.location_label, 1);
        v_location_delta := 1;
      else
        update public.public_impact_action_location_counts
        set action_count = action_count + 1 where location_label = p_contribution.location_label;
      end if;
    elsif v_location_count is null or v_location_count <= 0 then
      raise exception 'Missing public Impact location counter for %', p_contribution.location_label;
    elsif v_location_count = 1 then
      delete from public.public_impact_action_location_counts where location_label = p_contribution.location_label;
      v_location_delta := -1;
    else
      update public.public_impact_action_location_counts
      set action_count = action_count - 1 where location_label = p_contribution.location_label;
    end if;
  end if;

  if v_state.distinct_locations + v_location_delta < 0 then
    raise exception 'Public Impact distinct location counter would become negative';
  end if;

  update public.public_impact_action_aggregate_state
  set visible_actions = visible_actions + p_sign,
      distinct_locations = distinct_locations + v_location_delta,
      waste_kg = waste_kg + (p_sign * p_contribution.waste_kg),
      cigarette_butts = cigarette_butts + (p_sign * p_contribution.cigarette_butts),
      participants_total = participants_total + (p_sign * p_contribution.participants_total),
      total_duration_minutes = total_duration_minutes + (p_sign * p_contribution.duration_minutes),
      updated_at = now()
  where state_id = true;

  if p_sign = 1 then
    insert into public.public_impact_action_distribution_counts(category_key, category_label, action_count)
    values (p_contribution.category_key, p_contribution.category_label, 1)
    on conflict (category_key) do update set category_label = excluded.category_label,
      action_count = public.public_impact_action_distribution_counts.action_count + 1;
  else
    update public.public_impact_action_distribution_counts set action_count = action_count - 1
    where category_key = p_contribution.category_key and action_count > 0;
    if not found then raise exception 'Missing public Impact distribution counter for %', p_contribution.category_key; end if;
    delete from public.public_impact_action_distribution_counts where category_key = p_contribution.category_key and action_count = 0;
  end if;

  if p_contribution.warning_code is not null then
    if p_sign = 1 then
      insert into public.public_impact_action_warning_counts(warning_code, warning_count)
      values (p_contribution.warning_code, 1)
      on conflict (warning_code) do update set warning_count = public.public_impact_action_warning_counts.warning_count + 1;
    else
      update public.public_impact_action_warning_counts set warning_count = warning_count - 1
      where warning_code = p_contribution.warning_code and warning_count > 0;
      if not found then raise exception 'Missing public Impact warning counter for %', p_contribution.warning_code; end if;
      delete from public.public_impact_action_warning_counts where warning_code = p_contribution.warning_code and warning_count = 0;
    end if;
  end if;

  for v_condition in select * from public.public_impact_butt_condition_counts(p_contribution) loop
    if p_sign = 1 then
      insert into public.public_impact_action_butt_condition_counts(condition, cigarette_butts)
      values (v_condition.condition, v_condition.cigarette_butts)
      on conflict (condition) do update set cigarette_butts =
        public.public_impact_action_butt_condition_counts.cigarette_butts + excluded.cigarette_butts;
    else
      update public.public_impact_action_butt_condition_counts
      set cigarette_butts = cigarette_butts - v_condition.cigarette_butts
      where condition = v_condition.condition and cigarette_butts >= v_condition.cigarette_butts;
      if not found then raise exception 'Missing public Impact butt condition counter for %', v_condition.condition; end if;
      delete from public.public_impact_action_butt_condition_counts
      where condition = v_condition.condition and cigarette_butts = 0;
    end if;
  end loop;
end;
$$;

revoke all on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) from public, anon, authenticated;
grant execute on function public.public_impact_adjust_contribution(
  public.public_impact_action_contributions, integer
) to service_role;

create or replace function public.sync_public_impact_action_contribution()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous public.public_impact_action_contributions%rowtype;
  v_next public.public_impact_action_contributions%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.public-impact-action-state', 0));
  if tg_op = 'UPDATE' then
    select * into v_previous from public.public_impact_action_contributions
    where action_id = old.id for update;
    if found then
      perform public.public_impact_adjust_contribution(v_previous, -1);
      delete from public.public_impact_action_contributions where action_id = old.id;
    end if;
  end if;
  select (public.build_public_impact_action_contribution(new)).* into v_next;
  insert into public.public_impact_action_contributions select v_next.*
  on conflict (action_id) do update set
    source_updated_at = excluded.source_updated_at, action_date = excluded.action_date,
    eligible_non_temporal = excluded.eligible_non_temporal, location_label = excluded.location_label,
    waste_kg = excluded.waste_kg, cigarette_butts = excluded.cigarette_butts,
    participants_total = excluded.participants_total, duration_minutes = excluded.duration_minutes,
    category_key = excluded.category_key, category_label = excluded.category_label,
    warning_code = excluded.warning_code, butts_condition = excluded.butts_condition,
    butts_condition_count = excluded.butts_condition_count,
    methodology_version = excluded.methodology_version, projected_at = excluded.projected_at,
    butts_propre_count = excluded.butts_propre_count,
    butts_humide_count = excluded.butts_humide_count,
    butts_mouille_count = excluded.butts_mouille_count;
  perform public.public_impact_adjust_contribution(v_next, 1);
  return new;
end;
$$;

revoke all on function public.sync_public_impact_action_contribution() from public, anon, authenticated;
grant execute on function public.sync_public_impact_action_contribution() to service_role;

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
with contributions as (
  select (public.build_public_impact_action_contribution(a)).*
  from public.actions a
  where a.action_date >= p_floor_date and a.action_date <= current_date
), eligible as (
  select * from contributions where eligible_non_temporal
), distribution as (
  select category_key, max(category_label) as category_label, count(*)::bigint as action_count
  from eligible group by category_key
), warnings as (
  select warning_code, count(*)::bigint as warning_count
  from eligible where warning_code is not null group by warning_code
), butt_conditions as (
  select b.condition, sum(b.cigarette_butts)::bigint as count
  from eligible e cross join lateral public.public_impact_butt_condition_counts(e) b
  group by b.condition
)
select count(*)::bigint, count(distinct location_label)::bigint,
  coalesce(sum(waste_kg), 0::numeric), coalesce(sum(cigarette_butts), 0::bigint),
  coalesce(sum(participants_total), 0::bigint), coalesce(sum(participants_total), 0::bigint),
  coalesce(sum(duration_minutes), 0::bigint),
  coalesce((select jsonb_agg(jsonb_build_object('key', category_key, 'category', category_label, 'count', action_count)
    order by category_key) from distribution), '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_build_object('code', warning_code, 'count', warning_count)
    order by warning_code) from warnings), '[]'::jsonb),
  coalesce((select jsonb_agg(jsonb_build_object('condition', condition, 'count', count)
    order by condition) from butt_conditions), '[]'::jsonb)
from eligible;
$$;

revoke all on function public.load_public_landing_action_summary(date)
  from public, anon, authenticated, service_role;
grant execute on function public.load_public_landing_action_summary(date) to service_role;

-- The version transition makes the existing maintenance path rebuild the
-- state once. Raw actions, lot sources and historical snapshots are untouched.
