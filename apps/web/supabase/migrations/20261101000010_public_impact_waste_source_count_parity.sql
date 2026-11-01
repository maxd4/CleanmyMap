-- PURPOSE: derive public waste coverage from the canonical contribution population.
-- CALLER: service_role through the existing public landing summary RPC.
-- AUTHORIZATION_BOUNDARY: keep the existing SECURITY DEFINER/service_role boundary.
-- IDEMPOTENCY: CREATE OR REPLACE changes only the RPC definition.
-- ATOMICITY: the read is a single stable aggregate over the canonical projection.
-- FAILURE_BEHAVIOR: an uninitialized aggregate state still fails closed as before.
-- SEARCH_PATH: fixed to pg_catalog, public.
-- GRANTS: preserve service_role-only execution.

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
      select jsonb_agg(jsonb_build_object('condition', b.condition, 'count', b.cigarette_butts)
        order by b.condition)
      from public.public_impact_action_butt_condition_counts b
    ), '[]'::jsonb),
    v_state.methodology_version;
end;
$$;

revoke all on function public.load_public_landing_action_summary_incremental() from public, anon, authenticated;
grant execute on function public.load_public_landing_action_summary_incremental() to service_role;
