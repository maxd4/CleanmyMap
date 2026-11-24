-- PURPOSE: reserve immutable source event identity before canonical action creation,
-- reject unsafe links and persist suppression audit evidence.
-- CALLER: server-only synchronization service through service_role RPCs.
-- AUTHORIZATION_BOUNDARY: authenticated/anon cannot access these tables or functions.
-- IDEMPOTENCY: (source_id, external_event_id) is reserved before create and remains
-- stable when source dates or route descriptions change.
-- FAILURE_BEHAVIOR: conflicting, suppressed, expired or unrelated records are not linked.
-- SEARCH_PATH: SECURITY DEFINER functions pin pg_catalog, public and private.

create table if not exists private.external_action_sync_suppression_audit (
  operation_id text primary key check (length(btrim(operation_id)) between 1 and 200),
  action_id uuid not null,
  actor_user_id text not null check (length(btrim(actor_user_id)) between 1 and 200),
  reason text not null check (length(btrim(reason)) between 5 and 500),
  suppressed_at timestamptz not null default now()
);

alter table private.external_action_sync_suppression_audit enable row level security;
revoke all on private.external_action_sync_suppression_audit from public, anon, authenticated;
grant select, insert on private.external_action_sync_suppression_audit to service_role;

create or replace function public.reserve_external_action_sync_reference(
  p_identity_hash text,
  p_organizer_directory_id text,
  p_creator_user_id text,
  p_claim_token uuid,
  p_source_id text,
  p_external_event_id text,
  p_external_url text,
  p_external_revision text,
  p_source_snapshot jsonb,
  p_content_hash text
)
returns table (reservation_status text, identity_hash text, action_id uuid, creator_user_id text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_identity private.external_action_sync_identities%rowtype;
  v_reference private.external_action_sync_references%rowtype;
  v_claim record;
  v_action_organizer text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_identity_hash !~ '^[0-9a-f]{64}$'
     or nullif(btrim(p_organizer_directory_id), '') is null
     or nullif(btrim(p_creator_user_id), '') is null
     or p_claim_token is null
     or p_source_id not in ('jagis_pour_la_nature', 'fondation_de_la_mer')
     or nullif(btrim(p_external_event_id), '') is null
     or p_external_url !~ '^https://'
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or p_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid external action source reference';
  end if;

  select * into v_reference from private.external_action_sync_references
   where source_id = p_source_id and external_event_id = btrim(p_external_event_id)
   for update;
  if found then
    select * into v_identity from private.external_action_sync_identities
     where external_action_sync_identities.identity_hash = v_reference.identity_hash for update;
    if v_reference.suppressed_at is not null or v_identity.suppressed_at is not null then
      return query select 'suppressed'::text, v_reference.identity_hash, v_reference.action_id, v_identity.creator_user_id;
      return;
    end if;
    -- The source key is immutable; revisions including a new date or route continue
    -- to address the original canonical action rather than manufacturing a new one.
    update private.external_action_sync_references set
      external_url = p_external_url,
      external_revision = nullif(btrim(p_external_revision), ''),
      source_snapshot = p_source_snapshot,
      content_hash = p_content_hash,
      last_seen_at = now(), updated_at = now()
    where source_id = p_source_id and external_event_id = btrim(p_external_event_id);
    return query select case when v_identity.action_id is null then 'reserved' else 'linked' end,
      v_reference.identity_hash, v_identity.action_id, v_identity.creator_user_id;
    return;
  end if;

  select * into v_claim from public.claim_external_action_sync_identity(
    p_identity_hash, p_organizer_directory_id, p_creator_user_id, p_claim_token
  );
  if v_claim.claim_status not in ('claimed', 'linked') then
    return query select v_claim.claim_status, p_identity_hash, v_claim.action_id, v_claim.creator_user_id;
    return;
  end if;
  if v_claim.action_id is not null then
    select a.organizer_id into v_action_organizer from public.actions a where a.id = v_claim.action_id;
    if not found or v_action_organizer is distinct from btrim(p_organizer_directory_id) then
      return query select 'organizer_mismatch'::text, p_identity_hash, null::uuid, v_claim.creator_user_id;
      return;
    end if;
  end if;
  insert into private.external_action_sync_references(
    source_id, external_event_id, identity_hash, action_id, external_url,
    external_revision, source_snapshot, content_hash, last_seen_at
  ) values (
    p_source_id, btrim(p_external_event_id), p_identity_hash, v_claim.action_id, p_external_url,
    nullif(btrim(p_external_revision), ''), p_source_snapshot, p_content_hash, now()
  );
  return query select 'reserved'::text, p_identity_hash, v_claim.action_id, v_claim.creator_user_id;
exception when unique_violation then
  -- Concurrent reservation of the same source key is resolved by replaying the winner.
  select * into v_reference from private.external_action_sync_references
   where source_id = p_source_id and external_event_id = btrim(p_external_event_id);
  if found then
    return query select 'reserved'::text, v_reference.identity_hash, v_reference.action_id, null::text;
  else
    raise;
  end if;
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
  v_action_organizer text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_source_id not in ('jagis_pour_la_nature', 'fondation_de_la_mer')
     or nullif(btrim(p_external_event_id), '') is null
     or p_external_url !~ '^https://'
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or p_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid external action reference';
  end if;
  select * into v_identity from private.external_action_sync_identities
   where identity_hash = p_identity_hash for update;
  if not found then return query select 'not_found'::text, null::uuid; return; end if;
  if v_identity.suppressed_at is not null then return query select 'suppressed'::text, v_identity.action_id; return; end if;
  if v_identity.action_id is null then return query select 'not_ready'::text, null::uuid; return; end if;
  select a.organizer_id into v_action_organizer from public.actions a where a.id = v_identity.action_id;
  if not found or v_action_organizer is distinct from v_identity.organizer_directory_id then
    return query select 'organizer_mismatch'::text, null::uuid; return;
  end if;
  select * into v_reference from private.external_action_sync_references
   where source_id = p_source_id and external_event_id = btrim(p_external_event_id) for update;
  if found and v_reference.identity_hash <> p_identity_hash then
    return query select 'source_identity_conflict'::text, v_reference.action_id; return;
  end if;
  if found and v_reference.suppressed_at is not null then
    return query select 'suppressed'::text, v_reference.action_id; return;
  end if;
  insert into private.external_action_sync_references(
    source_id, external_event_id, identity_hash, action_id, external_url,
    external_revision, source_snapshot, content_hash, last_seen_at
  ) values (
    p_source_id, btrim(p_external_event_id), p_identity_hash, v_identity.action_id, p_external_url,
    nullif(btrim(p_external_revision), ''), p_source_snapshot, p_content_hash, now()
  ) on conflict (source_id, external_event_id) do update set
    action_id = excluded.action_id, external_url = excluded.external_url,
    external_revision = excluded.external_revision, source_snapshot = excluded.source_snapshot,
    content_hash = excluded.content_hash, last_seen_at = now(), updated_at = now()
   where private.external_action_sync_references.identity_hash = excluded.identity_hash
     and private.external_action_sync_references.suppressed_at is null;
  if not found then return query select 'source_identity_conflict'::text, null::uuid; return; end if;
  return query select 'linked'::text, v_identity.action_id;
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
  v_action public.actions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_action_id is null then return 'invalid_action'; end if;
  select * into v_identity from private.external_action_sync_identities
   where identity_hash = p_identity_hash for update;
  if not found then return 'not_found'; end if;
  if v_identity.suppressed_at is not null then return 'suppressed'; end if;
  if v_identity.action_id is not null then
    if v_identity.action_id <> p_action_id then return 'identity_conflict'; end if;
    select * into v_action from public.actions where id = p_action_id;
    if not found or v_action.organizer_id is distinct from v_identity.organizer_directory_id then
      return 'organizer_mismatch';
    end if;
    return 'linked';
  end if;
  if v_identity.claim_token is distinct from p_claim_token or v_identity.claim_expires_at <= now() then
    return 'claim_expired';
  end if;
  select * into v_action from public.actions where id = p_action_id;
  if not found or v_action.organizer_id is distinct from v_identity.organizer_directory_id then
    return 'organizer_mismatch';
  end if;
  update private.external_action_sync_identities set
    action_id = p_action_id, claim_token = null, claim_expires_at = null, updated_at = now()
   where identity_hash = p_identity_hash;
  update private.external_action_sync_references set action_id = p_action_id, updated_at = now()
   where identity_hash = p_identity_hash and suppressed_at is null;
  return 'linked';
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
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_action_id is null or nullif(btrim(p_actor_user_id), '') is null
     or nullif(btrim(p_operation_id), '') is null
     or length(btrim(p_reason)) < 5 or length(btrim(p_reason)) > 500 then
    raise exception 'Invalid external action suppression';
  end if;
  select * into v_identity from private.external_action_sync_identities
   where action_id = p_action_id for update;
  if not found then return 'not_synced'; end if;
  if not exists(select 1 from public.actions a
    where a.id = p_action_id and a.organizer_id = v_identity.organizer_directory_id) then
    return 'organizer_mismatch';
  end if;
  insert into private.external_action_sync_suppression_audit(operation_id, action_id, actor_user_id, reason)
  values (btrim(p_operation_id), p_action_id, btrim(p_actor_user_id), btrim(p_reason))
  on conflict (operation_id) do nothing;
  update private.external_action_sync_identities set
    suppressed_at = coalesce(suppressed_at, now()), claim_token = null, claim_expires_at = null, updated_at = now()
   where action_id = p_action_id;
  update private.external_action_sync_references set suppressed_at = coalesce(suppressed_at, now()), updated_at = now()
   where action_id = p_action_id;
  return 'suppressed';
end;
$$;

revoke all on function public.reserve_external_action_sync_reference(text, text, text, uuid, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.reserve_external_action_sync_reference(text, text, text, uuid, text, text, text, text, jsonb, text) to service_role;
revoke all on function public.link_external_action_sync_reference(text, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.link_external_action_sync_reference(text, text, text, text, text, jsonb, text) to service_role;
revoke all on function public.complete_external_action_sync_identity(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_external_action_sync_identity(text, uuid, uuid) to service_role;
revoke all on function public.suppress_external_action_sync_action(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.suppress_external_action_sync_action(uuid, text, text, text) to service_role;
