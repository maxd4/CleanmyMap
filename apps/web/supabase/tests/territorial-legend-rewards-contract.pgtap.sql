-- Ephemeral PostgreSQL contract for the territorial legend reward migration.
-- It is executed only by the hosted Supabase replay lane after a canonical
-- migration reset; it must never target the linked or production database.

begin;
select plan(78);

set local role postgres;
create temp table territorial_legend_contract_state (
  effective_on date not null,
  first_period_id bigint,
  fact_revision timestamptz,
  fact_action_id uuid
) on commit drop;
grant select, update on territorial_legend_contract_state to service_role;
insert into territorial_legend_contract_state (effective_on)
values ((now() at time zone 'Europe/Paris')::date - 10);

delete from public.territorial_legend_award_proofs
 where user_id like 'legend-contract-%';
delete from public.territorial_legend_hold_periods
 where user_id like 'legend-contract-%';
delete from public.territorial_legend_consents
 where user_id = 'legend-consent-contract';

select ok(to_regclass('public.territorial_legend_hold_periods') is not null, 'hold periods table exists after replay');
select ok(to_regclass('public.territorial_legend_award_proofs') is not null, 'award proofs table exists after replay');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261103000002'), 'previous territorial migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261103000003'), 'repaired territorial migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261103000004'), 'forward contract migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261104000001'), 'annual campaign migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261104000002'), 'consent hardening migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261104000007'), 'annual integrity migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261105000014'), 'monotone fact revision migration is registered');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

update territorial_legend_contract_state
   set fact_revision = public.get_territorial_legend_fact_revision();
do $$
declare
  v_action_id uuid;
begin
  insert into public.actions (created_by_clerk_id, action_date, location_label, status)
  values ('legend-contract-fact', current_date, 'Fact revision contract', 'approved')
  returning id into v_action_id;
  insert into public.action_participants (action_id, user_id)
  values (v_action_id, 'legend-contract-fact-user');
  update territorial_legend_contract_state set fact_action_id = v_action_id;
end;
$$;
select ok(
  public.get_territorial_legend_fact_revision() > (select fact_revision from territorial_legend_contract_state),
  'canonical revision advances after a fact insert'
);
update territorial_legend_contract_state set fact_revision = public.get_territorial_legend_fact_revision();
update public.actions
   set notes = 'later non-participant fact'
 where id = (select fact_action_id from territorial_legend_contract_state);
update territorial_legend_contract_state set fact_revision = public.get_territorial_legend_fact_revision();
delete from public.action_participants
 where action_id = (select fact_action_id from territorial_legend_contract_state);
select ok(
  public.get_territorial_legend_fact_revision() > (select fact_revision from territorial_legend_contract_state),
  'non-maximal fact deletion advances the canonical revision'
);

-- The legacy two-argument writer is exercised only as the migration's
-- postgres-owned implementation. The exposed service boundary below is the
-- three-argument, revision-checked wrapper.
set local role postgres;

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on from territorial_legend_contract_state),
    jsonb_build_array(
      jsonb_build_object(
        'user_id', 'legend-contract-a', 'campaign_year', extract(year from (select effective_on from territorial_legend_contract_state))::integer, 'level', 'commune',
        'territory_code', '75056', 'territory_label', 'Paris',
        'effective_on', (select effective_on from territorial_legend_contract_state),
        'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-a'
      ),
      jsonb_build_object(
        'user_id', 'legend-contract-b', 'campaign_year', extract(year from (select effective_on from territorial_legend_contract_state))::integer, 'level', 'commune',
        'territory_code', '75056', 'territory_label', 'Paris',
        'effective_on', (select effective_on from territorial_legend_contract_state),
        'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-b'
      )
    ),
    public.get_territorial_legend_fact_revision()
  )->>'status',
  'applied',
  'a two-winner snapshot is accepted with snake_case payload fields'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id like 'legend-contract-%'), 2, 'the first snapshot creates one hold per tied winner');
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id like 'legend-contract-%' and award_kind = 'conquest'), 2, 'the first snapshot creates one conquest proof per winner');

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on from territorial_legend_contract_state),
    jsonb_build_array(
      jsonb_build_object('user_id', 'legend-contract-a', 'campaign_year', extract(year from (select effective_on from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-a'),
      jsonb_build_object('user_id', 'legend-contract-b', 'campaign_year', extract(year from (select effective_on from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-b')
    )
  )->>'insertedProofs',
  '0',
  'replaying the same snapshot is idempotent'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id like 'legend-contract-%' and validity_status = 'active'), 2, 'an idempotent replay keeps both titles active');

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 2 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-a', 'campaign_year', extract(year from (select effective_on + 2 from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 2 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'contract-source-a-gap'))
  )->>'closedPeriods',
  '2',
  'an interruption closes the absent winner and the gapped period'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id like 'legend-contract-%' and validity_status = 'active'), 1, 'the interrupted snapshot leaves only the current winner active');

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 2 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-same-day', 'campaign_year', extract(year from (select effective_on + 2 from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 2 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'same-day-gain'))
  )->>'status',
  'applied',
  'same-day transition first records the title'
);
select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 2 from territorial_legend_contract_state),
    '[]'::jsonb
  )->>'status',
  'applied',
  'same-day loss is replayable without deleting the period'
);
select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 2 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-same-day', 'campaign_year', extract(year from (select effective_on + 2 from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 2 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'same-day-return'))
  )->>'status',
  'applied',
  'same-day return reuses the verified period'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id = 'legend-contract-same-day'), 1, 'same-day return does not create a duplicate hold period');
select is((select validity_status from public.territorial_legend_hold_periods where user_id = 'legend-contract-same-day'), 'active', 'same-day return leaves the period active');
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-same-day' and award_kind = 'conquest'), 1, 'same-day return does not duplicate conquest proof');
select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 2 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-same-day', 'campaign_year', extract(year from (select effective_on + 2 from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 2 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'same-day-replay'))
  )->>'status',
  'applied',
  'same-day return replay remains idempotent'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id = 'legend-contract-same-day'), 1, 'same-day replay keeps one hold period');

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 3 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-order', 'campaign_year', extract(year from (select effective_on + 3 from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 3 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'newer-state'))
  )->>'status',
  'applied',
  'newer snapshot establishes the ordering watermark'
);
select throws_ok(
  $$select public.reconcile_territorial_legend_snapshot((select effective_on + 2 from territorial_legend_contract_state), '[]'::jsonb)$$,
  'P0001',
  'snapshot is older than the last verified territorial state',
  'an older snapshot is rejected before mutation'
);
select is((select last_verified_on from public.territorial_legend_hold_periods where user_id = 'legend-contract-order'), (select effective_on + 3 from territorial_legend_contract_state), 'rejected older snapshot leaves the verified state unchanged');

do $$
declare
  v_day date;
  v_offset integer;
  v_snapshot jsonb;
begin
  select effective_on into v_day from territorial_legend_contract_state;
  v_snapshot := jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-a', 'campaign_year', extract(year from v_day)::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'contract-source-a-continuous'));
  for v_offset in 3..8 loop
    v_snapshot := jsonb_set(jsonb_set(v_snapshot, '{0,effective_on}', to_jsonb(v_day + v_offset)), '{0,campaign_year}', to_jsonb(extract(year from v_day + v_offset)::integer));
    perform public.reconcile_territorial_legend_snapshot(v_day + v_offset, v_snapshot);
  end loop;
end;
$$;

select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-a' and award_kind = 'longevity' and threshold_days = 7), 1, 'seven consecutive verified days create the exact longevity proof');
select is((select last_verified_on from public.territorial_legend_hold_periods where user_id = 'legend-contract-a' and validity_status = 'active'), (select effective_on + 8 from territorial_legend_contract_state), 'continuous holding advances only through verified days');

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 10 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-a', 'campaign_year', extract(year from (select effective_on + 10 from territorial_legend_contract_state))::integer, 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 10 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'contract-source-a-reconquest'))
  )->>'status',
  'applied',
  'a later verified title is treated as a new detention after a gap'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id = 'legend-contract-a' and validity_status = 'active'), 1, 'reconquest has one active period');
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-a' and award_kind = 'conquest'), 1, 'reconquest does not duplicate the one-shot conquest proof');

update territorial_legend_contract_state
   set first_period_id = (
     select id from public.territorial_legend_hold_periods
      where user_id = 'legend-contract-a'
        and started_on = (select effective_on from territorial_legend_contract_state)
   );
select is(
  (public.invalidate_territorial_legend_history(
    array[(select first_period_id from territorial_legend_contract_state)],
    array['legend-contract-a:commune:' || extract(year from (select effective_on from territorial_legend_contract_state))::integer || ':*:conquest:0']::text[],
    (select effective_on + 10 from territorial_legend_contract_state)
  )->>'status',
  'applied',
  'historical correction executes through the privileged RPC'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where id = (select first_period_id from territorial_legend_contract_state) and validity_status = 'invalidated'), 1, 'historical correction invalidates the selected hold period');
select is((select count(*)::integer from public.territorial_legend_award_proofs where proof_id = 'legend-contract-a:commune:' || extract(year from (select effective_on from territorial_legend_contract_state))::integer || ':*:conquest:0' and validity_status = 'invalidated'), 1, 'historical correction invalidates the selected proof');

select ok(exists (
  select 1 from information_schema.columns
   where table_schema = 'public' and table_name = 'territorial_legend_hold_periods' and column_name = 'campaign_year'
), 'hold periods persist a campaign year');
select ok(exists (
  select 1 from information_schema.columns
   where table_schema = 'public' and table_name = 'territorial_legend_award_proofs' and column_name = 'campaign_year'
), 'award proofs persist a campaign year');
select is((select count(*)::integer from pg_constraint where conrelid = 'public.territorial_legend_award_proofs'::regclass and contype = 'c' and conname = 'territorial_legend_award_proofs_annual_kind_check'), 1, 'the annual award_kind constraint is the only inherited kind gate');

-- The consent scenario runs after the current-relative reconciliation so its
-- current-day hold cannot make an earlier current snapshot look stale.
select is(
  (public.set_territorial_legend_consent('legend-consent-contract', true, '15_or_over', '2026-11-03T10:00:00Z'::timestamptz)->>'enabled'),
  'true',
  'service-only consent RPC activates an eligible server decision'
);
select is(
  (public.set_territorial_legend_consent('legend-consent-contract', true, '15_or_over', '2026-11-04T10:00:00Z'::timestamptz)->>'activated_at'),
  '2026-11-03T10:00:00+00:00',
  'repeated activation preserves the original activation watermark'
);
insert into public.territorial_legend_hold_periods (
  user_id, campaign_year, level, territory_code, territory_label,
  started_on, last_verified_on, validity_status, source_fingerprint
) values (
  'legend-consent-contract', extract(year from current_date)::integer, 'commune', '75056', 'Paris',
  current_date - 2, current_date - 1, 'active', 'consent-revocation-hold'
);
select is(
  (public.set_territorial_legend_consent('legend-consent-contract', false, '15_or_over', '2026-11-05T10:00:00Z'::timestamptz)->>'activated_at'),
  '2026-11-03T10:00:00+00:00',
  'revocation keeps the owner-scoped activation history'
);
select is(
  (select count(*)::integer from public.territorial_legend_hold_periods where user_id = 'legend-consent-contract' and validity_status = 'closed'),
  1,
  'revocation closes active detention without deleting its period'
);
select is(
  (public.set_territorial_legend_consent('legend-consent-contract', true, '15_or_over', '2026-11-06T10:00:00Z'::timestamptz)->>'activated_at'),
  '2026-11-06T10:00:00+00:00',
  'reactivation creates a new non-retroactive watermark'
);

-- Isolate the historical campaign from every current-relative fixture. This
-- exercises the production monotonicity guard without weakening it.
delete from public.territorial_legend_award_proofs
 where user_id like 'legend-contract-%';
delete from public.territorial_legend_hold_periods
 where user_id like 'legend-contract-%';
delete from public.territorial_legend_hold_periods
 where user_id = 'legend-consent-contract';
delete from public.territorial_legend_consents
 where user_id = 'legend-consent-contract';

do $$
declare
  v_day date;
begin
  for v_day in
    select date '2025-07-05' + day_offset
      from generate_series(0, 178) as day_series(day_offset)
  loop
    perform public.reconcile_territorial_legend_snapshot(
      v_day,
      jsonb_build_array(jsonb_build_object(
        'user_id', 'legend-contract-year', 'campaign_year', 2025, 'level', 'commune',
        'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', v_day,
        'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'annual-' || v_day::text
      ))
    );
  end loop;
end;
$$;
select is(
  (public.reconcile_territorial_legend_snapshot(
    date '2025-12-31',
    jsonb_build_array(jsonb_build_object(
      'user_id', 'legend-contract-year', 'campaign_year', 2025, 'level', 'commune',
      'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', date '2025-12-31',
      'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'annual-2025-12-31'
    ))
  )->>'status',
  'applied',
  '31 December records the final verified day without closing the season'
);
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-year' and campaign_year = 2025 and award_kind = 'longevity' and threshold_days = 180), 1, '180 consecutive verified days create the annual longevity proof');
select is((select started_on from public.territorial_legend_hold_periods where user_id = 'legend-contract-year' and campaign_year = 2025), date '2025-07-05', 'the annual series starts on its first verified day');
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-year' and campaign_year = 2025 and award_kind = 'season_end'), 0, 'season-end reward waits until after the civil year ends');
select is((select last_verified_on from public.territorial_legend_hold_periods where user_id = 'legend-contract-year' and campaign_year = 2025), date '2025-12-31', 'the prior period ends on 31 December');

select is(
  (public.reconcile_territorial_legend_snapshot(
    date '2026-01-01',
    jsonb_build_array(jsonb_build_object(
      'user_id', 'legend-contract-year', 'campaign_year', 2026, 'level', 'commune',
      'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', date '2026-01-01',
      'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'annual-2026-01-01'
    ))
  )->>'status',
  'applied',
  '1 January starts a new campaign instead of extending the prior title'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id = 'legend-contract-year' and campaign_year = 2025 and validity_status = 'closed'), 1, 'the previous campaign period is closed without deletion');
select is((select started_on from public.territorial_legend_hold_periods where user_id = 'legend-contract-year' and campaign_year = 2026 and validity_status = 'active'), date '2026-01-01', 'the new campaign period starts on 1 January');
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-year' and campaign_year = 2026 and award_kind = 'conquest'), 1, 'the same grade can be conquered once again in the new campaign');
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-year' and campaign_year = 2025 and award_kind = 'season_end'), 1, 'the missed closure is recovered on 1 January from the verified 31 December hold');

select public.reconcile_territorial_legend_snapshot(
  date '2026-01-01',
  jsonb_build_array(jsonb_build_object(
    'user_id', 'legend-contract-year', 'campaign_year', 2026, 'level', 'commune',
    'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', date '2026-01-01',
    'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'annual-2026-01-01-replay'
  ))
);
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-year' and campaign_year = 2025 and award_kind = 'season_end'), 1, 'replaying the closure remains idempotent');

select is(
  (public.reconcile_territorial_legend_snapshot(
    date '2026-01-02',
    jsonb_build_array(jsonb_build_object(
      'user_id', 'legend-contract-year', 'campaign_year', 2026, 'level', 'commune',
      'territory_code', '69123', 'territory_label', 'Lyon', 'effective_on', date '2026-01-02',
      'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'annual-2026-01-02-lyon'
    ))
  )->>'status',
  'applied',
  'a second territory in the same grade remains in the same annual campaign'
);
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-year' and campaign_year = 2026 and award_kind = 'conquest'), 1, 'conquest is deduplicated per user, grade and campaign across territories');
select is((select territory_code from public.territorial_legend_hold_periods where user_id = 'legend-contract-year' and campaign_year = 2026 and validity_status = 'active'), '69123', 'the active title follows the current territory without transferring days');
select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-year' and campaign_year = 2026 and threshold_days in (365, 730)), 0, 'annual campaigns never create legacy 365 or 730 day rewards');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('request.jwt.claim.role', 'anon', true);
select throws_ok($$select public.reconcile_territorial_legend_snapshot(current_date, '[]'::jsonb, now())$$, '42501', null, 'anon cannot execute snapshot reconciliation');
select ok(not has_function_privilege('anon', 'public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz)', 'execute'), 'anon has no snapshot reconciliation privilege');

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$select public.reconcile_territorial_legend_snapshot(current_date, '[]'::jsonb, now())$$, '42501', null, 'authenticated cannot invoke snapshot reconciliation');
select throws_ok($$select public.invalidate_territorial_legend_history('{}'::bigint[], '{}'::text[], current_date)$$, '42501', null, 'authenticated cannot invoke history invalidation');

select ok(not has_table_privilege('authenticated', 'public.territorial_legend_hold_periods', 'select'), 'authenticated cannot read private hold periods');
select ok(not has_table_privilege('authenticated', 'public.territorial_legend_award_proofs', 'select'), 'authenticated cannot read private award proofs');
select ok(has_table_privilege('authenticated', 'public.territorial_legend_consents', 'select'), 'authenticated can read only its consent projection through RLS');
select ok(not has_table_privilege('authenticated', 'public.territorial_legend_consents', 'insert'), 'authenticated cannot insert consent state directly');
select ok(not has_table_privilege('authenticated', 'public.territorial_legend_consents', 'update'), 'authenticated cannot update consent state directly');
select throws_ok($$insert into public.territorial_legend_consents (user_id, enabled, age_band) values ('forged-consent', true, '15_or_over')$$, '42501', null, 'authenticated direct consent insert is refused');
select throws_ok($$update public.territorial_legend_consents set enabled = true where user_id = 'legend-consent-contract'$$, '42501', null, 'authenticated direct consent update is refused');
select ok(not has_function_privilege('authenticated', 'public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz)', 'execute'), 'authenticated cannot execute snapshot reconciliation');
select ok(not has_function_privilege('authenticated', 'public.invalidate_territorial_legend_history(bigint[], text[], date)', 'execute'), 'authenticated cannot execute history invalidation');
select ok(not has_function_privilege('authenticated', 'public.set_territorial_legend_consent(text, boolean, text, timestamptz)', 'execute'), 'authenticated cannot execute the consent mutation RPC');
select ok(has_table_privilege('service_role', 'public.territorial_legend_hold_periods', 'select'), 'service_role can read hold periods');
select ok(has_table_privilege('service_role', 'public.territorial_legend_award_proofs', 'select'), 'service_role can read award proofs');
select ok(has_function_privilege('service_role', 'public.reconcile_territorial_legend_snapshot(date, jsonb, timestamptz)', 'execute'), 'service_role can execute snapshot reconciliation');
select ok(has_function_privilege('service_role', 'public.invalidate_territorial_legend_history(bigint[], text[], date)', 'execute'), 'service_role can execute history invalidation');

select * from finish();
rollback;
