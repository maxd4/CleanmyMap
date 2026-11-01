-- SCIENTIFIC-PROJECTION-VOLUME-LOT-RECONCILIATION-2026-11
-- PURPOSE: feed the public SQL projection with current lot results produced by
-- the canonical TypeScript cigarette-butt engine, while retaining the action's
-- historical scalar and the raw lot source.
-- CALLER: service_role maintenance before public-impact rebuild or advance.
-- AUTHORIZATION_BOUNDARY: the reconciliation cache and state transitions are
-- service_role-only; public.actions and historical snapshots remain untouched.
-- IDEMPOTENCY: rows are upserted by action_id and source_updated_at; a retry
-- replaces one derived projection and reruns the existing locked state update.
-- ATOMICITY: the three-argument transition RPC upserts rows and rebuilds or
-- advances the public state in one caller transaction under the existing lock.
-- FAILURE_BEHAVIOR: a missing current projection for an action with retained
-- lots aborts the state transition instead of exposing its historical scalar as
-- CURRENT; ambiguous scalar history remains the historical fallback.
-- SEARCH_PATH: every function fixes pg_catalog/public explicitly.
-- GRANTS: no public read or write access is added to the reconciliation cache.

create table if not exists public.public_impact_action_cigarette_butt_projections (
  action_id uuid primary key references public.actions(id) on delete cascade,
  source_updated_at timestamptz not null,
  projected_count bigint,
  recalculation_status text not null
    check (recalculation_status in ('recalculable', 'not_recalculable', 'not_applicable')),
  projection_version text not null,
  projected_lot_results jsonb
    check (projected_lot_results is null or jsonb_typeof(projected_lot_results) = 'array'),
  projected_at timestamptz not null default now(),
  check (projected_count is null or projected_count >= 0),
  check (recalculation_status <> 'recalculable' or projected_count is not null)
);

create index if not exists idx_public_impact_action_butt_projections_source_updated_at
  on public.public_impact_action_cigarette_butt_projections(source_updated_at);

comment on table public.public_impact_action_cigarette_butt_projections is
  'Service-only current projection from canonical retained cigarette-butt lots; public.actions remains the historical/source owner.';

alter table public.public_impact_action_cigarette_butt_projections enable row level security;
drop policy if exists public_impact_action_butt_projections_service_only
  on public.public_impact_action_cigarette_butt_projections;
create policy public_impact_action_butt_projections_service_only
  on public.public_impact_action_cigarette_butt_projections
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

revoke all on table public.public_impact_action_cigarette_butt_projections
  from public, anon, authenticated;
grant all on table public.public_impact_action_cigarette_butt_projections
  to service_role;

create or replace function public.upsert_public_impact_action_cigarette_butt_projections(
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Public Impact cigarette-butt projection rows must be an array';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_rows) as rows(
      action_id uuid,
      source_updated_at timestamptz,
      projected_count bigint,
      recalculation_status text,
      projection_version text,
      projected_lot_results jsonb
    )
    where rows.action_id is null
       or rows.source_updated_at is null
       or rows.recalculation_status not in ('recalculable', 'not_recalculable', 'not_applicable')
       or rows.projection_version is distinct from public.current_public_impact_projection_version()
       or rows.projected_count is not null and rows.projected_count < 0
       or rows.recalculation_status = 'recalculable' and rows.projected_count is null
       or rows.projected_lot_results is not null
          and jsonb_typeof(rows.projected_lot_results) <> 'array'
  ) then
    raise exception 'Invalid public Impact cigarette-butt projection row';
  end if;

  insert into public.public_impact_action_cigarette_butt_projections (
    action_id,
    source_updated_at,
    projected_count,
    recalculation_status,
    projection_version,
    projected_lot_results,
    projected_at
  )
  select
    rows.action_id,
    rows.source_updated_at,
    rows.projected_count,
    rows.recalculation_status,
    rows.projection_version,
    rows.projected_lot_results,
    now()
  from jsonb_to_recordset(p_rows) as rows(
    action_id uuid,
    source_updated_at timestamptz,
    projected_count bigint,
    recalculation_status text,
    projection_version text,
    projected_lot_results jsonb
  )
  on conflict (action_id) do update set
    source_updated_at = excluded.source_updated_at,
    projected_count = excluded.projected_count,
    recalculation_status = excluded.recalculation_status,
    projection_version = excluded.projection_version,
    projected_lot_results = excluded.projected_lot_results,
    projected_at = excluded.projected_at;
end;
$$;

revoke all on function public.upsert_public_impact_action_cigarette_butt_projections(jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_public_impact_action_cigarette_butt_projections(jsonb)
  to service_role;

create or replace function public.merge_public_impact_current_butt_lot_results(
  p_notes text,
  p_lot_results jsonb
)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
with metadata as (
  select jsonb_set(
    coalesce(public.extract_action_cigarette_butts_metadata(p_notes), '{}'::jsonb),
    '{cigaretteButtsMeasurements,cigaretteButtsLotResults}',
    p_lot_results,
    true
  )::text as value
), clean_notes as (
  select regexp_replace(
    coalesce(p_notes, ''),
    '(?mi)^\[cmm-meta\].*(\r?\n|$)',
    '',
    'g'
  ) as value
)
select '[cmm-meta]' || metadata.value ||
  case when btrim(clean_notes.value) = '' then '' else E'\n' || btrim(clean_notes.value) end
from metadata cross join clean_notes;
$$;

revoke all on function public.merge_public_impact_current_butt_lot_results(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.merge_public_impact_current_butt_lot_results(text, jsonb)
  to service_role;

create or replace function public.project_public_impact_action_with_current_butt_projection(
  p_action public.actions
)
returns public.actions
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select case
  when projection.projected_count is null then p_action
  when projection.projected_lot_results is not null then
    jsonb_populate_record(
      p_action,
      jsonb_build_object(
        'cigarette_butts', projection.projected_count,
        'notes', public.merge_public_impact_current_butt_lot_results(
          p_action.notes,
          projection.projected_lot_results
        )
      )
    )
  else jsonb_populate_record(
    p_action,
    jsonb_build_object('cigarette_butts', projection.projected_count)
  )
end
from (select p_action) as source_action
left join public.public_impact_action_cigarette_butt_projections projection
  on projection.action_id = p_action.id
 and projection.source_updated_at = p_action.updated_at
 and projection.projection_version = public.current_public_impact_projection_version();
$$;

revoke all on function public.project_public_impact_action_with_current_butt_projection(public.actions)
  from public, anon, authenticated;
grant execute on function public.project_public_impact_action_with_current_butt_projection(public.actions)
  to service_role;

alter function public.build_public_impact_action_contribution(public.actions)
  rename to build_public_impact_action_contribution_from_historical;

create function public.build_public_impact_action_contribution(
  p_action public.actions
)
returns public.public_impact_action_contributions
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select public.build_public_impact_action_contribution_from_historical(
  public.project_public_impact_action_with_current_butt_projection(p_action)
);
$$;

revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions)
  to service_role;

create or replace function public.assert_public_impact_current_butt_projections()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.actions a
    cross join lateral public.extract_action_cigarette_butts_metadata(a.notes) as metadata(value)
    where jsonb_typeof(metadata.value->'cigaretteButtsMeasurements'->'cigaretteButtsLots') = 'array'
      and jsonb_array_length(
        case when jsonb_typeof(metadata.value->'cigaretteButtsMeasurements'->'cigaretteButtsLots') = 'array'
          then metadata.value->'cigaretteButtsMeasurements'->'cigaretteButtsLots'
          else '[]'::jsonb
        end
      ) > 0
      and not exists (
        select 1
        from public.public_impact_action_cigarette_butt_projections projection
        where projection.action_id = a.id
          and projection.source_updated_at = a.updated_at
          and projection.projection_version = public.current_public_impact_projection_version()
      )
  ) then
    raise exception 'Current cigarette-butt lot projections are incomplete; synchronize the canonical TypeScript projections first';
  end if;
end;
$$;

revoke all on function public.assert_public_impact_current_butt_projections()
  from public, anon, authenticated;
grant execute on function public.assert_public_impact_current_butt_projections()
  to service_role;

alter function public.rebuild_public_impact_action_state(date, text)
  rename to rebuild_public_impact_action_state_from_historical;
alter function public.advance_public_impact_action_state(date, text)
  rename to advance_public_impact_action_state_from_historical;

create function public.rebuild_public_impact_action_state(
  p_floor_date date,
  p_methodology_version text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.assert_public_impact_current_butt_projections();
  perform public.rebuild_public_impact_action_state_from_historical(
    p_floor_date,
    p_methodology_version
  );
end;
$$;

create function public.advance_public_impact_action_state(
  p_floor_date date,
  p_methodology_version text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.assert_public_impact_current_butt_projections();
  perform public.advance_public_impact_action_state_from_historical(
    p_floor_date,
    p_methodology_version
  );
end;
$$;

create function public.rebuild_public_impact_action_state(
  p_floor_date date,
  p_methodology_version text,
  p_projection_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.upsert_public_impact_action_cigarette_butt_projections(p_projection_rows);
  perform public.rebuild_public_impact_action_state(p_floor_date, p_methodology_version);
end;
$$;

create function public.advance_public_impact_action_state(
  p_floor_date date,
  p_methodology_version text,
  p_projection_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.upsert_public_impact_action_cigarette_butt_projections(p_projection_rows);
  perform public.advance_public_impact_action_state(p_floor_date, p_methodology_version);
end;
$$;

revoke all on function public.rebuild_public_impact_action_state(date, text)
  from public, anon, authenticated;
grant execute on function public.rebuild_public_impact_action_state(date, text)
  to service_role;
revoke all on function public.advance_public_impact_action_state(date, text)
  from public, anon, authenticated;
grant execute on function public.advance_public_impact_action_state(date, text)
  to service_role;
revoke all on function public.rebuild_public_impact_action_state(date, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.rebuild_public_impact_action_state(date, text, jsonb)
  to service_role;
revoke all on function public.advance_public_impact_action_state(date, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.advance_public_impact_action_state(date, text, jsonb)
  to service_role;

create or replace function public.current_public_impact_projection_version()
returns text
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select 'impact-terrain-public-2026.09-v7'::text;
$$;

revoke all on function public.current_public_impact_projection_version()
  from public, anon, authenticated;
grant execute on function public.current_public_impact_projection_version()
  to service_role;

alter table public.public_impact_action_contributions
  alter column methodology_version set default public.current_public_impact_projection_version();
alter table public.public_impact_action_aggregate_state
  alter column methodology_version set default public.current_public_impact_projection_version();

-- The old state is intentionally made unavailable until the canonical
-- TypeScript projection rows have been supplied by the next maintenance call.
update public.public_impact_action_aggregate_state
set initialized_at = null,
    methodology_version = public.current_public_impact_projection_version(),
    updated_at = now()
where state_id = true;
