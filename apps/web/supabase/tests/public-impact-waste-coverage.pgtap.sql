begin;

select plan(22);

create temp table public_impact_waste_coverage_before as
select * from public.load_public_landing_action_summary_incremental();

create temp table public_impact_waste_coverage_full_before as
select *
from public.load_public_landing_action_summary(
  (select floor_date from public.public_impact_action_aggregate_state where state_id = true)
);

-- These rows use the canonical public.actions table. The triggers populate the
-- canonical contribution and condition projections; rollback below keeps the
-- production dataset unchanged.
insert into public.actions (
  id,
  created_by_clerk_id,
  action_date,
  location_label,
  waste_kg,
  cigarette_butts,
  volunteers_count,
  duration_minutes,
  status,
  notes
)
values
  (
    '00000000-0000-0000-0000-000000000101',
    'pgtap-public-impact',
    current_date,
    'pgTAP eligible metadata',
    10,
    0,
    1,
    0,
    'approved',
    '[cmm-meta]{"label":"test"}'
  ),
  (
    '00000000-0000-0000-0000-000000000102',
    'pgtap-public-impact',
    current_date,
    'pgTAP eligible zero',
    0,
    0,
    1,
    0,
    'approved',
    'Mesure explicite nulle'
  ),
  (
    '00000000-0000-0000-0000-000000000103',
    'pgtap-public-impact',
    current_date,
    'pgTAP eligible null',
    null,
    0,
    1,
    0,
    'approved',
    'Pas de masse declaree'
  ),
  (
    '00000000-0000-0000-0000-000000000104',
    'pgtap-public-impact',
    current_date,
    'pgTAP excluded business',
    5,
    0,
    1,
    0,
    'approved',
    'Exclusion metier malgre test'
  ),
  (
    '00000000-0000-0000-0000-000000000105',
    'pgtap-public-impact',
    current_date,
    'pgTAP masses proprees v1 v2',
    null,
    300,
    1,
    0,
    'approved',
    '[cmm-meta]{"cigaretteButtsMeasurements":{"cigaretteButtsLotResults":[{"id":"lot-v1","condition":"propre","count":100,"massKg":0.02,"massProvenance":"measured","massConversionFormulaVersion":"impact-terrain-2026-butts-mass-v1"},{"id":"lot-v2","condition":"propre","count":200,"massKg":0.04,"massProvenance":"estimated","volumeConversionFormulaVersion":"cleanmymap-butts-volume-v2"}]}}'
  ),
  (
    '00000000-0000-0000-0000-000000000106',
    'pgtap-public-impact',
    current_date,
    'pgTAP masse propre inconnue',
    null,
    75,
    1,
    0,
    'approved',
    '[cmm-meta]{"cigaretteButtsMeasurements":{"cigaretteButtsLotResults":[{"id":"lot-unknown","condition":"propre","count":75,"massKg":null,"massProvenance":"unknown","massConversionFormulaVersion":null}]}}'
  );

select is(
  (select count(*)::bigint
   from public.public_impact_action_contributions c
   join public.actions a on a.id = c.action_id
   where a.id in (
     '00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-000000000102',
     '00000000-0000-0000-0000-000000000103',
     '00000000-0000-0000-0000-000000000104'
   )
     and c.eligible_non_temporal
     and a.waste_kg is not null
     and a.waste_kg >= 0),
  2::bigint,
  'the canonical eligible population counts two raw waste measurements'
);
select is(
  (select sum(a.waste_kg)
   from public.actions a
   where a.id in (
     '00000000-0000-0000-0000-000000000101',
     '00000000-0000-0000-0000-000000000102',
     '00000000-0000-0000-0000-000000000103',
     '00000000-0000-0000-0000-000000000104'
   )
     and a.waste_kg is not null
     and a.waste_kg >= 0),
  15::numeric,
  'the canonical fixture keeps the declared total unchanged'
);
select is(
  (select count(*)::bigint
   from public.public_impact_action_contributions c
   where c.action_id = '00000000-0000-0000-0000-000000000101'
     and c.eligible_non_temporal),
  1::bigint,
  'technical metadata does not exclude an otherwise eligible measure'
);
select is(
  (select count(*)::bigint
   from public.actions
   where id = '00000000-0000-0000-0000-000000000102'
     and waste_kg = 0),
  1::bigint,
  'an explicit zero remains a measured source'
);
select is(
  (select count(*)::bigint
   from public.public_impact_action_contributions c
   join public.actions a on a.id = c.action_id
   where a.id = '00000000-0000-0000-0000-000000000103'
     and c.eligible_non_temporal
     and a.waste_kg is null),
  1::bigint,
  'an eligible NULL raw mass remains visible but is not a measured source'
);
select is(
  (select count(*)::bigint
   from public.public_impact_action_contributions c
   join public.actions a on a.id = c.action_id
   where a.id = '00000000-0000-0000-0000-000000000104'
     and not c.eligible_non_temporal
     and a.waste_kg is not null
     and a.waste_kg >= 0),
  1::bigint,
  'a business-excluded action retains its raw mass without entering coverage'
);

create temp table public_impact_waste_coverage_after as
select * from public.load_public_landing_action_summary_incremental();

create temp table public_impact_waste_coverage_full_after as
select *
from public.load_public_landing_action_summary(
  (select floor_date from public.public_impact_action_aggregate_state where state_id = true)
);

select is(
  (select waste_source_count from public_impact_waste_coverage_after)
    - (select waste_source_count from public_impact_waste_coverage_before),
  2::bigint,
  'the incremental RPC counts eligible non-NULL sources, including technical metadata and zero'
);
select is(
  (select cigarette_butts from public_impact_waste_coverage_after)
    - (select cigarette_butts from public_impact_waste_coverage_before),
  375::bigint,
  'canonical lot counts are added exactly once'
);
select is(
  (
    coalesce((select (entry.value->>'count')::bigint
      from public_impact_waste_coverage_after a
      cross join lateral jsonb_array_elements(a.butts_by_condition) entry
      where entry.value->>'condition' = 'propre'), 0)
    - coalesce((select (entry.value->>'count')::bigint
      from public_impact_waste_coverage_before a
      cross join lateral jsonb_array_elements(a.butts_by_condition) entry
      where entry.value->>'condition' = 'propre'), 0)
  ),
  375::bigint,
  'two canonical lots in one condition preserve their exact count'
);
select is(
  (select count(*)::bigint
   from public_impact_waste_coverage_after a
   cross join lateral jsonb_array_elements(a.butts_by_condition) condition_entry
   cross join lateral jsonb_array_elements(condition_entry.value->'massContributions') item
   where condition_entry.value->>'condition' = 'propre'
     and item.value->>'actionId' in (
       '00000000-0000-0000-0000-000000000105',
       '00000000-0000-0000-0000-000000000106'
     )),
  3::bigint,
  'the incremental RPC preserves distinct mass contributions per canonical lot'
);
select is(
  (select count(distinct item.value->>'conversionVersion')::bigint
   from public_impact_waste_coverage_after a
   cross join lateral jsonb_array_elements(a.butts_by_condition) condition_entry
   cross join lateral jsonb_array_elements(condition_entry.value->'massContributions') item
   where condition_entry.value->>'condition' = 'propre'
     and item.value->>'actionId' in (
       '00000000-0000-0000-0000-000000000105',
       '00000000-0000-0000-0000-000000000106'
     )
     and item.value->>'conversionVersion' is not null),
  2::bigint,
  'the incremental RPC preserves the v1 and v2 conversion identities'
);
select is(
  (select count(*)::bigint
   from public_impact_waste_coverage_after a
   cross join lateral jsonb_array_elements(a.butts_by_condition) condition_entry
   cross join lateral jsonb_array_elements(condition_entry.value->'massContributions') item
   where condition_entry.value->>'condition' = 'propre'
     and item.value->>'actionId' = '00000000-0000-0000-0000-000000000106'
     and item.value->>'massProvenance' = 'unknown'
     and item.value->>'massKg' is null),
  1::bigint,
  'the incremental RPC preserves an unknown mass contribution without conversion'
);
select is(
  (select cigarette_butts from public_impact_waste_coverage_full_after),
  (select cigarette_butts from public_impact_waste_coverage_after),
  'full and incremental RPCs preserve the same canonical butt total'
);
select is(
  (select waste_kg from public_impact_waste_coverage_full_after),
  (select waste_kg from public_impact_waste_coverage_after),
  'full and incremental RPCs preserve the same waste aggregate'
);
select is(
  (select count(*)::bigint
   from public_impact_waste_coverage_full_after a
   cross join lateral jsonb_array_elements(a.butts_by_condition) condition_entry
   cross join lateral jsonb_array_elements(condition_entry.value->'massContributions') item
   where condition_entry.value->>'condition' = 'propre'
     and item.value->>'actionId' in (
       '00000000-0000-0000-0000-000000000105',
       '00000000-0000-0000-0000-000000000106'
     )),
  3::bigint,
  'the full RPC preserves the same measured, estimated and unknown contributions'
);
select is(
  (select count(*)::bigint
   from (
     select condition_entry.value->>'condition' as condition,
       item.value->>'actionId' as action_id,
       item.value->>'count' as lot_count,
       item.value->>'massKg' as mass_kg,
       item.value->>'massProvenance' as mass_provenance,
       item.value->>'conversionVersion' as conversion_version
     from public_impact_waste_coverage_after a
     cross join lateral jsonb_array_elements(a.butts_by_condition) condition_entry
     cross join lateral jsonb_array_elements(condition_entry.value->'massContributions') item
     where item.value->>'actionId' in (
       '00000000-0000-0000-0000-000000000105',
       '00000000-0000-0000-0000-000000000106'
     )
     except
     select condition_entry.value->>'condition',
       item.value->>'actionId', item.value->>'count', item.value->>'massKg',
       item.value->>'massProvenance', item.value->>'conversionVersion'
     from public_impact_waste_coverage_full_after a
     cross join lateral jsonb_array_elements(a.butts_by_condition) condition_entry
     cross join lateral jsonb_array_elements(condition_entry.value->'massContributions') item
     where item.value->>'actionId' in (
       '00000000-0000-0000-0000-000000000105',
       '00000000-0000-0000-0000-000000000106'
     )
   ) differences),
  0::bigint,
  'full and incremental RPCs preserve the same mass contribution records'
);

insert into public.public_impact_action_cigarette_butt_projections (
  action_id,
  source_updated_at,
  projected_count,
  recalculation_status,
  projection_version,
  projected_lot_results
)
select
  a.id,
  a.updated_at,
  a.cigarette_butts,
  case when a.id = '00000000-0000-0000-0000-000000000105'
    then 'recalculable' else 'not_recalculable' end,
  public.current_public_impact_projection_version(),
  public.extract_action_cigarette_butts_metadata(a.notes)
    -> 'cigaretteButtsMeasurements' -> 'cigaretteButtsLotResults'
from public.actions a
where a.id in (
  '00000000-0000-0000-0000-000000000105',
  '00000000-0000-0000-0000-000000000106'
);

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    (select floor_date from public.public_impact_action_aggregate_state where state_id = true),
    public.current_public_impact_projection_version()
  )$$,
  'full reconstruction remains executable with canonical lot projections'
);

create temp table public_impact_waste_coverage_rebuild_once as
select * from public.load_public_landing_action_summary_incremental();

select is(
  (select cigarette_butts from public_impact_waste_coverage_rebuild_once),
  (select cigarette_butts from public_impact_waste_coverage_full_after),
  'reconstruction converges to the full RPC butt total'
);
select is(
  (select count(*)::bigint
   from public_impact_waste_coverage_rebuild_once a
   cross join lateral jsonb_array_elements(a.butts_by_condition) condition_entry
   cross join lateral jsonb_array_elements(condition_entry.value->'massContributions') item
   where item.value->>'actionId' in (
     '00000000-0000-0000-0000-000000000105',
     '00000000-0000-0000-0000-000000000106'
   )),
  3::bigint,
  'reconstruction retains all canonical mass contributions'
);

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    (select floor_date from public.public_impact_action_aggregate_state where state_id = true),
    public.current_public_impact_projection_version()
  )$$,
  'a second reconstruction remains executable'
);
select is(
  (select cigarette_butts from public.load_public_landing_action_summary_incremental()),
  (select cigarette_butts from public_impact_waste_coverage_rebuild_once),
  'a second reconstruction is idempotent for the canonical butt total'
);

select * from finish();
rollback;
