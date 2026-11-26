-- PURPOSE: Harden submit_external_action_sync_review so it never coerces non-pending review outcomes
-- (already_decided, not_required, not_found, review_error) into pending_review.
-- CALLER: service_role server store (apps/web/src/lib/actions/external-sync/store.ts).
-- AUTHORIZATION_BOUNDARY: service_role only; verifies active subscription mandate, consent_granted_at,
-- owner profile, organizer_id, organizer membership, and non-suppressed identity/reference under FOR UPDATE locks.
-- IDEMPOTENCY: expected_updated_at compare-and-set; repeated review submission preserves pending_review only when real review_state is pending_review.
-- ATOMICITY: single transaction with canonical lock order (subscriptions -> identities -> references -> actions).
-- FAILURE_BEHAVIOR: returns explicit status ('pending_review', 'already_decided', 'not_required', 'not_found', 'review_error', 'mandate_revoked', 'suppressed', 'organizer_mismatch', 'terminal_state', 'conflict').
-- SEARCH_PATH: pg_catalog, public, private.
-- GRANTS: execute revoked from public/anon/authenticated, granted only to service_role.

create or replace function public.submit_external_action_sync_review(
  p_action_id uuid,
  p_organizer_directory_id text,
  p_source_id text,
  p_external_event_id text,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_sub private.external_action_sync_subscriptions%rowtype;
  v_identity private.external_action_sync_identities%rowtype;
  v_ref private.external_action_sync_references%rowtype;
  v_action public.actions%rowtype;
  v_review jsonb;
  v_review_status text;
  v_review_state text;
  v_org_id text := nullif(btrim(p_organizer_directory_id), '');
  v_event_id text := nullif(btrim(p_external_event_id), '');
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'Forbidden'; end if;
  if p_action_id is null or v_org_id is null or v_event_id is null then
    raise exception 'Invalid external action sync review parameters';
  end if;

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
    return jsonb_build_object('status', 'mandate_revoked');
  end if;

  if not exists (select 1 from public.profiles pr where pr.id = v_sub.owner_user_id) then
    return jsonb_build_object('status', 'mandate_revoked');
  end if;

  select * into v_identity
  from private.external_action_sync_identities i
  where i.action_id = p_action_id
  for update;

  if not found or v_identity.organizer_directory_id <> v_org_id then
    return jsonb_build_object('status', 'organizer_mismatch');
  end if;
  if v_identity.suppressed_at is not null then
    return jsonb_build_object('status', 'suppressed');
  end if;

  select * into v_ref
  from private.external_action_sync_references r
  where r.source_id = p_source_id
    and r.external_event_id = v_event_id
  for update;

  if not found or v_ref.identity_hash <> v_identity.identity_hash then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_ref.suppressed_at is not null then
    return jsonb_build_object('status', 'suppressed');
  end if;

  select * into v_action
  from public.actions a
  where a.id = p_action_id
  for update;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_action.organizer_id is distinct from v_org_id then
    return jsonb_build_object('status', 'organizer_mismatch');
  end if;
  if v_action.created_by_clerk_id <> v_sub.owner_user_id
     and not exists (
       select 1 from public.action_organizers ao
       where ao.action_id = p_action_id
         and ao.organizer_clerk_id = v_sub.owner_user_id
     ) then
    return jsonb_build_object('status', 'mandate_revoked');
  end if;
  if v_action.action_phase <> 'pre_action'
     or v_action.status in ('rejected', 'cancelled') then
    return jsonb_build_object('status', 'terminal_state');
  end if;
  if p_expected_updated_at is not null and v_action.updated_at is distinct from p_expected_updated_at then
    return jsonb_build_object('status', 'conflict');
  end if;

  begin
    v_review := public.submit_association_action_review(
      p_action_id,
      v_sub.owner_user_id,
      v_action.updated_at
    );
  exception when others then
    return jsonb_build_object(
      'status', 'review_error',
      'error_message', sqlerrm
    );
  end;

  v_review_status := coalesce(v_review->>'status', '');
  v_review_state := v_review->>'review_state';

  case v_review_status
    when 'submitted', 'already_submitted' then
      if v_review_state is distinct from 'pending_review' then
        return jsonb_build_object(
          'status', 'review_error',
          'review_status', v_review_status,
          'review_state', v_review_state
        );
      end if;
      return jsonb_build_object(
        'status', 'pending_review',
        'review_status', v_review_status,
        'review_state', 'pending_review',
        'updated_at', v_review->>'updated_at'
      );
    when 'already_decided' then
      return jsonb_build_object(
        'status', 'already_decided',
        'review_status', 'already_decided',
        'review_state', v_review_state,
        'updated_at', v_review->>'updated_at'
      );
    when 'not_required' then
      return jsonb_build_object(
        'status', 'not_required',
        'review_status', 'not_required',
        'review_state', v_review_state
      );
    when 'not_found' then
      return jsonb_build_object('status', 'not_found');
    when 'conflict' then
      return jsonb_build_object(
        'status', 'conflict',
        'review_state', v_review_state,
        'updated_at', v_review->>'updated_at'
      );
    else
      return jsonb_build_object(
        'status', 'review_error',
        'review_status', coalesce(nullif(v_review_status, ''), 'unknown'),
        'review_state', v_review_state
      );
  end case;
end;
$$;

revoke all on function public.submit_external_action_sync_review(uuid, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.submit_external_action_sync_review(uuid, text, text, text, timestamptz) to service_role;
