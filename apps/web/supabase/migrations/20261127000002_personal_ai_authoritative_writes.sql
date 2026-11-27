begin;

-- PURPOSE: keep scientific calculation and normalized import validation at the authenticated server boundary.
-- CALLER: Personal AI API routes after Clerk authentication, strict parsing, hash verification and server calculation.
-- AUTHORIZATION_BOUNDARY: authenticated keeps owner-scoped SELECT/DELETE only; service_role can execute owner-explicit RPCs, not direct table DML.
-- IDEMPOTENCY: import identity and scenario identity retain their existing owner-scoped keys; exact import retries preserve revisions.
-- ATOMICITY: each declaration, status transition or import batch is one PostgreSQL transaction.
-- FAILURE_BEHAVIOR: overlap raises 23P01; missing/foreign owner row raises 42501; invalid status raises 22023.
-- SEARCH_PATH: privileged RPCs use pg_catalog, public and fixed SECURITY DEFINER ownership.
-- GRANTS: service_role-only mutation RPCs; authenticated can read and delete its own rows under RLS.

-- No user-facing or service-role client can bypass the API's normalization, hash checks or scientific snapshot calculation.
revoke all on table public.personal_ai_declarations from authenticated, service_role;
revoke insert (
  owner_clerk_id, period_start_utc, period_end_utc, declaration, snapshot,
  methodology_version, factor_version, status, source_identity_hash, source_scope,
  normalized_content_hash, import_metadata, cost_amount, cost_currency, import_revision,
  quick_scenario
) on public.personal_ai_declarations from authenticated, service_role;
revoke update (
  owner_clerk_id, period_start_utc, period_end_utc, declaration, snapshot,
  methodology_version, factor_version, status, source_identity_hash, source_scope,
  normalized_content_hash, import_metadata, cost_amount, cost_currency, import_revision,
  quick_scenario
) on public.personal_ai_declarations from authenticated, service_role;
grant select, delete on public.personal_ai_declarations to authenticated;

revoke all on function public.confirm_personal_ai_import(jsonb) from public, anon, authenticated, service_role;
revoke all on function public.save_personal_ai_chat_scenario(uuid, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated, service_role;
revoke all on function public.personal_ai_declarations_may_overlap(text, timestamptz, timestamptz, jsonb, jsonb, text, timestamptz, timestamptz, jsonb, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.guard_personal_ai_chat_scenario_overlap() from public, anon, authenticated, service_role;
revoke all on function public.guard_personal_ai_import_mutation() from public, anon, authenticated, service_role;

-- Quick-scenario edits and creates must acquire the owner mutex before taking a row lock.
create or replace function public.save_personal_ai_chat_scenario(
  p_id uuid,
  p_declaration jsonb,
  p_quick_scenario jsonb,
  p_snapshot jsonb,
  p_methodology_version text,
  p_factor_version text
)
returns setof public.personal_ai_declarations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner text := auth.jwt() ->> 'sub';
  v_saved public.personal_ai_declarations;
begin
  if v_owner is null or length(v_owner) not between 1 and 255 then
    raise exception 'authenticated owner required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_owner, 0));
  if p_id is not null then
    update public.personal_ai_declarations
       set declaration = p_declaration,
           quick_scenario = p_quick_scenario,
           period_start_utc = nullif(p_declaration ->> 'periodStartUtc', '')::timestamptz,
           period_end_utc = nullif(p_declaration ->> 'periodEndUtc', '')::timestamptz,
           snapshot = p_snapshot,
           methodology_version = p_methodology_version,
           factor_version = p_factor_version
     where id = p_id and owner_clerk_id = v_owner and quick_scenario is not null
    returning * into v_saved;
    if not found then raise exception 'personal AI scenario not found' using errcode = '42501'; end if;
  else
    select * into v_saved
      from public.personal_ai_declarations
     where owner_clerk_id = v_owner
       and quick_scenario ->> 'chatbot' = p_quick_scenario ->> 'chatbot'
       and coalesce(quick_scenario ->> 'chatbotLabel', '') = coalesce(p_quick_scenario ->> 'chatbotLabel', '')
       and period_start_utc = nullif(p_declaration ->> 'periodStartUtc', '')::timestamptz
       and period_end_utc = nullif(p_declaration ->> 'periodEndUtc', '')::timestamptz
     for update;
    if found then
      update public.personal_ai_declarations
         set declaration = p_declaration,
             quick_scenario = p_quick_scenario,
             snapshot = p_snapshot,
             methodology_version = p_methodology_version,
             factor_version = p_factor_version
       where id = v_saved.id
      returning * into v_saved;
    else
      insert into public.personal_ai_declarations (
        owner_clerk_id, period_start_utc, period_end_utc, declaration, quick_scenario,
        snapshot, methodology_version, factor_version
      ) values (
        v_owner, nullif(p_declaration ->> 'periodStartUtc', '')::timestamptz,
        nullif(p_declaration ->> 'periodEndUtc', '')::timestamptz, p_declaration, p_quick_scenario,
        p_snapshot, p_methodology_version, p_factor_version
      ) returning * into v_saved;
    end if;
  end if;
  return next v_saved;
end;
$$;

create or replace function public.save_personal_ai_declaration_for_owner(
  p_owner_clerk_id text,
  p_id uuid,
  p_declaration jsonb,
  p_quick_scenario jsonb,
  p_snapshot jsonb,
  p_methodology_version text,
  p_factor_version text,
  p_status text default null
)
returns setof public.personal_ai_declarations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_saved public.personal_ai_declarations;
  v_previous_claims text := current_setting('request.jwt.claims', true);
begin
  if p_owner_clerk_id is null or length(p_owner_clerk_id) not between 1 and 255
     or p_declaration is null or p_snapshot is null
     or (p_status is not null and p_status not in ('ACTIVE', 'EXCLUDED')) then
    raise exception 'invalid personal AI declaration request' using errcode = '22023';
  end if;

  -- Global order: owner advisory lock, then any scenario row/index lock.
  perform pg_advisory_xact_lock(hashtextextended(p_owner_clerk_id, 0));
  if p_quick_scenario is not null then
    perform set_config('request.jwt.claims', jsonb_build_object('role', 'authenticated', 'sub', p_owner_clerk_id)::text, true);
    select * into v_saved
      from public.save_personal_ai_chat_scenario(
        p_id, p_declaration, p_quick_scenario, p_snapshot, p_methodology_version, p_factor_version
      ) limit 1;
    perform set_config('request.jwt.claims', coalesce(v_previous_claims, '{}'), true);
    if v_saved.id is null then raise exception 'personal AI scenario not found' using errcode = '42501'; end if;
  elsif p_id is null then
    insert into public.personal_ai_declarations (
      owner_clerk_id, period_start_utc, period_end_utc, declaration, quick_scenario,
      snapshot, methodology_version, factor_version, status
    ) values (
      p_owner_clerk_id,
      nullif(p_declaration ->> 'periodStartUtc', '')::timestamptz,
      nullif(p_declaration ->> 'periodEndUtc', '')::timestamptz,
      p_declaration, null, p_snapshot, p_methodology_version, p_factor_version,
      coalesce(p_status, 'ACTIVE')
    ) returning * into v_saved;
  else
    update public.personal_ai_declarations
       set period_start_utc = nullif(p_declaration ->> 'periodStartUtc', '')::timestamptz,
           period_end_utc = nullif(p_declaration ->> 'periodEndUtc', '')::timestamptz,
           declaration = p_declaration,
           quick_scenario = null,
           snapshot = p_snapshot,
           methodology_version = p_methodology_version,
           factor_version = p_factor_version,
           status = coalesce(p_status, status)
     where id = p_id and owner_clerk_id = p_owner_clerk_id and source_identity_hash is null
    returning * into v_saved;
    if not found then raise exception 'personal AI declaration not found' using errcode = '42501'; end if;
  end if;

  if p_status is not null and p_quick_scenario is not null then
    update public.personal_ai_declarations
       set status = p_status
     where id = v_saved.id and owner_clerk_id = p_owner_clerk_id
    returning * into v_saved;
  end if;

  return next v_saved;
end;
$$;

create or replace function public.set_personal_ai_declaration_status_for_owner(
  p_owner_clerk_id text,
  p_id uuid,
  p_status text
)
returns setof public.personal_ai_declarations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_saved public.personal_ai_declarations;
begin
  if p_owner_clerk_id is null or length(p_owner_clerk_id) not between 1 and 255
     or p_status not in ('ACTIVE', 'EXCLUDED') then
    raise exception 'invalid personal AI declaration status' using errcode = '22023';
  end if;
  -- Match create/edit order so reactivation cannot deadlock against a concurrent scenario save.
  perform pg_advisory_xact_lock(hashtextextended(p_owner_clerk_id, 0));
  update public.personal_ai_declarations
     set status = p_status
   where id = p_id and owner_clerk_id = p_owner_clerk_id
  returning * into v_saved;
  if not found then raise exception 'personal AI declaration not found' using errcode = '42501'; end if;
  return next v_saved;
end;
$$;

create or replace function public.confirm_personal_ai_import_for_owner(
  p_owner_clerk_id text,
  p_rows jsonb
)
returns setof public.personal_ai_declarations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_previous_claims text := current_setting('request.jwt.claims', true);
  v_saved public.personal_ai_declarations;
begin
  if p_owner_clerk_id is null or length(p_owner_clerk_id) not between 1 and 255 then
    raise exception 'authenticated owner required' using errcode = '42501';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'authenticated', 'sub', p_owner_clerk_id)::text, true);
  for v_saved in select * from public.confirm_personal_ai_import(p_rows)
  loop
    return next v_saved;
  end loop;
  perform set_config('request.jwt.claims', coalesce(v_previous_claims, '{}'), true);
  return;
end;
$$;

create or replace function public.update_personal_ai_chat_scenario_overlap_policy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status <> 'ACTIVE' then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.owner_clerk_id, 0));

  if exists (
    select 1
      from public.personal_ai_declarations existing
     where existing.owner_clerk_id = new.owner_clerk_id
       and existing.id is distinct from new.id
       and existing.status = 'ACTIVE'
       and (
         existing.source_identity_hash is distinct from new.source_identity_hash
         or existing.quick_scenario is not null
         or new.quick_scenario is not null
       )
       and public.personal_ai_declarations_may_overlap(
         coalesce(existing.import_metadata ->> 'provider', existing.declaration ->> 'provider'),
         existing.period_start_utc, existing.period_end_utc, existing.declaration, existing.source_scope,
         coalesce(new.import_metadata ->> 'provider', new.declaration ->> 'provider'),
         new.period_start_utc, new.period_end_utc, new.declaration, new.source_scope
       )
  ) then
    raise exception 'active personal AI activity period and scope may overlap another source; exclude or reconcile one source'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists personal_ai_chat_scenario_overlap_guard on public.personal_ai_declarations;
create trigger personal_ai_chat_scenario_overlap_guard
  before insert or update of owner_clerk_id, period_start_utc, period_end_utc, declaration, quick_scenario, status
  on public.personal_ai_declarations
  for each row execute function public.update_personal_ai_chat_scenario_overlap_policy();

revoke all on function public.save_personal_ai_chat_scenario(uuid, jsonb, jsonb, jsonb, text, text) from public, anon, authenticated, service_role;
revoke all on function public.save_personal_ai_declaration_for_owner(text, uuid, jsonb, jsonb, jsonb, text, text, text) from public, anon, authenticated;
revoke all on function public.set_personal_ai_declaration_status_for_owner(text, uuid, text) from public, anon, authenticated;
revoke all on function public.confirm_personal_ai_import_for_owner(text, jsonb) from public, anon, authenticated;
revoke all on function public.update_personal_ai_chat_scenario_overlap_policy() from public, anon, authenticated, service_role;
grant execute on function public.save_personal_ai_declaration_for_owner(text, uuid, jsonb, jsonb, jsonb, text, text, text) to service_role;
grant execute on function public.set_personal_ai_declaration_status_for_owner(text, uuid, text) to service_role;
grant execute on function public.confirm_personal_ai_import_for_owner(text, jsonb) to service_role;

comment on function public.save_personal_ai_declaration_for_owner(text, uuid, jsonb, jsonb, jsonb, text, text, text) is
  'PURPOSE: persist server-normalized declaration and server-calculated snapshot. CALLER: authenticated API after Clerk AuthN. AUTHORIZATION_BOUNDARY: service_role-only execute; explicit Clerk owner parameter from handler; owner mutex before row locks. IDEMPOTENCY: quick scenarios retain their owner/chatbot/period key. ATOMICITY: declaration, optional status transition and overlap trigger share one transaction. FAILURE_BEHAVIOR: 23P01 overlap; 42501 missing or imported edit. SEARCH_PATH: pg_catalog, public. GRANTS: service_role only.';
comment on function public.confirm_personal_ai_import_for_owner(text, jsonb) is
  'PURPOSE: call the existing owner-scoped atomic import persistence after server hash verification and snapshot calculation. CALLER: authenticated import API. AUTHORIZATION_BOUNDARY: service_role-only execute and explicit Clerk owner; no public/authenticated direct RPC. IDEMPOTENCY: owner plus stable source identity and content revision. ATOMICITY: entire import batch. FAILURE_BEHAVIOR: 23P01 overlap, 22023 invalid data, transaction rollback. SEARCH_PATH: pg_catalog, public. GRANTS: service_role only.';

commit;
