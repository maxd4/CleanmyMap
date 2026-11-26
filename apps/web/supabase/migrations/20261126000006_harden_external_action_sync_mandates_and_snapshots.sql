-- PURPOSE: harden external action sync mandates/consent, separate observed vs applied snapshots, isolate proposals by organizer, and hide suppressed actions from public surfaces.
-- CALLER: server-only synchronization engine and admin boundaries through service_role RPCs.
-- AUTHORIZATION_BOUNDARY: browser roles have no schema/table/function grants; admin is verified at HTTP.
-- IDEMPOTENCY: proposal resolutions are keyed by resolved_content_hash; suppression remains replay-safe.
-- ATOMICITY: all reference/identity/action suppression mutations run inside a single locked transaction.
-- FAILURE_BEHAVIOR: revoked mandates, organizer mismatches and concurrent edits fail closed without silent overwrite.
-- SEARCH_PATH: every SECURITY DEFINER function pins pg_catalog, public and private.
-- GRANTS: execute only to service_role; tables only to service_role with RLS enabled.

alter table private.external_action_sync_subscriptions
  add column if not exists consent_granted_at timestamptz;

alter table private.external_action_sync_references
  add column if not exists applied_snapshot jsonb,
  add column if not exists applied_content_hash text check (applied_content_hash is null or applied_content_hash ~ '^[0-9a-f]{64}$'),
  add column if not exists applied_revision text,
  add column if not exists applied_at timestamptz;

alter table private.external_action_sync_proposals
  add column if not exists resolved_content_hash text check (resolved_content_hash is null or resolved_content_hash ~ '^[0-9a-f]{64}$');

-- Close legacy overloads before creating hardened signatures.
drop function if exists public.list_external_action_sync_subscriptions();
drop function if exists public.upsert_external_action_sync_subscription(text, text, text, text[], text, text, text, boolean, text, date, timestamptz);
drop function if exists public.upsert_external_action_sync_proposal(text, text, text, text, uuid, text, jsonb, uuid[], jsonb);
drop function if exists public.list_external_action_sync_proposals(text);
drop function if exists public.resolve_external_action_sync_proposal(uuid, text, text, text);

create function public.list_external_action_sync_subscriptions()
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
  last_error text,
  consent_granted_at timestamptz
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
         s.last_error, s.consent_granted_at
  from private.external_action_sync_subscriptions s
  order by s.organizer_directory_id, s.source_id;
end;
$$;

create function public.upsert_external_action_sync_subscription(
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
  p_revoked_at timestamptz default null,
  p_consent_granted_at timestamptz default null
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
    sync_start_date, revoked_at, consent_granted_at
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
    p_revoked_at,
    p_consent_granted_at
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
    consent_granted_at = coalesce(excluded.consent_granted_at, private.external_action_sync_subscriptions.consent_granted_at),
    updated_at = clock_timestamp()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.get_external_action_sync_reference_state(
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
  applied_snapshot jsonb,
  applied_content_hash text,
  applied_revision text,
  applied_at timestamptz,
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
         r.applied_snapshot, r.applied_content_hash, r.applied_revision, r.applied_at,
         (r.suppressed_at is not null or i.suppressed_at is not null)
  from private.external_action_sync_references r
  join private.external_action_sync_identities i using (identity_hash)
  where r.source_id = p_source_id and r.external_event_id = p_external_event_id;
end;
$$;

create or replace function public.mark_external_action_sync_reference_applied(
  p_source_id text,
  p_external_event_id text,
  p_applied_snapshot jsonb,
  p_applied_content_hash text,
  p_applied_revision text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_ref private.external_action_sync_references%rowtype;
  v_identity private.external_action_sync_identities%rowtype;
  v_action public.actions%rowtype;
  v_now timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_applied_content_hash !~ '^[0-9a-f]{64}$' or jsonb_typeof(p_applied_snapshot) <> 'object' then
    raise exception 'Invalid applied snapshot';
  end if;

  select r.identity_hash into v_ref.identity_hash
  from private.external_action_sync_references r
  where r.source_id = p_source_id and r.external_event_id = btrim(p_external_event_id);
  if not found then return 'not_found'; end if;

  select * into v_identity
  from private.external_action_sync_identities i
  where i.identity_hash = v_ref.identity_hash
  for update;

  select * into v_ref
  from private.external_action_sync_references r
  where r.source_id = p_source_id and r.external_event_id = btrim(p_external_event_id)
  for update;

  if v_identity.suppressed_at is not null or v_ref.suppressed_at is not null then
    return 'suppressed';
  end if;

  if not exists (
    select 1 from private.external_action_sync_subscriptions s
    where s.organizer_directory_id = v_identity.organizer_directory_id
      and s.source_id = p_source_id
      and s.owner_user_id = v_identity.creator_user_id
      and s.enabled = true
      and s.revoked_at is null
      and s.consent_granted_at is not null
      and s.authorization_ref is not null
      and s.access_mode <> 'disabled'
  ) then
    return 'mandate_revoked';
  end if;

  if v_identity.action_id is not null then
    select * into v_action from public.actions a where a.id = v_identity.action_id for update;
    if not found or v_action.organizer_id is distinct from v_identity.organizer_directory_id then
      return 'organizer_mismatch';
    end if;
    if v_action.status = 'cancelled' or v_action.status = 'rejected' then
      return 'suppressed';
    end if;
  end if;

  update private.external_action_sync_references
  set applied_snapshot = p_applied_snapshot,
      applied_content_hash = p_applied_content_hash,
      applied_revision = nullif(btrim(p_applied_revision), ''),
      applied_at = v_now,
      updated_at = v_now
  where source_id = p_source_id
    and external_event_id = btrim(p_external_event_id);

  return 'applied';
end;
$$;

create function public.upsert_external_action_sync_proposal(
  p_organizer_directory_id text,
  p_source_id text,
  p_external_event_id text,
  p_identity_hash text,
  p_action_id uuid,
  p_proposal_kind text,
  p_external_event jsonb,
  p_candidate_action_ids uuid[],
  p_conflict_fields jsonb,
  p_content_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_existing private.external_action_sync_proposals%rowtype;
  v_id uuid;
  v_org_id text := btrim(p_organizer_directory_id);
  v_event_id text := btrim(p_external_event_id);
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;

  select * into v_existing
  from private.external_action_sync_proposals p
  where p.source_id = p_source_id
    and p.external_event_id = v_event_id
  for update;

  if found then
    if v_existing.organizer_directory_id <> v_org_id then
      raise exception 'proposal_organizer_conflict';
    end if;
    if v_existing.status in ('resolved', 'dismissed')
       and p_content_hash is not null
       and v_existing.resolved_content_hash = p_content_hash
       and v_existing.proposal_kind = p_proposal_kind then
      return v_existing.id;
    end if;
  end if;

  insert into private.external_action_sync_proposals(
    organizer_directory_id, source_id, external_event_id, identity_hash,
    action_id, proposal_kind, status, external_event, candidate_action_ids,
    conflict_fields, resolved_content_hash, resolution_note, resolved_by_user_id, resolved_at
  ) values (
    v_org_id,
    p_source_id,
    v_event_id,
    nullif(btrim(p_identity_hash), ''),
    p_action_id,
    p_proposal_kind,
    'pending',
    coalesce(p_external_event, '{}'::jsonb),
    coalesce(p_candidate_action_ids, '{}'),
    coalesce(p_conflict_fields, '[]'::jsonb),
    nullif(btrim(p_content_hash), ''),
    null,
    null,
    null
  )
  on conflict (source_id, external_event_id) do update set
    identity_hash = excluded.identity_hash,
    action_id = excluded.action_id,
    proposal_kind = excluded.proposal_kind,
    status = 'pending',
    external_event = excluded.external_event,
    candidate_action_ids = excluded.candidate_action_ids,
    conflict_fields = excluded.conflict_fields,
    resolved_content_hash = excluded.resolved_content_hash,
    resolution_note = null,
    resolved_by_user_id = null,
    resolved_at = null,
    updated_at = clock_timestamp()
  where private.external_action_sync_proposals.organizer_directory_id = excluded.organizer_directory_id
    and not (
      private.external_action_sync_proposals.status in ('resolved', 'dismissed')
      and excluded.resolved_content_hash is not null
      and private.external_action_sync_proposals.resolved_content_hash = excluded.resolved_content_hash
      and private.external_action_sync_proposals.proposal_kind = excluded.proposal_kind
    )
  returning id into v_id;

  if v_id is null then
    select * into v_existing
    from private.external_action_sync_proposals p
    where p.source_id = p_source_id
      and p.external_event_id = v_event_id;
    if v_existing.organizer_directory_id <> v_org_id then
      raise exception 'proposal_organizer_conflict';
    end if;
    return v_existing.id;
  end if;

  return v_id;
end;
$$;

create function public.list_external_action_sync_proposals(
  p_status text default 'pending',
  p_organizer_directory_id text default null
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
    and (p_organizer_directory_id is null or p.organizer_directory_id = btrim(p_organizer_directory_id))
  order by p.updated_at desc, p.id;
end;
$$;

create function public.resolve_external_action_sync_proposal(
  p_proposal_id uuid,
  p_status text,
  p_actor_user_id text,
  p_resolution_note text default null,
  p_organizer_directory_id text default null
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
      resolved_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = p_proposal_id
    and (p_organizer_directory_id is null or organizer_directory_id = btrim(p_organizer_directory_id));

  if not found then
    return 'not_found';
  end if;
  return p_status;
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
  v_audit private.external_action_sync_suppression_audit%rowtype;
  v_actor_user_id text;
  v_operation_id text;
  v_reason text;
  v_now timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  v_actor_user_id := nullif(btrim(p_actor_user_id), '');
  v_operation_id := nullif(btrim(p_operation_id), '');
  v_reason := btrim(p_reason);
  if p_action_id is null
     or v_actor_user_id is null
     or v_operation_id is null
     or length(v_reason) < 5
     or length(v_reason) > 500 then
    raise exception 'Invalid external action suppression';
  end if;

  select * into v_audit
  from private.external_action_sync_suppression_audit a
  where a.operation_id = v_operation_id;
  if found and (
    v_audit.action_id is distinct from p_action_id
    or v_audit.actor_user_id is distinct from v_actor_user_id
    or v_audit.reason is distinct from v_reason
  ) then
    return 'operation_conflict';
  end if;

  select * into v_identity
  from private.external_action_sync_identities i
  where i.action_id = p_action_id
  for update;
  if not found then return 'not_synced'; end if;

  if not exists(
    select 1 from public.actions a
    where a.id = p_action_id and a.organizer_id = v_identity.organizer_directory_id
  ) then
    return 'organizer_mismatch';
  end if;

  insert into private.external_action_sync_suppression_audit(
    operation_id, action_id, actor_user_id, reason
  ) values (
    v_operation_id, p_action_id, v_actor_user_id, v_reason
  ) on conflict (operation_id) do nothing;

  if not found then
    select * into v_audit
    from private.external_action_sync_suppression_audit a
    where a.operation_id = v_operation_id;
    if v_audit.action_id is distinct from p_action_id
       or v_audit.actor_user_id is distinct from v_actor_user_id
       or v_audit.reason is distinct from v_reason then
      return 'operation_conflict';
    end if;
  end if;

  update private.external_action_sync_identities set
    suppressed_at = coalesce(suppressed_at, v_now),
    claim_token = null,
    claim_expires_at = null,
    updated_at = v_now
  where action_id = p_action_id;

  update private.external_action_sync_references set
    suppressed_at = coalesce(suppressed_at, v_now),
    updated_at = v_now
  where action_id = p_action_id;

  -- Remove from all public surfaces according to canonical action lifecycle.
  update public.actions set
    moderation_visibility = 'hidden',
    hidden_at = coalesce(hidden_at, v_now),
    hidden_by_clerk_id = coalesce(hidden_by_clerk_id, v_actor_user_id),
    hidden_reason = coalesce(hidden_reason, v_reason),
    published_at = null,
    group_join_enabled = false,
    status = 'cancelled',
    updated_at = v_now
  where id = p_action_id;

  return 'suppressed';
end;
$$;

revoke all on function public.list_external_action_sync_subscriptions() from public, anon, authenticated;
revoke all on function public.upsert_external_action_sync_subscription(text, text, text, text[], text, text, text, boolean, text, date, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.get_external_action_sync_reference_state(text, text) from public, anon, authenticated;
revoke all on function public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.upsert_external_action_sync_proposal(text, text, text, text, uuid, text, jsonb, uuid[], jsonb, text) from public, anon, authenticated;
revoke all on function public.list_external_action_sync_proposals(text, text) from public, anon, authenticated;
revoke all on function public.resolve_external_action_sync_proposal(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.suppress_external_action_sync_action(uuid, text, text, text) from public, anon, authenticated;

grant execute on function public.list_external_action_sync_subscriptions() to service_role;
grant execute on function public.upsert_external_action_sync_subscription(text, text, text, text[], text, text, text, boolean, text, date, timestamptz, timestamptz) to service_role;
grant execute on function public.get_external_action_sync_reference_state(text, text) to service_role;
grant execute on function public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text) to service_role;
grant execute on function public.upsert_external_action_sync_proposal(text, text, text, text, uuid, text, jsonb, uuid[], jsonb, text) to service_role;
grant execute on function public.list_external_action_sync_proposals(text, text) to service_role;
grant execute on function public.resolve_external_action_sync_proposal(uuid, text, text, text, text) to service_role;
grant execute on function public.suppress_external_action_sync_action(uuid, text, text, text) to service_role;
