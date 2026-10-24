-- PURPOSE: persist only explicit partner engagement declarations for the
-- annuaire filter while keeping legacy display types untouched.
-- CALLER: the existing service_role-only onboarding RPC inserts the pending
-- annuaire projection; this trigger copies its public declaration to the
-- private source request in the same transaction.
-- AUTHORIZATION_BOUNDARY: the request and projection remain service_role-only;
-- no public table or function grant is added.
-- IDEMPOTENCY: the existing onboarding RPC still resolves the first request
-- for (submitted_by_user_id, idempotency_key); a retry does not reapply data.
-- ATOMICITY: the source declaration and pending public projection are written
-- in the same transaction and a validation failure rolls both back.
-- FAILURE_BEHAVIOR: invalid, duplicate or provenance-less declarations fail
-- closed; historical synthetic types remain an empty filter classification.
-- SEARCH_PATH: the trigger function pins search_path to public, pg_temp.

alter table public.partner_onboarding_requests
  add column if not exists engagement_types text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.partner_onboarding_requests'::regclass
      and conname = 'partner_onboarding_engagement_types_allowed'
  ) then
    alter table public.partner_onboarding_requests
      add constraint partner_onboarding_engagement_types_allowed
      check (
        engagement_types <@ array['environnemental', 'social', 'humanitaire']::text[]
        and cardinality(engagement_types) <= 3
      );
  end if;
end;
$$;

create or replace function public.sync_partner_engagement_types_from_annuaire()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_engagement_types text[] := '{}'::text[];
  v_type_count integer := 0;
  v_distinct_type_count integer := 0;
begin
  if NEW.public_data->>'engagementTypesSource' is not null
     and NEW.public_data->>'engagementTypesSource' <> 'partner_declaration' then
    raise exception 'invalid partner engagement types provenance';
  end if;

  if NEW.public_data->>'engagementTypesSource' = 'partner_declaration' then
    if jsonb_typeof(NEW.public_data->'types') <> 'array' then
      raise exception 'partner engagement declaration must be an array';
    end if;

    select
      coalesce(array_agg(item.value order by item.ordinality), '{}'::text[]),
      count(*)::integer,
      count(distinct item.value)::integer
    into v_engagement_types, v_type_count, v_distinct_type_count
    from jsonb_array_elements_text(NEW.public_data->'types')
      with ordinality as item(value, ordinality);

    if v_type_count = 0
       or v_type_count > 3
       or v_type_count <> v_distinct_type_count
       or exists (
         select 1
         from unnest(v_engagement_types) as engagement_type
         where engagement_type not in ('environnemental', 'social', 'humanitaire')
       ) then
      raise exception 'invalid partner engagement types';
    end if;
  end if;

  update public.partner_onboarding_requests
  set engagement_types = v_engagement_types
  where id = NEW.source_request_id;

  if not found then
    raise exception 'partner onboarding source request not found';
  end if;

  return NEW;
end;
$$;

drop trigger if exists sync_partner_engagement_types_from_annuaire
  on public.partner_annuaire_entries;
create trigger sync_partner_engagement_types_from_annuaire
after insert or update of public_data on public.partner_annuaire_entries
for each row
execute function public.sync_partner_engagement_types_from_annuaire();

revoke all on function public.sync_partner_engagement_types_from_annuaire()
  from public, anon, authenticated;
grant execute on function public.sync_partner_engagement_types_from_annuaire()
  to service_role;
