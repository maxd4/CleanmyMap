-- SPOGOMI lot 7: certified recognition facts and repeatable collection awards.
-- Rankings remain an official projection input; this migration never computes a rank.

alter table public.spogomi_events
  add column if not exists official_timezone text not null default 'Europe/Paris'
    check (length(btrim(official_timezone)) > 0);

create table public.spogomi_recognition_attestations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  participant_id uuid not null references public.spogomi_participants(id) on delete cascade,
  kind text not null check (kind in ('collector', 'referee', 'organizer')),
  status text not null check (status in ('certified', 'revoked')),
  evidence_reference text not null check (length(btrim(evidence_reference)) > 0),
  certified_by_clerk_id text not null check (length(btrim(certified_by_clerk_id)) > 0),
  certified_at timestamptz not null,
  certification_version text not null check (length(btrim(certification_version)) > 0),
  revoked_at timestamptz,
  revoked_by_clerk_id text,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, participant_id, kind),
  check (status <> 'revoked' or (revoked_at is not null and revoked_by_clerk_id is not null and revocation_reason is not null))
);

create table public.spogomi_recognition_attestation_history (
  id uuid primary key default gen_random_uuid(),
  attestation_id uuid not null references public.spogomi_recognition_attestations(id) on delete restrict,
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  participant_id uuid not null references public.spogomi_participants(id) on delete restrict,
  kind text not null check (kind in ('collector', 'referee', 'organizer')),
  status text not null check (status in ('certified', 'revoked')),
  action text not null check (action in ('certified', 'revoked', 'corrected')),
  evidence_reference text not null,
  certification_version text not null,
  actor_clerk_id text not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.spogomi_official_rankings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  team_id uuid not null references public.spogomi_teams(id) on delete cascade,
  kind text not null check (kind in ('points', 'butts')),
  rank integer not null check (rank > 0),
  status text not null check (status in ('certified', 'revoked')),
  team_eligible boolean not null,
  decision_version text not null check (length(btrim(decision_version)) > 0),
  source_reference text not null check (length(btrim(source_reference)) > 0),
  decided_by_clerk_id text not null check (length(btrim(decided_by_clerk_id)) > 0),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, kind, team_id, decision_version)
);

create unique index spogomi_official_rankings_current_unique
  on public.spogomi_official_rankings(event_id, kind, team_id)
  where status = 'certified';

create table public.spogomi_collection_awards (
  id uuid primary key default gen_random_uuid(),
  user_id text not null check (length(btrim(user_id)) > 0),
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  badge_type_id text not null check (badge_type_id in (
    'spogomi_collector', 'spogomi_referee',
    'spogomi_points_bronze', 'spogomi_points_silver', 'spogomi_points_gold',
    'spogomi_butts_bronze', 'spogomi_butts_silver', 'spogomi_butts_gold',
    'spogomi_double_podium', 'spogomi_organizer'
  )),
  event_year integer not null,
  event_local_date date not null,
  event_timezone text not null check (length(btrim(event_timezone)) > 0),
  proof_reference text not null check (length(btrim(proof_reference)) > 0),
  certification_reference text not null check (length(btrim(certification_reference)) > 0),
  ranking_version text,
  status text not null check (status in ('active', 'revoked', 'replaced')),
  awarded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, badge_type_id)
);

create table public.spogomi_collection_award_history (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.spogomi_collection_awards(id) on delete restrict,
  user_id text not null,
  event_id uuid not null references public.spogomi_events(id) on delete restrict,
  badge_type_id text not null,
  action text not null check (action in ('awarded', 'reinstated', 'revoked', 'replaced', 'corrected')),
  status text not null check (status in ('active', 'revoked', 'replaced')),
  proof_reference text not null,
  actor_clerk_id text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index spogomi_recognition_attestations_event_idx on public.spogomi_recognition_attestations(event_id, kind, status);
create index spogomi_official_rankings_event_idx on public.spogomi_official_rankings(event_id, kind, status);
create index spogomi_collection_awards_user_idx on public.spogomi_collection_awards(user_id, event_year desc, event_id);
create index spogomi_collection_awards_event_idx on public.spogomi_collection_awards(event_id, status);

create trigger spogomi_recognition_attestations_set_updated_at
before update on public.spogomi_recognition_attestations
for each row execute function public.set_updated_at();
create trigger spogomi_official_rankings_set_updated_at
before update on public.spogomi_official_rankings
for each row execute function public.set_updated_at();
create trigger spogomi_collection_awards_set_updated_at
before update on public.spogomi_collection_awards
for each row execute function public.set_updated_at();

alter table public.spogomi_recognition_attestations enable row level security;
alter table public.spogomi_recognition_attestation_history enable row level security;
alter table public.spogomi_official_rankings enable row level security;
alter table public.spogomi_collection_awards enable row level security;
alter table public.spogomi_collection_award_history enable row level security;

revoke all on table public.spogomi_recognition_attestations from public, anon, authenticated;
revoke all on table public.spogomi_recognition_attestation_history from public, anon, authenticated;
revoke all on table public.spogomi_official_rankings from public, anon, authenticated;
revoke all on table public.spogomi_collection_awards from public, anon, authenticated;
revoke all on table public.spogomi_collection_award_history from public, anon, authenticated;
grant all on table public.spogomi_recognition_attestations to service_role;
grant all on table public.spogomi_recognition_attestation_history to service_role;
grant all on table public.spogomi_official_rankings to service_role;
grant all on table public.spogomi_collection_awards to service_role;
grant all on table public.spogomi_collection_award_history to service_role;

create or replace function public.reconcile_spogomi_collection_awards(
  p_event_id uuid,
  p_awards jsonb,
  p_actor_clerk_id text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_award jsonb;
  v_existing public.spogomi_collection_awards%rowtype;
  v_event_date date;
  v_event_year integer;
  v_touched integer := 0;
  v_action text;
begin
  -- PURPOSE: atomically replace one event's repeatable recognition projection.
  -- CALLER: server-side SPOGOMI recognition reconciler only.
  -- AUTHORIZATION_BOUNDARY: service_role grant; browser roles receive no table/RPC access.
  -- IDEMPOTENCY: unique(user_id,event_id,badge_type_id) and deterministic desired set.
  -- ATOMICITY: event and current awards are locked in one transaction.
  -- FAILURE_BEHAVIOR: invalid or incomplete desired input aborts without partial awards.
  -- SEARCH_PATH: fixed to public, pg_catalog. GRANTS: service_role only.
  if coalesce(auth.role(), '') <> 'service_role' or p_event_id is null or
     p_awards is null or jsonb_typeof(p_awards) <> 'array' or
     length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI recognition reconciliation is forbidden';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI event not found'; end if;
  v_event_date := (v_event.starts_at at time zone v_event.official_timezone)::date;
  v_event_year := extract(year from (v_event.starts_at at time zone v_event.official_timezone))::integer;

  for v_award in select value from jsonb_array_elements(p_awards) loop
    if length(btrim(coalesce(v_award ->> 'userId', ''))) = 0 or
       length(btrim(coalesce(v_award ->> 'badgeTypeId', ''))) = 0 or
       length(btrim(coalesce(v_award ->> 'proofReference', ''))) = 0 or
       length(btrim(coalesce(v_award ->> 'certificationReference', ''))) = 0 then
      raise exception using errcode = '22023', message = 'Invalid SPOGOMI award proof';
    end if;
    select * into v_existing from public.spogomi_collection_awards
     where user_id = v_award ->> 'userId' and event_id = p_event_id and badge_type_id = v_award ->> 'badgeTypeId'
     for update;
    if found then
      if v_existing.status <> 'active' or
         v_existing.proof_reference is distinct from v_award ->> 'proofReference' or
         v_existing.certification_reference is distinct from v_award ->> 'certificationReference' or
         v_existing.ranking_version is distinct from nullif(v_award ->> 'rankingVersion', '') then
        v_action := case when v_existing.status <> 'active' then 'reinstated' else 'corrected' end;
        update public.spogomi_collection_awards set
          event_year = v_event_year, event_local_date = v_event_date, event_timezone = v_event.official_timezone,
          proof_reference = v_award ->> 'proofReference', certification_reference = v_award ->> 'certificationReference',
          ranking_version = nullif(v_award ->> 'rankingVersion', ''), status = 'active', updated_at = now()
         where id = v_existing.id;
        insert into public.spogomi_collection_award_history
          (award_id, user_id, event_id, badge_type_id, action, status, proof_reference, actor_clerk_id)
        values (v_existing.id, v_award ->> 'userId', p_event_id, v_award ->> 'badgeTypeId', v_action, 'active', v_award ->> 'proofReference', p_actor_clerk_id);
        v_touched := v_touched + 1;
      end if;
    else
      insert into public.spogomi_collection_awards
        (user_id, event_id, badge_type_id, event_year, event_local_date, event_timezone, proof_reference, certification_reference, ranking_version, status)
      values
        (v_award ->> 'userId', p_event_id, v_award ->> 'badgeTypeId', v_event_year, v_event_date, v_event.official_timezone,
         v_award ->> 'proofReference', v_award ->> 'certificationReference', nullif(v_award ->> 'rankingVersion', ''), 'active')
      returning * into v_existing;
      insert into public.spogomi_collection_award_history
        (award_id, user_id, event_id, badge_type_id, action, status, proof_reference, actor_clerk_id)
      values (v_existing.id, v_existing.user_id, p_event_id, v_existing.badge_type_id, 'awarded', 'active', v_existing.proof_reference, p_actor_clerk_id);
      v_touched := v_touched + 1;
    end if;
  end loop;

  for v_existing in select * from public.spogomi_collection_awards where event_id = p_event_id and status = 'active' for update loop
    if not exists (select 1 from jsonb_array_elements(p_awards) a where a ->> 'userId' = v_existing.user_id and a ->> 'badgeTypeId' = v_existing.badge_type_id) then
      update public.spogomi_collection_awards set status = 'replaced', updated_at = now() where id = v_existing.id;
      insert into public.spogomi_collection_award_history
        (award_id, user_id, event_id, badge_type_id, action, status, proof_reference, actor_clerk_id, reason)
      values (v_existing.id, v_existing.user_id, p_event_id, v_existing.badge_type_id, 'replaced', 'replaced', v_existing.proof_reference, p_actor_clerk_id, 'Projection SPOGOMI corrigée ou preuve révoquée.');
      v_touched := v_touched + 1;
    end if;
  end loop;
  return v_touched;
end;
$$;

create or replace function public.set_spogomi_recognition_attestation(
  p_event_id uuid,
  p_participant_id uuid,
  p_kind text,
  p_status text,
  p_evidence_reference text,
  p_certification_version text,
  p_actor_clerk_id text,
  p_reason text
)
returns public.spogomi_recognition_attestations
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_participant public.spogomi_participants%rowtype;
  v_existing public.spogomi_recognition_attestations%rowtype;
  v_result public.spogomi_recognition_attestations%rowtype;
begin
  -- PURPOSE: record the controlled proof of actual SPOGOMI work, not a role assignment.
  -- CALLER: organizer-authorized server route; no browser role can execute this RPC.
  -- AUTHORIZATION_BOUNDARY: the route checks event ownership and this function rejects self-attestation.
  -- IDEMPOTENCY: one current fact per event, participant and kind; every decision is appended to history.
  -- ATOMICITY: current fact and history row are written in one transaction.
  -- FAILURE_BEHAVIOR: invalid, self-authored or incomplete proof aborts without a current fact.
  -- SEARCH_PATH: fixed to public, pg_catalog. GRANTS: service_role only.
  if coalesce(auth.role(), '') <> 'service_role' or p_event_id is null or p_participant_id is null or
     p_kind not in ('collector', 'referee', 'organizer') or p_status not in ('certified', 'revoked') or
     length(btrim(coalesce(p_evidence_reference, ''))) = 0 or
     length(btrim(coalesce(p_certification_version, ''))) = 0 or
     length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 or
     (p_status = 'revoked' and length(btrim(coalesce(p_reason, ''))) = 0) then
    raise exception using errcode = '22023', message = 'Invalid SPOGOMI attestation';
  end if;
  select * into v_participant from public.spogomi_participants
   where id = p_participant_id and event_id = p_event_id for update;
  if not found then raise exception using errcode = 'P0002', message = 'SPOGOMI participant not found'; end if;
  if v_participant.clerk_id is not null and v_participant.clerk_id = p_actor_clerk_id then
    raise exception using errcode = '42501', message = 'SPOGOMI self-attestation is forbidden';
  end if;
  select * into v_existing from public.spogomi_recognition_attestations
   where event_id = p_event_id and participant_id = p_participant_id and kind = p_kind for update;
  if found then
    update public.spogomi_recognition_attestations set
      status = p_status, evidence_reference = btrim(p_evidence_reference),
      certified_by_clerk_id = p_actor_clerk_id, certified_at = coalesce(v_existing.certified_at, now()),
      certification_version = btrim(p_certification_version),
      revoked_at = case when p_status = 'revoked' then now() else null end,
      revoked_by_clerk_id = case when p_status = 'revoked' then p_actor_clerk_id else null end,
      revocation_reason = case when p_status = 'revoked' then nullif(btrim(coalesce(p_reason, '')), '') else null end,
      updated_at = now()
     where id = v_existing.id returning * into v_result;
  else
    if p_status = 'revoked' then
      raise exception using errcode = '23514', message = 'A recognition proof must be certified before revocation';
    end if;
    insert into public.spogomi_recognition_attestations
      (event_id, participant_id, kind, status, evidence_reference, certified_by_clerk_id, certified_at, certification_version)
    values (p_event_id, p_participant_id, p_kind, p_status, btrim(p_evidence_reference), p_actor_clerk_id, now(), btrim(p_certification_version))
    returning * into v_result;
  end if;
  insert into public.spogomi_recognition_attestation_history
    (attestation_id, event_id, participant_id, kind, status, action, evidence_reference, certification_version, actor_clerk_id, reason)
  values (v_result.id, p_event_id, p_participant_id, p_kind, p_status,
    case when p_status = 'revoked' then 'revoked' when v_existing.id is null then 'certified' else 'corrected' end,
    v_result.evidence_reference, v_result.certification_version, p_actor_clerk_id, nullif(btrim(coalesce(p_reason, '')), ''));
  return v_result;
end;
$$;

revoke all on function public.reconcile_spogomi_collection_awards(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.reconcile_spogomi_collection_awards(uuid, jsonb, text) to service_role;
revoke all on function public.set_spogomi_recognition_attestation(uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.set_spogomi_recognition_attestation(uuid, uuid, text, text, text, text, text, text) to service_role;

comment on table public.spogomi_official_rankings is
  'Certified official ranking projection consumed by recognition; no local ranking or tiebreaker is computed here.';
comment on table public.spogomi_collection_awards is
  'Repeatable private SPOGOMI award instances. The badge catalog remains the identity owner; these rows are reconstructible projections.';
comment on function public.reconcile_spogomi_collection_awards(uuid, jsonb, text) is
  'ATOMIC replacement of one event collection projection; corrections never create a second active award instance.';
