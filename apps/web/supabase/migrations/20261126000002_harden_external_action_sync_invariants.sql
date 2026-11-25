-- PURPOSE: harden external action sync reservation, lock ordering, lease expiration and suppression idempotency.
-- CALLER: server-only synchronization service through service_role RPCs.
-- AUTHORIZATION_BOUNDARY: browser roles have no schema/table/function grants; admin is verified at HTTP.
-- IDEMPOTENCY: identical active-lease reservations and identical suppression operations are idempotent; incompatible reuse is rejected without mutation.
-- ATOMICITY: all RPCs lock external_action_sync_identities before external_action_sync_references to prevent deadlocks.
-- FAILURE_BEHAVIOR: expired tokens, foreign owners, busy leases, tombstones and operation_id collisions return stable statuses without mutating state.
-- SEARCH_PATH: every SECURITY DEFINER function pins pg_catalog, public and private.
-- GRANTS: execute only to service_role; tables only to service_role with RLS enabled.

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
  v_organizer_id text;
  v_creator_id text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  v_organizer_id := nullif(btrim(p_organizer_directory_id), '');
  v_creator_id := nullif(btrim(p_creator_user_id), '');
  if p_identity_hash !~ '^[0-9a-f]{64}$'
     or v_organizer_id is null
     or v_creator_id is null
     or p_claim_token is null then
    raise exception 'Invalid external action identity claim';
  end if;

  insert into private.external_action_sync_identities(
    identity_hash, organizer_directory_id, creator_user_id, claim_token, claim_expires_at
  ) values (
    p_identity_hash, v_organizer_id, v_creator_id, p_claim_token, now() + interval '5 minutes'
  ) on conflict (identity_hash) do nothing;

  select * into v_identity
  from private.external_action_sync_identities
  where identity_hash = p_identity_hash
  for update;

  if v_identity.organizer_directory_id <> v_organizer_id then
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
    if v_identity.claim_expires_at is not null and v_identity.claim_expires_at > now() then
      return query select 'claimed'::text, null::uuid, v_identity.creator_user_id;
      return;
    end if;
    return query select 'claim_expired'::text, null::uuid, v_identity.creator_user_id;
    return;
  end if;
  if v_identity.claim_expires_at is not null and v_identity.claim_expires_at > now() then
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
  v_target_identity_hash text;
  v_organizer_id text;
  v_creator_id text;
  v_event_id text;
  v_revision text;
  v_attempt integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  v_organizer_id := nullif(btrim(p_organizer_directory_id), '');
  v_creator_id := nullif(btrim(p_creator_user_id), '');
  v_event_id := nullif(btrim(p_external_event_id), '');
  v_revision := nullif(btrim(p_external_revision), '');
  if p_identity_hash !~ '^[0-9a-f]{64}$'
     or v_organizer_id is null
     or v_creator_id is null
     or p_claim_token is null
     or p_source_id not in ('jagis_pour_la_nature', 'fondation_de_la_mer')
     or v_event_id is null
     or p_external_url !~ '^https://'
     or jsonb_typeof(p_source_snapshot) <> 'object'
     or p_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid external action source reference';
  end if;

  for v_attempt in 1..2 loop
    v_target_identity_hash := null;
    select r.identity_hash into v_target_identity_hash
    from private.external_action_sync_references r
    where r.source_id = p_source_id
      and r.external_event_id = v_event_id;

    if v_target_identity_hash is not null then
      -- Canonical lock order: identities -> references (matches complete, link and suppress).
      select * into v_identity
      from private.external_action_sync_identities i
      where i.identity_hash = v_target_identity_hash
      for update;

      select * into v_reference
      from private.external_action_sync_references r
      where r.source_id = p_source_id
        and r.external_event_id = v_event_id
      for update;

      if v_reference.suppressed_at is not null or v_identity.suppressed_at is not null then
        return query select 'suppressed'::text, v_reference.identity_hash, coalesce(v_identity.action_id, v_reference.action_id), v_identity.creator_user_id;
        return;
      end if;

      if v_identity.organizer_directory_id <> v_organizer_id then
        return query select 'identity_conflict'::text, v_reference.identity_hash, null::uuid, v_identity.creator_user_id;
        return;
      end if;

      if v_identity.action_id is not null then
        select a.organizer_id into v_action_organizer
        from public.actions a
        where a.id = v_identity.action_id;
        if not found or v_action_organizer is distinct from v_organizer_id then
          return query select 'organizer_mismatch'::text, v_reference.identity_hash, null::uuid, v_identity.creator_user_id;
          return;
        end if;

        update private.external_action_sync_references set
          external_url = p_external_url,
          external_revision = v_revision,
          source_snapshot = p_source_snapshot,
          content_hash = p_content_hash,
          last_seen_at = now(),
          updated_at = now()
        where source_id = p_source_id
          and external_event_id = v_event_id;

        return query select 'linked'::text, v_reference.identity_hash, v_identity.action_id, v_identity.creator_user_id;
        return;
      end if;

      if v_identity.claim_token = p_claim_token then
        if v_identity.claim_expires_at is null or v_identity.claim_expires_at <= now() then
          return query select 'claim_expired'::text, v_reference.identity_hash, null::uuid, v_identity.creator_user_id;
          return;
        end if;
      elsif v_identity.claim_expires_at is not null and v_identity.claim_expires_at > now() then
        return query select 'busy'::text, v_reference.identity_hash, null::uuid, v_identity.creator_user_id;
        return;
      else
        update private.external_action_sync_identities set
          claim_token = p_claim_token,
          claim_expires_at = now() + interval '5 minutes',
          updated_at = now()
        where external_action_sync_identities.identity_hash = v_identity.identity_hash;
      end if;

      update private.external_action_sync_references set
        external_url = p_external_url,
        external_revision = v_revision,
        source_snapshot = p_source_snapshot,
        content_hash = p_content_hash,
        last_seen_at = now(),
        updated_at = now()
      where source_id = p_source_id
        and external_event_id = v_event_id;

      return query select 'reserved'::text, v_reference.identity_hash, null::uuid, v_identity.creator_user_id;
      return;
    end if;

    begin
      select * into v_claim from public.claim_external_action_sync_identity(
        p_identity_hash, v_organizer_id, v_creator_id, p_claim_token
      );
      if v_claim.claim_status not in ('claimed', 'linked') then
        return query select v_claim.claim_status, p_identity_hash, v_claim.action_id, v_claim.creator_user_id;
        return;
      end if;
      if v_claim.action_id is not null then
        select a.organizer_id into v_action_organizer
        from public.actions a
        where a.id = v_claim.action_id;
        if not found or v_action_organizer is distinct from v_organizer_id then
          return query select 'organizer_mismatch'::text, p_identity_hash, null::uuid, v_claim.creator_user_id;
          return;
        end if;
      end if;

      insert into private.external_action_sync_references(
        source_id, external_event_id, identity_hash, action_id, external_url,
        external_revision, source_snapshot, content_hash, last_seen_at
      ) values (
        p_source_id, v_event_id, p_identity_hash, v_claim.action_id, p_external_url,
        v_revision, p_source_snapshot, p_content_hash, now()
      );

      return query select
        case when v_claim.claim_status = 'linked' then 'linked'::text else 'reserved'::text end,
        p_identity_hash, v_claim.action_id, v_claim.creator_user_id;
      return;
    exception when unique_violation then
      if v_attempt = 2 then
        raise;
      end if;
      -- Re-enter loop so winner is locked in canonical order (identities -> references)
      -- and all ownership, suppression, lease and token checks are re-applied.
    end;
  end loop;
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
    suppressed_at = coalesce(suppressed_at, now()),
    claim_token = null,
    claim_expires_at = null,
    updated_at = now()
  where action_id = p_action_id;

  update private.external_action_sync_references set
    suppressed_at = coalesce(suppressed_at, now()),
    updated_at = now()
  where action_id = p_action_id;

  return 'suppressed';
end;
$$;

revoke all on function public.claim_external_action_sync_identity(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_external_action_sync_identity(text, text, text, uuid) to service_role;
revoke all on function public.reserve_external_action_sync_reference(text, text, text, uuid, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.reserve_external_action_sync_reference(text, text, text, uuid, text, text, text, text, jsonb, text) to service_role;
revoke all on function public.suppress_external_action_sync_action(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.suppress_external_action_sync_action(uuid, text, text, text) to service_role;
