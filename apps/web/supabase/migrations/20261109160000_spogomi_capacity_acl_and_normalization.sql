-- SPOGOMI capacity ACL and canonical representation.
--
-- PURPOSE: keep registration capacities bounded and identically interpreted by
-- the policy, readiness, admission and public projections.
-- CALLER: service_role through the existing owner RPCs.
-- AUTHORIZATION_BOUNDARY: helper functions are not client-callable.
-- MIGRATION: forward-only; historical migrations remain unchanged.

create or replace function public.spogomi_registration_capacity_value(
  p_value jsonb
)
returns integer
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_text text;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_value) not in ('string', 'number') then
    return null;
  end if;
  v_text := p_value #>> '{}';
  if v_text !~ '^[1-9][0-9]*$' or length(v_text) > 10 then
    return null;
  end if;
  begin
    return v_text::integer;
  exception when numeric_value_out_of_range then
    return null;
  end;
end;
$$;

create or replace function public.spogomi_registration_policy_for_division(
  p_event_id uuid,
  p_division_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event_policy jsonb;
  v_division_policy jsonb;
  v_policy jsonb;
  v_capacity integer;
begin
  select coalesce(regulation_config -> 'registrationPolicy', '{}'::jsonb)
    into v_event_policy
    from public.spogomi_events
   where id = p_event_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'SPOGOMI event not found';
  end if;
  select coalesce(regulation_config -> 'registrationPolicy', '{}'::jsonb)
    into v_division_policy
    from public.spogomi_divisions
   where id = p_division_id and event_id = p_event_id;
  if not found then
    raise exception using errcode = '22023', message = 'spogomi_admission_division_required';
  end if;

  v_policy := v_event_policy || v_division_policy;
  if v_policy ? 'capacity' and jsonb_typeof(v_policy -> 'capacity') <> 'null' then
    v_capacity := public.spogomi_registration_capacity_value(v_policy -> 'capacity');
    if v_capacity is null then
      v_policy := jsonb_set(v_policy, '{capacity}', 'null'::jsonb, true)
        || jsonb_build_object('capacityValid', false);
    else
      v_policy := jsonb_set(v_policy, '{capacity}', to_jsonb(v_capacity), true)
        || jsonb_build_object('capacityValid', true);
    end if;
  else
    v_policy := v_policy || jsonb_build_object('capacityValid', true);
  end if;
  return v_policy;
end;
$$;

create or replace function public.spogomi_registration_capacity_for_division(
  p_event_id uuid,
  p_division_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_policy jsonb := public.spogomi_registration_policy_for_division(p_event_id, p_division_id);
  v_capacity integer;
  v_registered_count integer;
begin
  if coalesce((v_policy ->> 'capacityValid')::boolean, true) = false then
    raise exception using errcode = '23514', message = 'La capacité doit être un entier positif représentable';
  end if;
  v_capacity := public.spogomi_registration_capacity_value(v_policy -> 'capacity');
  select count(*)::integer into v_registered_count
    from public.spogomi_participants
   where event_id = p_event_id
     and division_id = p_division_id
     and registration_status = 'registered';
  return jsonb_build_object(
    'policy', v_policy,
    'capacity', v_capacity,
    'registeredCount', v_registered_count,
    'available', v_capacity is null or v_registered_count < v_capacity
  );
end;
$$;

create or replace function public.spogomi_update_registration_policy(
  p_event_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text,
  p_registration_policy jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_policy jsonb;
  v_patch jsonb := coalesce(p_registration_policy, '{}'::jsonb);
  v_capacity integer;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or jsonb_typeof(coalesce(p_registration_policy, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '42501', message = 'SPOGOMI registration policy update is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  if v_event.composition_revision <> p_expected_revision then raise exception using errcode = '40001', message = 'The SPOGOMI preparation revision changed'; end if;
  if v_event.state not in ('draft', 'registration_open') then raise exception using errcode = '23514', message = 'La préparation des inscriptions est verrouillée par l’état de l’édition'; end if;
  if v_patch ? 'capacity' and jsonb_typeof(v_patch -> 'capacity') <> 'null' then
    v_capacity := public.spogomi_registration_capacity_value(v_patch -> 'capacity');
    if v_capacity is null then raise exception using errcode = '23514', message = 'La capacité doit être un entier positif représentable'; end if;
    v_patch := jsonb_set(v_patch, '{capacity}', to_jsonb(v_capacity), true);
  end if;
  if jsonb_typeof(v_patch -> 'minorsApplicable') is not null and jsonb_typeof(v_patch -> 'minorsApplicable') <> 'boolean' then
    raise exception using errcode = '23514', message = 'La déclaration mineurs est invalide';
  end if;
  v_policy := coalesce(v_event.regulation_config -> 'registrationPolicy', '{}'::jsonb) || v_patch;
  perform set_config('spogomi.composition_write_context', 'registration_policy_update', true);
  update public.spogomi_events
     set regulation_config = jsonb_set(coalesce(regulation_config, '{}'::jsonb), '{registrationPolicy}', v_policy, true),
         composition_revision = composition_revision + 1,
         updated_at = now()
   where id = p_event_id;
  select * into v_event from public.spogomi_events where id = p_event_id;
  return to_jsonb(v_event);
end;
$$;

revoke all on function public.spogomi_registration_capacity_value(jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_registration_capacity_value(jsonb) to service_role;
revoke all on function public.spogomi_registration_policy_for_division(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_registration_policy_for_division(uuid, uuid) to service_role;
revoke all on function public.spogomi_registration_capacity_for_division(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_registration_capacity_for_division(uuid, uuid) to service_role;
revoke all on function public.spogomi_update_registration_policy(uuid, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_update_registration_policy(uuid, bigint, text, jsonb) to service_role;
