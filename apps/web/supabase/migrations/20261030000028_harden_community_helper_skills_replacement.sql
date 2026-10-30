-- PURPOSE: serialize complete helper-skill replacements per user and prevent
--   direct browser DML from bypassing the replacement boundary.
-- CALLER: authenticated HTTP routes after Clerk identity resolution, through
--   the service-role Supabase client and server-only replacement RPC.
-- AUTHORIZATION_BOUNDARY: authenticated keeps owner-scoped SELECT under RLS;
--   only service_role keeps INSERT, UPDATE and DELETE and can execute the RPC.
-- IDEMPOTENCY: each invocation replaces the complete owner set; the
--   transaction advisory lock serializes invocations for the same user_id.
-- ATOMICITY: validation, DELETE and INSERT occur in one function transaction.
-- FAILURE_BEHAVIOR: invalid or duplicate categories raise before any durable
--   replacement state is committed; PostgreSQL rolls back the invocation.
-- SEARCH_PATH: the SECURITY DEFINER RPC pins search_path to pg_catalog, public.
-- GRANTS: authenticated can SELECT only; service_role owns server-side DML
--   and replacement execution.

revoke insert, update, delete
  on table public.community_helper_skills
  from public, anon, authenticated;

grant select
  on table public.community_helper_skills
  to authenticated, service_role;

grant insert, update, delete
  on table public.community_helper_skills
  to service_role;

create or replace function public.replace_community_helper_skills(
  p_user_id text,
  p_categories text[]
)
returns setof public.community_helper_skills
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_category text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'community_helper_skills_server_only' using errcode = '42501';
  end if;

  if nullif(btrim(p_user_id), '') is null then
    raise exception 'community_helper_skills_user_required' using errcode = '22023';
  end if;

  if p_categories is null then
    raise exception 'community_helper_skills_categories_required' using errcode = '22023';
  end if;

  -- The lock is transaction-scoped and keyed by the canonical owner id. It
  -- forces concurrent complete replacements for one member to run one after
  -- another, so the second DELETE cannot observe and preserve a stale union.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  foreach v_category in array p_categories loop
    if v_category is null or v_category not in (
      'materiel',
      'transport',
      'renfort_benevole',
      'communication',
      'photo_video',
      'cartographie',
      'expertise',
      'logistique'
    ) then
      raise exception 'community_helper_skills_invalid_category' using errcode = '23514';
    end if;
  end loop;

  if cardinality(p_categories) <> (
    select count(distinct category)::integer
    from unnest(p_categories) as categories(category)
  ) then
    raise exception 'community_helper_skills_duplicate_category' using errcode = '23505';
  end if;

  delete from public.community_helper_skills
  where user_id = p_user_id;

  insert into public.community_helper_skills (user_id, category)
  select p_user_id, categories.category
  from unnest(p_categories) as categories(category);

  return query
  select skills.*
  from public.community_helper_skills as skills
  where skills.user_id = p_user_id
  order by skills.category;
end;
$$;

revoke all on function public.replace_community_helper_skills(text, text[])
  from public, anon, authenticated;
grant execute on function public.replace_community_helper_skills(text, text[])
  to service_role;
