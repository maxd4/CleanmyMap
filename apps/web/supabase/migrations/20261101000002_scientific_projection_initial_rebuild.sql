-- SCIENTIFIC-PROJECTION-INITIAL-REBUILD-2026-11
-- PURPOSE: initialize or converge the public incremental projection after the
-- version identity migration, without touching raw observations or snapshots.
-- CALLER: migration runner during activation of v3.
-- AUTHORIZATION_BOUNDARY: the service_role-only state transition is called
-- inside the migration transaction.
-- IDEMPOTENCY: advance rebuilds when the state is absent, uninitialized, or
-- carries another methodology version; otherwise it advances the existing floor.
-- ATOMICITY: the existing public-impact advisory lock and transaction protect
-- the complete rebuild and counter updates.
-- FAILURE_BEHAVIOR: any error aborts the migration transaction and leaves the
-- prior projection untouched for a retry.
-- SEARCH_PATH: no unqualified application object is introduced.
-- GRANTS: no grants are changed; the called RPC remains service_role-only.

do $$
declare
  v_floor_date date;
begin
  select greatest(
    current_date - 365,
    coalesce(floor_date, current_date - 365)
  )
  into v_floor_date
  from public.public_impact_action_aggregate_state
  where state_id = true;

  v_floor_date := coalesce(v_floor_date, current_date - 365);

  perform public.advance_public_impact_action_state(
    v_floor_date,
    public.current_public_impact_projection_version()
  );
end;
$$;
