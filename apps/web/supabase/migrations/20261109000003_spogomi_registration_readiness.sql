-- SPOGOMI: server-owned preparation gate for new self-service registrations.
--
-- Existing event, division, route and field-operation contracts remain the
-- sources of truth. The only new persisted values live in the existing
-- spogomi_events.regulation_config.registrationPolicy object:
-- safety/contact/assistance text, their explicit verification flags, and the
-- minor-applicability declaration plus its information/verification flag.

create or replace function public.spogomi_registration_readiness(p_event_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_policy jsonb;
  v_edition_items jsonb;
  v_divisions jsonb := '[]'::jsonb;
  v_division record;
  v_items jsonb;
  v_division_ready boolean;
  v_ready boolean := true;
  v_minors_applicable boolean;
begin
  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event not found';
  end if;

  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);
  v_minors_applicable := case
    when jsonb_typeof(v_policy -> 'minorsApplicable') = 'boolean'
      then (v_policy ->> 'minorsApplicable')::boolean
    else null
  end;

  v_edition_items := jsonb_build_array(
    jsonb_build_object(
      'id', 'meeting_point',
      'label', 'Lieu de rendez-vous',
      'status', case when length(btrim(coalesce(v_event.location_label, ''))) > 0 and v_event.location_label <> 'Lieu à préciser' then 'complete' else 'incomplete' end,
      'required', true,
      'href', '#spogomi-event-information'
    ),
    jsonb_build_object(
      'id', 'collection_scope',
      'label', 'Périmètre de collecte',
      'status', case when exists (
        select 1 from public.spogomi_event_routes route
         where route.event_id = p_event_id
           and route.point_count >= 2
           and jsonb_typeof(route.geometry_geojson) = 'object'
      ) then 'complete' else 'incomplete' end,
      'required', true,
      'href', '#spogomi-route'
    ),
    jsonb_build_object(
      'id', 'safety_instructions',
      'label', 'Consignes de sécurité',
      'status', case
        when length(btrim(coalesce(v_policy ->> 'safetyInstructions', ''))) = 0 then 'incomplete'
        when jsonb_typeof(v_policy -> 'safetyInstructionsVerified') = 'boolean' and (v_policy ->> 'safetyInstructionsVerified')::boolean then 'complete'
        else 'not_verified'
      end,
      'required', true,
      'href', '#spogomi-registration-readiness'
    ),
    jsonb_build_object(
      'id', 'organization_contact',
      'label', 'Contact d’organisation',
      'status', case
        when length(btrim(coalesce(v_policy ->> 'organizationContact', ''))) = 0 then 'incomplete'
        when jsonb_typeof(v_policy -> 'organizationContactVerified') = 'boolean' and (v_policy ->> 'organizationContactVerified')::boolean then 'complete'
        else 'not_verified'
      end,
      'required', true,
      'href', '#spogomi-registration-readiness'
    ),
    jsonb_build_object(
      'id', 'assistance_procedure',
      'label', 'Procédure d’assistance',
      'status', case
        when length(btrim(coalesce(v_policy ->> 'assistanceProcedure', ''))) = 0 then 'incomplete'
        when jsonb_typeof(v_policy -> 'assistanceProcedureVerified') = 'boolean' and (v_policy ->> 'assistanceProcedureVerified')::boolean then 'complete'
        else 'not_verified'
      end,
      'required', true,
      'href', '#spogomi-registration-readiness'
    ),
    jsonb_build_object(
      'id', 'minor_information',
      'label', 'Informations utiles aux mineurs',
      'status', case
        when v_minors_applicable is null then 'incomplete'
        when v_minors_applicable = false then 'complete'
        when length(btrim(coalesce(v_policy ->> 'minorInformation', ''))) = 0 then 'incomplete'
        when jsonb_typeof(v_policy -> 'minorInformationVerified') = 'boolean' and (v_policy ->> 'minorInformationVerified')::boolean then 'complete'
        else 'not_verified'
      end,
      'required', coalesce(v_minors_applicable, true),
      'href', '#spogomi-registration-readiness'
    )
  );

  if exists (
    select 1 from jsonb_array_elements(v_edition_items) item
     where (item ->> 'required')::boolean and item ->> 'status' <> 'complete'
  ) then
    v_ready := false;
  end if;

  for v_division in
    select d.id, d.division_type, d.regulation_version, d.regulation_config
      from public.spogomi_divisions d
     where d.event_id = p_event_id
     order by d.division_type
  loop
    v_policy := coalesce(v_division.regulation_config -> 'registrationPolicy', '{}'::jsonb)
      || coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb);
    v_items := jsonb_build_array(
      jsonb_build_object(
        'id', 'regulation',
        'label', 'Règlement applicable, version et source',
        'status', case when public.spogomi_division_regulation_is_complete(p_event_id, v_division.id, v_division.regulation_version) then 'complete' else 'incomplete' end,
        'required', true,
        'href', '#spogomi-regulation-' || v_division.id
      ),
      jsonb_build_object(
        'id', 'categories',
        'label', 'Catégories et barèmes',
        'status', case when exists (
          select 1 from public.spogomi_category_rules category
           where category.event_id = p_event_id
             and category.division_id = v_division.id
             and category.regulation_version = v_division.regulation_version
        ) and not exists (
          select 1 from public.spogomi_category_rules category
           where category.event_id = p_event_id
             and category.division_id = v_division.id
             and category.regulation_version = v_division.regulation_version
             and (not category.is_complete or length(btrim(category.code)) = 0 or length(btrim(category.label)) = 0 or length(btrim(category.unit)) = 0)
        ) then 'complete' else 'incomplete' end,
        'required', true,
        'href', '#spogomi-regulation-' || v_division.id
      ),
      jsonb_build_object(
        'id', 'schedule',
        'label', 'Horaires officiels',
        'status', case when exists (
          select 1 from public.spogomi_field_operations operation
           where operation.event_id = p_event_id
             and operation.division_id = v_division.id
             and operation.regulation_version = v_division.regulation_version
             and exists (select 1 from pg_timezone_names zone where zone.name = operation.timezone_name)
             and operation.official_start_at is not null
             and operation.collection_limit_at is not null
             and operation.sorting_limit_at is not null
             and operation.weighing_start_at is not null
             and operation.weighing_end_at is not null
        ) then 'complete' else 'incomplete' end,
        'required', true,
        'href', '#operations'
      ),
      jsonb_build_object(
        'id', 'capacity',
        'label', 'Capacité d’inscription',
        'status', case when coalesce((v_policy ->> 'capacity') ~ '^[1-9][0-9]*$', false) then 'complete' else 'incomplete' end,
        'required', true,
        'href', '#spogomi-registration-readiness'
      ),
      jsonb_build_object(
        'id', 'eligibility',
        'label', 'Conditions d’éligibilité',
        'status', case when jsonb_typeof(v_division.regulation_config -> 'eligibility') = 'object' and jsonb_typeof(v_division.regulation_config #> '{eligibility,requiresAllCategories}') = 'boolean' then 'complete' else 'incomplete' end,
        'required', true,
        'href', '#spogomi-regulation-' || v_division.id
      )
    );
    select not exists (
      select 1 from jsonb_array_elements(v_items) item
       where (item ->> 'required')::boolean and item ->> 'status' <> 'complete'
    ) into v_division_ready;
    if not v_division_ready then v_ready := false; end if;
    v_divisions := v_divisions || jsonb_build_array(jsonb_build_object(
      'divisionId', v_division.id,
      'divisionType', v_division.division_type,
      'ready', v_division_ready,
      'items', v_items
    ));
  end loop;

  return jsonb_build_object(
    'eventId', p_event_id,
    'ready', v_ready,
    'policy', coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb),
    'editionItems', v_edition_items,
    'divisions', v_divisions
  );
end;
$$;

create or replace function public.spogomi_update_registration_policy(
  p_event_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text,
  p_registration_policy jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_policy jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 or jsonb_typeof(coalesce(p_registration_policy, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '42501', message = 'SPOGOMI registration policy update is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then raise exception using errcode = '40001', message = 'The SPOGOMI preparation revision changed'; end if;
  if v_event.state not in ('draft', 'registration_open') then raise exception using errcode = '23514', message = 'La préparation des inscriptions est verrouillée par l’état de l’édition'; end if;
  if jsonb_typeof(p_registration_policy -> 'capacity') = 'number' and (p_registration_policy ->> 'capacity') !~ '^[1-9][0-9]*$' then raise exception using errcode = '23514', message = 'La capacité doit être un entier positif'; end if;
  if jsonb_typeof(p_registration_policy -> 'minorsApplicable') is not null and jsonb_typeof(p_registration_policy -> 'minorsApplicable') <> 'boolean' then raise exception using errcode = '23514', message = 'La déclaration mineurs est invalide'; end if;
  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb) || p_registration_policy;
  perform set_config('spogomi.composition_write_context', 'registration_policy_update', true);
  update public.spogomi_events
     set regulation_config = jsonb_set(coalesce(regulation_config, '{}'::jsonb), '{registrationPolicy}', v_policy, true),
         composition_revision = composition_revision + 1,
         updated_at = now()
   where id = p_event_id;
  select * into v_event from public.spogomi_events where id = p_event_id;
  return to_jsonb(v_event);
end;
$$;

create or replace function public.spogomi_open_registration(
  p_event_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_readiness jsonb;
  v_policy jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI registration opening is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then raise exception using errcode = '40001', message = 'The SPOGOMI preparation revision changed'; end if;
  if v_event.state <> 'draft' then raise exception using errcode = '23514', message = 'Les inscriptions ne peuvent être ouvertes que depuis un brouillon'; end if;
  if v_event.public_visibility <> 'published' then raise exception using errcode = '42501', message = 'La fiche publique doit être publiée avant l’ouverture des inscriptions'; end if;
  v_readiness := public.spogomi_registration_readiness(p_event_id);
  if coalesce((v_readiness ->> 'ready')::boolean, false) = false then
    raise exception using errcode = '23514', message = 'spogomi_registration_readiness_incomplete';
  end if;
  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb) || jsonb_build_object('directRegistrationOpen', true);
  perform set_config('spogomi.composition_write_context', 'registration_open', true);
  update public.spogomi_events
     set state = 'registration_open',
         regulation_config = jsonb_set(coalesce(regulation_config, '{}'::jsonb), '{registrationPolicy}', v_policy, true),
         composition_revision = composition_revision + 1,
         updated_at = now()
   where id = p_event_id;
  select * into v_event from public.spogomi_events where id = p_event_id;
  return to_jsonb(v_event);
end;
$$;

revoke all on function public.spogomi_registration_readiness(uuid) from public, anon, authenticated;
grant execute on function public.spogomi_registration_readiness(uuid) to service_role;
revoke all on function public.spogomi_update_registration_policy(uuid, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_update_registration_policy(uuid, bigint, text, jsonb) to service_role;
revoke all on function public.spogomi_open_registration(uuid, bigint, text) from public, anon, authenticated;
grant execute on function public.spogomi_open_registration(uuid, bigint, text) to service_role;

comment on function public.spogomi_registration_readiness(uuid) is
  'Canonical server-side checklist for opening new self-service SPOGOMI registrations. It does not invalidate existing participants or administrative workflows.';
