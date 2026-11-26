-- Forward-only fix for public.suppress_external_action_sync_action:
-- Respect actions_cancellation_state_check without fabricating cancelled_from_status
-- for already-rejected actions, while still hiding/unpublishing them and keeping
-- cancelled tombstones immutable.

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

  -- Pending/approved actions transition to canonical cancelled tombstones with exact prior status.
  update public.actions set
    moderation_visibility = 'hidden',
    hidden_at = coalesce(hidden_at, v_now),
    hidden_by_clerk_id = coalesce(hidden_by_clerk_id, v_actor_user_id),
    hidden_reason = coalesce(hidden_reason, v_reason),
    published_at = null,
    notes = private.set_action_group_join_enabled_in_notes(notes, false),
    status = 'cancelled',
    cancelled_at = v_now,
    cancelled_by_clerk_id = v_actor_user_id,
    cancelled_from_status = status,
    updated_at = v_now
  where id = p_action_id
    and status in ('pending', 'approved');

  -- Rejected actions keep status='rejected' and null cancellation columns per actions_cancellation_state_check,
  -- while still being hidden and unpublished from all public surfaces.
  -- Already-cancelled actions are left untouched to preserve tombstone immutability.
  update public.actions set
    moderation_visibility = 'hidden',
    hidden_at = coalesce(hidden_at, v_now),
    hidden_by_clerk_id = coalesce(hidden_by_clerk_id, v_actor_user_id),
    hidden_reason = coalesce(hidden_reason, v_reason),
    published_at = null,
    notes = private.set_action_group_join_enabled_in_notes(notes, false),
    updated_at = v_now
  where id = p_action_id
    and status = 'rejected';

  return 'suppressed';
end;
$$;
