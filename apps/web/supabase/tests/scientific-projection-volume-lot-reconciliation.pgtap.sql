begin;

select plan(29);

select has_table(
  'public',
  'public_impact_action_cigarette_butt_projections',
  'current cigarette-butt projection cache exists'
);
select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.public_impact_action_cigarette_butt_projections'::regclass),
  'current cigarette-butt projection cache has RLS enabled'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.public_impact_action_cigarette_butt_projections',
    'SELECT'
  ),
  'browser roles cannot read the current cigarette-butt projection cache'
);
select ok(
  has_table_privilege(
    'service_role',
    'public.public_impact_action_cigarette_butt_projections',
    'SELECT'
  ),
  'service_role can maintain the current cigarette-butt projection cache'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.rebuild_public_impact_action_state(date,text,jsonb)',
    'EXECUTE'
  ),
  'service_role can use the atomic full-rebuild compatibility overload'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.rebuild_public_impact_action_state(date,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot use the atomic full-rebuild compatibility overload'
);

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"scientific-projection-test"}', true);

create temp table scientific_projection_fixture (
  volume_action_id uuid not null,
  mass_action_id uuid not null,
  ambiguous_action_id uuid not null,
  volume_source_updated_at timestamptz not null,
  mass_source_updated_at timestamptz not null,
  ambiguous_source_updated_at timestamptz not null,
  historical_volume_notes text not null,
  historical_mass_notes text not null
);

do $$
declare
  v_volume_action_id uuid := gen_random_uuid();
  v_mass_action_id uuid := gen_random_uuid();
  v_ambiguous_action_id uuid := gen_random_uuid();
  v_volume_source_updated_at timestamptz;
  v_mass_source_updated_at timestamptz;
  v_ambiguous_source_updated_at timestamptz;
  v_historical_volume_notes text := '[cmm-meta]' || jsonb_build_object(
    'cigaretteButtsMeasurements', jsonb_build_object(
      'cigaretteButtsCount', 600,
      'cigaretteButtsCountProvenance', 'estimated',
      'cigaretteButtsLots', jsonb_build_array(jsonb_build_object(
        'id', 'volume-v1', 'source', 'volume_l', 'value', 1,
        'condition', 'propre'
      )),
      'cigaretteButtsLotResults', jsonb_build_array(jsonb_build_object(
        'id', 'volume-v1', 'source', 'volume_l', 'value', 1,
        'condition', 'propre', 'count', 600, 'massKg', 0.22,
        'rawMassKg', null, 'rawVolumeLiters', 1,
        'countProvenance', 'volume_converted',
        'massProvenance', 'weight_converted',
        'massConversionFormulaVersion', 'cleanmymap-butts-mass-v1',
        'volumeConversionFormulaVersion', 'cleanmymap-butts-volume-v1'
      )),
      'cigaretteButtsConversionFormulaVersion', 'cleanmymap-butts-volume-v1'
    )
  )::text;
  v_historical_mass_notes text := '[cmm-meta]' || jsonb_build_object(
    'cigaretteButtsMeasurements', jsonb_build_object(
      'cigaretteButtsCount', 2250,
      'cigaretteButtsCountProvenance', 'estimated',
      'cigaretteButtsLots', jsonb_build_array(
        jsonb_build_object(
          'id', 'counted', 'source', 'count', 'value', 500,
          'condition', 'humide'
        ),
        jsonb_build_object(
          'id', 'measured-mass', 'source', 'mass_kg', 'value', 1,
          'condition', 'mouille'
        )
      ),
      'cigaretteButtsLotResults', jsonb_build_array(
        jsonb_build_object(
          'id', 'counted', 'source', 'count', 'value', 500,
          'condition', 'humide', 'count', 500, 'massKg', 0.11,
          'rawMassKg', null, 'rawVolumeLiters', null,
          'countProvenance', 'counted', 'massProvenance', 'weight_converted',
          'massConversionFormulaVersion', 'cleanmymap-butts-mass-v1',
          'volumeConversionFormulaVersion', null
        ),
        jsonb_build_object(
          'id', 'measured-mass', 'source', 'mass_kg', 'value', 1,
          'condition', 'mouille', 'count', 1750, 'massKg', 1,
          'rawMassKg', 1, 'rawVolumeLiters', null,
          'countProvenance', 'mass_converted', 'massProvenance', 'measured',
          'massConversionFormulaVersion', 'cleanmymap-butts-mass-v1',
          'volumeConversionFormulaVersion', null
        )
      )
    )
  )::text;

  insert into public.actions (
    id, created_by_clerk_id, action_date, location_label, status,
    cigarette_butts, waste_kg, volunteers_count, duration_minutes, notes
  ) values (
    v_volume_action_id, 'scientific-projection-fixture', current_date,
    'Projection fixture volume', 'approved', 600, 0, 1, 0,
    v_historical_volume_notes
  ) returning updated_at into v_volume_source_updated_at;

  insert into public.actions (
    id, created_by_clerk_id, action_date, location_label, status,
    cigarette_butts, waste_kg, volunteers_count, duration_minutes, notes
  ) values (
    v_mass_action_id, 'scientific-projection-fixture', current_date,
    'Projection fixture mass', 'approved', 2250, 0, 1, 0,
    v_historical_mass_notes
  ) returning updated_at into v_mass_source_updated_at;

  insert into public.actions (
    id, created_by_clerk_id, action_date, location_label, status,
    cigarette_butts, waste_kg, volunteers_count, duration_minutes, notes
  ) values (
    v_ambiguous_action_id, 'scientific-projection-fixture', current_date,
    'Projection fixture ambiguous', 'approved', 1700, 0, 1, 0, null
  ) returning updated_at into v_ambiguous_source_updated_at;

  insert into scientific_projection_fixture values (
    v_volume_action_id, v_mass_action_id, v_ambiguous_action_id,
    v_volume_source_updated_at, v_mass_source_updated_at,
    v_ambiguous_source_updated_at, v_historical_volume_notes,
    v_historical_mass_notes
  );
end;
$$;

select is(
  (select cigarette_butts::bigint from public.actions
   where id = (select volume_action_id from scientific_projection_fixture)),
  600::bigint,
  'the historical volume action keeps its stored 600-count observation'
);

select lives_ok(
  $$select public.upsert_public_impact_action_cigarette_butt_projections(
    jsonb_build_array(
      jsonb_build_object(
        'action_id', (select volume_action_id from scientific_projection_fixture),
        'source_updated_at', (select volume_source_updated_at from scientific_projection_fixture),
        'projected_count', 700,
        'recalculation_status', 'recalculable',
        'projection_version', public.current_public_impact_projection_version(),
        'projected_lot_results', jsonb_build_array(jsonb_build_object(
          'id', 'volume-v1', 'source', 'volume_l', 'value', 1,
          'condition', 'propre', 'count', 700, 'massKg', 0.22,
          'rawMassKg', null, 'rawVolumeLiters', 1,
          'countProvenance', 'volume_converted',
          'massProvenance', 'weight_converted',
          'massConversionFormulaVersion', 'cleanmymap-butts-mass-v1',
          'volumeConversionFormulaVersion', 'cleanmymap-butts-volume-v2'
        ))
      ),
      jsonb_build_object(
        'action_id', (select mass_action_id from scientific_projection_fixture),
        'source_updated_at', (select mass_source_updated_at from scientific_projection_fixture),
        'projected_count', 2250,
        'recalculation_status', 'not_applicable',
        'projection_version', public.current_public_impact_projection_version(),
        'projected_lot_results', jsonb_build_array(
          jsonb_build_object(
            'id', 'counted', 'source', 'count', 'value', 500,
            'condition', 'humide', 'count', 500, 'massKg', 0.11,
            'countProvenance', 'counted', 'massProvenance', 'weight_converted',
            'massConversionFormulaVersion', 'cleanmymap-butts-mass-v1'
          ),
          jsonb_build_object(
            'id', 'measured-mass', 'source', 'mass_kg', 'value', 1,
            'condition', 'mouille', 'count', 1750, 'massKg', 1,
            'rawMassKg', 1, 'countProvenance', 'mass_converted',
            'massProvenance', 'measured',
            'massConversionFormulaVersion', 'cleanmymap-butts-mass-v1'
          )
        )
      ),
      jsonb_build_object(
        'action_id', (select ambiguous_action_id from scientific_projection_fixture),
        'source_updated_at', (select ambiguous_source_updated_at from scientific_projection_fixture),
        'projected_count', 1700,
        'recalculation_status', 'not_recalculable',
        'projection_version', public.current_public_impact_projection_version(),
        'projected_lot_results', null
      )
    )
  )$$,
  'the current projection rows are accepted atomically'
);
select is(
  (select recalculation_status
   from public.public_impact_action_cigarette_butt_projections
   where action_id = (select volume_action_id from scientific_projection_fixture)),
  'recalculable',
  'the volume lot is explicitly marked recalculable'
);
select is(
  (select projection_version
   from public.public_impact_action_cigarette_butt_projections
   where action_id = (select volume_action_id from scientific_projection_fixture)),
  public.current_public_impact_projection_version(),
  'projection rows carry the current version'
);
select is(
  (select notes from public.actions
   where id = (select mass_action_id from scientific_projection_fixture)),
  (select historical_mass_notes from scientific_projection_fixture),
  'mixed counted and mass lot source notes remain unchanged'
);
select is(
  (select recalculation_status
   from public.public_impact_action_cigarette_butt_projections
   where action_id = (select ambiguous_action_id from scientific_projection_fixture)),
  'not_recalculable',
  'an ambiguous scalar is explicitly marked non-recalculable'
);

select is(
  (select (public.project_public_impact_action_with_current_butt_projection(a)).cigarette_butts::bigint
   from public.actions a
   where a.id = (select volume_action_id from scientific_projection_fixture)),
  700::bigint,
  'a retained one-liter v1 lot is projected at 700 in the current action view'
);
select is(
  (select (public.build_public_impact_action_contribution(a)).cigarette_butts
   from public.actions a
   where a.id = (select volume_action_id from scientific_projection_fixture)),
  700::bigint,
  'the public contribution builder consumes the current volume projection'
);
select is(
  (select (public.build_public_impact_action_contribution(a)).butts_propre_count
   from public.actions a
   where a.id = (select volume_action_id from scientific_projection_fixture)),
  700::bigint,
  'condition counts use the recalculated lot result without double counting'
);
select is(
  (select (public.build_public_impact_action_contribution(a)).methodology_version
   from public.actions a
   where a.id = (select volume_action_id from scientific_projection_fixture)),
  public.current_public_impact_projection_version(),
  'the current contribution is labelled with the current projection version'
);
select ok(
  (select (public.build_public_impact_action_contribution(a)).butts_mass_by_condition->'propre' @> '[{"conversionVersion":"cleanmymap-butts-volume-v2"}]'::jsonb
   from public.actions a
   where a.id = (select volume_action_id from scientific_projection_fixture)),
  'the current volume conversion version is retained in provenance'
);
select is(
  (select (public.build_public_impact_action_contribution(a)).cigarette_butts
   from public.actions a
   where a.id = (select mass_action_id from scientific_projection_fixture)),
  2250::bigint,
  'counted and mass lots keep their supplied count without a volume conversion'
);
select ok(
  (select (public.build_public_impact_action_contribution(a)).butts_mass_by_condition->'mouille' @> '[{"massKg":1,"massProvenance":"measured","conversionVersion":"cleanmymap-butts-mass-v1"}]'::jsonb
   from public.actions a
   where a.id = (select mass_action_id from scientific_projection_fixture)),
  'measured mass provenance remains intact in the mixed lot projection'
);
select is(
  (select (public.build_public_impact_action_contribution(a)).cigarette_butts
   from public.actions a
   where a.id = (select ambiguous_action_id from scientific_projection_fixture)),
  1700::bigint,
  'an ambiguous scalar without retained lots remains unchanged'
);
select is(
  (select cigarette_butts::bigint from public.actions
   where id = (select volume_action_id from scientific_projection_fixture)),
  600::bigint,
  'projection does not rewrite the historical action observation'
);
select is(
  (select notes from public.actions
   where id = (select volume_action_id from scientific_projection_fixture)),
  (select historical_volume_notes from scientific_projection_fixture),
  'projection does not rewrite the historical lot snapshot'
);

create temp table scientific_projection_rows as
select coalesce(jsonb_agg(jsonb_build_object(
  'action_id', entries.action_id,
  'source_updated_at', entries.source_updated_at,
  'projected_count', entries.projected_count,
  'recalculation_status', entries.recalculation_status,
  'projection_version', entries.projection_version,
  'projected_lot_results', entries.projected_lot_results
)), '[]'::jsonb) as rows
from (
  select
    a.id as action_id,
    a.updated_at as source_updated_at,
    a.cigarette_butts::bigint as projected_count,
    case when jsonb_typeof(public.extract_action_cigarette_butts_metadata(a.notes)->'cigaretteButtsMeasurements'->'cigaretteButtsLots') = 'array'
      and jsonb_array_length(case when jsonb_typeof(public.extract_action_cigarette_butts_metadata(a.notes)->'cigaretteButtsMeasurements'->'cigaretteButtsLots') = 'array'
        then public.extract_action_cigarette_butts_metadata(a.notes)->'cigaretteButtsMeasurements'->'cigaretteButtsLots'
        else '[]'::jsonb end) > 0
      then 'not_recalculable' else 'not_applicable' end as recalculation_status,
    public.current_public_impact_projection_version() as projection_version,
    null::jsonb as projected_lot_results
  from public.actions a
  where a.id not in (
    select volume_action_id from scientific_projection_fixture
    union all select mass_action_id from scientific_projection_fixture
    union all select ambiguous_action_id from scientific_projection_fixture
  )
  union all
  select
    projection.action_id,
    projection.source_updated_at,
    projection.projected_count,
    projection.recalculation_status,
    projection.projection_version,
    projection.projected_lot_results
  from public.public_impact_action_cigarette_butt_projections projection
  where projection.action_id in (
    select volume_action_id from scientific_projection_fixture
    union all select mass_action_id from scientific_projection_fixture
    union all select ambiguous_action_id from scientific_projection_fixture
  )
) entries;

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    current_date - 365,
    public.current_public_impact_projection_version(),
    (select rows from scientific_projection_rows)
  )$$,
  'full reconstruction accepts a complete current projection input'
);
select is(
  (select cigarette_butts from public.public_impact_action_contributions
   where action_id = (select volume_action_id from scientific_projection_fixture)),
  700::bigint,
  'full reconstruction stores the current 700-count public contribution'
);
select is(
  (select methodology_version from public.public_impact_action_aggregate_state where state_id = true),
  public.current_public_impact_projection_version(),
  'full reconstruction publishes the current methodology version'
);

select lives_ok(
  $$select public.rebuild_public_impact_action_state(
    current_date - 365,
    public.current_public_impact_projection_version(),
    (select rows from scientific_projection_rows)
  )$$,
  'replaying the full reconstruction is idempotent'
);
create temp table scientific_projection_state_snapshot as
select to_jsonb(state) - 'initialized_at' - 'updated_at' as value
from public.public_impact_action_aggregate_state state
where state_id = true;
select is(
  (select to_jsonb(state) - 'initialized_at' - 'updated_at'
   from public.public_impact_action_aggregate_state state where state_id = true),
  (select value from scientific_projection_state_snapshot),
  'reconstruction state remains stable apart from timestamps'
);

select lives_ok(
  $$select public.advance_public_impact_action_state(
    current_date - 365,
    public.current_public_impact_projection_version(),
    (select rows from scientific_projection_rows)
  )$$,
  'incremental replay accepts the same complete projection input'
);
select is(
  (select to_jsonb(state) - 'initialized_at' - 'updated_at'
   from public.public_impact_action_aggregate_state state where state_id = true),
  (select value from scientific_projection_state_snapshot),
  'incremental replay has parity with the full reconstruction'
);

select * from finish();
rollback;
