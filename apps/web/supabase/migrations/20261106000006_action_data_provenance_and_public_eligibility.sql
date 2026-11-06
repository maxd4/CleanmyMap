-- PURPOSE: distinguish real action submissions, preserved historical unknowns and
--          isolated test fixtures without changing existing measurements or formulas.
-- CALLER: the server-only action creation boundary, public reference RPCs,
--         public impact projections and public map readers.
-- AUTHORIZATION_BOUNDARY: normal action creation is service_role-only and marks
--                         the row real through a transaction-local server marker;
--                         test rows are created only by isolated test fixtures.
-- IDEMPOTENCY: schema additions, policies and function replacements are safe in
--              the ordered migration stream; no action row is deleted or reclassified.
-- ATOMICITY: provenance, eligibility functions and projections are changed in one
--            migration transaction.
-- FAILURE_BEHAVIOR: existing rows receive only the non-assertive unknown value;
--                   test rows fail closed for public statistics and projections.
-- SEARCH_PATH: every function pins public, pg_catalog explicitly.
-- GRANTS: existing reader grants are preserved; creation remains service_role-only.

alter table public.actions
  add column if not exists data_provenance text not null default 'unknown';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'actions_data_provenance_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_data_provenance_check
      check (data_provenance in ('unknown', 'real', 'test'));
  end if;
end;
$$;

comment on column public.actions.data_provenance is
  'Server-controlled provenance: real for normal API creation, test for isolated fixtures, unknown for preserved historical rows.';

create or replace function public.is_public_real_completed_action(
  p_status text,
  p_action_phase text,
  p_access_mode text,
  p_moderation_visibility text,
  p_action_date date,
  p_data_provenance text,
  p_as_of_date date
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
    and p_action_date <= p_as_of_date
    and coalesce(p_data_provenance, 'unknown') <> 'test';
$$;

revoke all on function public.is_public_real_completed_action(text, text, text, text, date, text, date)
  from public;
grant execute on function public.is_public_real_completed_action(text, text, text, text, date, text, date)
  to anon, authenticated, service_role;

-- The legacy RPC remains the implementation owner for the validated JSON and
-- relation transaction. The wrapper supplies the provenance only at the
-- service boundary; arbitrary client JSON cannot opt into or out of this value.
alter function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)
  rename to create_action_with_relations_legacy;

create or replace function public.apply_server_action_data_provenance()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if current_setting('cleanmymap.action_creation_provenance', true) = 'real' then
    new.data_provenance := 'real';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_server_action_data_provenance on public.actions;
create trigger trg_apply_server_action_data_provenance
before insert on public.actions
for each row execute function public.apply_server_action_data_provenance();

create or replace function public.create_action_with_relations(
  p_action jsonb,
  p_organizers jsonb,
  p_registrations jsonb,
  p_creator_id text,
  p_client_request_id text default null,
  p_client_request_fingerprint text default null,
  p_organizer_required boolean default true
)
returns table (action_id uuid, replayed boolean)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  perform set_config('cleanmymap.action_creation_provenance', 'real', true);
  return query
  select *
  from public.create_action_with_relations_legacy(
    p_action,
    p_organizers,
    p_registrations,
    p_creator_id,
    p_client_request_id,
    p_client_request_fingerprint,
    p_organizer_required
  );
end;
$$;

revoke all on function public.create_action_with_relations_legacy(jsonb, jsonb, jsonb, text, text, text, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.create_action_with_relations(jsonb, jsonb, jsonb, text, text, text, boolean)
  to service_role;

-- Browser readers must never see a test fixture through a direct action read.
-- SECURITY INVOKER map and action reads therefore fail closed even if a future
-- permissive SELECT policy is added accidentally.
drop policy if exists actions_select_exclude_test_data on public.actions;
create policy actions_select_exclude_test_data
on public.actions as restrictive
for select to anon, authenticated
using (data_provenance <> 'test');

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
    where public.is_public_real_completed_action(
        a.status, a.action_phase, a.access_mode, a.moderation_visibility,
        a.action_date, a.data_provenance, current_date
      )
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

create or replace function public.action_collection_context_reference_averages_v1()
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
with eligible as (
  select
    a.action_context,
    a.waste_kg,
    a.cigarette_butts,
    case
      when a.action_context in ('citizen', 'company')
        then a.adult_count + 0.5 * a.children_count + 0.5 * a.retired_count
      when a.action_context = 'school'
        then a.adult_count + 0.45 * a.children_count
      else null
    end as waste_units,
    case
      when a.action_context in ('citizen', 'company')
        then a.adult_count + 0.5 * a.children_count + 0.5 * a.retired_count
      when a.action_context = 'school'
        then a.adult_count
      else null
    end as butts_units
  from public.actions a
  where public.is_public_real_completed_action(
      a.status, a.action_phase, a.access_mode, a.moderation_visibility,
      a.action_date, a.data_provenance, current_date
    )
    and a.action_context is not null
    and a.children_count is not null
    and a.adult_count is not null
    and a.retired_count is not null
    and a.children_count + a.adult_count + a.retired_count = a.volunteers_count
    and (a.action_context <> 'school' or a.retired_count = 0)
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
select action_context, waste_average, butts_average, waste_count, butts_count,
  eligible_count, 'contextual-effective-units-v1'::text, now()
from grouped
order by action_context;
$$;

revoke all on function public.action_collection_context_reference_averages_v1() from public;
grant execute on function public.action_collection_context_reference_averages_v1() to anon, authenticated;

-- Keep the existing impact arithmetic and mass provenance implementation, but
-- put its eligibility decision behind the canonical predicate. Renaming keeps
-- the already-reviewed implementation available only as a private helper.
alter function public.build_public_impact_action_contribution(public.actions)
  rename to build_public_impact_action_contribution_legacy;

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
  v_contribution public.public_impact_action_contributions;
begin
  select * into v_contribution
  from public.build_public_impact_action_contribution_legacy(p_action);
  v_contribution.eligible_non_temporal := public.is_public_real_completed_action(
    p_action.status,
    p_action.action_phase,
    p_action.access_mode,
    p_action.moderation_visibility,
    p_action.action_date,
    p_action.data_provenance,
    current_date
  );
  return v_contribution;
end;
$$;

revoke all on function public.build_public_impact_action_contribution_legacy(public.actions)
  from public, anon, authenticated, service_role;
revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions)
  to service_role;

-- This scalar was historically read directly from actions. Read it from the
-- already-filtered contribution projection so service_role cannot reintroduce
-- a test fixture into the public landing count.
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
  select
    v_state.visible_actions,
    v_state.distinct_locations,
    v_state.waste_kg,
    (
      select count(*)::bigint
      from public.public_impact_action_contributions c
      join public.actions a on a.id = c.action_id
      where c.eligible_non_temporal
        and a.data_provenance <> 'test'
        and c.action_date >= v_state.floor_date
        and c.action_date <= current_date
        and a.waste_kg is not null
        and a.waste_kg >= 0
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
      select jsonb_agg(jsonb_build_object(
        'condition', b.condition,
        'count', b.cigarette_butts,
        'massContributions', b.mass_contributions)
        order by b.condition)
      from public.public_impact_action_butt_condition_counts b
    ), '[]'::jsonb),
    v_state.methodology_version;
end;
$$;

revoke all on function public.load_public_landing_action_summary_incremental() from public, anon, authenticated;
grant execute on function public.load_public_landing_action_summary_incremental() to service_role;
