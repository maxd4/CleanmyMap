-- SPOGOMI day operations: event-scoped check-in access and audited attendance.
-- The existing attendance_status remains the canonical current value. This
-- migration adds only the append-only evidence needed to correct it safely.

alter table public.spogomi_event_reviewers
  drop constraint if exists spogomi_event_reviewers_role_check;

alter table public.spogomi_event_reviewers
  add constraint spogomi_event_reviewers_role_check
  check (role in ('observer', 'referee', 'checkin'));

alter table public.spogomi_event_access_audit
  drop constraint if exists spogomi_event_access_audit_access_role_check;

alter table public.spogomi_event_access_audit
  add constraint spogomi_event_access_audit_access_role_check
  check (access_role in ('observer', 'referee', 'checkin'));

create table public.spogomi_attendance_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_id uuid not null,
  participant_id uuid not null,
  previous_status text not null check (previous_status in ('unknown', 'present', 'absent')),
  next_status text not null check (next_status in ('unknown', 'present', 'absent')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text not null check (length(btrim(reason)) > 0),
  provenance text not null check (length(btrim(provenance)) > 0),
  created_at timestamptz not null default now(),
  foreign key (participant_id, event_id, division_id)
    references public.spogomi_participants(id, event_id, division_id)
    on delete cascade
);

create index spogomi_attendance_audit_participant_idx
  on public.spogomi_attendance_audit(event_id, division_id, participant_id, created_at desc);

create index spogomi_attendance_audit_actor_idx
  on public.spogomi_attendance_audit(event_id, actor_clerk_id, created_at desc);

alter table public.spogomi_attendance_audit enable row level security;
revoke all on table public.spogomi_attendance_audit from public, anon, authenticated;
grant all on table public.spogomi_attendance_audit to service_role;

create or replace function public.spogomi_set_attendance_status(
  p_event_id uuid,
  p_division_id uuid,
  p_participant_id uuid,
  p_next_status text,
  p_actor_clerk_id text,
  p_reason text,
  p_provenance text,
  p_expected_updated_at timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_participant public.spogomi_participants%rowtype;
  v_previous_status text;
  v_changed boolean := false;
begin
  -- PURPOSE: atomically record an event-scoped day-of attendance decision.
  -- CALLER: server route after organizer/checkin AuthZ; no Clerk id is required for the participant.
  -- IDEMPOTENCY: repeating the current status is a no-op and creates no duplicate history.
  -- CONCURRENCY: event and participant row locks plus an optional updated_at precondition.
  -- ATOMICITY: current value and append-only evidence commit or fail together.
  -- GRANTS: service_role only; direct client execution is denied.
  if auth.role() <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI attendance is server-only';
  end if;
  if p_next_status not in ('unknown', 'present', 'absent') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI attendance status is invalid';
  end if;
  if length(btrim(coalesce(p_actor_clerk_id, ''))) = 0
     or length(btrim(coalesce(p_reason, ''))) = 0
     or length(btrim(coalesce(p_provenance, ''))) = 0 then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI attendance actor, reason and provenance are required';
  end if;
  if not exists (
    select 1 from public.spogomi_divisions d
    where d.id = p_division_id and d.event_id = p_event_id
  ) then
    raise exception using errcode = '23503', message = 'SPOGOMI division does not belong to the event';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s', p_event_id, p_participant_id), 0));
  select * into v_participant
    from public.spogomi_participants
   where id = p_participant_id
     and event_id = p_event_id
     and division_id = p_division_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI participant not found';
  end if;
  if p_expected_updated_at is not null and v_participant.updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'SPOGOMI attendance is stale; reload the current roster';
  end if;

  v_previous_status := v_participant.attendance_status;
  if v_previous_status <> p_next_status then
    update public.spogomi_participants
       set attendance_status = p_next_status, updated_at = now()
     where id = p_participant_id and event_id = p_event_id and division_id = p_division_id;
    insert into public.spogomi_attendance_audit (
      event_id, division_id, participant_id, previous_status, next_status,
      actor_clerk_id, reason, provenance
    ) values (
      p_event_id, p_division_id, p_participant_id, v_previous_status, p_next_status,
      btrim(p_actor_clerk_id), btrim(p_reason), btrim(p_provenance)
    );
    v_changed := true;
  end if;

  select * into v_participant
    from public.spogomi_participants
   where id = p_participant_id and event_id = p_event_id and division_id = p_division_id;
  return jsonb_build_object(
    'changed', v_changed,
    'eventId', p_event_id,
    'divisionId', p_division_id,
    'participantId', p_participant_id,
    'previousStatus', v_previous_status,
    'attendanceStatus', v_participant.attendance_status,
    'updatedAt', v_participant.updated_at
  );
end;
$$;

revoke all on function public.spogomi_set_attendance_status(uuid, uuid, uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.spogomi_set_attendance_status(uuid, uuid, uuid, text, text, text, text, timestamptz) to service_role;

create or replace function public.spogomi_set_event_access(
  p_event_id uuid,
  p_subject_clerk_id text,
  p_access_role text,
  p_operation text,
  p_actor_clerk_id text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_reviewer public.spogomi_event_reviewers%rowtype;
  v_changed boolean := false;
begin
  -- PURPOSE: atomically grant or revoke observer, referee or check-in access for one edition.
  -- AUTHORIZATION_BOUNDARY: service_role execution only; the server caller supplies the audited actor.
  -- IDEMPOTENCY: repeated grant/revoke of the current state is a no-op.
  if auth.role() <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI event access is server-only';
  end if;
  if p_access_role not in ('observer', 'referee', 'checkin') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI event access role is invalid';
  end if;
  if p_operation not in ('grant', 'revoke') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI event access operation is invalid';
  end if;
  if length(btrim(coalesce(p_subject_clerk_id, ''))) = 0 or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI event access identities are required';
  end if;
  if not exists (select 1 from public.spogomi_events e where e.id = p_event_id) then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_event_id, p_subject_clerk_id, p_access_role), 0));
  select * into v_reviewer from public.spogomi_event_reviewers
   where event_id = p_event_id and clerk_id = btrim(p_subject_clerk_id) and role = p_access_role for update;
  if p_operation = 'grant' then
    if not found then
      insert into public.spogomi_event_reviewers (event_id, clerk_id, role, assigned_by_clerk_id, revoked_at)
      values (p_event_id, btrim(p_subject_clerk_id), p_access_role, btrim(p_actor_clerk_id), null)
      returning * into v_reviewer;
      v_changed := true;
    elsif v_reviewer.revoked_at is not null then
      update public.spogomi_event_reviewers set assigned_by_clerk_id = btrim(p_actor_clerk_id), revoked_at = null, updated_at = now()
       where id = v_reviewer.id returning * into v_reviewer;
      v_changed := true;
    end if;
  elsif found and v_reviewer.revoked_at is null then
    update public.spogomi_event_reviewers set revoked_at = now(), updated_at = now()
     where id = v_reviewer.id returning * into v_reviewer;
    v_changed := true;
  end if;
  if v_changed then
    insert into public.spogomi_event_access_audit (event_id, subject_clerk_id, access_role, operation, actor_clerk_id, details)
    values (p_event_id, btrim(p_subject_clerk_id), p_access_role,
      case when p_operation = 'grant' then 'granted' else 'revoked' end,
      btrim(p_actor_clerk_id), jsonb_build_object('reviewer_id', v_reviewer.id));
  end if;
  return jsonb_build_object('changed', v_changed, 'event_id', p_event_id, 'clerk_id', btrim(p_subject_clerk_id), 'role', p_access_role,
    'revoked_at', case when v_reviewer.id is null then null else v_reviewer.revoked_at end);
end;
$$;

revoke all on function public.spogomi_set_event_access(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_set_event_access(uuid, text, text, text, text) to service_role;
