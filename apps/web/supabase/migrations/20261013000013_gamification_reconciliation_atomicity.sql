-- PURPOSE: Apply one CURRENT gamification reconciliation atomically.
-- CALLER: server-side reconciliation and administrative backfill only.
-- AUTHORIZATION_BOUNDARY: service_role only; no client role may execute this RPC.
-- IDEMPOTENCY: the caller supplies the complete ledger snapshot and deterministic receipt id.
-- ATOMICITY: ledger projection, profile projection, level notification and receipt commit together.
-- FAILURE_BEHAVIOR: a stale snapshot returns status=conflict without partial writes.
-- SEARCH_PATH: fixed for SECURITY DEFINER.
-- GRANTS: execute is limited to service_role.

create or replace function public.apply_gamification_reconciliation(
  p_user_id text,
  p_expected_events jsonb,
  p_events_to_add jsonb,
  p_events_to_update jsonb,
  p_events_to_remove bigint[],
  p_expected_profile_updated_at timestamptz,
  p_profile_update jsonb default null,
  p_receipt jsonb default null,
  p_level_up jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current_events jsonb;
  v_profile_updated_at timestamptz;
  v_profile_exists boolean;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_removed integer := 0;
  v_event record;
begin
  -- The grant is the primary boundary. Keep a claim check here as a second
  -- guard because this is a SECURITY DEFINER function.
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  -- Transaction-scoped coordination works across all server instances that
  -- use this database. It is intentionally not an application-memory lock.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  if p_profile_update is not null then
    select pp.updated_at
      into v_profile_updated_at
      from public.progression_profiles pp
     where pp.user_id = p_user_id
     for update;
    v_profile_exists := found;

    if p_expected_profile_updated_at is null then
      if v_profile_exists then
        return jsonb_build_object('status', 'conflict', 'reason', 'profile_created_after_snapshot');
      end if;
    elsif not v_profile_exists or v_profile_updated_at is distinct from p_expected_profile_updated_at then
      return jsonb_build_object('status', 'conflict', 'reason', 'profile_revision_changed');
    end if;
  end if;

  -- Lock the rows before taking the comparison snapshot. The JSONB equality
  -- check covers additions, updates and removals made by another writer.
  perform 1
    from public.progression_events pe
   where pe.user_id = p_user_id
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
   where pe.user_id = p_user_id;

  if v_current_events is distinct from coalesce(p_expected_events, '[]'::jsonb) then
    return jsonb_build_object('status', 'conflict', 'reason', 'ledger_revision_changed');
  end if;

  if coalesce(cardinality(p_events_to_remove), 0) > 0 then
    delete from public.progression_events pe
     where pe.user_id = p_user_id
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
       and user_id = p_user_id;
    if not found then
      return jsonb_build_object('status', 'conflict', 'reason', 'event_removed_after_snapshot');
    end if;
    v_updated := v_updated + 1;
  end loop;

  for v_event in
    select *
      from jsonb_to_recordset(coalesce(p_events_to_add, '[]'::jsonb)) as event(
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
      user_id,
      event_type,
      source_table,
      source_id,
      status_phase,
      weight,
      xp_base,
      xp_awarded,
      occurred_on,
      metadata
    ) values (
      p_user_id,
      v_event.event_type,
      v_event.source_table,
      v_event.source_id,
      v_event.status_phase,
      v_event.weight,
      v_event.xp_base,
      v_event.xp_awarded,
      v_event.occurred_on,
      coalesce(v_event.metadata, '{}'::jsonb)
    );
    v_inserted := v_inserted + 1;
  end loop;

  if p_profile_update is not null then
    insert into public.progression_profiles (
      user_id,
      xp_total,
      xp_pending,
      xp_validated,
      current_level,
      potential_level,
      current_applied_rules_revision,
      updated_at
    ) values (
      p_user_id,
      (p_profile_update ->> 'xp_total')::numeric,
      (p_profile_update ->> 'xp_pending')::numeric,
      (p_profile_update ->> 'xp_validated')::numeric,
      (p_profile_update ->> 'current_level')::integer,
      (p_profile_update ->> 'potential_level')::integer,
      (p_profile_update ->> 'current_applied_rules_revision')::integer,
      clock_timestamp()
    )
    on conflict (user_id) do update set
      xp_total = excluded.xp_total,
      xp_pending = excluded.xp_pending,
      xp_validated = excluded.xp_validated,
      current_level = excluded.current_level,
      potential_level = excluded.potential_level,
      current_applied_rules_revision = excluded.current_applied_rules_revision,
      updated_at = excluded.updated_at;
  end if;

  if p_level_up is not null then
    insert into public.app_notifications (
      user_id,
      type,
      title,
      content,
      payload,
      created_at
    )
    select
      p_user_id,
      'system',
      'Niveau Supérieur ! 🏆',
      format('Félicitations ! Vous avez atteint le niveau %s. Votre impact sur CleanMyMap grandit !', p_level_up ->> 'newLevel'),
      jsonb_build_object(
        'kind', 'gamification_level_up',
        'oldLevel', (p_level_up ->> 'oldLevel')::integer,
        'newLevel', (p_level_up ->> 'newLevel')::integer,
        'reconciliationId', p_level_up ->> 'reconciliationId'
      ),
      clock_timestamp()
    where not exists (
      select 1
        from public.app_notifications n
       where n.user_id = p_user_id
         and n.type = 'system'
         and n.payload ->> 'kind' = 'gamification_level_up'
         and n.payload ->> 'reconciliationId' = p_level_up ->> 'reconciliationId'
    );
  end if;

  if p_receipt is not null and coalesce((p_receipt ->> 'hasUserVisibleChanges')::boolean, false) then
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
      'Votre progression CleanMyMap a été mise à jour.',
      'Voir les changements sur la page Gamification.',
      (p_receipt ->> 'occurredAt')::timestamptz,
      null,
      null,
      jsonb_build_object(
        'kind', 'gamification_reconciliation_receipt',
        'schemaVersion', 2,
        'reconciliationId', p_receipt ->> 'reconciliationId',
        'receipt', p_receipt
      )
    ) on conflict do nothing;
  end if;

  return jsonb_build_object(
    'status', 'applied',
    'inserted', v_inserted,
    'updated', v_updated,
    'removed', v_removed
  );
exception
  when unique_violation then
    return jsonb_build_object('status', 'conflict', 'reason', 'unique_projection_conflict');
end;
$$;

revoke all on function public.apply_gamification_reconciliation(text, jsonb, jsonb, jsonb, bigint[], timestamptz, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.apply_gamification_reconciliation(text, jsonb, jsonb, jsonb, bigint[], timestamptz, jsonb, jsonb, jsonb) to service_role;

-- Profile refreshes triggered by ordinary progression writes use the same
-- database coordination. Their totals are recomputed inside the transaction,
-- so an older server response cannot overwrite a newer ledger projection.
create or replace function public.refresh_gamification_profile(
  p_user_id text,
  p_expected_updated_at timestamptz,
  p_current_level integer,
  p_potential_level integer,
  p_current_applied_rules_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_updated_at timestamptz;
  v_profile_exists boolean;
  v_previous_level integer := 1;
  v_xp_total numeric;
  v_xp_pending numeric;
  v_xp_validated numeric;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  select pp.current_level, pp.updated_at
    into v_previous_level, v_updated_at
    from public.progression_profiles pp
   where pp.user_id = p_user_id
   for update;
  v_profile_exists := found;
  v_previous_level := coalesce(v_previous_level, 1);

  if p_expected_updated_at is null then
    if v_profile_exists then
      return jsonb_build_object('status', 'conflict', 'reason', 'profile_created_after_snapshot');
    end if;
  elsif not v_profile_exists or v_updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object('status', 'conflict', 'reason', 'profile_revision_changed');
  end if;

  select
    coalesce(sum(pe.xp_awarded), 0),
    coalesce(sum(pe.xp_awarded) filter (where pe.status_phase = 'pending'), 0),
    coalesce(sum(pe.xp_awarded) filter (where pe.status_phase = 'validated'), 0)
    into v_xp_total, v_xp_pending, v_xp_validated
    from public.progression_events pe
   where pe.user_id = p_user_id;

  insert into public.progression_profiles (
    user_id,
    xp_total,
    xp_pending,
    xp_validated,
    current_level,
    potential_level,
    current_applied_rules_revision,
    updated_at
  ) values (
    p_user_id,
    v_xp_total,
    v_xp_pending,
    v_xp_validated,
    p_current_level,
    p_potential_level,
    p_current_applied_rules_revision,
    clock_timestamp()
  )
  on conflict (user_id) do update set
    xp_total = excluded.xp_total,
    xp_pending = excluded.xp_pending,
    xp_validated = excluded.xp_validated,
    current_level = excluded.current_level,
    potential_level = excluded.potential_level,
    current_applied_rules_revision = excluded.current_applied_rules_revision,
    updated_at = excluded.updated_at;

  return jsonb_build_object('status', 'applied', 'previous_level', v_previous_level);
end;
$$;

revoke all on function public.refresh_gamification_profile(text, timestamptz, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.refresh_gamification_profile(text, timestamptz, integer, integer, integer) to service_role;
