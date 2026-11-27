begin;

-- PURPOSE: serialize applied-state writes with mandate revocation and prevent stale source revisions from replacing newer snapshots.
-- CALLER: server-only external sync store through service_role RPCs.
-- AUTHORIZATION_BOUNDARY: subscription row lock serializes consent/revocation; owner, source, identity, suppression and action are revalidated.
-- IDEMPOTENCY: repeating the same snapshot/hash/revision is a no-op; only the currently observed source revision may be marked applied.
-- ATOMICITY: canonical action update and applied reference snapshot commit or roll back together.
-- FAILURE_BEHAVIOR: returns mandate_revoked, suppressed, organizer_mismatch, not_found, conflict or stale_revision without partial mutation.
-- SEARCH_PATH: SECURITY DEFINER functions pin pg_catalog, public and private.
-- GRANTS: mutation RPCs are executable only by service_role.

drop function public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text);

create function public.mark_external_action_sync_reference_applied(
  p_source_id text,
  p_external_event_id text,
  p_applied_snapshot jsonb,
  p_applied_content_hash text,
  p_applied_revision text,
  p_expected_action_updated_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_identity_hash text;
  v_organizer_id text;
  v_owner_user_id text;
  v_sub private.external_action_sync_subscriptions%rowtype;
  v_identity private.external_action_sync_identities%rowtype;
  v_ref private.external_action_sync_references%rowtype;
  v_action public.actions%rowtype;
  v_applied_revision text := nullif(btrim(p_applied_revision), '');
  v_now timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if nullif(btrim(p_source_id), '') is null
     or nullif(btrim(p_external_event_id), '') is null
     or p_applied_content_hash is null
     or p_applied_content_hash !~ '^[0-9a-f]{64}$'
     or p_applied_snapshot is null
     or jsonb_typeof(p_applied_snapshot) <> 'object' then
    raise exception 'Invalid applied snapshot';
  end if;

  -- This first lookup is deliberately unlocked. The canonical mutation order starts with
  -- the subscription row; all source identity values are verified again after locking.
  select i.identity_hash, i.organizer_directory_id, i.creator_user_id
    into v_identity_hash, v_organizer_id, v_owner_user_id
    from private.external_action_sync_references r
    join private.external_action_sync_identities i using (identity_hash)
   where r.source_id = p_source_id
     and r.external_event_id = btrim(p_external_event_id);
  if not found then return 'not_found'; end if;

  select * into v_sub
    from private.external_action_sync_subscriptions s
   where s.organizer_directory_id = v_organizer_id
     and s.source_id = p_source_id
     and s.owner_user_id = v_owner_user_id
   for update;
  if not found
     or not v_sub.enabled
     or v_sub.revoked_at is not null
     or v_sub.consent_granted_at is null
     or v_sub.authorization_ref is null
     or v_sub.access_mode = 'disabled'
     or not exists (select 1 from public.profiles pr where pr.id = v_sub.owner_user_id) then
    return 'mandate_revoked';
  end if;

  select * into v_identity
    from private.external_action_sync_identities i
   where i.identity_hash = v_identity_hash
   for update;
  if not found
     or v_identity.organizer_directory_id is distinct from v_organizer_id
     or v_identity.creator_user_id is distinct from v_owner_user_id then
    return 'organizer_mismatch';
  end if;
  if v_identity.suppressed_at is not null or v_identity.action_id is null then
    return 'suppressed';
  end if;

  select * into v_ref
    from private.external_action_sync_references r
   where r.source_id = p_source_id
     and r.external_event_id = btrim(p_external_event_id)
   for update;
  if not found or v_ref.identity_hash is distinct from v_identity.identity_hash then
    return 'not_found';
  end if;
  if v_ref.suppressed_at is not null then return 'suppressed'; end if;

  -- Revisions are opaque source tokens, so equality with the latest observed value is
  -- the safe ordering test. The hash check also protects sources that omit revisions.
  if v_ref.content_hash is distinct from p_applied_content_hash
     or nullif(btrim(v_ref.external_revision), '') is distinct from v_applied_revision then
    return 'stale_revision';
  end if;

  select * into v_action
    from public.actions a
   where a.id = v_identity.action_id
   for update;
  if not found or v_action.organizer_id is distinct from v_identity.organizer_directory_id then
    return 'organizer_mismatch';
  end if;
  if v_action.created_by_clerk_id <> v_sub.owner_user_id
     and not exists (
       select 1 from public.action_organizers ao
        where ao.action_id = v_action.id
          and ao.organizer_clerk_id = v_sub.owner_user_id
     ) then
    return 'mandate_revoked';
  end if;
  if v_action.status in ('cancelled', 'rejected') then return 'suppressed'; end if;
  if p_expected_action_updated_at is not null
     and v_action.updated_at is distinct from p_expected_action_updated_at then
    return 'conflict';
  end if;

  if v_ref.applied_snapshot is not distinct from p_applied_snapshot
     and v_ref.applied_content_hash is not distinct from p_applied_content_hash
     and nullif(btrim(v_ref.applied_revision), '') is not distinct from v_applied_revision then
    return 'applied';
  end if;

  update private.external_action_sync_references
     set applied_snapshot = p_applied_snapshot,
         applied_content_hash = p_applied_content_hash,
         applied_revision = v_applied_revision,
         applied_at = v_now,
         updated_at = v_now
   where source_id = p_source_id
     and external_event_id = btrim(p_external_event_id);
  return 'applied';
end;
$$;

create function public.apply_external_action_sync_pre_action(
  p_action_id uuid,
  p_organizer_directory_id text,
  p_source_id text,
  p_external_event_id text,
  p_expected_updated_at timestamptz,
  p_updates jsonb,
  p_applied_snapshot jsonb,
  p_applied_content_hash text,
  p_applied_revision text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_update_status text;
  v_apply_status text;
  v_status text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;

  -- The existing update RPC owns consent, moderation, tombstone and optimistic-version
  -- checks and takes locks in subscription -> identity -> reference -> action order.
  -- A subtransaction rolls back that business write if the applied revision is stale.
  begin
    v_update_status := public.update_external_action_sync_pre_action(
      p_action_id, p_organizer_directory_id, p_source_id, p_external_event_id,
      p_expected_updated_at, p_updates, false
    );
    if v_update_status <> 'updated' then
      raise exception using errcode = 'PZ001', message = v_update_status;
    end if;

    v_apply_status := public.mark_external_action_sync_reference_applied(
      p_source_id, p_external_event_id, p_applied_snapshot, p_applied_content_hash,
      p_applied_revision, null
    );
    if v_apply_status <> 'applied' then
      raise exception using errcode = 'PZ001', message = v_apply_status;
    end if;
  exception when sqlstate 'PZ001' then
    get stacked diagnostics v_status = message_text;
    return v_status;
  end;
  return 'updated';
end;
$$;

revoke all on function public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text, timestamptz) to service_role;
revoke all on function public.apply_external_action_sync_pre_action(uuid, text, text, text, timestamptz, jsonb, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.apply_external_action_sync_pre_action(uuid, text, text, text, timestamptz, jsonb, jsonb, text, text) to service_role;

comment on function public.mark_external_action_sync_reference_applied(text, text, jsonb, text, text, timestamptz) is
  'PURPOSE: mark only the latest observed source snapshot applied. CALLER: service_role sync engine. AUTHORIZATION_BOUNDARY: subscription/consent row is locked against revocation; owner, identity, suppression and canonical action are revalidated. IDEMPOTENCY: same snapshot/hash/revision is a no-op. ATOMICITY: ref snapshot update is one transaction after action validation. FAILURE_BEHAVIOR: stale source content/revision returns stale_revision; action CAS returns conflict. SEARCH_PATH: pg_catalog, public, private. GRANTS: service_role only.';
comment on function public.apply_external_action_sync_pre_action(uuid, text, text, text, timestamptz, jsonb, jsonb, text, text) is
  'PURPOSE: atomically apply a validated external action field update and register the matching source revision. CALLER: service_role sync store. AUTHORIZATION_BOUNDARY: delegates to the locked canonical update guard and latest-revision applied guard. IDEMPOTENCY: optimistic action timestamp and external revision/hash. ATOMICITY: update and reference snapshot roll back together. FAILURE_BEHAVIOR: explicit guard status with no partial write. SEARCH_PATH: pg_catalog, public, private. GRANTS: service_role only.';

commit;
