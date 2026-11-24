-- LOT XL | SPOGOMI : affectation nominative, serveur et revocable d'un arbitre referent par equipe.
-- Forward-only migration: aucune modification des compositions sportives, places Weezevent ou resultats.

create table if not exists public.spogomi_team_referee_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  team_id uuid not null,
  referee_clerk_id text not null check (length(btrim(referee_clerk_id)) > 0),
  assigned_by_clerk_id text not null check (length(btrim(assigned_by_clerk_id)) > 0),
  assigned_at timestamptz not null default now(),
  revoked_by_clerk_id text,
  revoked_at timestamptz,
  revocation_reason text,
  replaced_by_assignment_id uuid references public.spogomi_team_referee_assignments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (team_id, event_id, division_id)
    references public.spogomi_teams(id, event_id, division_id)
    on delete cascade,
  check (
    (revoked_at is null and revoked_by_clerk_id is null)
    or (revoked_at is not null and revoked_by_clerk_id is not null and length(btrim(revoked_by_clerk_id)) > 0)
  )
);

create unique index if not exists spogomi_team_referee_assignments_active_team_unique
  on public.spogomi_team_referee_assignments(team_id)
  where revoked_at is null;

create unique index if not exists spogomi_team_referee_assignments_active_referee_event_unique
  on public.spogomi_team_referee_assignments(event_id, referee_clerk_id)
  where revoked_at is null;

create index if not exists spogomi_team_referee_assignments_event_division_idx
  on public.spogomi_team_referee_assignments(event_id, division_id, team_id);

create table if not exists public.spogomi_team_referee_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.spogomi_team_referee_assignments(id) on delete set null,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  team_id uuid not null,
  referee_clerk_id text not null check (length(btrim(referee_clerk_id)) > 0),
  action text not null check (action in ('assigned', 'replaced', 'revoked')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists spogomi_team_referee_assignment_audit_event_idx
  on public.spogomi_team_referee_assignment_audit(event_id, created_at desc);

alter table public.spogomi_team_referee_assignments enable row level security;
alter table public.spogomi_team_referee_assignment_audit enable row level security;

revoke all on table public.spogomi_team_referee_assignments from public, anon, authenticated;
revoke all on table public.spogomi_team_referee_assignment_audit from public, anon, authenticated;
grant all on table public.spogomi_team_referee_assignments to service_role;
grant all on table public.spogomi_team_referee_assignment_audit to service_role;

create or replace function public.spogomi_actor_is_event_organizer(
  p_event_id uuid,
  p_actor_clerk_id text
)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.spogomi_events e
    left join public.actions a on a.id = e.action_id
    where e.id = p_event_id
      and length(btrim(coalesce(p_actor_clerk_id, ''))) > 0
      and (
        e.created_by_clerk_id = btrim(p_actor_clerk_id)
        or a.created_by_clerk_id = btrim(p_actor_clerk_id)
        or exists (
          select 1
          from public.action_organizers ao
          where ao.action_id = e.action_id
            and ao.user_id = btrim(p_actor_clerk_id)
        )
      )
  );
$$;

revoke all on function public.spogomi_actor_is_event_organizer(uuid, text) from public, anon, authenticated;
grant execute on function public.spogomi_actor_is_event_organizer(uuid, text) to service_role;

create or replace function public.spogomi_referee_is_team_eligible(
  p_event_id uuid,
  p_division_id uuid,
  p_referee_clerk_id text
)
returns boolean
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_referee_id text := btrim(coalesce(p_referee_clerk_id, ''));
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_referee_eligibility_requires_service_role';
  end if;
  if length(v_referee_id) = 0 then
    return false;
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then
    return false;
  end if;

  if not exists (
    select 1 from public.spogomi_divisions d
    where d.id = p_division_id and d.event_id = p_event_id
  ) then
    return false;
  end if;

  -- Interdire tout cumul competiteur inscrit / arbitre referent sur l'edition.
  if exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_referee_id
  ) then
    return false;
  end if;

  -- Exiger une habilitation arbitre active sur l'edition.
  if not exists (
    select 1
    from public.spogomi_event_reviewers r
    where r.event_id = p_event_id
      and r.clerk_id = v_referee_id
      and r.role = 'referee'
      and r.revoked_at is null
  ) then
    return false;
  end if;

  -- Exiger une qualification valide et confirmation pratique sur la division et le reglement courant.
  if not exists (
    select 1
    from public.spogomi_referee_applications app
    where app.event_id = p_event_id
      and app.division_id = p_division_id
      and app.clerk_id = v_referee_id
      and app.status = 'habilitated'
      and app.regulation_version = v_event.regulation_version
      and app.quiz_proof_id is not null
      and app.practical_confirmation_id is not null
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.spogomi_referee_is_team_eligible(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.spogomi_referee_is_team_eligible(uuid, uuid, text) to service_role;

create or replace function public.spogomi_team_referee_status(
  p_event_id uuid,
  p_division_id uuid,
  p_team_id uuid
)
returns text
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_assignment public.spogomi_team_referee_assignments%rowtype;
  v_event public.spogomi_events%rowtype;
  v_app public.spogomi_referee_applications%rowtype;
  v_has_active_reviewer boolean;
  v_is_participant boolean;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_team_referee_status_requires_service_role';
  end if;

  select *
  into v_assignment
  from public.spogomi_team_referee_assignments a
  where a.event_id = p_event_id
    and a.division_id = p_division_id
    and a.team_id = p_team_id
    and a.revoked_at is null
  limit 1;

  if not found then
    return 'to_assign';
  end if;

  select * into v_event from public.spogomi_events where id = p_event_id;
  if not found then
    return 'unavailable';
  end if;

  select exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_assignment.referee_clerk_id
  ) into v_is_participant;

  if v_is_participant then
    return 'unavailable';
  end if;

  select exists (
    select 1
    from public.spogomi_event_reviewers r
    where r.event_id = p_event_id
      and r.clerk_id = v_assignment.referee_clerk_id
      and r.role = 'referee'
      and r.revoked_at is null
  ) into v_has_active_reviewer;

  if not v_has_active_reviewer then
    return 'unavailable';
  end if;

  select *
  into v_app
  from public.spogomi_referee_applications app
  where app.event_id = p_event_id
    and app.division_id = p_division_id
    and app.clerk_id = v_assignment.referee_clerk_id
  limit 1;

  if not found then
    return 'unavailable';
  end if;

  if v_app.status in ('refused', 'revoked') then
    return 'unavailable';
  end if;

  if v_app.status in ('registered', 'theory_qualified', 'practical_pending')
     or v_app.regulation_version is distinct from v_event.regulation_version
     or v_app.quiz_proof_id is null
     or v_app.practical_confirmation_id is null then
    return 'pending_validation';
  end if;

  if v_app.status = 'habilitated' then
    return 'assigned';
  end if;

  return 'unavailable';
end;
$$;

revoke all on function public.spogomi_team_referee_status(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_team_referee_status(uuid, uuid, uuid) to service_role;

create or replace function public.spogomi_division_referee_coverage_ready(
  p_event_id uuid,
  p_division_id uuid
)
returns boolean
language plpgsql
stable
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_team_count integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_referee_coverage_requires_service_role';
  end if;

  select count(*)::integer
  into v_team_count
  from public.spogomi_teams t
  where t.event_id = p_event_id
    and t.division_id = p_division_id;

  if v_team_count = 0 then
    return false;
  end if;

  return not exists (
    select 1
    from public.spogomi_teams t
    where t.event_id = p_event_id
      and t.division_id = p_division_id
      and public.spogomi_team_referee_status(p_event_id, p_division_id, t.id) <> 'assigned'
  );
end;
$$;

revoke all on function public.spogomi_division_referee_coverage_ready(uuid, uuid) from public, anon, authenticated;
grant execute on function public.spogomi_division_referee_coverage_ready(uuid, uuid) to service_role;

create or replace function public.spogomi_assign_team_referee(
  p_event_id uuid,
  p_division_id uuid,
  p_team_id uuid,
  p_referee_clerk_id text,
  p_actor_clerk_id text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_referee_id text := btrim(coalesce(p_referee_clerk_id, ''));
  v_actor_id text := btrim(coalesce(p_actor_clerk_id, ''));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_team public.spogomi_teams%rowtype;
  v_existing public.spogomi_team_referee_assignments%rowtype;
  v_conflict public.spogomi_team_referee_assignments%rowtype;
  v_inserted public.spogomi_team_referee_assignments%rowtype;
  v_action text := 'assigned';
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_assign_team_referee_requires_service_role';
  end if;
  if length(v_actor_id) = 0 or length(v_referee_id) = 0 then
    raise exception using errcode = '23514', message = 'spogomi_team_referee_actor_and_subject_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('spogomi_team_referee:%s', p_event_id), 0));

  perform 1 from public.spogomi_events where id = p_event_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_event_not_found';
  end if;

  if not public.spogomi_actor_is_event_organizer(p_event_id, v_actor_id) then
    raise exception using errcode = '42501', message = 'spogomi_team_referee_organizer_required';
  end if;

  select *
  into v_team
  from public.spogomi_teams
  where id = p_team_id
    and event_id = p_event_id
    and division_id = p_division_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'spogomi_team_not_found';
  end if;

  if exists (
    select 1
    from public.spogomi_participants p
    where p.event_id = p_event_id
      and p.registration_status = 'registered'
      and p.clerk_id = v_referee_id
  ) then
    raise exception using errcode = '23514', message = 'spogomi_participant_cannot_be_team_referee';
  end if;

  if not public.spogomi_referee_is_team_eligible(p_event_id, p_division_id, v_referee_id) then
    raise exception using errcode = '42501', message = 'spogomi_referee_not_habilitated_for_division';
  end if;

  select *
  into v_existing
  from public.spogomi_team_referee_assignments
  where team_id = p_team_id
    and revoked_at is null
  for update;

  if found and v_existing.referee_clerk_id = v_referee_id then
    return jsonb_build_object(
      'already_processed', true,
      'assignment', to_jsonb(v_existing),
      'status', public.spogomi_team_referee_status(p_event_id, p_division_id, p_team_id)
    );
  end if;

  select *
  into v_conflict
  from public.spogomi_team_referee_assignments
  where event_id = p_event_id
    and referee_clerk_id = v_referee_id
    and revoked_at is null
    and team_id <> p_team_id
  limit 1;
  if found then
    raise exception using errcode = '23505', message = 'spogomi_referee_already_assigned_in_event';
  end if;

  -- Revoke the current row before inserting its replacement: the partial
  -- unique index permits only one active assignment per team. Any later
  -- failure rolls this update back with the function call's transaction.
  if v_existing.id is not null then
    v_action := 'replaced';
    update public.spogomi_team_referee_assignments
    set revoked_at = now(),
        revoked_by_clerk_id = v_actor_id,
        revocation_reason = coalesce(v_reason, 'replaced'),
        updated_at = now()
    where id = v_existing.id;
  end if;

  insert into public.spogomi_team_referee_assignments (
    event_id,
    division_id,
    team_id,
    referee_clerk_id,
    assigned_by_clerk_id
  ) values (
    p_event_id,
    p_division_id,
    p_team_id,
    v_referee_id,
    v_actor_id
  )
  returning * into v_inserted;

  if v_existing.id is not null then
    update public.spogomi_team_referee_assignments
    set replaced_by_assignment_id = v_inserted.id,
        updated_at = now()
    where id = v_existing.id;
  end if;

  insert into public.spogomi_team_referee_assignment_audit (
    assignment_id,
    event_id,
    division_id,
    team_id,
    referee_clerk_id,
    action,
    actor_clerk_id,
    reason
  ) values (
    v_inserted.id,
    p_event_id,
    p_division_id,
    p_team_id,
    v_referee_id,
    v_action,
    v_actor_id,
    v_reason
  );

  return jsonb_build_object(
    'already_processed', false,
    'action', v_action,
    'assignment', to_jsonb(v_inserted),
    'status', public.spogomi_team_referee_status(p_event_id, p_division_id, p_team_id)
  );
end;
$$;

revoke all on function public.spogomi_assign_team_referee(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_assign_team_referee(uuid, uuid, uuid, text, text, text) to service_role;

create or replace function public.spogomi_revoke_team_referee(
  p_event_id uuid,
  p_division_id uuid,
  p_team_id uuid,
  p_actor_clerk_id text,
  p_reason text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_actor_id text := btrim(coalesce(p_actor_clerk_id, ''));
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_existing public.spogomi_team_referee_assignments%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'spogomi_revoke_team_referee_requires_service_role';
  end if;
  if length(v_actor_id) = 0 then
    raise exception using errcode = '23514', message = 'spogomi_team_referee_actor_required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('spogomi_team_referee:%s', p_event_id), 0));

  if not public.spogomi_actor_is_event_organizer(p_event_id, v_actor_id) then
    raise exception using errcode = '42501', message = 'spogomi_team_referee_organizer_required';
  end if;

  select *
  into v_existing
  from public.spogomi_team_referee_assignments
  where event_id = p_event_id
    and division_id = p_division_id
    and team_id = p_team_id
    and revoked_at is null
  for update;

  if not found then
    return jsonb_build_object(
      'already_processed', true,
      'revoked', false,
      'status', 'to_assign'
    );
  end if;

  update public.spogomi_team_referee_assignments
  set revoked_at = now(),
      revoked_by_clerk_id = v_actor_id,
      revocation_reason = coalesce(v_reason, 'revoked_by_organizer'),
      updated_at = now()
  where id = v_existing.id
  returning * into v_existing;

  insert into public.spogomi_team_referee_assignment_audit (
    assignment_id,
    event_id,
    division_id,
    team_id,
    referee_clerk_id,
    action,
    actor_clerk_id,
    reason
  ) values (
    v_existing.id,
    p_event_id,
    p_division_id,
    p_team_id,
    v_existing.referee_clerk_id,
    'revoked',
    v_actor_id,
    coalesce(v_reason, 'revoked_by_organizer')
  );

  return jsonb_build_object(
    'already_processed', false,
    'revoked', true,
    'assignment', to_jsonb(v_existing),
    'status', 'to_assign'
  );
end;
$$;

revoke all on function public.spogomi_revoke_team_referee(uuid, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_revoke_team_referee(uuid, uuid, uuid, text, text) to service_role;

-- Enforce complete team referee coverage before launching field collection.
create or replace function public.spogomi_launch_field_phase(
  p_event_id uuid,
  p_division_id uuid,
  p_phase text,
  p_at timestamptz,
  p_actor_clerk_id text,
  p_reason text,
  p_provenance text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_operation public.spogomi_field_operations%rowtype;
  v_action text;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI field phases are server-only';
  end if;
  if p_phase not in ('collection', 'sorting', 'weighing', 'closed') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI field phase is invalid';
  end if;
  if p_phase = 'collection' and not public.spogomi_division_referee_coverage_ready(p_event_id, p_division_id) then
    raise exception using errcode = '42501', message = 'spogomi_team_referee_coverage_incomplete';
  end if;
  select * into v_operation from public.spogomi_field_operations where event_id = p_event_id and division_id = p_division_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI field operation is not configured';
  end if;
  if p_phase = 'collection' then
    update public.spogomi_field_operations set official_start_at = coalesce(official_start_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id;
  elsif p_phase = 'sorting' then
    update public.spogomi_field_operations set collection_end_at = coalesce(collection_end_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id;
  elsif p_phase = 'weighing' then
    update public.spogomi_field_operations set weighing_start_at = coalesce(weighing_start_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id;
  else
    update public.spogomi_field_operations set weighing_end_at = coalesce(weighing_end_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id;
  end if;
  select * into v_operation from public.spogomi_field_operations where id = v_operation.id;
  v_action := case when p_phase = 'closed' then 'closed' else 'phase_started' end;
  insert into public.spogomi_field_operation_history (event_id, division_id, operation_id, action, phase, actor_clerk_id, reason, provenance, snapshot)
  values (p_event_id, p_division_id, v_operation.id, v_action, v_operation.phase, p_actor_clerk_id, p_reason, p_provenance, to_jsonb(v_operation));
  return to_jsonb(v_operation);
end;
$$;

revoke all on function public.spogomi_launch_field_phase(uuid, uuid, text, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_launch_field_phase(uuid, uuid, text, timestamptz, text, text, text) to service_role;
