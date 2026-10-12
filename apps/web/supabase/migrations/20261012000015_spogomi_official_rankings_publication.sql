-- SPOGOMI lot 8: atomic replacement of the official ranking projection.
-- Scores and eligibility are computed by the versioned server projection;
-- this RPC owns the durable, auditable ranking rows only.

create or replace function public.publish_spogomi_official_rankings(
  p_event_id uuid,
  p_decision_version text,
  p_source_reference text,
  p_rankings jsonb,
  p_actor_clerk_id text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_ranking jsonb;
  v_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_event_id is null
     or length(btrim(coalesce(p_decision_version, ''))) = 0
     or length(btrim(coalesce(p_source_reference, ''))) = 0
     or jsonb_typeof(p_rankings) <> 'array'
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI ranking publication is forbidden';
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  if v_event.state <> 'certified' or v_event.regulation_status <> 'complete' then
    raise exception using errcode = '23514', message = 'Only a certified event with complete rules can publish official rankings';
  end if;
  perform 1 from public.spogomi_teams where event_id = p_event_id for update;
  update public.spogomi_official_rankings
     set status = 'revoked', updated_at = now()
   where event_id = p_event_id and status = 'certified';

  for v_ranking in select value from jsonb_array_elements(p_rankings) loop
    if (v_ranking ->> 'kind') not in ('points', 'butts')
       or nullif(v_ranking ->> 'teamId', '') is null
       or (v_ranking ->> 'rank')::integer < 1
       or jsonb_typeof(v_ranking -> 'teamEligible') <> 'boolean'
       or not exists (select 1 from public.spogomi_teams where id = (v_ranking ->> 'teamId')::uuid and event_id = p_event_id) then
      raise exception using errcode = '22023', message = 'Invalid SPOGOMI official ranking';
    end if;
    insert into public.spogomi_official_rankings
      (event_id, team_id, kind, rank, status, team_eligible, decision_version, source_reference, decided_by_clerk_id)
    values
      (p_event_id, (v_ranking ->> 'teamId')::uuid, v_ranking ->> 'kind', (v_ranking ->> 'rank')::integer,
       'certified', (v_ranking ->> 'teamEligible')::boolean, btrim(p_decision_version), btrim(p_source_reference), btrim(p_actor_clerk_id));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.publish_spogomi_official_rankings(uuid, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.publish_spogomi_official_rankings(uuid, text, text, jsonb, text) to service_role;
