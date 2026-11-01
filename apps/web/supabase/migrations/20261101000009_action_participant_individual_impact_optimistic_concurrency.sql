-- PURPOSE: upgrade the canonical individual-impact RPC with an optimistic
-- concurrency token and transactionally locked eligibility dependencies.
-- CALLER: server-side participant-impact route through service_role only.
-- AUTHORIZATION_BOUNDARY: the action, participant and organizer relation are
-- rechecked after locks are acquired; no client can call this RPC directly.
-- IDEMPOTENCY: a retry uses the freshly returned action_participants.updated_at
-- revision; accepted side effects remain downstream of the successful write.
-- ATOMICITY: lock order is action -> participant -> organizer rows, then the
-- revision-guarded UPDATE. A stale token returns revision_conflict and writes
-- nothing.
-- FAILURE_BEHAVIOR: ineligible targets return ok=false; stale revisions use a
-- distinct code; SQL constraints still reject invalid payloads transactionally.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: the superseded signature is removed; only the revised RPC is granted
-- to service_role.

-- The published signature cannot be extended with CREATE OR REPLACE. Remove
-- only that superseded callable signature, then recreate the same canonical
-- RPC with its expected participant revision.
drop function if exists public.persist_action_participant_individual_impact(
  uuid, uuid, text, boolean, numeric, text, text, text, integer, numeric,
  text, text, text, jsonb, text, timestamptz
);

create or replace function public.persist_action_participant_individual_impact(
  p_action_id uuid,
  p_participant_id uuid,
  p_reviewer_user_id text,
  p_admin_override boolean,
  p_expected_participant_updated_at timestamptz,
  p_individual_waste_kg numeric,
  p_individual_waste_condition text,
  p_individual_waste_measurement_method text,
  p_individual_waste_normalization_version text,
  p_individual_cigarette_butts_count integer,
  p_individual_cigarette_butts_mass_kg numeric,
  p_individual_cigarette_butts_condition text,
  p_individual_cigarette_butts_provenance text,
  p_individual_cigarette_butts_conversion_version text,
  p_individual_cigarette_butts_lots jsonb,
  p_individual_impact_measured_by text,
  p_individual_impact_measured_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_participant public.action_participants%rowtype;
  v_reviewer_active_role text;
  v_admin_override boolean := false;
  v_result jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_reviewer_user_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'code', 'reviewer_missing');
  end if;

  -- Parent action first: action status cannot change behind the eligibility
  -- decision and the foreign-key parent lock protects organizer insertions.
  select *
    into v_action
    from public.actions
   where id = p_action_id
   for update;
  if not found or v_action.status <> 'approved' then
    return jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible');
  end if;

  -- Participant second: this is the revision-bearing row and the row whose
  -- individual measurements are being replaced.
  select *
    into v_participant
    from public.action_participants
   where action_id = p_action_id
     and id = p_participant_id
   for update;
  if not found or v_participant.participation_status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible');
  end if;

  -- Lock all current organizer rows in deterministic order before checking
  -- the reviewer. This prevents a concurrent organizer removal/replacement
  -- from changing the authorization decision after this point.
  perform 1
    from public.action_organizers as ao
   where ao.action_id = p_action_id
   order by ao.organizer_clerk_id, ao.id
   for update;

  if coalesce(p_admin_override, false) then
    -- The route's Clerk identity is not trusted as a durable authorization
    -- decision. Re-read the canonical role projection while its row is locked.
    select p.active_role_label
      into v_reviewer_active_role
      from public.profiles as p
     where p.id = p_reviewer_user_id
     for update;
    v_admin_override := v_reviewer_active_role in ('admin', 'max');
  end if;

  if not (
    v_admin_override
    or v_action.created_by_clerk_id = p_reviewer_user_id
    or exists (
      select 1
        from public.action_organizers as ao
       where ao.action_id = p_action_id
         and ao.organizer_clerk_id = p_reviewer_user_id
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible');
  end if;

  if p_expected_participant_updated_at is null
     or v_participant.updated_at is distinct from p_expected_participant_updated_at then
    return jsonb_build_object(
      'ok', false,
      'code', 'revision_conflict',
      'currentUpdatedAt', v_participant.updated_at
    );
  end if;

  -- A replay of the same measurement is a successful no-op. Measurement
  -- metadata is deliberately excluded from this comparison: the route must
  -- not mint a new measured_at value merely because the request was replayed.
  if v_participant.individual_waste_kg is not distinct from p_individual_waste_kg
     and v_participant.individual_waste_condition is not distinct from p_individual_waste_condition
     and v_participant.individual_waste_measurement_method is not distinct from p_individual_waste_measurement_method
     and v_participant.individual_waste_normalization_version is not distinct from p_individual_waste_normalization_version
     and v_participant.individual_cigarette_butts_count is not distinct from p_individual_cigarette_butts_count
     and v_participant.individual_cigarette_butts_mass_kg is not distinct from p_individual_cigarette_butts_mass_kg
     and v_participant.individual_cigarette_butts_condition is not distinct from p_individual_cigarette_butts_condition
     and v_participant.individual_cigarette_butts_provenance is not distinct from p_individual_cigarette_butts_provenance
     and v_participant.individual_cigarette_butts_conversion_version is not distinct from p_individual_cigarette_butts_conversion_version
     and v_participant.individual_cigarette_butts_lots is not distinct from p_individual_cigarette_butts_lots
     and (
       p_individual_waste_kg is not null
       or p_individual_cigarette_butts_count is not null
       or p_individual_cigarette_butts_mass_kg is not null
       or p_individual_cigarette_butts_lots is not null
       or (
         v_participant.individual_impact_measured_by is not distinct from p_individual_impact_measured_by
         and v_participant.individual_impact_measured_at is not distinct from p_individual_impact_measured_at
       )
     ) then
    return jsonb_build_object(
      'ok', true,
      'changed', false,
      'id', v_participant.id,
      'updatedAt', v_participant.updated_at,
      'userId', v_participant.user_id
    );
  end if;

  update public.action_participants as ap
     set individual_waste_kg = p_individual_waste_kg,
         individual_waste_condition = p_individual_waste_condition,
         individual_waste_measurement_method = p_individual_waste_measurement_method,
         individual_waste_normalization_version = p_individual_waste_normalization_version,
         individual_cigarette_butts_count = p_individual_cigarette_butts_count,
         individual_cigarette_butts_mass_kg = p_individual_cigarette_butts_mass_kg,
         individual_cigarette_butts_condition = p_individual_cigarette_butts_condition,
         individual_cigarette_butts_provenance = p_individual_cigarette_butts_provenance,
         individual_cigarette_butts_conversion_version = p_individual_cigarette_butts_conversion_version,
         individual_cigarette_butts_lots = p_individual_cigarette_butts_lots,
         individual_impact_measured_by = p_individual_impact_measured_by,
         individual_impact_measured_at = p_individual_impact_measured_at
   where ap.action_id = p_action_id
     and ap.id = p_participant_id
     and ap.participation_status = 'confirmed'
   returning jsonb_build_object(
     'ok', true,
     'changed', true,
     'id', ap.id,
     'updatedAt', ap.updated_at,
     'userId', ap.user_id
   ) into v_result;

  return coalesce(
    v_result,
    jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible')
  );
end;
$$;

revoke all on function public.persist_action_participant_individual_impact(
  uuid, uuid, text, boolean, timestamptz, numeric, text, text, text, integer,
  numeric, text, text, text, jsonb, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.persist_action_participant_individual_impact(
  uuid, uuid, text, boolean, timestamptz, numeric, text, text, text, integer,
  numeric, text, text, text, jsonb, text, timestamptz
) to service_role;
