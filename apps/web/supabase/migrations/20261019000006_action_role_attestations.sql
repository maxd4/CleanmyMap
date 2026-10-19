-- PURPOSE: attest the operational roles actually performed by confirmed
--          participants after an action is finalized.
-- CALLER: Clerk-authenticated server routes through service_role-only RPCs.
-- AUTHORIZATION_BOUNDARY: action_organizers and the action creator remain the
--          permission authority; an attestation never grants permission or
--          implies attendance.
-- IDEMPOTENCY: one current attestation per action/user/role, revisioned audit
--          rows, and one notification event per decision revision.
-- ATOMICITY: the action, final participation, provenance snapshot, current
--          decision, audit row and notification are written in one RPC.
-- FAILURE_BEHAVIOR: non-final actions, non-confirmed participants, invalid
--          roles, unauthorized reviewers and self-review are rejected or kept
--          pending without a confirmed/rejected decision.
-- SEARCH_PATH: fixed to public, pg_catalog.
-- GRANTS: browser roles have no table or RPC access; service_role only.

create table if not exists public.action_role_attestations (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  user_id text not null,
  role_code text not null references public.action_field_role_catalog(code),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'confirmed', 'rejected')),
  reviewer_clerk_id text,
  decided_at timestamptz,
  decision_reason text,
  responsibility_provenance text not null
    check (responsibility_provenance in ('planned_assignment', 'retrospective')),
  provenance_snapshot jsonb not null default '{}'::jsonb,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (action_id, user_id, role_code),
  check (
    (verification_status = 'pending' and decided_at is null)
    or (verification_status in ('confirmed', 'rejected') and reviewer_clerk_id is not null and decided_at is not null)
  )
);

create table if not exists public.action_role_attestation_audit (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  attestation_id uuid references public.action_role_attestations(id) on delete set null,
  user_id text not null,
  role_code text not null,
  event_code text not null
    check (event_code in ('pending', 'confirmed', 'rejected', 'corrected')),
  actor_clerk_id text not null,
  reviewer_clerk_id text,
  previous_status text,
  next_status text not null,
  decision_reason text,
  responsibility_provenance text not null,
  provenance_snapshot jsonb not null default '{}'::jsonb,
  revision integer not null check (revision > 0),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists action_role_attestations_action_idx
  on public.action_role_attestations (action_id, verification_status, user_id);
create index if not exists action_role_attestations_user_idx
  on public.action_role_attestations (user_id, decided_at desc);
create index if not exists action_role_attestation_audit_action_idx
  on public.action_role_attestation_audit (action_id, created_at desc);

alter table public.action_role_attestations enable row level security;
alter table public.action_role_attestation_audit enable row level security;
revoke all on table public.action_role_attestations from public, anon, authenticated;
revoke all on table public.action_role_attestation_audit from public, anon, authenticated;
grant select, insert, update on table public.action_role_attestations to service_role;
grant select, insert on table public.action_role_attestation_audit to service_role;

create unique index if not exists app_notifications_role_attestation_event_unique_idx
  on public.app_notifications (user_id, (payload ->> 'eventKey'))
  where type = 'action_event'
    and payload ->> 'subtype' = 'role_attestation_decision'
    and nullif(payload ->> 'eventKey', '') is not null;

create or replace function public.review_action_role_attestation(
  p_action_id uuid,
  p_user_id text,
  p_role_code text,
  p_decision text,
  p_reviewer_clerk_id text,
  p_reason text default null,
  p_reviewer_is_global_admin boolean default false
)
returns public.action_role_attestations
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions;
  v_participant public.action_participants;
  v_current public.action_role_attestations;
  v_attestation public.action_role_attestations;
  v_assignment public.action_field_role_assignments;
  v_reviewer_organizer jsonb;
  v_target_organizer jsonb;
  v_provenance jsonb;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_status text;
  v_event text;
  v_revision integer;
  v_now timestamptz := timezone('utc', now());
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'action_role_attestation_forbidden' using errcode = '42501';
  end if;
  if nullif(trim(p_user_id), '') is null
     or nullif(trim(p_reviewer_clerk_id), '') is null
     or p_decision not in ('confirm', 'reject') then
    raise exception 'action_role_attestation_input_invalid' using errcode = '22023';
  end if;
  if not exists (select 1 from public.action_field_role_catalog where code = trim(p_role_code)) then
    raise exception 'action_role_attestation_role_invalid' using errcode = '22023';
  end if;

  select * into v_action from public.actions where id = p_action_id for update;
  if not found
     or v_action.status <> 'approved'
     or v_action.action_phase <> 'post_action_complete'
     or v_action.published_at is null
     or coalesce(v_action.moderation_visibility, 'visible') = 'hidden' then
    raise exception 'action_role_attestation_lifecycle_closed' using errcode = 'P0001';
  end if;

  select * into v_participant
    from public.action_participants
   where action_id = p_action_id and user_id = trim(p_user_id)
   for update;
  if not found or v_participant.participation_status <> 'confirmed' then
    raise exception 'action_role_attestation_participation_required' using errcode = 'P0001';
  end if;

  if not (
    p_reviewer_is_global_admin
    or trim(p_reviewer_clerk_id) = v_action.created_by_clerk_id
    or exists (
      select 1 from public.action_organizers
       where action_id = p_action_id and organizer_clerk_id = trim(p_reviewer_clerk_id)
    )
  ) then
    raise exception 'action_role_attestation_reviewer_forbidden' using errcode = '42501';
  end if;

  select * into v_assignment
    from public.action_field_role_assignments
   where action_id = p_action_id
     and user_id = trim(p_user_id)
     and role_code = trim(p_role_code)
     and assignment_status = 'active'
   for update;
  if v_assignment.id is null and v_reason is null then
    raise exception 'action_role_attestation_reason_required' using errcode = '22023';
  end if;

  select to_jsonb(organizer_row) into v_reviewer_organizer
    from (
      select * from public.action_organizers
       where action_id = p_action_id
         and organizer_clerk_id = trim(p_reviewer_clerk_id)
       limit 1
    ) organizer_row;
  select to_jsonb(organizer_row) into v_target_organizer
    from (
      select * from public.action_organizers
       where action_id = p_action_id
         and organizer_clerk_id = trim(p_user_id)
       limit 1
    ) organizer_row;
  v_provenance := jsonb_build_object(
    'kind', case when v_assignment.id is null then 'retrospective' else 'planned_assignment' end,
    'capturedAt', v_now,
    'assignment', case when v_assignment.id is null then null else to_jsonb(v_assignment) end,
    'reviewerOrganizer', coalesce(v_reviewer_organizer, '{}'::jsonb),
    'targetOrganizer', coalesce(v_target_organizer, '{}'::jsonb)
  );

  select * into v_current
    from public.action_role_attestations
   where action_id = p_action_id
     and user_id = trim(p_user_id)
     and role_code = trim(p_role_code)
   for update;

  -- A reviewer cannot silently attest their own mission. Keep an explicit
  -- pending row so a later independent reviewer can complete the evidence.
  if trim(p_reviewer_clerk_id) = trim(p_user_id) and not p_reviewer_is_global_admin then
    if v_current.id is not null
       and v_current.verification_status = 'pending'
       and v_current.decision_reason is not distinct from coalesce(v_reason, 'independent_reviewer_required') then
      return v_current;
    end if;
    v_revision := coalesce(v_current.revision, 0) + 1;
    insert into public.action_role_attestations (
      action_id, user_id, role_code, verification_status, reviewer_clerk_id,
      decided_at, decision_reason, responsibility_provenance, provenance_snapshot,
      revision, created_at, updated_at
    ) values (
      p_action_id, trim(p_user_id), trim(p_role_code), 'pending', null, null,
      coalesce(v_reason, 'independent_reviewer_required'),
      v_provenance, v_revision, coalesce(v_current.created_at, v_now), v_now
    )
    on conflict (action_id, user_id, role_code) do update set
      verification_status = excluded.verification_status,
      reviewer_clerk_id = excluded.reviewer_clerk_id,
      decided_at = excluded.decided_at,
      decision_reason = excluded.decision_reason,
      responsibility_provenance = excluded.responsibility_provenance,
      provenance_snapshot = excluded.provenance_snapshot,
      revision = excluded.revision,
      updated_at = excluded.updated_at
    returning * into v_attestation;
    insert into public.action_role_attestation_audit (
      action_id, attestation_id, user_id, role_code, event_code, actor_clerk_id,
      reviewer_clerk_id, previous_status, next_status, decision_reason,
      responsibility_provenance, provenance_snapshot, revision
    ) values (
      p_action_id, v_attestation.id, trim(p_user_id), trim(p_role_code), 'pending',
      trim(p_reviewer_clerk_id), null, v_current.verification_status, 'pending',
      v_attestation.decision_reason, v_attestation.responsibility_provenance,
      v_attestation.provenance_snapshot, v_attestation.revision
    );
    return v_attestation;
  end if;

  v_status := case when p_decision = 'confirm' then 'confirmed' else 'rejected' end;
  if v_current.id is not null
     and v_current.verification_status = v_status
     and v_current.reviewer_clerk_id = trim(p_reviewer_clerk_id)
     and v_current.decision_reason is not distinct from v_reason then
    return v_current;
  end if;
  v_revision := coalesce(v_current.revision, 0) + 1;
  v_event := case when v_current.id is null then v_status else 'corrected' end;

  insert into public.action_role_attestations (
    action_id, user_id, role_code, verification_status, reviewer_clerk_id,
    decided_at, decision_reason, responsibility_provenance, provenance_snapshot,
    revision, created_at, updated_at
  ) values (
    p_action_id, trim(p_user_id), trim(p_role_code), v_status,
    trim(p_reviewer_clerk_id), v_now, v_reason,
    case when v_assignment.id is null then 'retrospective' else 'planned_assignment' end,
    v_provenance, v_revision, coalesce(v_current.created_at, v_now), v_now
  )
  on conflict (action_id, user_id, role_code) do update set
    verification_status = excluded.verification_status,
    reviewer_clerk_id = excluded.reviewer_clerk_id,
    decided_at = excluded.decided_at,
    decision_reason = excluded.decision_reason,
    responsibility_provenance = excluded.responsibility_provenance,
    provenance_snapshot = excluded.provenance_snapshot,
    revision = excluded.revision,
    updated_at = excluded.updated_at
  returning * into v_attestation;

  insert into public.action_role_attestation_audit (
    action_id, attestation_id, user_id, role_code, event_code, actor_clerk_id,
    reviewer_clerk_id, previous_status, next_status, decision_reason,
    responsibility_provenance, provenance_snapshot, revision
  ) values (
    p_action_id, v_attestation.id, trim(p_user_id), trim(p_role_code), v_event,
    trim(p_reviewer_clerk_id), trim(p_reviewer_clerk_id), v_current.verification_status,
    v_status, v_reason, v_attestation.responsibility_provenance,
    v_attestation.provenance_snapshot, v_attestation.revision
  );

  insert into public.app_notifications (user_id, type, title, content, payload)
  values (
    trim(p_user_id),
    'action_event',
    case when v_status = 'confirmed' then 'Mission confirmée' else 'Mission non confirmée' end,
    case when v_status = 'confirmed'
      then 'Un responsable a confirmé une mission que vous avez exercée.'
      else 'Un responsable n’a pas confirmé cette mission. Consultez le détail pour connaître le motif.'
    end,
    jsonb_build_object(
      'eventType', 'action_event',
      'subtype', 'role_attestation_decision',
      'actionId', p_action_id,
      'attestationId', v_attestation.id,
      'roleCode', trim(p_role_code),
      'decision', v_status,
      'revision', v_attestation.revision,
      'eventKey', 'role_attestation:' || v_attestation.id::text || ':' || v_attestation.revision::text,
      'href', '/sections/rejoindre-une-action?tab=past&actionId=' || p_action_id::text
    )
  ) on conflict do nothing;

  return v_attestation;
end;
$$;

revoke all on function public.review_action_role_attestation(uuid, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.review_action_role_attestation(uuid, text, text, text, text, text, boolean) to service_role;
