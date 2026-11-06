-- PUBLIC-COLLECTION-REFERENCE-PRIVACY-2026-11
-- PURPOSE: exclude invite-link actions from the public historical collection
--          population while preserving the existing arithmetic averages.
-- CALLER: anon/authenticated through the public aggregate RPC; server readers
--         may call it through the existing public contract.
-- AUTHORIZATION_BOUNDARY: SECURITY INVOKER remains in force; RLS and existing
--                         grants are not widened by this correction.
-- IDEMPOTENCY: CREATE OR REPLACE is safe to replay after a partial migration.
-- ATOMICITY: the function definition and grants are applied in one migration.
-- FAILURE_BEHAVIOR: an incomplete definition is not exposed by this migration.
-- SEARCH_PATH: fixed to pg_catalog; the public table is schema-qualified.
-- GRANTS: anon and authenticated retain EXECUTE; all other public grants are
--         revoked as in the existing public RPC contract.

create or replace function public.action_collection_reference_averages_v1()
returns table (
  waste_per_volunteer numeric,
  butts_per_volunteer numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  with eligible_actions as (
    select
      a.waste_kg,
      a.cigarette_butts,
      a.volunteers_count::numeric as volunteers_count
    from public.actions as a
    where a.status = 'approved'
      and coalesce(a.moderation_visibility, 'visible') = 'visible'
      and coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
      and coalesce(a.access_mode, 'public') = 'public'
      and a.action_date <= current_date
      and a.volunteers_count > 0
      and (
        (a.waste_kg is not null and a.waste_kg >= 0 and a.waste_kg <= 100000)
        or
        (a.cigarette_butts is not null and a.cigarette_butts >= 0 and a.cigarette_butts <= 5000000)
      )
  )
  select
    avg(waste_kg / volunteers_count)
      filter (where waste_kg is not null and waste_kg >= 0 and waste_kg <= 100000),
    avg(cigarette_butts::numeric / volunteers_count)
      filter (where cigarette_butts is not null and cigarette_butts >= 0 and cigarette_butts <= 5000000),
    count(*) filter (where waste_kg is not null and waste_kg >= 0 and waste_kg <= 100000)::integer,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0 and cigarette_butts <= 5000000)::integer,
    count(*)::integer,
    'action-collection-reference-averages-v1'::text,
    now()
  from eligible_actions;
$$;

revoke all on function public.action_collection_reference_averages_v1() from public;
grant execute on function public.action_collection_reference_averages_v1() to anon, authenticated;
