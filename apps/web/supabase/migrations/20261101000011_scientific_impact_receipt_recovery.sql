-- PURPOSE: make the scientific receipt intent durable with the Mohs mutation.
-- CALLER: server-side scientific gamification reconciliation only.
-- AUTHORIZATION_BOUNDARY: service_role only; the intent user must match p_user_id.
-- IDEMPOTENCY: the existing reconciliation id unique index keeps one pending/final row.
-- ATOMICITY: Mohs events and the pending intent commit or roll back together.
-- FAILURE_BEHAVIOR: invalid intent or receipt-journal failure rolls back the Mohs diff.
-- SEARCH_PATH: fixed for SECURITY DEFINER.
-- GRANTS: execute is limited to service_role; the published five-argument RPC is unchanged.

create or replace function public.apply_mohs_impact_reconciliation_with_receipt(
  p_user_id text,
  p_expected_events jsonb,
  p_events_to_add jsonb,
  p_events_to_update jsonb,
  p_events_to_remove bigint[],
  p_scientific_receipt_intent jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_result jsonb;
  v_impact jsonb;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  if jsonb_typeof(p_scientific_receipt_intent) <> 'object'
     or p_scientific_receipt_intent ->> 'kind' <> 'scientific_impact_reconciliation_pending'
     or p_scientific_receipt_intent ->> 'schemaVersion' <> '1'
     or p_scientific_receipt_intent ->> 'userId' <> p_user_id
     or nullif(p_scientific_receipt_intent ->> 'reconciliationId', '') is null
     or jsonb_typeof(p_scientific_receipt_intent -> 'scientificImpact') <> 'object' then
    raise exception 'invalid scientific receipt intent';
  end if;

  v_impact := p_scientific_receipt_intent -> 'scientificImpact';
  if nullif(v_impact ->> 'methodVersion', '') is null
     or v_impact ->> 'sourceFingerprint' is null
     or nullif(v_impact ->> 'eventsAdded', '') is null
     or nullif(v_impact ->> 'eventsUpdated', '') is null
     or nullif(v_impact ->> 'eventsRemoved', '') is null
     or (v_impact ->> 'eventsAdded') !~ '^[0-9]+$'
     or (v_impact ->> 'eventsUpdated') !~ '^[0-9]+$'
     or (v_impact ->> 'eventsRemoved') !~ '^[0-9]+$' then
    raise exception 'invalid scientific receipt impact';
  end if;

  v_result := public.apply_mohs_impact_reconciliation(
    p_user_id,
    p_expected_events,
    p_events_to_add,
    p_events_to_update,
    p_events_to_remove
  );

  if v_result ->> 'status' <> 'applied' then
    return v_result;
  end if;

  if (v_result ->> 'inserted') <> (v_impact ->> 'eventsAdded')
     or (v_result ->> 'updated') <> (v_impact ->> 'eventsUpdated')
     or (v_result ->> 'removed') <> (v_impact ->> 'eventsRemoved') then
    raise exception 'scientific receipt counters do not match the applied Mohs diff';
  end if;

  insert into public.app_notifications (
    user_id,
    type,
    title,
    content,
    created_at,
    seen_at,
    acknowledged_at,
    payload
  ) values (
    p_user_id,
    'gamification_reconciliation',
    'Mise à jour scientifique en préparation.',
    'La mise à jour de votre progression est en cours.',
    timezone('utc', now()),
    null,
    null,
    jsonb_build_object(
      'kind', 'scientific_impact_reconciliation_pending',
      'schemaVersion', 1,
      'reconciliationId', p_scientific_receipt_intent ->> 'reconciliationId',
      'userId', p_user_id,
      'scientificImpact', v_impact
    )
  )
  on conflict do nothing;

  return v_result;
end;
$$;

revoke all on function public.apply_mohs_impact_reconciliation_with_receipt(text, jsonb, jsonb, jsonb, bigint[], jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_mohs_impact_reconciliation_with_receipt(text, jsonb, jsonb, jsonb, bigint[], jsonb)
  to service_role;
