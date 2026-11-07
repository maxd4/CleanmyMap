-- PURPOSE: reconcile the public contextual-reference overload with the dated
--          service-only implementation so current revocations and the minimum
--          source rule cannot diverge between signatures.
-- CALLER: anon/authenticated use the historical zero-argument contract;
--         service_role uses the dated as-of contract directly.
-- AUTHORIZATION_BOUNDARY: the public wrapper is SECURITY DEFINER only because
--                         it delegates to the service-owned implementation;
--                         it returns aggregate rows and never exposes snapshots.
-- IDEMPOTENCY: CREATE OR REPLACE preserves the public function identity and
--              its existing grants.
-- ATOMICITY: the wrapper definition, owner and grants are installed together.
-- FAILURE_BEHAVIOR: the dated implementation remains the sole source of the
--                   eligibility predicate, formulas and two-source threshold.
-- SEARCH_PATH: fixed to pg_catalog, public; the delegated function is qualified.
-- GRANTS: anon and authenticated retain only the zero-argument public contract;
--         the dated overload remains service_role-only.

create or replace function public.action_collection_context_reference_averages_v1()
returns table (
  action_context text,
  waste_per_effective_unit numeric,
  butts_per_effective_unit numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select *
  from public.action_collection_context_reference_averages_v1(current_date);
$$;

alter function public.action_collection_context_reference_averages_v1()
  owner to postgres;

revoke all on function public.action_collection_context_reference_averages_v1()
  from public;
grant execute on function public.action_collection_context_reference_averages_v1()
  to anon, authenticated;
