-- PURPOSE: persist revocable external action sync subscriptions/mandates and private review proposals.
-- CALLER: server-only synchronization engine and admin/cron boundaries through service_role RPCs.
-- AUTHORIZATION_BOUNDARY: browser roles have no schema/table/function grants; admin is verified at HTTP.
-- IDEMPOTENCY: subscriptions are unique by (organizer_directory_id, source_id); proposals are unique by (source_id, external_event_id).
-- ATOMICITY: RPCs mutate subscription state and proposals inside single-statement/locked transactions.
-- FAILURE_BEHAVIOR: missing or revoked mandates fail closed; invalid states raise explicit exceptions.
-- SEARCH_PATH: every SECURITY DEFINER function pins pg_catalog, public and private.
-- GRANTS: execute only to service_role; tables only to service_role with RLS enabled.

create table if not exists private.external_action_sync_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organizer_directory_id text not null check (length(btrim(organizer_directory_id)) between 1 and 200),
  source_id text not null check (source_id in ('jagis_pour_la_nature', 'fondation_de_la_mer')),
  owner_user_id text not null check (length(btrim(owner_user_id)) between 1 and 200),
  co_organizer_user_ids text[] not null default '{}',
  source_structure_ref text not null check (length(btrim(source_structure_ref)) between 1 and 300),
  source_url text check (source_url is null or source_url ~ '^https://'),
  access_mode text not null default 'disabled' check (
    access_mode in ('disabled', 'synthetic_fixture', 'authorized_feed', 'webhook')
  ),
  enabled boolean not null default false,
  authorization_ref text,
  sync_start_date date not null,
  revoked_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text check (
    last_sync_status is null or last_sync_status in ('ok', 'partial', 'error', 'disabled')
  ),
  last_sync_summary jsonb not null default '{}'::jsonb check (jsonb_typeof(last_sync_summary) = 'object'),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizer_directory_id, source_id)
);

create table if not exists private.external_action_sync_proposals (
  id uuid primary key default gen_random_uuid(),
  organizer_directory_id text not null check (length(btrim(organizer_directory_id)) between 1 and 200),
  source_id text not null check (source_id in ('jagis_pour_la_nature', 'fondation_de_la_mer')),
  external_event_id text not null check (length(btrim(external_event_id)) between 1 and 300),
  identity_hash text check (identity_hash is null or identity_hash ~ '^[0-9a-f]{64}$'),
  action_id uuid references public.actions(id) on delete set null,
  proposal_kind text not null check (
    proposal_kind in ('incomplete_event', 'ambiguous_match', 'field_conflict', 'cancellation_review')
  ),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  external_event jsonb not null default '{}'::jsonb check (jsonb_typeof(external_event) = 'object'),
  candidate_action_ids uuid[] not null default '{}',
  conflict_fields jsonb not null default '[]'::jsonb check (jsonb_typeof(conflict_fields) = 'array'),
  resolution_note text,
  resolved_by_user_id text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_event_id)
);

create index if not exists external_action_sync_proposals_status_idx
  on private.external_action_sync_proposals(status, updated_at desc);

alter table private.external_action_sync_subscriptions enable row level security;
alter table private.external_action_sync_proposals enable row level security;

revoke all on private.external_action_sync_subscriptions from public, anon, authenticated;
revoke all on private.external_action_sync_proposals from public, anon, authenticated;
grant select, insert, update, delete on private.external_action_sync_subscriptions to service_role;
grant select, insert, update, delete on private.external_action_sync_proposals to service_role;

create or replace function public.list_external_action_sync_subscriptions()
returns table (
  id uuid,
  organizer_directory_id text,
  source_id text,
  owner_user_id text,
  co_organizer_user_ids text[],
  source_structure_ref text,
  source_url text,
  access_mode text,
  enabled boolean,
  authorization_ref text,
  sync_start_date date,
  revoked_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_summary jsonb,
  last_error text
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  return query
  select s.id, s.organizer_directory_id, s.source_id, s.owner_user_id,
         s.co_organizer_user_ids, s.source_structure_ref, s.source_url,
         s.access_mode, s.enabled, s.authorization_ref, s.sync_start_date,
         s.revoked_at, s.last_sync_at, s.last_sync_status, s.last_sync_summary,
         s.last_error
  from private.external_action_sync_subscriptions s
  order by s.organizer_directory_id, s.source_id;
end;
$$;

create or replace function public.upsert_external_action_sync_subscription(
  p_organizer_directory_id text,
  p_source_id text,
  p_owner_user_id text,
  p_co_organizer_user_ids text[],
  p_source_structure_ref text,
  p_source_url text,
  p_access_mode text,
  p_enabled boolean,
  p_authorization_ref text,
  p_sync_start_date date,
  p_revoked_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  insert into private.external_action_sync_subscriptions(
    organizer_directory_id, source_id, owner_user_id, co_organizer_user_ids,
    source_structure_ref, source_url, access_mode, enabled, authorization_ref,
    sync_start_date, revoked_at
  ) values (
    btrim(p_organizer_directory_id),
    p_source_id,
    btrim(p_owner_user_id),
    coalesce(p_co_organizer_user_ids, '{}'),
    btrim(p_source_structure_ref),
    nullif(btrim(p_source_url), ''),
    p_access_mode,
    coalesce(p_enabled, false),
    nullif(btrim(p_authorization_ref), ''),
    p_sync_start_date,
    p_revoked_at
  )
  on conflict (organizer_directory_id, source_id) do update set
    owner_user_id = excluded.owner_user_id,
    co_organizer_user_ids = excluded.co_organizer_user_ids,
    source_structure_ref = excluded.source_structure_ref,
    source_url = excluded.source_url,
    access_mode = excluded.access_mode,
    enabled = excluded.enabled,
    authorization_ref = excluded.authorization_ref,
    sync_start_date = excluded.sync_start_date,
    revoked_at = excluded.revoked_at,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.record_external_action_sync_run_result(
  p_organizer_directory_id text,
  p_source_id text,
  p_status text,
  p_summary jsonb,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  update private.external_action_sync_subscriptions
  set last_sync_at = now(),
      last_sync_status = p_status,
      last_sync_summary = coalesce(p_summary, '{}'::jsonb),
      last_error = nullif(btrim(p_error), ''),
      updated_at = now()
  where organizer_directory_id = btrim(p_organizer_directory_id)
    and source_id = p_source_id;
end;
$$;

create or replace function public.upsert_external_action_sync_proposal(
  p_organizer_directory_id text,
  p_source_id text,
  p_external_event_id text,
  p_identity_hash text,
  p_action_id uuid,
  p_proposal_kind text,
  p_external_event jsonb,
  p_candidate_action_ids uuid[],
  p_conflict_fields jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  insert into private.external_action_sync_proposals(
    organizer_directory_id, source_id, external_event_id, identity_hash,
    action_id, proposal_kind, status, external_event, candidate_action_ids,
    conflict_fields, resolution_note, resolved_by_user_id, resolved_at
  ) values (
    btrim(p_organizer_directory_id),
    p_source_id,
    btrim(p_external_event_id),
    nullif(btrim(p_identity_hash), ''),
    p_action_id,
    p_proposal_kind,
    'pending',
    coalesce(p_external_event, '{}'::jsonb),
    coalesce(p_candidate_action_ids, '{}'),
    coalesce(p_conflict_fields, '[]'::jsonb),
    null,
    null,
    null
  )
  on conflict (source_id, external_event_id) do update set
    organizer_directory_id = excluded.organizer_directory_id,
    identity_hash = excluded.identity_hash,
    action_id = excluded.action_id,
    proposal_kind = excluded.proposal_kind,
    status = 'pending',
    external_event = excluded.external_event,
    candidate_action_ids = excluded.candidate_action_ids,
    conflict_fields = excluded.conflict_fields,
    resolution_note = null,
    resolved_by_user_id = null,
    resolved_at = null,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.list_external_action_sync_proposals(
  p_status text default 'pending'
)
returns table (
  id uuid,
  organizer_directory_id text,
  source_id text,
  external_event_id text,
  identity_hash text,
  action_id uuid,
  proposal_kind text,
  status text,
  external_event jsonb,
  candidate_action_ids uuid[],
  conflict_fields jsonb,
  resolution_note text,
  resolved_by_user_id text,
  resolved_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  return query
  select p.id, p.organizer_directory_id, p.source_id, p.external_event_id,
         p.identity_hash, p.action_id, p.proposal_kind, p.status,
         p.external_event, p.candidate_action_ids, p.conflict_fields,
         p.resolution_note, p.resolved_by_user_id, p.resolved_at,
         p.created_at, p.updated_at
  from private.external_action_sync_proposals p
  where (p_status is null or p.status = p_status)
  order by p.updated_at desc, p.id;
end;
$$;

create or replace function public.resolve_external_action_sync_proposal(
  p_proposal_id uuid,
  p_status text,
  p_actor_user_id text,
  p_resolution_note text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_status not in ('resolved', 'dismissed') or nullif(btrim(p_actor_user_id), '') is null then
    raise exception 'Invalid external action proposal resolution';
  end if;

  update private.external_action_sync_proposals
  set status = p_status,
      resolved_by_user_id = btrim(p_actor_user_id),
      resolution_note = nullif(btrim(p_resolution_note), ''),
      resolved_at = now(),
      updated_at = now()
  where id = p_proposal_id;

  if not found then
    return 'not_found';
  end if;
  return p_status;
end;
$$;

revoke all on function public.list_external_action_sync_subscriptions() from public, anon, authenticated;
revoke all on function public.upsert_external_action_sync_subscription(text, text, text, text[], text, text, text, boolean, text, date, timestamptz) from public, anon, authenticated;
revoke all on function public.record_external_action_sync_run_result(text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.upsert_external_action_sync_proposal(text, text, text, text, uuid, text, jsonb, uuid[], jsonb) from public, anon, authenticated;
revoke all on function public.list_external_action_sync_proposals(text) from public, anon, authenticated;
revoke all on function public.resolve_external_action_sync_proposal(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.list_external_action_sync_subscriptions() to service_role;
grant execute on function public.upsert_external_action_sync_subscription(text, text, text, text[], text, text, text, boolean, text, date, timestamptz) to service_role;
grant execute on function public.record_external_action_sync_run_result(text, text, text, jsonb, text) to service_role;
grant execute on function public.upsert_external_action_sync_proposal(text, text, text, text, uuid, text, jsonb, uuid[], jsonb) to service_role;
grant execute on function public.list_external_action_sync_proposals(text) to service_role;
grant execute on function public.resolve_external_action_sync_proposal(uuid, text, text, text) to service_role;
