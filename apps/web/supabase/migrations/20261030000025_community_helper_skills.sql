-- PURPOSE: persist private opt-in helper category preferences.
-- CALLER: authenticated HTTP routes after Clerk identity resolution.
-- AUTHORIZATION_BOUNDARY: RLS scopes direct authenticated access to the owner;
--   the replacement RPC is service_role-only and receives the server-resolved user id.
-- IDEMPOTENCY: the replacement RPC deletes and recreates the complete owner set in one transaction.
-- ATOMICITY: replacement is a single PostgreSQL function invocation.
-- FAILURE_BEHAVIOR: category validation or any write failure aborts the function transaction.
-- SEARCH_PATH: the SECURITY DEFINER RPC pins search_path to pg_catalog, public.
-- GRANTS: anon receives no privileges; authenticated has owner-scoped table access;
--   service_role owns the server-side replacement boundary.

create table if not exists public.community_helper_skills (
  user_id text not null,
  category text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint community_helper_skills_pkey primary key (user_id, category),
  constraint community_helper_skills_user_id_check
    check (nullif(btrim(user_id), '') is not null),
  constraint community_helper_skills_category_check
    check (category in (
      'materiel',
      'transport',
      'renfort_benevole',
      'communication',
      'photo_video',
      'cartographie',
      'expertise',
      'logistique'
    ))
);

drop trigger if exists community_helper_skills_set_updated_at on public.community_helper_skills;
create trigger community_helper_skills_set_updated_at
before update on public.community_helper_skills
for each row execute function public.set_updated_at();

alter table public.community_helper_skills enable row level security;

drop policy if exists community_helper_skills_select_own on public.community_helper_skills;
create policy community_helper_skills_select_own
on public.community_helper_skills for select
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists community_helper_skills_insert_own on public.community_helper_skills;
create policy community_helper_skills_insert_own
on public.community_helper_skills for insert
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists community_helper_skills_update_own on public.community_helper_skills;
create policy community_helper_skills_update_own
on public.community_helper_skills for update
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
)
with check (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

drop policy if exists community_helper_skills_delete_own on public.community_helper_skills;
create policy community_helper_skills_delete_own
on public.community_helper_skills for delete
using (
  (select auth.role()) = 'service_role'
  or user_id = coalesce((select auth.jwt()) ->> 'sub', '')
);

revoke all on table public.community_helper_skills from public, anon;
grant select, insert, update, delete on table public.community_helper_skills to authenticated, service_role;

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

revoke all on function public.replace_community_helper_skills(text, text[]) from public, anon, authenticated;
grant execute on function public.replace_community_helper_skills(text, text[]) to service_role;
