-- PURPOSE: preserve structurally valid inactive historical formalities progress
-- while requiring current content versions for active qualification progress.
-- CALLER: the service-only association action review decision RPC through the
-- canonical readiness helper.
-- AUTHORIZATION_BOUNDARY: only service_role can execute the helper and RPC.
-- IDEMPOTENCY: the existing operation_id advisory lock and idempotent audit path
-- are preserved; this migration only refines the readiness predicate.
-- ATOMICITY: the decision RPC remains the transaction owner for review state,
-- publication, audit and notifications.
-- FAILURE_BEHAVIOR: malformed workflow, duplicate identifier, stale active
-- progress version or invalid proof timestamp returns false without throwing.
-- SEARCH_PATH: explicit pg_catalog, public.
-- GRANTS: public, anon and authenticated cannot execute either function.

create or replace function public.is_association_action_formalities_ready(
  p_preparation_data jsonb
)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  with workflow as (
    select case
      when jsonb_typeof(p_preparation_data) = 'object'
        then p_preparation_data -> 'formalitiesWorkflow'
      else null
    end as value
  ),
  trace as (
    select value -> 'trace' as value
    from workflow
  ),
  determining_facts as (
    select value -> 'determiningFacts' as value
    from trace
  ),
  official_source_ids as (
    select item as value
    from trace,
      lateral jsonb_array_elements(case
        when jsonb_typeof(value -> 'officialSourceIds') = 'array'
          then value -> 'officialSourceIds'
        else '[]'::jsonb
      end) item
  ),
  official_sources as (
    select item
    from trace,
      lateral jsonb_array_elements(case
        when jsonb_typeof(value -> 'officialSources') = 'array'
          then value -> 'officialSources'
        else '[]'::jsonb
      end) item
  ),
  formalities as (
    select item, item ->> 'id' as formality_id
    from trace,
      lateral jsonb_array_elements(case
        when jsonb_typeof(value -> 'formalities') = 'array'
          then value -> 'formalities'
        else '[]'::jsonb
      end) item
  ),
  progress_entries as (
    select item, item ->> 'formalityId' as formality_id
    from workflow,
      lateral jsonb_array_elements(case
        when jsonb_typeof(value -> 'progress') = 'array'
          then value -> 'progress'
        else '[]'::jsonb
      end) item
  ),
  required_formalities as (
    select formality_id
    from formalities
    where item ->> 'requirementStatus' = 'required'
  )
  select coalesce(
    jsonb_typeof(p_preparation_data) = 'object'
    and jsonb_typeof((select value from workflow)) = 'object'
    and (select value ->> 'schemaVersion' from workflow) = 'action-formalities-workflow-v1'
    and jsonb_typeof((select value -> 'contentVersion' from workflow)) = 'string'
    and nullif(btrim((select value ->> 'contentVersion' from workflow)), '') is not null
    and jsonb_typeof((select value from trace)) = 'object'
    and jsonb_typeof((select value -> 'qualifiedAt' from trace)) = 'string'
    and (select value ->> 'qualifiedAt' from trace) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
    and pg_catalog.pg_input_is_valid((select value ->> 'qualifiedAt' from trace), 'timestamptz')
    and jsonb_typeof((select value -> 'rulesetVersion' from trace)) in ('null', 'string')
    and ((select value -> 'rulesetVersion' from trace) = 'null'::jsonb or nullif(btrim((select value ->> 'rulesetVersion' from trace)), '') is not null)
    and jsonb_typeof((select value -> 'officialSourceIds' from trace)) = 'array'
    and jsonb_typeof((select value -> 'officialSources' from trace)) = 'array'
    and jsonb_typeof((select value -> 'verifiedOn' from trace)) in ('null', 'string')
    and ((select value -> 'verifiedOn' from trace) = 'null'::jsonb or nullif(btrim((select value ->> 'verifiedOn' from trace)), '') is not null)
    and jsonb_typeof((select value -> 'actionDependencyFingerprint' from trace)) = 'string'
    and nullif(btrim((select value ->> 'actionDependencyFingerprint' from trace)), '') is not null
    and jsonb_typeof((select value from determining_facts)) = 'object'
    and jsonb_typeof((select value -> 'territory' from determining_facts)) = 'object'
    and (select value -> 'territory' ->> 'countryCode' from determining_facts) = 'FR'
    and nullif(btrim((select value -> 'territory' ->> 'code' from determining_facts)), '') is not null
    and nullif(btrim((select value -> 'territory' ->> 'label' from determining_facts)), '') is not null
    and (select value ->> 'publicSpace' from determining_facts) in ('public_domain', 'private_domain', 'unknown')
    and jsonb_typeof((select value -> 'manager' from determining_facts)) = 'object'
    and (select value -> 'manager' ->> 'kind' from determining_facts) in ('paris_city', 'state', 'sncf', 'haropa', 'other_public', 'private', 'unknown')
    and jsonb_typeof((select value -> 'manager' -> 'label' from determining_facts)) in ('null', 'string')
    and jsonb_typeof((select value -> 'isCleanwalk' from determining_facts)) = 'boolean'
    and (jsonb_typeof((select value -> 'isPublicRoadwayActivity' from determining_facts)) = 'boolean' or (select value ->> 'isPublicRoadwayActivity' from determining_facts) = 'unknown')
    and (jsonb_typeof((select value -> 'isItinerant' from determining_facts)) = 'boolean' or (select value ->> 'isItinerant' from determining_facts) = 'unknown')
    and (jsonb_typeof((select value -> 'isClaiming' from determining_facts)) = 'boolean' or (select value ->> 'isClaiming' from determining_facts) = 'unknown')
    and (jsonb_typeof((select value -> 'hasInstallations' from determining_facts)) = 'boolean' or (select value ->> 'hasInstallations' from determining_facts) = 'unknown')
    and (jsonb_typeof((select value -> 'requiresPhysicalOccupation' from determining_facts)) = 'boolean' or (select value ->> 'requiresPhysicalOccupation' from determining_facts) = 'unknown')
    and (jsonb_typeof((select value -> 'localCustomaryUse' from determining_facts)) = 'boolean' or (select value ->> 'localCustomaryUse' from determining_facts) = 'unknown')
    and (jsonb_typeof((select value -> 'largeCrowdOrComplexInstallations' from determining_facts)) = 'boolean' or (select value ->> 'largeCrowdOrComplexInstallations' from determining_facts) = 'unknown')
    and jsonb_typeof((select value -> 'formalities' from trace)) = 'array'
    and jsonb_typeof((select value -> 'progress' from workflow)) = 'array'
    and not exists (
      select 1
      from official_source_ids
      where jsonb_typeof(value) <> 'string'
        or nullif(btrim(value #>> '{}'), '') is null
    )
    and not exists (
      select 1
      from official_source_ids
      group by value #>> '{}'
      having count(*) > 1
    )
    and not exists (
      select 1
      from official_sources
      where not coalesce(
        jsonb_typeof(item) = 'object'
        and nullif(btrim(item ->> 'id'), '') is not null
        and nullif(btrim(item ->> 'url'), '') is not null
        and item ->> 'authorityLevel' in ('municipal', 'police', 'national')
        and nullif(btrim(item ->> 'verifiedOn'), '') is not null,
        false
      )
    )
    and not exists (
      select 1
      from official_sources
      group by item ->> 'id'
      having count(*) > 1
    )
    and not exists (
      select 1
      from formalities
      where not coalesce(
        jsonb_typeof(item) = 'object'
        and nullif(btrim(item ->> 'id'), '') is not null
        and item ->> 'requirementStatus' in ('required', 'recommended', 'not_required', 'unknown')
        and item ->> 'procedureKind' in ('city_aot', 'police_declaration', 'other_manager', 'information_only', 'none', 'unknown')
        and item ? 'sourceId'
        and jsonb_typeof(item -> 'sourceId') in ('null', 'string')
        and (item -> 'sourceId' = 'null'::jsonb or nullif(btrim(item ->> 'sourceId'), '') is not null),
        false
      )
    )
    and not exists (
      select 1
      from formalities
      group by formality_id
      having count(*) > 1
    )
    and not exists (
      select 1
      from progress_entries
      where not coalesce(
        jsonb_typeof(item) = 'object'
        and nullif(btrim(item ->> 'formalityId'), '') is not null
        and item ->> 'userStatus' in ('not_started', 'prepared', 'sent')
        and jsonb_typeof(item -> 'contentVersion') = 'string'
        and jsonb_typeof(item -> 'active') = 'boolean'
        and (
          item -> 'active' <> 'true'::jsonb
          or item ->> 'contentVersion' = (select value ->> 'contentVersion' from workflow)
        )
        and item ? 'statusChangedAt'
        and (
          jsonb_typeof(item -> 'statusChangedAt') = 'null'
          or (
            jsonb_typeof(item -> 'statusChangedAt') = 'string'
            and (item ->> 'statusChangedAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
            and pg_catalog.pg_input_is_valid(item ->> 'statusChangedAt', 'timestamptz')
          )
        )
        and item ? 'proof'
        and (
          jsonb_typeof(item -> 'proof') = 'null'
          or (
            jsonb_typeof(item -> 'proof') = 'object'
            and item -> 'proof' ->> 'kind' in ('user_declared', 'official_confirmation')
            and item -> 'proof' ? 'reference'
            and jsonb_typeof(item -> 'proof' -> 'reference') in ('null', 'string')
            and jsonb_typeof(item -> 'proof' -> 'recordedAt') = 'string'
            and (item -> 'proof' ->> 'recordedAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
            and pg_catalog.pg_input_is_valid(item -> 'proof' ->> 'recordedAt', 'timestamptz')
          )
        )
        and jsonb_typeof(item -> 'validForQualification') = 'boolean'
        and item ? 'invalidatedAt'
        and (
          jsonb_typeof(item -> 'invalidatedAt') = 'null'
          or (
            jsonb_typeof(item -> 'invalidatedAt') = 'string'
            and (item ->> 'invalidatedAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
            and pg_catalog.pg_input_is_valid(item ->> 'invalidatedAt', 'timestamptz')
          )
        ),
        false
      )
    )
    and not exists (
      select 1
      from progress_entries
      group by formality_id
      having count(*) > 1
    )
    and not exists (
      select 1
      from progress_entries progress
      where progress.item -> 'active' = 'true'::jsonb
        and not exists (
          select 1 from formalities formality
          where formality.formality_id = progress.formality_id
        )
    )
    and not exists (
      select 1
      from formalities formality
      where not exists (
        select 1 from progress_entries progress
        where progress.formality_id = formality.formality_id
          and progress.item -> 'active' = 'true'::jsonb
      )
    )
    and not exists (
      select 1
      from required_formalities required
      where required.formality_id is null
        or not exists (
          select 1
          from progress_entries progress
          where progress.formality_id = required.formality_id
            and progress.item ->> 'userStatus' = 'sent'
            and progress.item -> 'active' = 'true'::jsonb
            and progress.item -> 'validForQualification' = 'true'::jsonb
            and jsonb_typeof(progress.item -> 'proof') = 'object'
            and progress.item -> 'proof' ->> 'kind' in ('user_declared', 'official_confirmation')
            and progress.item -> 'proof' ? 'reference'
            and jsonb_typeof(progress.item -> 'proof' -> 'reference') in ('null', 'string')
            and (progress.item -> 'proof' ->> 'recordedAt') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
            and pg_catalog.pg_input_is_valid(progress.item -> 'proof' ->> 'recordedAt', 'timestamptz')
        )
    ),
    false
  );
$$;

revoke all on function public.is_association_action_formalities_ready(jsonb)
  from public, anon, authenticated;
grant execute on function public.is_association_action_formalities_ready(jsonb)
  to service_role;
