-- PURPOSE: repair the executable territorial legend RPC contract without
--          rewriting the already published reward migration semantics.
-- CALLER: server-side daily/event reconciliation with service_role only.
-- AUTHORIZATION_BOUNDARY: clients cannot read or write either private table or RPC.
-- IDEMPOTENCY: additive column guard and CREATE OR REPLACE RPC definitions.
-- ATOMICITY: the snapshot and historical correction keep their existing locks.
-- FAILURE_BEHAVIOR: malformed snapshots and non-service callers fail closed.
-- SEARCH_PATH: fixed for SECURITY DEFINER.
-- GRANTS: service_role only.

alter table if exists public.territorial_legend_award_proofs
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.reconcile_territorial_legend_snapshot(
  p_effective_on date,
  p_winners jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_winner record;
  v_hold record;
  v_period_id bigint;
  v_started_on date;
  v_last_verified_on date;
  v_days integer;
  v_threshold integer;
  v_affected_users text[] := '{}';
  v_closed_users text[] := '{}';
  v_inserted_proofs integer := 0;
  v_row_count integer := 0;
  v_extended_periods integer := 0;
  v_closed_periods integer := 0;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_effective_on is null or p_effective_on > (now() at time zone 'Europe/Paris')::date then
    raise exception 'effective date must be a non-future civil date';
  end if;
  if jsonb_typeof(coalesce(p_winners, '[]'::jsonb)) <> 'array' then
    raise exception 'winner snapshot must be a JSON array';
  end if;

  -- The TypeScript boundary serializes snake_case keys. Every closure check
  -- uses the same keys as jsonb_to_recordset so membership cannot drift.
  perform pg_advisory_xact_lock(hashtextextended('territorial-legends:global', 0));
  perform pg_advisory_xact_lock(hashtextextended('territorial-legends:' || p_effective_on::text, 0));

  select coalesce(array_agg(distinct h.user_id), '{}')
    into v_closed_users
    from public.territorial_legend_hold_periods h
   where h.validity_status = 'active'
     and not exists (
       select 1
         from jsonb_array_elements(coalesce(p_winners, '[]'::jsonb)) item
        where item ->> 'user_id' = h.user_id
          and item ->> 'level' = h.level
          and item ->> 'territory_code' = h.territory_code
     );

  update public.territorial_legend_hold_periods h
     set ended_on = h.last_verified_on,
         validity_status = 'closed',
         updated_at = clock_timestamp()
   where h.validity_status = 'active'
     and not exists (
       select 1
         from jsonb_array_elements(coalesce(p_winners, '[]'::jsonb)) item
        where item ->> 'user_id' = h.user_id
          and item ->> 'level' = h.level
          and item ->> 'territory_code' = h.territory_code
     );
  get diagnostics v_closed_periods = row_count;
  v_affected_users := v_closed_users;

  for v_winner in
    select * from jsonb_to_recordset(coalesce(p_winners, '[]'::jsonb)) as winner(
      user_id text,
      level text,
      territory_code text,
      territory_label text,
      effective_on date,
      score integer,
      rank integer,
      tie_size integer,
      source_fingerprint text
    )
  loop
    if v_winner.user_id is null or btrim(v_winner.user_id) = ''
      or v_winner.level is null or v_winner.territory_code is null
      or v_winner.territory_label is null or v_winner.source_fingerprint is null
      or v_winner.effective_on is null or v_winner.score is null
      or v_winner.rank is null or v_winner.tie_size is null
      or v_winner.effective_on is distinct from p_effective_on
      or v_winner.rank <> 1 or v_winner.score < 2 or v_winner.tie_size < 1 then
      raise exception 'invalid territorial winner snapshot';
    end if;
    if not (v_winner.user_id = any(v_affected_users)) then
      v_affected_users := array_append(v_affected_users, v_winner.user_id);
    end if;

    select h.*
      into v_hold
      from public.territorial_legend_hold_periods h
     where h.user_id = v_winner.user_id
       and h.level = v_winner.level
       and h.territory_code = v_winner.territory_code
       and h.validity_status = 'active'
     for update;

    if not found then
      insert into public.territorial_legend_hold_periods (
        user_id, level, territory_code, territory_label, started_on,
        last_verified_on, validity_status, source_fingerprint, updated_at
      ) values (
        v_winner.user_id, v_winner.level, v_winner.territory_code,
        v_winner.territory_label, p_effective_on, p_effective_on, 'active',
        v_winner.source_fingerprint, clock_timestamp()
      ) returning id, started_on, last_verified_on into v_period_id, v_started_on, v_last_verified_on;
    elsif v_hold.last_verified_on = p_effective_on - 1 or v_hold.last_verified_on = p_effective_on then
      update public.territorial_legend_hold_periods
         set last_verified_on = greatest(last_verified_on, p_effective_on),
             territory_label = v_winner.territory_label,
             source_fingerprint = v_winner.source_fingerprint,
             updated_at = clock_timestamp()
       where id = v_hold.id;
      v_period_id := v_hold.id;
      v_started_on := v_hold.started_on;
      v_last_verified_on := greatest(v_hold.last_verified_on, p_effective_on);
      v_extended_periods := v_extended_periods + 1;
    else
      update public.territorial_legend_hold_periods
         set ended_on = last_verified_on,
             validity_status = 'closed',
             updated_at = clock_timestamp()
       where id = v_hold.id;
      v_closed_periods := v_closed_periods + 1;
      insert into public.territorial_legend_hold_periods (
        user_id, level, territory_code, territory_label, started_on,
        last_verified_on, validity_status, source_fingerprint, updated_at
      ) values (
        v_winner.user_id, v_winner.level, v_winner.territory_code,
        v_winner.territory_label, p_effective_on, p_effective_on, 'active',
        v_winner.source_fingerprint, clock_timestamp()
      ) returning id, started_on, last_verified_on into v_period_id, v_started_on, v_last_verified_on;
    end if;

    insert into public.territorial_legend_award_proofs (
      proof_id, user_id, level, territory_code, award_kind, threshold_days,
      hold_period_id, hold_started_on, held_through_on, awarded_on,
      valid_from, validity_status, source_fingerprint, updated_at
    ) values (
      v_winner.user_id || ':' || v_winner.level || ':' || v_winner.territory_code || ':conquest:0',
      v_winner.user_id, v_winner.level, v_winner.territory_code, 'conquest', 0,
      v_period_id, v_started_on, v_last_verified_on, p_effective_on,
      p_effective_on, 'active', v_winner.source_fingerprint, clock_timestamp()
    ) on conflict (user_id, level, territory_code, award_kind, threshold_days) do nothing;
    get diagnostics v_row_count = row_count;
    v_inserted_proofs := v_inserted_proofs + v_row_count;

    v_days := v_last_verified_on - v_started_on + 1;
    foreach v_threshold in array[7, 30, 90, 180, 365, 730] loop
      if v_days >= v_threshold then
        insert into public.territorial_legend_award_proofs (
          proof_id, user_id, level, territory_code, award_kind, threshold_days,
          hold_period_id, hold_started_on, held_through_on, awarded_on,
          valid_from, validity_status, source_fingerprint, updated_at
        ) values (
          v_winner.user_id || ':' || v_winner.level || ':' || v_winner.territory_code || ':longevity:' || v_threshold,
          v_winner.user_id, v_winner.level, v_winner.territory_code, 'longevity', v_threshold,
          v_period_id, v_started_on, v_last_verified_on, p_effective_on,
          p_effective_on, 'active', v_winner.source_fingerprint, clock_timestamp()
        ) on conflict (user_id, level, territory_code, award_kind, threshold_days) do nothing;
        get diagnostics v_row_count = row_count;
        v_inserted_proofs := v_inserted_proofs + v_row_count;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'status', 'applied',
    'affectedUserIds', to_jsonb(v_affected_users),
    'insertedProofs', v_inserted_proofs,
    'extendedPeriods', v_extended_periods,
    'closedPeriods', v_closed_periods
  );
end;
$$;

revoke all on function public.reconcile_territorial_legend_snapshot(date, jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_territorial_legend_snapshot(date, jsonb) to service_role;

create or replace function public.invalidate_territorial_legend_history(
  p_hold_period_ids bigint[],
  p_proof_ids text[],
  p_invalidated_on date
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_hold_period_ids bigint[] := coalesce(p_hold_period_ids, '{}'::bigint[]);
  v_proof_ids text[] := coalesce(p_proof_ids, '{}'::text[]);
  v_hold_count integer := 0;
  v_proof_count integer := 0;
  v_affected_users text[] := '{}';
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'service_role required';
  end if;
  if p_invalidated_on is null or p_invalidated_on > (now() at time zone 'Europe/Paris')::date then
    raise exception 'invalidated date must be a non-future civil date';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('territorial-legends:global', 0));
  perform pg_advisory_xact_lock(hashtextextended('territorial-legends:correction', 0));

  select coalesce(array_agg(distinct affected.user_id), '{}'::text[])
    into v_affected_users
    from (
      select h.user_id
        from public.territorial_legend_hold_periods h
       where h.id = any(v_hold_period_ids)
      union
      select p.user_id
        from public.territorial_legend_award_proofs p
       where p.proof_id = any(v_proof_ids)
          or p.hold_period_id = any(v_hold_period_ids)
    ) affected;

  update public.territorial_legend_hold_periods
     set ended_on = coalesce(ended_on, last_verified_on),
         validity_status = 'invalidated',
         updated_at = clock_timestamp()
   where id = any(v_hold_period_ids)
     and validity_status <> 'invalidated';
  get diagnostics v_hold_count = row_count;

  update public.territorial_legend_award_proofs
     set validity_status = 'invalidated',
         valid_until = case
           when p_invalidated_on > valid_from then p_invalidated_on - 1
           else null
         end,
         updated_at = clock_timestamp()
   where validity_status = 'active'
     and (
       proof_id = any(v_proof_ids)
       or hold_period_id = any(v_hold_period_ids)
     );
  get diagnostics v_proof_count = row_count;

  return jsonb_build_object(
    'status', 'applied',
    'invalidatedHoldPeriods', v_hold_count,
    'invalidatedAwardProofs', v_proof_count,
    'affectedUserIds', to_jsonb(v_affected_users)
  );
end;
$$;

revoke all on function public.invalidate_territorial_legend_history(bigint[], text[], date) from public, anon, authenticated;
grant execute on function public.invalidate_territorial_legend_history(bigint[], text[], date) to service_role;
