-- Ephemeral PostgreSQL contract for the territorial legend reward migration.
-- It is executed only by the hosted Supabase replay lane after a canonical
-- migration reset; it must never target the linked or production database.

begin;
select plan(30);

set local role postgres;
create temp table territorial_legend_contract_state (
  effective_on date not null,
  first_period_id bigint
) on commit drop;
insert into territorial_legend_contract_state (effective_on)
values ((now() at time zone 'Europe/Paris')::date - 10);

delete from public.territorial_legend_award_proofs
 where user_id in ('legend-contract-a', 'legend-contract-b');
delete from public.territorial_legend_hold_periods
 where user_id in ('legend-contract-a', 'legend-contract-b');

select ok(to_regclass('public.territorial_legend_hold_periods') is not null, 'hold periods table exists after replay');
select ok(to_regclass('public.territorial_legend_award_proofs') is not null, 'award proofs table exists after replay');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261103000002'), 'previous territorial migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261103000003'), 'repaired territorial migration is registered');
select ok(exists (select 1 from supabase_migrations.schema_migrations where version = '20261103000004'), 'forward contract migration is registered');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on from territorial_legend_contract_state),
    jsonb_build_array(
      jsonb_build_object(
        'user_id', 'legend-contract-a', 'level', 'commune',
        'territory_code', '75056', 'territory_label', 'Paris',
        'effective_on', (select effective_on from territorial_legend_contract_state),
        'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-a'
      ),
      jsonb_build_object(
        'user_id', 'legend-contract-b', 'level', 'commune',
        'territory_code', '75056', 'territory_label', 'Paris',
        'effective_on', (select effective_on from territorial_legend_contract_state),
        'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-b'
      )
    )
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
      jsonb_build_object('user_id', 'legend-contract-a', 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-a'),
      jsonb_build_object('user_id', 'legend-contract-b', 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 2, 'source_fingerprint', 'contract-source-b')
    )
  )->>'insertedProofs',
  '0',
  'replaying the same snapshot is idempotent'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id like 'legend-contract-%' and validity_status = 'active'), 2, 'an idempotent replay keeps both titles active');

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 2 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-a', 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 2 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'contract-source-a-gap'))
  )->>'closedPeriods',
  '2',
  'an interruption closes the absent winner and the gapped period'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where user_id like 'legend-contract-%' and validity_status = 'active'), 1, 'the interrupted snapshot leaves only the current winner active');

do $$
declare
  v_day date;
  v_offset integer;
  v_snapshot jsonb;
begin
  select effective_on into v_day from territorial_legend_contract_state;
  v_snapshot := jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-a', 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'contract-source-a-continuous'));
  for v_offset in 3..8 loop
    v_snapshot := jsonb_set(v_snapshot, '{0,effective_on}', to_jsonb(v_day + v_offset));
    perform public.reconcile_territorial_legend_snapshot(v_day + v_offset, v_snapshot);
  end loop;
end;
$$;

select is((select count(*)::integer from public.territorial_legend_award_proofs where user_id = 'legend-contract-a' and award_kind = 'longevity' and threshold_days = 7), 1, 'seven consecutive verified days create the exact longevity proof');
select is((select last_verified_on from public.territorial_legend_hold_periods where user_id = 'legend-contract-a' and validity_status = 'active'), (select effective_on + 8 from territorial_legend_contract_state), 'continuous holding advances only through verified days');

select is(
  (public.reconcile_territorial_legend_snapshot(
    (select effective_on + 10 from territorial_legend_contract_state),
    jsonb_build_array(jsonb_build_object('user_id', 'legend-contract-a', 'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris', 'effective_on', (select effective_on + 10 from territorial_legend_contract_state), 'score', 2, 'rank', 1, 'tie_size', 1, 'source_fingerprint', 'contract-source-a-reconquest'))
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
    array['legend-contract-a:commune:75056:conquest:0']::text[],
    (select effective_on + 10 from territorial_legend_contract_state)
  )->>'status',
  'applied',
  'historical correction executes through the privileged RPC'
);
select is((select count(*)::integer from public.territorial_legend_hold_periods where id = (select first_period_id from territorial_legend_contract_state) and validity_status = 'invalidated'), 1, 'historical correction invalidates the selected hold period');
select is((select count(*)::integer from public.territorial_legend_award_proofs where proof_id = 'legend-contract-a:commune:75056:conquest:0' and validity_status = 'invalidated'), 1, 'historical correction invalidates the selected proof');

set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set_config('request.jwt.claim.role', 'authenticated', true);
select throws_ok($$select public.reconcile_territorial_legend_snapshot(current_date, '[]'::jsonb)$$, 'P0001', 'service_role required', 'authenticated cannot invoke snapshot reconciliation');
select throws_ok($$select public.invalidate_territorial_legend_history('{}'::bigint[], '{}'::text[], current_date)$$, 'P0001', 'service_role required', 'authenticated cannot invoke history invalidation');

select ok(not has_table_privilege('authenticated', 'public.territorial_legend_hold_periods', 'select'), 'authenticated cannot read private hold periods');
select ok(not has_table_privilege('authenticated', 'public.territorial_legend_award_proofs', 'select'), 'authenticated cannot read private award proofs');
select ok(not has_function_privilege('authenticated', 'public.reconcile_territorial_legend_snapshot(date, jsonb)', 'execute'), 'authenticated cannot execute snapshot reconciliation');
select ok(not has_function_privilege('authenticated', 'public.invalidate_territorial_legend_history(bigint[], text[], date)', 'execute'), 'authenticated cannot execute history invalidation');
select ok(has_table_privilege('service_role', 'public.territorial_legend_hold_periods', 'select'), 'service_role can read hold periods');
select ok(has_table_privilege('service_role', 'public.territorial_legend_award_proofs', 'select'), 'service_role can read award proofs');
select ok(has_function_privilege('service_role', 'public.reconcile_territorial_legend_snapshot(date, jsonb)', 'execute'), 'service_role can execute snapshot reconciliation');
select ok(has_function_privilege('service_role', 'public.invalidate_territorial_legend_history(bigint[], text[], date)', 'execute'), 'service_role can execute history invalidation');

select * from finish();
rollback;
