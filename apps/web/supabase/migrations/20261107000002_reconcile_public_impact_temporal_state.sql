-- PURPOSE: reconcile the derived public Impact state after the temporal
--          eligibility column was introduced with a false default.
-- CALLER: the one-time forward-only migration transaction after
--         20261107000001_public_impact_temporal_eligibility.sql.
-- AUTHORIZATION_BOUNDARY: this migration invokes service-only projection RPCs;
--                         no browser role gains access and source actions are
--                         never updated or deleted.
-- IDEMPOTENCY: reconstruction clears and rebuilds only derived contributions,
--              counters and distributions from the canonical action snapshots.
-- ATOMICITY: the canonical advisory lock and aggregate row lock cover the
--            complete reconciliation, so no temporal transition can interleave.
-- FAILURE_BEHAVIOR: an uninitialized state is left untouched for the existing
--                   maintenance rebuild path; a rebuild error aborts the
--                   migration transaction without partial derived state.
-- SEARCH_PATH: the invoked SECURITY DEFINER functions pin pg_catalog, public.
-- GRANTS: no grants are added.

do $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('cleanmymap.public-impact-action-state', 0)
  );

  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true
  for update;

  if found and v_state.initialized_at is not null then
    -- This is a governed reconstruction of derived state, not an incremental
    -- addition. It re-derives eligible_temporal and every dependent counter
    -- from the canonical snapshot-backed contribution builder exactly once.
    perform public.rebuild_public_impact_action_state(
      v_state.floor_date,
      v_state.methodology_version
    );
  end if;
end;
$$;
