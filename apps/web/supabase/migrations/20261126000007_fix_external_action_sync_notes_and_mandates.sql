-- PURPOSE: fix suppress_external_action_sync_action to use canonical notes metadata for groupJoinEnabled instead of a non-existent column, and add atomic RPC publication with transactional mandate checks.
-- CALLER: server-only synchronization engine and admin boundaries through service_role RPCs.
-- AUTHORIZATION_BOUNDARY: browser roles have no schema/table/function grants; admin is verified at HTTP.
-- IDEMPOTENCY: suppression and publication RPCs remain replay-safe and fail closed on conflicts.
-- ATOMICITY: subscription, identity, reference and public.actions rows are locked and updated in one transaction.
-- FAILURE_BEHAVIOR: revoked mandates, suppressed actions and concurrent edits return explicit statuses without partial writes.
-- SEARCH_PATH: every SECURITY DEFINER function pins pg_catalog, public and private.
-- GRANTS: execute only to service_role; private helper is not exposed to anon/authenticated.

create or replace function private.set_action_group_join_enabled_in_notes(
  p_notes text,
  p_enabled boolean
)
returns text
language plpgsql
immutable
set search_path = pg_catalog, public, private
as $$
declare
  v_lines text[];
  v_line text;
  v_idx integer;
  v_meta jsonb;
  v_updated boolean := false;
begin
  v_lines := string_to_array(coalesce(p_notes, ''), E'\n');
  if v_lines is null then
    v_lines := array[]::text[];
  end if;

  for v_idx in 1..coalesce(array_length(v_lines, 1), 0) loop
    v_line := v_lines[v_idx];
    if btrim(v_line) like '[cmm-meta]%' then
      begin
        v_meta := substr(btrim(v_line), 11)::jsonb;
        if jsonb_typeof(v_meta) = 'object' then
          v_meta := jsonb_set(v_meta, '{groupJoinEnabled}', to_jsonb(p_enabled), true);
          v_lines[v_idx] := '[cmm-meta]' || v_meta::text;
          v_updated := true;
        end if;
      exception when others then
        -- Preserve non-JSON lines untouched.
      end;
    end if;
  end loop;

  if not v_updated then
    v_lines := array_append(
      v_lines,
      '[cmm-meta]' || jsonb_build_object('groupJoinEnabled', p_enabled)::text
    );
  end if;

  return nullif(btrim(array_to_string(v_lines, E'\n')), '');
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

  -- Remove from all public surfaces according to canonical action lifecycle and notes metadata.
  update public.actions set
    moderation_visibility = 'hidden',
    hidden_at = coalesce(hidden_at, v_now),
    hidden_by_clerk_id = coalesce(hidden_by_clerk_id, v_actor_user_id),
    hidden_reason = coalesce(hidden_reason, v_reason),
    published_at = null,
    notes = private.set_action_group_join_enabled_in_notes(notes, false),
    status = 'cancelled',
    updated_at = v_now
  where id = p_action_id;

  return 'suppressed';
end;
$$;

create or replace function public.publish_external_action_sync_pre_action(
  p_action_id uuid,
  p_organizer_directory_id text,
  p_source_id text,
  p_external_event_id text,
  p_expected_updated_at timestamptz,
  p_published_at timestamptz,
  p_preparation_data jsonb default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_sub private.external_action_sync_subscriptions%rowtype;
  v_identity private.external_action_sync_identities%rowtype;
  v_ref private.external_action_sync_references%rowtype;
  v_action public.actions%rowtype;
  v_org_id text := btrim(p_organizer_directory_id);
  v_event_id text := btrim(p_external_event_id);
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;

  select * into v_sub
  from private.external_action_sync_subscriptions s
  where s.organizer_directory_id = v_org_id
    and s.source_id = p_source_id
  for update;

  if not found
     or not v_sub.enabled
     or v_sub.revoked_at is not null
     or v_sub.consent_granted_at is null
     or v_sub.authorization_ref is null
     or v_sub.access_mode = 'disabled' then
    return 'mandate_revoked';
  end if;

  if not exists (select 1 from public.profiles pr where pr.id = v_sub.owner_user_id) then
    return 'mandate_revoked';
  end if;

  select * into v_identity
  from private.external_action_sync_identities i
  where i.action_id = p_action_id
  for update;

  if not found or v_identity.organizer_directory_id <> v_org_id then
    return 'organizer_mismatch';
  end if;
  if v_identity.suppressed_at is not null then
    return 'suppressed';
  end if;

  select * into v_ref
  from private.external_action_sync_references r
  where r.source_id = p_source_id
    and r.external_event_id = v_event_id
  for update;

  if not found or v_ref.identity_hash <> v_identity.identity_hash then
    return 'not_found';
  end if;
  if v_ref.suppressed_at is not null then
    return 'suppressed';
  end if;

  select * into v_action
  from public.actions a
  where a.id = p_action_id
  for update;

  if not found then
    return 'not_found';
  end if;
  if v_action.organizer_id is distinct from v_org_id then
    return 'organizer_mismatch';
  end if;
  if v_action.created_by_clerk_id <> v_sub.owner_user_id
     and not exists (
       select 1 from public.action_organizers ao
       where ao.action_id = p_action_id
         and ao.organizer_clerk_id = v_sub.owner_user_id
     ) then
    return 'mandate_revoked';
  end if;
  if v_action.action_phase <> 'pre_action'
     or v_action.status in ('rejected', 'cancelled') then
    return 'terminal_state';
  end if;
  if v_action.published_at is not null then
    return 'already_published';
  end if;
  if p_expected_updated_at is not null and v_action.updated_at is distinct from p_expected_updated_at then
    return 'conflict';
  end if;

  update public.actions
  set published_at = p_published_at,
      preparation_data = coalesce(p_preparation_data, preparation_data),
      updated_at = clock_timestamp()
  where id = p_action_id;

  return 'published';
end;
$$;

revoke all on function public.suppress_external_action_sync_action(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.suppress_external_action_sync_action(uuid, text, text, text) to service_role;

revoke all on function public.publish_external_action_sync_pre_action(uuid, text, text, text, timestamptz, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.publish_external_action_sync_pre_action(uuid, text, text, text, timestamptz, timestamptz, jsonb) to service_role;
