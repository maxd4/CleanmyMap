-- PURPOSE: apply the source-derived Mohs progression diff atomically.
-- CALLER: server-side scientific gamification reconciliation only.
-- AUTHORIZATION_BOUNDARY: service_role only; no client role may execute this RPC.
-- IDEMPOTENCY: the caller supplies the complete locked Mohs event snapshot and stable source identities.
-- ATOMICITY: Mohs event removals, updates and inserts commit as one transaction.
-- FAILURE_BEHAVIOR: a stale snapshot returns status=conflict without partial writes.
-- SEARCH_PATH: fixed for SECURITY DEFINER.
-- GRANTS: execute is limited to service_role.

create or replace function public.apply_mohs_impact_reconciliation(
  p_user_id text,
  p_expected_events jsonb,
  p_events_to_add jsonb,
  p_events_to_update jsonb,
  p_events_to_remove bigint[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_events jsonb;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_removed integer := 0;
  v_event record;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  perform 1
    from public.progression_events pe
   where pe.user_id = p_user_id
     and pe.source_table = 'personal_impact_mohs'
   for update;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', pe.id,
        'event_type', pe.event_type,
        'source_table', pe.source_table,
        'source_id', pe.source_id,
        'status_phase', pe.status_phase,
        'weight', pe.weight,
        'xp_base', pe.xp_base,
        'xp_awarded', pe.xp_awarded,
        'occurred_on', pe.occurred_on,
        'metadata', pe.metadata
      ) order by pe.id
    ),
    '[]'::jsonb
  )
    into v_current_events
    from public.progression_events pe
   where pe.user_id = p_user_id
     and pe.source_table = 'personal_impact_mohs';

  if v_current_events is distinct from coalesce(p_expected_events, '[]'::jsonb) then
    return jsonb_build_object('status', 'conflict', 'reason', 'mohs_ledger_revision_changed');
  end if;

  if coalesce(cardinality(p_events_to_remove), 0) > 0 then
    delete from public.progression_events pe
     where pe.user_id = p_user_id
       and pe.source_table = 'personal_impact_mohs'
       and pe.id = any(p_events_to_remove);
    get diagnostics v_removed = row_count;
  end if;

  for v_event in
    select *
      from jsonb_to_recordset(coalesce(p_events_to_update, '[]'::jsonb)) as event(
        id bigint,
        event_type text,
        source_table text,
        source_id text,
        status_phase text,
        weight integer,
        xp_base numeric,
        xp_awarded numeric,
        occurred_on date,
        metadata jsonb
      )
  loop
    update public.progression_events
       set event_type = v_event.event_type,
           source_table = v_event.source_table,
           source_id = v_event.source_id,
           status_phase = v_event.status_phase,
           weight = v_event.weight,
           xp_base = v_event.xp_base,
           xp_awarded = v_event.xp_awarded,
           occurred_on = v_event.occurred_on,
           metadata = coalesce(v_event.metadata, '{}'::jsonb)
     where id = v_event.id
       and user_id = p_user_id
       and source_table = 'personal_impact_mohs';
    if not found then
      return jsonb_build_object('status', 'conflict', 'reason', 'mohs_event_removed_after_snapshot');
    end if;
    v_updated := v_updated + 1;
  end loop;

  for v_event in
    select *
      from jsonb_to_recordset(coalesce(p_events_to_add, '[]'::jsonb)) as event(
        user_id text,
        event_type text,
        source_table text,
        source_id text,
        status_phase text,
        weight integer,
        xp_base numeric,
        xp_awarded numeric,
        occurred_on date,
        metadata jsonb
      )
  loop
    insert into public.progression_events (
      user_id, event_type, source_table, source_id, status_phase,
      weight, xp_base, xp_awarded, occurred_on, metadata
    ) values (
      p_user_id, v_event.event_type, 'personal_impact_mohs', v_event.source_id,
      v_event.status_phase, v_event.weight, v_event.xp_base, v_event.xp_awarded,
      v_event.occurred_on, coalesce(v_event.metadata, '{}'::jsonb)
    );
    v_inserted := v_inserted + 1;
  end loop;

  return jsonb_build_object(
    'status', 'applied',
    'inserted', v_inserted,
    'updated', v_updated,
    'removed', v_removed
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'conflict', 'reason', 'unique_mohs_projection_conflict');
end;
$$;

revoke all on function public.apply_mohs_impact_reconciliation(text, jsonb, jsonb, jsonb, bigint[]) from public, anon, authenticated;
grant execute on function public.apply_mohs_impact_reconciliation(text, jsonb, jsonb, jsonb, bigint[]) to service_role;
