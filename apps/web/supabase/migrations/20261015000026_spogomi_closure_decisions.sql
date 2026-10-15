-- SPOGOMI closure decisions: explicit team outcomes and append-only corrections.
-- PURPOSE: separate sports eligibility from environmental eligibility at closure.
-- CALLER: authenticated organizer route through the service-role server client.
-- AUTHORIZATION_BOUNDARY: client roles cannot read or write this private table.
-- IDEMPOTENCY: replaying the same decision version is a no-op; a new decision
-- creates a new immutable row and supersedes the previous current row.
-- ATOMICITY: the RPC locks the event and team before replacing the current flag.
-- FAILURE_BEHAVIOR: invalid scope, transition or stale version aborts wholly.
-- SEARCH_PATH: explicitly public, pg_catalog.
-- GRANTS: service_role only.

create table public.spogomi_team_closure_decisions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  division_id uuid not null,
  team_id uuid not null,
  status text not null check (status in ('present_measured', 'absent', 'forfeit', 'excluded', 'disqualified', 'result_missing', 'contested')),
  sport_eligible boolean not null,
  environmental_eligibility text not null check (environmental_eligibility in ('eligible', 'excluded', 'unknown')),
  decision_version integer not null check (decision_version > 0),
  reason text not null check (length(btrim(reason)) > 0),
  supersedes_decision_id uuid references public.spogomi_team_closure_decisions(id) on delete restrict,
  is_current boolean not null default true,
  decided_by_clerk_id text not null check (length(btrim(decided_by_clerk_id)) > 0),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade,
  foreign key (team_id, event_id, division_id) references public.spogomi_teams(id, event_id, division_id) on delete cascade,
  check (status = 'present_measured' or sport_eligible = false),
  check (not (status in ('absent', 'forfeit')) or (sport_eligible = false and environmental_eligibility = 'excluded')),
  check (not (status in ('result_missing', 'contested')) or (sport_eligible = false and environmental_eligibility = 'unknown'))
);

create unique index spogomi_team_closure_decisions_current_unique
  on public.spogomi_team_closure_decisions(event_id, division_id, team_id)
  where is_current;

create index spogomi_team_closure_decisions_history_idx
  on public.spogomi_team_closure_decisions(event_id, division_id, team_id, decision_version desc);

create trigger spogomi_team_closure_decisions_set_updated_at
before update on public.spogomi_team_closure_decisions
for each row execute function public.set_updated_at();

alter table public.spogomi_team_closure_decisions enable row level security;
revoke all on table public.spogomi_team_closure_decisions from public, anon, authenticated;
grant all on table public.spogomi_team_closure_decisions to service_role;

create or replace function public.spogomi_set_team_closure_decision(
  p_event_id uuid,
  p_division_id uuid,
  p_team_id uuid,
  p_status text,
  p_sport_eligible boolean,
  p_environmental_eligibility text,
  p_reason text,
  p_decision_version integer,
  p_actor_clerk_id text
)
returns public.spogomi_team_closure_decisions
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_existing public.spogomi_team_closure_decisions%rowtype;
  v_decision public.spogomi_team_closure_decisions%rowtype;
  v_ranking public.spogomi_official_rankings%rowtype;
  v_attestation public.spogomi_recognition_attestations%rowtype;
  v_award public.spogomi_collection_awards%rowtype;
  v_has_existing boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or p_event_id is null or p_division_id is null or p_team_id is null
     or p_status not in ('present_measured', 'absent', 'forfeit', 'excluded', 'disqualified', 'result_missing', 'contested')
     or p_environmental_eligibility not in ('eligible', 'excluded', 'unknown')
     or p_decision_version is null or p_decision_version < 1
     or length(btrim(coalesce(p_reason, ''))) = 0
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '22023', message = 'Invalid SPOGOMI closure decision';
  end if;

  perform 1 from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  perform 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI team is outside the selected division'; end if;

  select * into v_existing
    from public.spogomi_team_closure_decisions
   where event_id = p_event_id and division_id = p_division_id and team_id = p_team_id and is_current
   for update;
  if found then
    v_has_existing := true;
    if v_existing.decision_version = p_decision_version
       and v_existing.status = p_status
       and v_existing.sport_eligible = p_sport_eligible
       and v_existing.environmental_eligibility = p_environmental_eligibility
       and v_existing.reason = btrim(p_reason) then
      return v_existing;
    end if;
    if p_decision_version <= v_existing.decision_version then
      raise exception using errcode = '40001', message = 'The SPOGOMI closure decision version is stale';
    end if;
    update public.spogomi_team_closure_decisions set is_current = false where id = v_existing.id;
  end if;

  insert into public.spogomi_team_closure_decisions (
    event_id, division_id, team_id, status, sport_eligible,
    environmental_eligibility, decision_version, reason,
    supersedes_decision_id, decided_by_clerk_id
  ) values (
    p_event_id, p_division_id, p_team_id, p_status, p_sport_eligible,
    p_environmental_eligibility, p_decision_version, btrim(p_reason),
    case when v_has_existing then v_existing.id else null end, btrim(p_actor_clerk_id)
  ) returning * into v_decision;

  -- A correction after certification invalidates dependent projections without
  -- deleting their historical rows. The next explicit ranking/consolidation
  -- publication must use the new decision snapshot; sports sanctions do not
  -- rewrite the measured mass, but they do force a revalidation of the source.
  for v_ranking in
    select * from public.spogomi_official_rankings
     where event_id = p_event_id and division_id = p_division_id and status = 'certified'
     for update
  loop
    update public.spogomi_official_rankings set status = 'revoked', updated_at = now() where id = v_ranking.id;
    insert into public.spogomi_official_ranking_history
      (ranking_id, event_id, division_id, team_id, kind, rank, status, action, team_eligible, decision_version, source_reference, source_snapshot, actor_clerk_id)
    values
      (v_ranking.id, v_ranking.event_id, v_ranking.division_id, v_ranking.team_id, v_ranking.kind, v_ranking.rank, 'revoked', 'revoked', v_ranking.team_eligible, v_ranking.decision_version, v_ranking.source_reference, v_ranking.source_snapshot, btrim(p_actor_clerk_id));
  end loop;

  update public.spogomi_action_consolidations
     set is_current = false, status = 'superseded', updated_at = now()
   where event_id = p_event_id and is_current;

  for v_attestation in
    select attestation.*
      from public.spogomi_recognition_attestations attestation
      join public.spogomi_participants participant on participant.id = attestation.participant_id
       and participant.event_id = attestation.event_id and participant.division_id = attestation.division_id
     where attestation.event_id = p_event_id and attestation.division_id = p_division_id
       and participant.team_id = p_team_id and attestation.kind = 'collector' and attestation.status = 'certified'
       for update
  loop
    update public.spogomi_recognition_attestations
       set status = 'revoked', revoked_at = now(), revoked_by_clerk_id = btrim(p_actor_clerk_id),
           revocation_reason = 'La décision de clôture a été corrigée ; une nouvelle certification est requise.', updated_at = now()
     where id = v_attestation.id;
    insert into public.spogomi_recognition_attestation_history
      (attestation_id, event_id, division_id, participant_id, kind, status, action, evidence_reference, certification_version, actor_clerk_id, reason)
    values
      (v_attestation.id, v_attestation.event_id, v_attestation.division_id, v_attestation.participant_id, v_attestation.kind, 'revoked', 'revoked', v_attestation.evidence_reference, v_attestation.certification_version, btrim(p_actor_clerk_id), 'Correction de clôture SPOGOMI.');
  end loop;

  for v_award in
    select * from public.spogomi_collection_awards
     where event_id = p_event_id and status = 'active' and ranking_version is not null
     for update
  loop
    update public.spogomi_collection_awards set status = 'replaced', updated_at = now() where id = v_award.id;
    insert into public.spogomi_collection_award_history
      (award_id, event_id, division_id, user_id, badge_type_id, action, status, proof_reference, actor_clerk_id, reason)
    values
      (v_award.id, v_award.event_id, v_award.division_id, v_award.user_id, v_award.badge_type_id, 'replaced', 'replaced', v_award.proof_reference, btrim(p_actor_clerk_id), 'Correction de clôture SPOGOMI ; réconciliation requise.');
  end loop;

  return v_decision;
end;
$$;

revoke all on function public.spogomi_set_team_closure_decision(uuid, uuid, uuid, text, boolean, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.spogomi_set_team_closure_decision(uuid, uuid, uuid, text, boolean, text, text, integer, text) to service_role;

comment on table public.spogomi_team_closure_decisions is
  'Append-only event/division/team closure decisions. Sports eligibility and environmental eligibility remain independent.';
comment on function public.spogomi_set_team_closure_decision(uuid, uuid, uuid, text, boolean, text, text, integer, text) is
  'Atomic, versioned closure decision; historical rows remain queryable and only one current row exists per team.';
