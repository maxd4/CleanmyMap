-- PURPOSE: repair inherited annual reward identities and close seasons only
--          after the previous Europe/Paris civil year is complete.
-- CALLER: server-side daily/event reconciliation with service_role only.
-- AUTHORIZATION_BOUNDARY: clients cannot read or write the private reward tables or RPC.
-- IDEMPOTENCY: forward-only constraint/index repair plus an idempotent RPC.
-- ATOMICITY: the existing global/civil-day advisory locks serialize closure and awards.
-- FAILURE_BEHAVIOR: an unverified 31 December never creates a season_end proof;
--                   a concurrent or invalid source remains outside the award set.
-- HISTORY: null campaign_year archives remain untouched and non-competitive.
-- SEARCH_PATH: fixed for SECURITY DEFINER.
-- GRANTS: service_role only.

drop index if exists public.territorial_legend_award_identity;

create unique index if not exists territorial_legend_award_legacy_identity
  on public.territorial_legend_award_proofs(user_id, level, territory_code, award_kind, threshold_days)
  where campaign_year is null;

-- The first migration used generated constraint names. Inspect pg_constraint
-- instead of assuming those names so every inherited award_kind check is removed.
do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
      from pg_constraint
     where conrelid = 'public.territorial_legend_award_proofs'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%award_kind%'
  loop
    execute format(
      'alter table public.territorial_legend_award_proofs drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$$;

alter table public.territorial_legend_award_proofs
  drop constraint if exists territorial_legend_award_proofs_annual_kind_check;
alter table public.territorial_legend_award_proofs
  add constraint territorial_legend_award_proofs_annual_kind_check
  check (
    (
      campaign_year is null
      and (
        (award_kind = 'conquest' and threshold_days = 0)
        or (award_kind = 'longevity' and threshold_days in (7, 30, 90, 180, 365, 730))
      )
    )
    or (
      campaign_year is not null
      and (
        (award_kind = 'conquest' and threshold_days = 0)
        or (award_kind = 'longevity' and threshold_days in (7, 30, 90, 180))
        or (award_kind = 'season_end' and threshold_days = 0)
      )
    )
  );

-- A previous version could have issued an active season_end proof on 31
-- December. Preserve that row for audit, but do not leave it CURRENT; the
-- closure query below can restore the same identity only after verification.
update public.territorial_legend_award_proofs
   set validity_status = 'invalidated',
       valid_until = coalesce(valid_until, awarded_on),
       updated_at = clock_timestamp()
 where campaign_year is not null
   and award_kind = 'season_end'
   and validity_status = 'active'
   and awarded_on = make_date(campaign_year, 12, 31);

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
  v_previous_campaign_end date;
  v_days integer;
  v_threshold integer;
  v_campaign_year integer;
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

  v_campaign_year := extract(year from p_effective_on)::integer;

  perform pg_advisory_xact_lock(hashtextextended('territorial-legends:global', 0));
  perform pg_advisory_xact_lock(hashtextextended('territorial-legends:' || p_effective_on::text, 0));

  -- A missed 31 December is recoverable only after that civil year has ended.
  -- The last verified day must be exactly 31 December: no missing day is inferred.
  if v_campaign_year > 1 then
    v_previous_campaign_end := make_date(v_campaign_year - 1, 12, 31);
    if p_effective_on > v_previous_campaign_end then
      insert into public.territorial_legend_award_proofs (
        proof_id, user_id, campaign_year, level, territory_code, award_kind, threshold_days,
        hold_period_id, hold_started_on, held_through_on, awarded_on,
        valid_from, validity_status, source_fingerprint, updated_at
      )
      select
        h.user_id || ':' || h.level || ':' || h.campaign_year || ':' || h.territory_code || ':season_end:0',
        h.user_id, h.campaign_year, h.level, h.territory_code, 'season_end', 0,
        h.id, h.started_on, h.last_verified_on, p_effective_on,
        p_effective_on, 'active', h.source_fingerprint, clock_timestamp()
        from public.territorial_legend_hold_periods h
       where h.campaign_year = v_campaign_year - 1
         and h.last_verified_on = v_previous_campaign_end
         and h.validity_status in ('active', 'closed')
      on conflict (proof_id) do update
        set hold_period_id = excluded.hold_period_id,
            hold_started_on = excluded.hold_started_on,
            held_through_on = excluded.held_through_on,
            awarded_on = excluded.awarded_on,
            valid_from = excluded.valid_from,
            valid_until = excluded.valid_until,
            validity_status = excluded.validity_status,
            source_fingerprint = excluded.source_fingerprint,
            updated_at = excluded.updated_at
       where public.territorial_legend_award_proofs.validity_status = 'invalidated'
         and public.territorial_legend_award_proofs.awarded_on = make_date(public.territorial_legend_award_proofs.campaign_year, 12, 31);
      get diagnostics v_row_count = row_count;
      v_inserted_proofs := v_inserted_proofs + v_row_count;
    end if;
  end if;

  select coalesce(array_agg(distinct h.user_id), '{}')
    into v_closed_users
    from public.territorial_legend_hold_periods h
   where h.validity_status = 'active'
     and (
       h.campaign_year is distinct from v_campaign_year
       or not exists (
         select 1
           from jsonb_array_elements(coalesce(p_winners, '[]'::jsonb)) item
          where item ->> 'user_id' = h.user_id
            and item ->> 'campaign_year' = v_campaign_year::text
            and item ->> 'level' = h.level
            and item ->> 'territory_code' = h.territory_code
       )
     );

  update public.territorial_legend_hold_periods h
     set ended_on = h.last_verified_on,
         validity_status = 'closed',
         updated_at = clock_timestamp()
   where h.validity_status = 'active'
     and (
       h.campaign_year is distinct from v_campaign_year
       or not exists (
         select 1
           from jsonb_array_elements(coalesce(p_winners, '[]'::jsonb)) item
          where item ->> 'user_id' = h.user_id
            and item ->> 'campaign_year' = v_campaign_year::text
            and item ->> 'level' = h.level
            and item ->> 'territory_code' = h.territory_code
       )
     );
  get diagnostics v_closed_periods = row_count;
  v_affected_users := v_closed_users;

  for v_winner in
    select * from jsonb_to_recordset(coalesce(p_winners, '[]'::jsonb)) as winner(
      user_id text,
      campaign_year integer,
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
      or v_winner.campaign_year is null
      or v_winner.level is null or v_winner.territory_code is null
      or v_winner.territory_label is null or v_winner.source_fingerprint is null
      or v_winner.effective_on is null or v_winner.score is null
      or v_winner.rank is null or v_winner.tie_size is null
      or v_winner.campaign_year <> v_campaign_year
      or v_winner.effective_on is distinct from p_effective_on
      or v_winner.rank <> 1 or v_winner.score < 2 or v_winner.tie_size < 1 then
      raise exception 'invalid annual territorial winner snapshot';
    end if;
    if not (v_winner.user_id = any(v_affected_users)) then
      v_affected_users := array_append(v_affected_users, v_winner.user_id);
    end if;

    select h.* into v_hold
      from public.territorial_legend_hold_periods h
     where h.user_id = v_winner.user_id
       and h.campaign_year = v_winner.campaign_year
       and h.level = v_winner.level
       and h.territory_code = v_winner.territory_code
       and h.validity_status = 'active'
     for update;

    if not found then
      insert into public.territorial_legend_hold_periods (
        user_id, campaign_year, level, territory_code, territory_label, started_on,
        last_verified_on, validity_status, source_fingerprint, updated_at
      ) values (
        v_winner.user_id, v_winner.campaign_year, v_winner.level, v_winner.territory_code,
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
         set ended_on = last_verified_on, validity_status = 'closed', updated_at = clock_timestamp()
       where id = v_hold.id;
      v_closed_periods := v_closed_periods + 1;
      insert into public.territorial_legend_hold_periods (
        user_id, campaign_year, level, territory_code, territory_label, started_on,
        last_verified_on, validity_status, source_fingerprint, updated_at
      ) values (
        v_winner.user_id, v_winner.campaign_year, v_winner.level, v_winner.territory_code,
        v_winner.territory_label, p_effective_on, p_effective_on, 'active',
        v_winner.source_fingerprint, clock_timestamp()
      ) returning id, started_on, last_verified_on into v_period_id, v_started_on, v_last_verified_on;
    end if;

    insert into public.territorial_legend_award_proofs (
      proof_id, user_id, campaign_year, level, territory_code, award_kind, threshold_days,
      hold_period_id, hold_started_on, held_through_on, awarded_on,
      valid_from, validity_status, source_fingerprint, updated_at
    ) values (
      v_winner.user_id || ':' || v_winner.level || ':' || v_winner.campaign_year || ':*:conquest:0',
      v_winner.user_id, v_winner.campaign_year, v_winner.level, v_winner.territory_code,
      'conquest', 0, v_period_id, v_started_on, v_last_verified_on, p_effective_on,
      p_effective_on, 'active', v_winner.source_fingerprint, clock_timestamp()
    ) on conflict do nothing;
    get diagnostics v_row_count = row_count;
    v_inserted_proofs := v_inserted_proofs + v_row_count;

    v_days := v_last_verified_on - v_started_on + 1;
    if v_days < 1 or v_days > 366 then raise exception 'territorial hold exceeds one annual campaign'; end if;
    foreach v_threshold in array array[7, 30, 90, 180] loop
      if v_days >= v_threshold then
        insert into public.territorial_legend_award_proofs (
          proof_id, user_id, campaign_year, level, territory_code, award_kind, threshold_days,
          hold_period_id, hold_started_on, held_through_on, awarded_on,
          valid_from, validity_status, source_fingerprint, updated_at
        ) values (
          v_winner.user_id || ':' || v_winner.level || ':' || v_winner.campaign_year || ':' || v_winner.territory_code || ':longevity:' || v_threshold,
          v_winner.user_id, v_winner.campaign_year, v_winner.level, v_winner.territory_code,
          'longevity', v_threshold, v_period_id, v_started_on, v_last_verified_on, p_effective_on,
          p_effective_on, 'active', v_winner.source_fingerprint, clock_timestamp()
        ) on conflict do nothing;
        get diagnostics v_row_count = row_count;
        v_inserted_proofs := v_inserted_proofs + v_row_count;
      end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'status', 'applied', 'campaignYear', v_campaign_year,
    'affectedUserIds', to_jsonb(v_affected_users), 'insertedProofs', v_inserted_proofs,
    'extendedPeriods', v_extended_periods, 'closedPeriods', v_closed_periods
  );
end;
$$;

revoke all on function public.reconcile_territorial_legend_snapshot(date, jsonb) from public, anon, authenticated;
grant execute on function public.reconcile_territorial_legend_snapshot(date, jsonb) to service_role;
