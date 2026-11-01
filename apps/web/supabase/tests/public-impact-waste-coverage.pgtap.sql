begin;

select plan(11);

create temp table public_impact_waste_coverage_fixture (
  action_id text primary key,
  eligible_non_temporal boolean not null,
  waste_kg numeric,
  raw_notes text not null
);

insert into public_impact_waste_coverage_fixture
  (action_id, eligible_non_temporal, waste_kg, raw_notes)
values
  ('eligible-meta-test', true, 10, '[cmm-meta]{"label":"test"}'),
  ('eligible-zero', true, 0, 'Mesure explicite nulle'),
  ('eligible-null', true, null, 'Pas de masse déclarée'),
  ('excluded-business-test', false, 5, 'Exclusion métier malgré test');

select is(
  (select count(*)::bigint from public_impact_waste_coverage_fixture
    where eligible_non_temporal and waste_kg is not null and waste_kg >= 0),
  2::bigint,
  'the canonical eligible population counts two raw waste measurements'
);
select is(
  (select sum(waste_kg) from public_impact_waste_coverage_fixture
    where eligible_non_temporal and waste_kg is not null and waste_kg >= 0),
  10::numeric,
  'the fixture keeps the declared total unchanged'
);
select is(
  (select count(*)::bigint from public_impact_waste_coverage_fixture
    where eligible_non_temporal and raw_notes ilike '%[cmm-meta]%' and raw_notes ilike '%test%'
      and waste_kg is not null and waste_kg >= 0),
  1::bigint,
  'technical metadata does not exclude an otherwise eligible measure'
);
select is(
  (select count(*)::bigint from public_impact_waste_coverage_fixture
    where eligible_non_temporal and waste_kg = 0),
  1::bigint,
  'an explicit zero remains a measured source'
);
select is(
  (select count(*)::bigint from public_impact_waste_coverage_fixture
    where eligible_non_temporal and waste_kg is null),
  0::bigint,
  'NULL is not counted as a waste source'
);
select is(
  (select count(*)::bigint from public_impact_waste_coverage_fixture
    where not eligible_non_temporal and waste_kg is not null and waste_kg >= 0),
  0::bigint,
  'a business-excluded action is not counted'
);

create temp table public_impact_waste_coverage_before as
select * from public.load_public_landing_action_summary_incremental();

select is(
  (select waste_source_count from public_impact_waste_coverage_before),
  (select count(*)::bigint
    from public.public_impact_action_contributions c
    join public.actions a on a.id = c.action_id
    cross join public.public_impact_action_aggregate_state s
    where s.state_id = true
      and c.eligible_non_temporal
      and c.action_date >= s.floor_date
      and c.action_date <= current_date
      and a.waste_kg is not null
      and a.waste_kg >= 0),
  'the RPC coverage equals the canonical contribution population'
);
select is(
  (select waste_kg from public_impact_waste_coverage_before),
  (select waste_kg from public.public_impact_action_aggregate_state where state_id = true),
  'the coverage correction does not alter the aggregate waste total'
);

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    (select floor_date from public.public_impact_action_aggregate_state where state_id = true),
    public.current_public_impact_projection_version()
  )$$,
  'full reconstruction remains executable'
);
select is(
  (select waste_source_count from public.load_public_landing_action_summary_incremental()),
  (select count(*)::bigint
    from public.public_impact_action_contributions c
    join public.actions a on a.id = c.action_id
    cross join public.public_impact_action_aggregate_state s
    where s.state_id = true
      and c.eligible_non_temporal
      and c.action_date >= s.floor_date
      and c.action_date <= current_date
      and a.waste_kg is not null
      and a.waste_kg >= 0),
  'reconstruction preserves the same coverage population'
);
select is(
  (select waste_kg from public.load_public_landing_action_summary_incremental()),
  (select waste_kg from public_impact_waste_coverage_before),
  'reconstruction preserves the aggregate waste total'
);

select * from finish();
rollback;
