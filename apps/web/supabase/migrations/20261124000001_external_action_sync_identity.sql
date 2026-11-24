-- PURPOSE: keep stable external-event identity, cross-source deduplication and deletion tombstones private.
-- CALLER: authenticated admin HTTP boundary through server-only service_role RPCs.
-- AUTHORIZATION_BOUNDARY: browser roles have no schema/table/function grants; admin is verified at HTTP.
-- IDEMPOTENCY: source/event and identity hashes are unique; claim leases and action links are replay-safe.
-- ATOMICITY: identity claim/link/suppression are transactional; action state transitions use canonical admin routes.
-- FAILURE_BEHAVIOR: conflicts return stable statuses; suppression survives action cancellation and later imports.
-- SEARCH_PATH: every SECURITY DEFINER function pins pg_catalog, public and private.
-- GRANTS: execute only to service_role; tables only to service_role with RLS enabled.

create table if not exists private.external_action_sync_identities (
  identity_hash text primary key check (identity_hash ~ '^[0-9a-f]{64}$'),
  organizer_directory_id text not null,
  creator_user_id text not null,
  action_id uuid references public.actions(id) on delete set null,
  claim_token uuid,
  claim_expires_at timestamptz,
  suppressed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_action_sync_claim_pair check (
    (claim_token is null and claim_expires_at is null)
    or (claim_token is not null and claim_expires_at is not null)
  )
);

create table if not exists private.external_action_sync_references (
  source_id text not null check (source_id in ('jagis_pour_la_nature', 'fondation_de_la_mer')),
  external_event_id text not null check (length(btrim(external_event_id)) between 1 and 300),
  identity_hash text not null references private.external_action_sync_identities(identity_hash) on delete restrict,
  action_id uuid references public.actions(id) on delete set null,
  external_url text not null check (external_url ~ '^https://'),
  external_revision text,
  source_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(source_snapshot) = 'object'),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  last_seen_at timestamptz not null default now(),
  suppressed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_id, external_event_id)
);

create index if not exists external_action_sync_references_action_idx
  on private.external_action_sync_references(action_id)
  where action_id is not null;

alter table private.external_action_sync_identities enable row level security;
alter table private.external_action_sync_references enable row level security;
revoke all on private.external_action_sync_identities from public, anon, authenticated;
revoke all on private.external_action_sync_references from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on private.external_action_sync_identities to service_role;
grant select, insert, update, delete on private.external_action_sync_references to service_role;

create or replace function public.claim_external_action_sync_identity(
  p_identity_hash text,
  p_organizer_directory_id text,
  p_creator_user_id text,
  p_claim_token uuid
)
returns table (claim_status text, action_id uuid, creator_user_id text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_identity private.external_action_sync_identities%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_identity_hash !~ '^[0-9a-f]{64}$'
     or nullif(btrim(p_organizer_directory_id), '') is null
     or nullif(btrim(p_creator_user_id), '') is null
     or p_claim_token is null then
    raise exception 'Invalid external action identity claim';
  end if;

  insert into private.external_action_sync_identities(
    identity_hash, organizer_directory_id, creator_user_id, claim_token, claim_expires_at
  ) values (
    p_identity_hash, btrim(p_organizer_directory_id), btrim(p_creator_user_id), p_claim_token, now() + interval '5 minutes'
  ) on conflict (identity_hash) do nothing;

  select * into v_identity
  from private.external_action_sync_identities
  where identity_hash = p_identity_hash
  for update;

  if v_identity.organizer_directory_id <> btrim(p_organizer_directory_id) then
    return query select 'identity_conflict'::text, null::uuid, v_identity.creator_user_id;
    return;
  end if;
  if v_identity.suppressed_at is not null then
    return query select 'suppressed'::text, v_identity.action_id, v_identity.creator_user_id;
    return;
  end if;
  if v_identity.action_id is not null then
    return query select 'linked'::text, v_identity.action_id, v_identity.creator_user_id;
    return;
  end if;
  if v_identity.claim_token = p_claim_token then
    return query select 'claimed'::text, null::uuid, v_identity.creator_user_id;
    return;
  end if;
  if v_identity.claim_expires_at > now() then
    return query select 'busy'::text, null::uuid, v_identity.creator_user_id;
    return;
  end if;

  update private.external_action_sync_identities
  set claim_token = p_claim_token,
      claim_expires_at = now() + interval '5 minutes',
      updated_at = now()
  where identity_hash = p_identity_hash;
  return query select 'claimed'::text, null::uuid, v_identity.creator_user_id;
end;
$$;

create or replace function public.complete_external_action_sync_identity(
  p_identity_hash text,
  p_claim_token uuid,
  p_action_id uuid
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_identity private.external_action_sync_identities%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  select * into v_identity from private.external_action_sync_identities
  where identity_hash = p_identity_hash for update;
  if not found then return 'not_found'; end if;
  if v_identity.suppressed_at is not null then return 'suppressed'; end if;
  if v_identity.action_id is not null then
    return case when v_identity.action_id = p_action_id then 'linked' else 'identity_conflict' end;
  end if;
  if v_identity.claim_token is distinct from p_claim_token or v_identity.claim_expires_at <= now() then
    return 'claim_expired';
  end if;
  update private.external_action_sync_identities
  set action_id = p_action_id, claim_token = null, claim_expires_at = null, updated_at = now()
  where identity_hash = p_identity_hash;
  return 'linked';
end;
$$;

create or replace function public.link_external_action_sync_reference(
  p_identity_hash text,
  p_source_id text,
  p_external_event_id text,
  p_external_url text,
  p_external_revision text,
  p_source_snapshot jsonb,
  p_content_hash text
)
returns table (link_status text, action_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_identity private.external_action_sync_identities%rowtype;
  v_reference private.external_action_sync_references%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  select * into v_identity from private.external_action_sync_identities
  where identity_hash = p_identity_hash for update;
  if not found then return query select 'not_found'::text, null::uuid; return; end if;
  if v_identity.suppressed_at is not null then return query select 'suppressed'::text, v_identity.action_id; return; end if;
  if v_identity.action_id is null then return query select 'not_ready'::text, null::uuid; return; end if;
  if p_source_id not in ('jagis_pour_la_nature', 'fondation_de_la_mer')
     or nullif(btrim(p_external_event_id), '') is null
     or p_external_url !~ '^https://'
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or p_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid external action reference';
  end if;

  select * into v_reference from private.external_action_sync_references
  where source_id = p_source_id and external_event_id = btrim(p_external_event_id)
  for update;
  if found and v_reference.identity_hash <> p_identity_hash then
    return query select 'source_identity_conflict'::text, v_reference.action_id;
    return;
  end if;
  if found and v_reference.suppressed_at is not null then
    return query select 'suppressed'::text, v_reference.action_id;
    return;
  end if;

  insert into private.external_action_sync_references(
    source_id, external_event_id, identity_hash, action_id, external_url,
    external_revision, source_snapshot, content_hash, last_seen_at
  ) values (
    p_source_id, btrim(p_external_event_id), p_identity_hash, v_identity.action_id,
    p_external_url, nullif(btrim(p_external_revision), ''), p_source_snapshot,
    p_content_hash, now()
  ) on conflict (source_id, external_event_id) do update
  set action_id = excluded.action_id,
      external_url = excluded.external_url,
      external_revision = excluded.external_revision,
      source_snapshot = excluded.source_snapshot,
      content_hash = excluded.content_hash,
      last_seen_at = excluded.last_seen_at,
      updated_at = now()
  where private.external_action_sync_references.identity_hash = excluded.identity_hash
    and private.external_action_sync_references.suppressed_at is null;
  if not found then return query select 'source_identity_conflict'::text, null::uuid; return; end if;
  return query select 'linked'::text, v_identity.action_id;
end;
$$;

create or replace function public.get_external_action_sync_reference(
  p_source_id text,
  p_external_event_id text
)
returns table (
  identity_hash text,
  action_id uuid,
  external_url text,
  external_revision text,
  source_snapshot jsonb,
  content_hash text,
  suppressed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  return query
  select r.identity_hash, r.action_id, r.external_url, r.external_revision,
         r.source_snapshot, r.content_hash,
         (r.suppressed_at is not null or i.suppressed_at is not null)
  from private.external_action_sync_references r
  join private.external_action_sync_identities i using (identity_hash)
  where r.source_id = p_source_id and r.external_event_id = p_external_event_id;
end;
$$;

create or replace function public.list_external_action_sync_actions()
returns table (
  action_id uuid,
  action_date date,
  action_title text,
  action_status text,
  published_at timestamptz,
  source_ids text[],
  suppressed boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  return query
  select a.id, a.action_date,
    coalesce(nullif(btrim(a.preparation_data ->> 'actionTitle'), ''), a.organizer_name, 'Action synchronisée') as action_title,
    a.status, a.published_at,
    array_agg(distinct r.source_id order by r.source_id),
    bool_or(i.suppressed_at is not null or r.suppressed_at is not null)
  from private.external_action_sync_references r
  join private.external_action_sync_identities i using (identity_hash)
  join public.actions a on a.id = coalesce(i.action_id, r.action_id)
  group by a.id, a.action_date, a.preparation_data, a.organizer_name, a.status, a.published_at
  order by a.action_date desc, a.id;
end;
$$;

create or replace function public.suppress_external_action_sync_action(
  p_action_id uuid,
  p_actor_user_id text,
  p_operation_id text,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_identity private.external_action_sync_identities%rowtype;
  v_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_action_id is null or nullif(btrim(p_actor_user_id), '') is null
     or nullif(btrim(p_operation_id), '') is null
     or length(btrim(p_reason)) < 5 or length(btrim(p_reason)) > 500 then
    raise exception 'Invalid external action suppression';
  end if;
  select i.* into v_identity
  from private.external_action_sync_identities i
  where i.action_id = p_action_id
  for update;
  if not found then return 'not_synced'; end if;

  update private.external_action_sync_identities
  set suppressed_at = coalesce(suppressed_at, now()), claim_token = null, claim_expires_at = null, updated_at = now()
  where action_id = p_action_id;
  update private.external_action_sync_references
  set suppressed_at = coalesce(suppressed_at, now()), updated_at = now()
  where action_id = p_action_id;
  get diagnostics v_count = row_count;

  -- The HTTP boundary writes the canonical admin_operations_audit record;
  -- that table has no unique operation_id constraint and this RPC only owns tombstones.
  return 'suppressed';
end;
$$;

revoke all on function public.claim_external_action_sync_identity(text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.complete_external_action_sync_identity(text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.link_external_action_sync_reference(text, text, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.get_external_action_sync_reference(text, text) from public, anon, authenticated;
revoke all on function public.list_external_action_sync_actions() from public, anon, authenticated;
revoke all on function public.suppress_external_action_sync_action(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.claim_external_action_sync_identity(text, text, text, uuid) to service_role;
grant execute on function public.complete_external_action_sync_identity(text, uuid, uuid) to service_role;
grant execute on function public.link_external_action_sync_reference(text, text, text, text, text, jsonb, text) to service_role;
grant execute on function public.get_external_action_sync_reference(text, text) to service_role;
grant execute on function public.list_external_action_sync_actions() to service_role;
grant execute on function public.suppress_external_action_sync_action(uuid, text, text, text) to service_role;
