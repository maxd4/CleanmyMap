-- SPOGOMI: organizer-owned division regulation configuration.
--
-- The existing nine-argument RPC remains the compatibility owner for the
-- division snapshot. This overload adds the missing category and mapping
-- writes in one transaction. It is service_role-only; the web service performs
-- the organizer relation check before invoking it.

create or replace function public.spogomi_division_regulation_is_complete(
  p_event_id uuid,
  p_division_id uuid,
  p_regulation_version text
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with division_config as (
    select d.*, e.environmental_mapping_version
      from public.spogomi_divisions d
      join public.spogomi_events e on e.id = d.event_id
     where d.id = p_division_id
       and d.event_id = p_event_id
       and d.regulation_version = p_regulation_version
       and d.regulation_status = 'complete'
       and length(btrim(coalesce(d.regulation_source_reference, ''))) > 0
  ), categories as (
    select c.*
      from public.spogomi_category_rules c
     where c.event_id = p_event_id
       and c.division_id = p_division_id
       and c.regulation_version = p_regulation_version
  ), config as (
    select d.regulation_config, d.environmental_mapping_version
      from division_config d
  ), mappings as (
    select m.*
      from public.spogomi_environment_category_mappings m
      join config c on c.environmental_mapping_version = m.mapping_version
     where m.event_id = p_event_id
       and m.division_id = p_division_id
  )
  select exists (select 1 from division_config)
     and exists (select 1 from categories)
     and not exists (
       select 1 from categories c
        where length(btrim(c.code)) = 0
           or length(btrim(c.label)) = 0
           or length(btrim(c.unit)) = 0
           or c.is_complete = false
           or (c.coefficient_status = 'confirmed' and (c.coefficient is null or c.coefficient::text = 'NaN'))
     )
     and coalesce((
       select jsonb_typeof(c.regulation_config -> 'rounding') = 'object'
          and jsonb_typeof(c.regulation_config #> '{rounding,decimals}') = 'number'
          and (c.regulation_config #>> '{rounding,mode}') in ('half_up', 'down', 'up')
         from config c
     ), false)
     and coalesce((
       select jsonb_typeof(c.regulation_config -> 'eligibility') = 'object'
          and jsonb_typeof(c.regulation_config #> '{eligibility,requiresAllCategories}') = 'boolean'
         from config c
     ), false)
     and coalesce((
       select jsonb_typeof(c.regulation_config -> 'tiebreakers') = 'array'
          and jsonb_array_length(c.regulation_config -> 'tiebreakers') > 0
          and (select count(*) from jsonb_array_elements_text(c.regulation_config -> 'tiebreakers')) =
              (select count(distinct value) from jsonb_array_elements_text(c.regulation_config -> 'tiebreakers') item(value))
         from config c
     ), false)
     and (select count(*) from mappings) = (select count(*) from categories)
     and not exists (
       select 1 from mappings m
        where m.mapping_status = 'unmapped'
           or (m.mapping_status = 'excluded' and length(btrim(coalesce(m.exclusion_reason, ''))) = 0)
           or (m.mapping_status = 'mapped' and (m.environmental_category_slug is null or m.source_field is null or m.target_unit is null or m.unit_factor_to_target is null or m.unit_factor_to_target <= 0))
     )
     and not exists (
       select 1 from categories c
        where not exists (select 1 from mappings m where m.category_rule_id = c.id)
     );
$$;

create or replace function public.spogomi_update_division_regulation(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text,
  p_regulation_version text,
  p_regulation_status text,
  p_regulation_source_reference text,
  p_regulation_config jsonb,
  p_team_size_config jsonb,
  p_categories jsonb,
  p_environment_mappings jsonb
)
returns public.spogomi_divisions
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_division public.spogomi_divisions%rowtype;
  v_item jsonb;
  v_category_id uuid;
  v_category_code text;
  v_mapping_version text;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_event_id is null or p_division_id is null
     or p_expected_revision is null or p_expected_revision < 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or length(btrim(coalesce(p_regulation_version, ''))) = 0
     or p_regulation_status not in ('incomplete', 'complete')
     or jsonb_typeof(coalesce(p_regulation_config, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_team_size_config, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_categories, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_environment_mappings, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '42501', message = 'SPOGOMI division regulation update is forbidden';
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'The SPOGOMI preparation revision changed';
  end if;
  if v_event.state not in ('draft', 'registration_open') then
    raise exception using errcode = '23514', message = 'La configuration du règlement est verrouillée par l’état de l’édition';
  end if;
  if exists (select 1 from public.spogomi_result_submissions where event_id = p_event_id and division_id = p_division_id) then
    raise exception using errcode = '23514', message = 'La configuration est protégée après la première soumission';
  end if;

  select * into v_division from public.spogomi_divisions
   where id = p_division_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI division not found'; end if;

  if v_division.division_type = 'casual' and (
    jsonb_typeof(p_team_size_config #> '{casual,minMembers}') not in ('number', 'null')
    or jsonb_typeof(p_team_size_config #> '{casual,maxMembers}') not in ('number', 'null')
    or (p_team_size_config #>> '{casual,minMembers}' is not null and (p_team_size_config #>> '{casual,minMembers}') !~ '^[1-9][0-9]*$')
    or (p_team_size_config #>> '{casual,maxMembers}' is not null and (p_team_size_config #>> '{casual,maxMembers}') !~ '^[1-9][0-9]*$')
    or ((p_team_size_config #>> '{casual,minMembers}')::integer > (p_team_size_config #>> '{casual,maxMembers}')::integer)
  ) then
    raise exception using errcode = '23514', message = 'Les bornes Casual sont invalides';
  end if;
  if p_regulation_status = 'complete' and jsonb_array_length(p_categories) = 0 then
    raise exception using errcode = '23514', message = 'Une configuration complète nécessite au moins une catégorie';
  end if;

  for v_item in select value from jsonb_array_elements(p_categories)
  loop
    v_category_code := btrim(coalesce(v_item ->> 'code', ''));
    if v_category_code = '' or btrim(coalesce(v_item ->> 'label', '')) = '' or btrim(coalesce(v_item ->> 'unit', '')) = '' then
      raise exception using errcode = '23514', message = 'Chaque catégorie doit avoir un code, un libellé et une unité';
    end if;
    if (select count(*) from jsonb_array_elements(p_categories) item where btrim(coalesce(item ->> 'code', '')) = v_category_code) > 1 then
      raise exception using errcode = '23514', message = 'Les codes de catégorie doivent être uniques';
    end if;
    if v_item ->> 'measurementKind' not in ('mass', 'count', 'volume')
       or v_item ->> 'coefficientStatus' not in ('unknown', 'confirmed', 'not_applicable')
       or jsonb_typeof(v_item -> 'isComplete') <> 'boolean'
       or jsonb_typeof(v_item -> 'displayOrder') <> 'number' then
      raise exception using errcode = '23514', message = 'La catégorie contient une valeur non autorisée';
    end if;
    if v_item ->> 'coefficientStatus' = 'confirmed' and (v_item -> 'coefficient') is null then
      raise exception using errcode = '23514', message = 'Un coefficient confirmé doit être renseigné';
    end if;
  end loop;

  if jsonb_typeof(p_regulation_config -> 'rounding') = 'object' then
    if (p_regulation_config #>> '{rounding,mode}') not in ('half_up', 'down', 'up')
       or (p_regulation_config #>> '{rounding,decimals}') !~ '^[0-6]$' then
      raise exception using errcode = '23514', message = 'L’arrondi du règlement est invalide';
    end if;
  end if;
  if jsonb_typeof(p_regulation_config -> 'eligibility') = 'object'
     and jsonb_typeof(p_regulation_config #> '{eligibility,requiresAllCategories}') <> 'boolean' then
    raise exception using errcode = '23514', message = 'L’éligibilité du règlement est invalide';
  end if;
  if jsonb_typeof(p_regulation_config -> 'tiebreakers') <> 'array' then
    raise exception using errcode = '23514', message = 'Les départages du règlement sont requis';
  end if;
  if exists (select 1 from jsonb_array_elements_text(p_regulation_config -> 'tiebreakers') value where value not in ('sporting_score', 'mass_grams', 'counted_objects')) then
    raise exception using errcode = '23514', message = 'Un départage du règlement est inconnu';
  end if;

  v_mapping_version := coalesce(v_event.environmental_mapping_version, 'spogomi-cleanmymap-v1');
  delete from public.spogomi_environment_category_mappings where event_id = p_event_id and division_id = p_division_id;
  delete from public.spogomi_category_rules where event_id = p_event_id and division_id = p_division_id;
  for v_item in select value from jsonb_array_elements(p_categories)
  loop
    v_category_id := nullif(v_item ->> 'id', '')::uuid;
    insert into public.spogomi_category_rules (
      event_id, division_id, regulation_version, code, label, measurement_kind, unit,
      coefficient, coefficient_status, environmental_category_slug, display_order, is_complete
    ) values (
      p_event_id, p_division_id, btrim(p_regulation_version), btrim(v_item ->> 'code'), btrim(v_item ->> 'label'),
      v_item ->> 'measurementKind', btrim(v_item ->> 'unit'), nullif(v_item ->> 'coefficient', '')::numeric,
      v_item ->> 'coefficientStatus', nullif(btrim(v_item ->> 'environmentalCategorySlug'), ''),
      (v_item ->> 'displayOrder')::integer, (v_item ->> 'isComplete')::boolean
    ) returning id into v_category_id;
  end loop;

  for v_item in select value from jsonb_array_elements(p_environment_mappings)
  loop
    select c.id into v_category_id
      from public.spogomi_category_rules c
     where c.event_id = p_event_id and c.division_id = p_division_id
       and c.regulation_version = btrim(p_regulation_version)
       and c.code = btrim(v_item ->> 'categoryCode');
    if v_category_id is null then
      raise exception using errcode = '23514', message = 'Chaque correspondance environnementale doit viser une catégorie';
    end if;
    if v_item ->> 'mappingStatus' = 'mapped' and (
      nullif(btrim(v_item ->> 'environmentalCategorySlug'), '') is null
      or v_item ->> 'sourceField' not in ('mass_grams', 'object_count', 'quantity')
      or v_item ->> 'targetUnit' not in ('grams', 'count', 'quantity')
      or nullif(v_item ->> 'unitFactorToTarget', '') is null
      or (v_item ->> 'unitFactorToTarget')::numeric <= 0
    ) then
      raise exception using errcode = '23514', message = 'Une correspondance mappée est incomplète';
    end if;
    if v_item ->> 'mappingStatus' <> 'mapped' and length(btrim(coalesce(v_item ->> 'exclusionReason', ''))) = 0 then
      raise exception using errcode = '23514', message = 'Une correspondance exclue ou non mappée doit être justifiée';
    end if;
    insert into public.spogomi_environment_category_mappings (
      event_id, division_id, category_rule_id, mapping_version, category_code,
      environmental_category_slug, source_field, source_unit, target_unit,
      unit_factor_to_target, counts_toward_total, is_megots, mapping_status, exclusion_reason
    ) values (
      p_event_id, p_division_id, v_category_id, v_mapping_version, btrim(v_item ->> 'categoryCode'),
      nullif(btrim(v_item ->> 'environmentalCategorySlug'), ''), v_item ->> 'sourceField', btrim(coalesce(v_item ->> 'sourceUnit', '')),
      v_item ->> 'targetUnit', nullif(v_item ->> 'unitFactorToTarget', '')::numeric,
      (v_item ->> 'countsTowardTotal')::boolean, (v_item ->> 'isMegots')::boolean,
      v_item ->> 'mappingStatus', nullif(btrim(v_item ->> 'exclusionReason'), '')
    );
  end loop;

  select public.spogomi_update_division_regulation(
    p_event_id, p_division_id, p_expected_revision, p_actor_clerk_id,
    p_regulation_version, p_regulation_status, p_regulation_source_reference,
    p_regulation_config, p_team_size_config
  ) into v_division;
  if p_regulation_status = 'complete' and not public.spogomi_division_regulation_is_complete(p_event_id, p_division_id, btrim(p_regulation_version)) then
    raise exception using errcode = '23514', message = 'La configuration complète ne satisfait pas les prérequis de certification';
  end if;
  update public.spogomi_events set composition_revision = composition_revision + 1, updated_at = now() where id = p_event_id;
  return v_division;
end;
$$;

revoke all on function public.spogomi_update_division_regulation(uuid, uuid, bigint, text, text, text, text, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_update_division_regulation(uuid, uuid, bigint, text, text, text, text, jsonb, jsonb, jsonb, jsonb) to service_role;
