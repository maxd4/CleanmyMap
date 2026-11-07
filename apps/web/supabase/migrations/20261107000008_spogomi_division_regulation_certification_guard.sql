-- SPOGOMI: certification completeness guard.
--
-- PURPOSE: keep the SQL certification predicate aligned with the server domain validator.
-- CALLER: the service-only regulation configuration RPC and certification consumers.
-- AUTHORIZATION_BOUNDARY: this is a SECURITY INVOKER read predicate; the existing RPC grants remain unchanged.
-- ATOMICITY: the caller raises inside its transaction when this predicate is false.
-- FAILURE_BEHAVIOR: incomplete configurations remain persistable; complete configurations fail closed.
-- SEARCH_PATH: fixed to pg_catalog, public.

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
           or c.is_complete is distinct from true
           or c.coefficient_status is distinct from 'confirmed'
           or c.coefficient is null
           or c.coefficient::text = 'NaN'
           or length(btrim(coalesce(c.environmental_category_slug, ''))) = 0
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
          and not exists (
            select 1
              from jsonb_array_elements_text(c.regulation_config -> 'tiebreakers') item(value)
             where item.value not in ('sporting_score', 'mass_grams', 'counted_objects')
          )
          and (select count(*) from jsonb_array_elements_text(c.regulation_config -> 'tiebreakers')) =
              (select count(distinct value) from jsonb_array_elements_text(c.regulation_config -> 'tiebreakers') item(value))
         from config c
     ), false)
     and (select count(*) from mappings) = (select count(*) from categories)
     and (select count(distinct category_rule_id) from mappings) = (select count(*) from categories)
     and not exists (
       select 1 from mappings m
        where m.mapping_status is distinct from 'mapped'
           or length(btrim(coalesce(m.environmental_category_slug, ''))) = 0
           or length(btrim(coalesce(m.source_field, ''))) = 0
           or length(btrim(coalesce(m.source_unit, ''))) = 0
           or length(btrim(coalesce(m.target_unit, ''))) = 0
           or m.unit_factor_to_target is null
           or m.unit_factor_to_target::text = 'NaN'
           or m.unit_factor_to_target <= 0
     )
     and not exists (
       select 1 from categories c
        where not exists (
          select 1 from mappings m
           where m.category_rule_id = c.id
        )
     );
$$;
