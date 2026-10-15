-- SPOGOMI ranking publication must not certify a snapshot that predates a
-- current team closure decision. The existing division-scoped publication RPC
-- remains the mutation owner; this service-only wrapper adds the missing guard.

create or replace function public.spogomi_division_closure_decisions_match(
  p_event_id uuid,
  p_division_id uuid,
  p_source_snapshot jsonb
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_teams jsonb := p_source_snapshot -> 'teams';
begin
  if jsonb_typeof(v_teams) <> 'array' then return false; end if;
  if jsonb_array_length(v_teams) <> (
    select count(*) from public.spogomi_teams
    where event_id = p_event_id and division_id = p_division_id
  ) then return false; end if;
  if exists (
    select 1
      from public.spogomi_team_closure_decisions current_row
     where current_row.event_id = p_event_id
       and current_row.division_id = p_division_id
       and current_row.is_current
       and not exists (
         select 1
           from jsonb_array_elements(v_teams) captured(value)
          where captured.value ->> 'id' = current_row.team_id::text
            and captured.value ->> 'closureStatus' = current_row.status
            and (captured.value ->> 'sportEligible')::boolean = current_row.sport_eligible
            and captured.value ->> 'environmentalEligibility' = current_row.environmental_eligibility
            and (captured.value ->> 'closureDecisionVersion')::integer = current_row.decision_version
       )
  ) then return false; end if;
  return true;
end;
$$;

create or replace function public.publish_spogomi_official_rankings_for_division_checked_closure(
  p_event_id uuid,
  p_division_id uuid,
  p_decision_version text,
  p_source_reference text,
  p_rankings jsonb,
  p_actor_clerk_id text,
  p_source_snapshot jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_event_id is null
     or p_division_id is null
     or not public.spogomi_division_closure_decisions_match(p_event_id, p_division_id, p_source_snapshot) then
    raise exception using errcode = '40001', message = 'The SPOGOMI closure decision set changed since ranking calculation';
  end if;

  return public.publish_spogomi_official_rankings_for_division(
    p_event_id,
    p_division_id,
    p_decision_version,
    p_source_reference,
    p_rankings,
    p_actor_clerk_id,
    p_source_snapshot
  );
end;
$$;

revoke all on function public.spogomi_division_closure_decisions_match(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_division_closure_decisions_match(uuid, uuid, jsonb) to service_role;
revoke all on function public.publish_spogomi_official_rankings_for_division_checked_closure(uuid, uuid, text, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function public.publish_spogomi_official_rankings_for_division_checked_closure(uuid, uuid, text, text, jsonb, text, jsonb) to service_role;
