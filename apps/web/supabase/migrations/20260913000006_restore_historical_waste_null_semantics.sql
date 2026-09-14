-- HISTORICAL-WASTE-2026-09: restore the five imported measurements with a
-- fail-closed identity check. Only public.actions.waste_kg is writable here.
-- NULL means not reported; cigarette butts are never converted into waste kg.

do $$
declare
  v_present_identities integer;
  v_invalid_cardinalities integer;
  v_unexpected_value integer;
begin
  with expected(action_date, location_label, expected_waste_kg, cigarette_butts,
                volunteers_count, duration_minutes) as (
    values
      ('2026-02-14'::date, 'Mairie du 20ᵉ arrondissement de Paris, 6 Pl. Gambetta, 75020 Paris → Pl. Martin Nadaud, 75020 Paris', null::numeric, 3750::bigint, 15::bigint, 90::bigint),
      ('2026-03-06'::date, 'Studio Ferber, 6 Rue Pierre Mouillard, 75020 Paris → Pl. Saint-Fargeau, 75020 Paris', null::numeric, 750::bigint, 10::bigint, 90::bigint),
      ('2026-03-21'::date, 'Porte des Lilas, 75020 Paris → Jardin Serge Gainsbourg, 9 Av. de la Prte des Lilas, 75019 Paris', 20::numeric, 6250::bigint, 20::bigint, 90::bigint),
      ('2026-04-11'::date, 'Ecole élémentaire Pierre Foncin (Ecole A), 8 Rue Pierre Foncin, 75020 Paris → Saveurs en Partage, 38 Bd Mortier, 75020 Paris', null::numeric, 1875::bigint, 10::bigint, 60::bigint),
      ('2026-04-22'::date, 'Rue Jacques Louvel-Tessier, 75010 Paris → Rue Marguerite Moret, 75011 Paris', 20::numeric, 1250::bigint, 10::bigint, 60::bigint)
  ), identity_counts as (
    select (
      select count(*)
      from public.actions a
      where a.actor_name = 'Google Sheet'
        and a.action_date = e.action_date
        and a.location_label = e.location_label
        and a.cigarette_butts = e.cigarette_butts
        and a.volunteers_count = e.volunteers_count
        and a.duration_minutes = e.duration_minutes
        and a.status = 'approved'
    ) as matching_count
    from expected e
  )
  select
    count(*) filter (where matching_count > 0),
    count(*) filter (where matching_count not in (0, 1))
  into v_present_identities, v_invalid_cardinalities
  from identity_counts;

  if v_invalid_cardinalities <> 0 or v_present_identities not in (0, 5) then
    raise exception 'Historical waste repair aborted: historical identity set is partial or duplicated (present identities: %, invalid cardinalities: %)',
      v_present_identities, v_invalid_cardinalities;
  end if;

  if v_present_identities = 5 then
    with expected(action_date, location_label, expected_waste_kg, cigarette_butts,
                  volunteers_count, duration_minutes) as (
      values
        ('2026-02-14'::date, 'Mairie du 20ᵉ arrondissement de Paris, 6 Pl. Gambetta, 75020 Paris → Pl. Martin Nadaud, 75020 Paris', null::numeric, 3750::bigint, 15::bigint, 90::bigint),
        ('2026-03-06'::date, 'Studio Ferber, 6 Rue Pierre Mouillard, 75020 Paris → Pl. Saint-Fargeau, 75020 Paris', null::numeric, 750::bigint, 10::bigint, 90::bigint),
        ('2026-03-21'::date, 'Porte des Lilas, 75020 Paris → Jardin Serge Gainsbourg, 9 Av. de la Prte des Lilas, 75019 Paris', 20::numeric, 6250::bigint, 20::bigint, 90::bigint),
        ('2026-04-11'::date, 'Ecole élémentaire Pierre Foncin (Ecole A), 8 Rue Pierre Foncin, 75020 Paris → Saveurs en Partage, 38 Bd Mortier, 75020 Paris', null::numeric, 1875::bigint, 10::bigint, 60::bigint),
        ('2026-04-22'::date, 'Rue Jacques Louvel-Tessier, 75010 Paris → Rue Marguerite Moret, 75011 Paris', 20::numeric, 1250::bigint, 10::bigint, 60::bigint)
    )
    select count(*)
    into v_unexpected_value
    from expected e
    join public.actions a
      on a.actor_name = 'Google Sheet'
     and a.action_date = e.action_date
     and a.location_label = e.location_label
     and a.cigarette_butts = e.cigarette_butts
     and a.volunteers_count = e.volunteers_count
     and a.duration_minutes = e.duration_minutes
     and a.status = 'approved'
    where a.waste_kg is not null
      and a.waste_kg <> 0
      and a.waste_kg is distinct from e.expected_waste_kg;

    if v_unexpected_value <> 0 then
      raise exception 'Historical waste repair aborted: % rows have an unexpected pre-existing waste_kg', v_unexpected_value;
    end if;

    with expected(action_date, location_label, expected_waste_kg, cigarette_butts,
                  volunteers_count, duration_minutes) as (
      values
        ('2026-02-14'::date, 'Mairie du 20ᵉ arrondissement de Paris, 6 Pl. Gambetta, 75020 Paris → Pl. Martin Nadaud, 75020 Paris', null::numeric, 3750::bigint, 15::bigint, 90::bigint),
        ('2026-03-06'::date, 'Studio Ferber, 6 Rue Pierre Mouillard, 75020 Paris → Pl. Saint-Fargeau, 75020 Paris', null::numeric, 750::bigint, 10::bigint, 90::bigint),
        ('2026-03-21'::date, 'Porte des Lilas, 75020 Paris → Jardin Serge Gainsbourg, 9 Av. de la Prte des Lilas, 75019 Paris', 20::numeric, 6250::bigint, 20::bigint, 90::bigint),
        ('2026-04-11'::date, 'Ecole élémentaire Pierre Foncin (Ecole A), 8 Rue Pierre Foncin, 75020 Paris → Saveurs en Partage, 38 Bd Mortier, 75020 Paris', null::numeric, 1875::bigint, 10::bigint, 60::bigint),
        ('2026-04-22'::date, 'Rue Jacques Louvel-Tessier, 75010 Paris → Rue Marguerite Moret, 75011 Paris', 20::numeric, 1250::bigint, 10::bigint, 60::bigint)
    )
    update public.actions a
    set waste_kg = e.expected_waste_kg
    from expected e
    where a.actor_name = 'Google Sheet'
      and a.action_date = e.action_date
      and a.location_label = e.location_label
      and a.cigarette_butts = e.cigarette_butts
      and a.volunteers_count = e.volunteers_count
      and a.duration_minutes = e.duration_minutes
      and a.status = 'approved';
  end if;
end;
$$;

-- Keep the compatibility signature, but make its semantics measured-waste
-- only. The legacy extra arguments are intentionally ignored.
create or replace function public.estimate_public_action_waste_kg(
  p_declared_waste_kg numeric,
  p_megots_kg numeric,
  p_cigarette_butts bigint,
  p_megots_condition text
)
returns numeric
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select case
    when p_declared_waste_kg is null then 0::numeric
    else greatest(0::numeric, p_declared_waste_kg)
  end;
$$;

revoke all on function public.estimate_public_action_waste_kg(numeric, numeric, bigint, text)
  from public, anon, authenticated;
grant execute on function public.estimate_public_action_waste_kg(numeric, numeric, bigint, text)
  to service_role;

-- The incremental snapshot RPC carries explicit waste coverage without a
-- second source or a per-action network read. Its state sum is rebuilt by the
-- existing service-only rebuild RPC using the compatibility function above.
drop function if exists public.load_public_landing_action_summary_incremental();

create function public.load_public_landing_action_summary_incremental()
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  waste_source_count bigint,
  cigarette_butts bigint,
  volunteers bigint,
  participants_total bigint,
  total_duration_minutes bigint,
  action_distribution jsonb,
  classification_warnings jsonb,
  butts_by_condition jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
begin
  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true;
  if not found or v_state.initialized_at is null then
    raise exception 'Public Impact incremental state is not initialized; run rebuild=true';
  end if;

  return query
  select
    v_state.visible_actions,
    v_state.distinct_locations,
    v_state.waste_kg,
    (
      select count(*)::bigint
      from public.actions a
      where a.status = 'approved'
        and coalesce(a.moderation_visibility, 'visible') = 'visible'
        and coalesce(a.action_phase, 'post_action_complete') <> 'pre_action'
        and a.action_date >= v_state.floor_date
        and a.action_date <= current_date
        and a.waste_kg is not null
        and a.waste_kg >= 0
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%test%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%demo%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%seed%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%dummy%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%fake%'
        and lower(concat_ws(' ', a.id::text, 'actions', coalesce(a.location_label, ''),
          coalesce(a.actor_name, ''), coalesce(a.notes, ''))) not like '%exemple%'
    ),
    v_state.cigarette_butts,
    v_state.participants_total,
    v_state.participants_total,
    v_state.total_duration_minutes,
    coalesce((
      select jsonb_agg(jsonb_build_object('key', d.category_key, 'category', d.category_label, 'count', d.action_count)
        order by case when d.category_key like 'spontaneous:%' then 1 else 2 end,
          case when d.category_key like 'spontaneous:%' then split_part(d.category_key, ':', 2)::bigint else 0::bigint end,
          d.category_label)
      from public.public_impact_action_distribution_counts d
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('code', w.warning_code, 'count', w.warning_count)
        order by w.warning_code)
      from public.public_impact_action_warning_counts w
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object('condition', b.condition, 'count', b.cigarette_butts)
        order by b.condition)
      from public.public_impact_action_butt_condition_counts b
    ), '[]'::jsonb);
end;
$$;

revoke all on function public.load_public_landing_action_summary_incremental()
  from public, anon, authenticated;
grant execute on function public.load_public_landing_action_summary_incremental()
  to service_role;

comment on function public.estimate_public_action_waste_kg(numeric, numeric, bigint, text)
  is 'Compatibility signature: returns only declared waste_kg; NULL is represented as zero only at aggregate sum boundaries, with waste_source_count preserved by the snapshot RPC.';
