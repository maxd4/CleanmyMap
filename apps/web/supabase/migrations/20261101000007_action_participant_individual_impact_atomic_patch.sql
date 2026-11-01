-- PURPOSE: atomically persist an individual impact PATCH after rechecking its
-- action, participation and reviewer eligibility at the database boundary.
-- CALLER: server-side participant-impact route through service_role only.
-- AUTHORIZATION_BOUNDARY: action must remain approved; participant confirmed;
-- non-admin reviewer must still be creator or persisted action organizer.
-- IDEMPOTENCY: setting the same projection twice is safe; notification
-- identity remains owned by the existing revision/fingerprint mechanism.
-- ATOMICITY: eligibility predicates and UPDATE share one PostgreSQL statement.
-- FAILURE_BEHAVIOR: an ineligible or missing row returns ok=false and writes
-- nothing; CHECK constraints still reject invalid payloads transactionally.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: revoked from public/anon/authenticated; executable by service_role.

create or replace function public.persist_action_participant_individual_impact(
  p_action_id uuid,
  p_participant_id uuid,
  p_reviewer_user_id text,
  p_admin_override boolean,
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
  v_result jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_reviewer_user_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'code', 'reviewer_missing');
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
  from public.actions as a
  where ap.action_id = p_action_id
    and ap.id = p_participant_id
    and ap.participation_status = 'confirmed'
    and a.id = p_action_id
    and a.status = 'approved'
    and (
      p_admin_override
      or a.created_by_clerk_id = p_reviewer_user_id
      or exists (
        select 1
        from public.action_organizers as ao
        where ao.action_id = a.id
          and ao.organizer_clerk_id = p_reviewer_user_id
      )
    )
  returning jsonb_build_object(
    'ok', true,
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
  uuid, uuid, text, boolean, numeric, text, text, text, integer, numeric,
  text, text, text, jsonb, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.persist_action_participant_individual_impact(
  uuid, uuid, text, boolean, numeric, text, text, text, integer, numeric,
  text, text, text, jsonb, text, timestamptz
) to service_role;
