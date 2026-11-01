-- PUBLIC-IMPACT-BUTT-CONDITION-DISTRIBUTION-REBUILD-2026-11
-- PURPOSE: converge the already deployed incremental state with the v5
-- per-condition contribution contract after the append-only schema change.
-- CALLER: migration runner; the existing maintenance RPC remains the owner.
-- AUTHORIZATION_BOUNDARY: no raw action or historical snapshot is rewritten.
-- IDEMPOTENCY: advance rebuilds only when the persisted methodology identity
-- differs and is safe to retry in a transaction.
-- ATOMICITY: the called RPC takes the existing public-impact advisory lock.

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
