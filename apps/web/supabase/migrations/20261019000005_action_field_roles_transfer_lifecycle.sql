-- PURPOSE: close stale primary-transfer proposals atomically and reconcile
--          operational role visibility with the registration lifecycle.
-- CONTRACT: this is a forward-only repair; published field-role migrations
--           remain immutable and browser roles remain denied.
-- ATOMICITY: action-scoped response locks the action before the proposal,
--            persists expiry/staleness instead of rolling it back, and returns
--            the terminal row for idempotent retries.
-- AUTHORIZATION_BOUNDARY: action_organizers remains the primary authority;
--          field roles never grant organization or attendance permissions.
-- SEARCH_PATH: fixed to public, pg_catalog.

alter table public.action_field_role_transfer_audit
  drop constraint if exists action_field_role_transfer_audit_event_code_check;

alter table public.action_field_role_transfer_audit
  add constraint action_field_role_transfer_audit_event_code_check
  check (event_code in ('proposed', 'accepted', 'rejected', 'stale', 'expired'));

-- The old proposal-id-only signature cannot enforce the route action scope.
-- Remove it before installing the action-scoped replacement.
drop function if exists public.respond_action_field_role_transfer(uuid, text, text, boolean, text);

create or replace function public.propose_action_field_role_transfer(
  p_action_id uuid,
  p_successor_user_id text,
  p_actor_id text,
  p_actor_is_global_admin boolean default false
)
returns public.action_field_role_transfer_proposals
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions;
  v_primary text;
  v_proposal public.action_field_role_transfer_proposals;
  v_expired public.action_field_role_transfer_proposals;
  v_now timestamptz;
begin
  if nullif(trim(p_successor_user_id), '') is null
     or nullif(trim(p_actor_id), '') is null then
    raise exception 'action_field_role_transfer_actor_required' using errcode = '22023';
  end if;

  select * into v_action
    from public.actions
   where id = p_action_id
   for update;
  if not found or v_action.action_phase <> 'pre_action'
     or v_action.status not in ('pending', 'approved') then
    raise exception 'action_field_role_transfer_lifecycle_closed' using errcode = 'P0001';
  end if;
  v_now := timezone('utc', now());

  select organizer_clerk_id into v_primary
    from public.action_organizers
   where action_id = p_action_id and is_primary
   for update;
  if v_primary is null then
    raise exception 'action_field_role_primary_missing' using errcode = 'P0001';
  end if;
  if not (p_actor_is_global_admin or trim(p_actor_id) = v_primary
          or trim(p_actor_id) = v_action.created_by_clerk_id) then
    raise exception 'action_field_role_transfer_forbidden' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.action_organizers
     where action_id = p_action_id and organizer_clerk_id = trim(p_successor_user_id)
  ) then
    raise exception 'action_field_role_successor_not_organizer' using errcode = 'P0001';
  end if;

  -- The action lock serializes proposal creation and response. Expired rows
  -- are kept as history and released from the partial pending index.
  for v_expired in
    select *
      from public.action_field_role_transfer_proposals
     where action_id = p_action_id
       and status = 'pending'
       and expires_at <= v_now
     for update
  loop
    update public.action_field_role_transfer_proposals
       set status = 'expired',
           updated_at = v_now,
           decided_at = v_now,
           decided_by_clerk_id = trim(p_actor_id),
           decision_reason = 'expired'
     where id = v_expired.id
     returning * into v_expired;

    insert into public.action_field_role_transfer_audit (
      action_id, proposal_id, event_code, actor_clerk_id,
      previous_primary_user_id, next_primary_user_id, details
    ) values (
      p_action_id, v_expired.id, 'expired', trim(p_actor_id),
      v_expired.current_primary_user_id, v_expired.successor_user_id,
      jsonb_build_object('reason', 'expires_at_reached')
    );
  end loop;

  insert into public.action_field_role_transfer_proposals (
    action_id, current_primary_user_id, successor_user_id, proposed_by_clerk_id
  ) values (
    p_action_id, v_primary, trim(p_successor_user_id), trim(p_actor_id)
  ) returning * into v_proposal;

  insert into public.action_field_role_transfer_audit (
    action_id, proposal_id, event_code, actor_clerk_id,
    previous_primary_user_id, next_primary_user_id
  ) values (
    p_action_id, v_proposal.id, 'proposed', trim(p_actor_id),
    v_primary, trim(p_successor_user_id)
  );
  return v_proposal;
end;
$$;

create or replace function public.respond_action_field_role_transfer(
  p_action_id uuid,
  p_proposal_id uuid,
  p_actor_id text,
  p_decision text,
  p_actor_is_global_admin boolean default false,
  p_reason text default null
)
returns public.action_field_role_transfer_proposals
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_proposal public.action_field_role_transfer_proposals;
  v_action public.actions;
  v_current_primary text;
  v_now timestamptz;
begin
  if nullif(trim(p_actor_id), '') is null or p_decision not in ('accept', 'reject') then
    raise exception 'action_field_role_transfer_decision_invalid' using errcode = '22023';
  end if;

  -- Lock the action first and scope the proposal lookup to the route action.
  -- A mismatched proposal is indistinguishable from not found to callers.
  select * into v_action
    from public.actions
   where id = p_action_id
   for update;
  if not found then
    raise exception 'action_field_role_transfer_not_found' using errcode = 'P0001';
  end if;
  v_now := timezone('utc', now());

  select * into v_proposal
    from public.action_field_role_transfer_proposals
   where id = p_proposal_id and action_id = p_action_id
   for update;
  if not found then
    raise exception 'action_field_role_transfer_not_found' using errcode = 'P0001';
  end if;

  -- Replays of a completed decision return the persisted result. A caller
  -- asking for the opposite decision receives the same terminal row and the
  -- HTTP boundary converts it to a conflict.
  if v_proposal.status <> 'pending' then
    return v_proposal;
  end if;

  if v_proposal.expires_at <= v_now then
    update public.action_field_role_transfer_proposals
       set status = 'expired', updated_at = v_now, decided_at = v_now,
           decided_by_clerk_id = trim(p_actor_id), decision_reason = 'expired'
     where id = v_proposal.id
     returning * into v_proposal;
    insert into public.action_field_role_transfer_audit (
      action_id, proposal_id, event_code, actor_clerk_id,
      previous_primary_user_id, next_primary_user_id, details
    ) values (
      p_action_id, v_proposal.id, 'expired', trim(p_actor_id),
      v_proposal.current_primary_user_id, v_proposal.successor_user_id,
      jsonb_build_object('reason', 'expires_at_reached')
    );
    return v_proposal;
  end if;

  -- Lifecycle is checked again while holding the action lock. A terminal or
  -- post-action action can only invalidate the proposal, never reopen it.
  if v_action.action_phase <> 'pre_action'
     or v_action.status not in ('pending', 'approved') then
    update public.action_field_role_transfer_proposals
       set status = 'expired', updated_at = v_now, decided_at = v_now,
           decided_by_clerk_id = trim(p_actor_id), decision_reason = 'action_lifecycle_closed'
     where id = v_proposal.id
     returning * into v_proposal;
    insert into public.action_field_role_transfer_audit (
      action_id, proposal_id, event_code, actor_clerk_id,
      previous_primary_user_id, next_primary_user_id, details
    ) values (
      p_action_id, v_proposal.id, 'stale', trim(p_actor_id),
      v_proposal.current_primary_user_id, v_proposal.successor_user_id,
      jsonb_build_object('reason', 'action_lifecycle_closed')
    );
    return v_proposal;
  end if;

  select organizer_clerk_id into v_current_primary
    from public.action_organizers
   where action_id = p_action_id and is_primary
   for update;
  if v_current_primary is distinct from v_proposal.current_primary_user_id
     or not exists (
       select 1 from public.action_organizers
        where action_id = p_action_id
          and organizer_clerk_id = v_proposal.successor_user_id
     ) then
    update public.action_field_role_transfer_proposals
       set status = 'expired', updated_at = v_now, decided_at = v_now,
           decided_by_clerk_id = trim(p_actor_id), decision_reason = 'primary_or_successor_changed'
     where id = v_proposal.id
     returning * into v_proposal;
    insert into public.action_field_role_transfer_audit (
      action_id, proposal_id, event_code, actor_clerk_id,
      previous_primary_user_id, next_primary_user_id, details
    ) values (
      p_action_id, v_proposal.id, 'stale', trim(p_actor_id),
      v_current_primary, v_proposal.successor_user_id,
      jsonb_build_object('reason', 'primary_or_successor_changed')
    );
    return v_proposal;
  end if;

  if p_decision = 'accept' then
    if trim(p_actor_id) <> v_proposal.successor_user_id then
      raise exception 'action_field_role_transfer_accept_forbidden' using errcode = '42501';
    end if;
    update public.action_organizers
       set is_primary = false
     where action_id = p_action_id and is_primary;
    update public.action_organizers
       set is_primary = true
     where action_id = p_action_id and organizer_clerk_id = v_proposal.successor_user_id;
    update public.action_field_role_transfer_proposals
       set status = 'accepted', updated_at = v_now, decided_at = v_now,
           decided_by_clerk_id = trim(p_actor_id), decision_reason = nullif(trim(p_reason), '')
     where id = v_proposal.id returning * into v_proposal;
    insert into public.action_field_role_transfer_audit (
      action_id, proposal_id, event_code, actor_clerk_id,
      previous_primary_user_id, next_primary_user_id
    ) values (
      p_action_id, v_proposal.id, 'accepted', trim(p_actor_id),
      v_proposal.current_primary_user_id, v_proposal.successor_user_id
    );
  else
    if not (p_actor_is_global_admin
            or trim(p_actor_id) in (v_proposal.current_primary_user_id,
                                    v_proposal.successor_user_id,
                                    v_action.created_by_clerk_id)) then
      raise exception 'action_field_role_transfer_reject_forbidden' using errcode = '42501';
    end if;
    update public.action_field_role_transfer_proposals
       set status = 'rejected', updated_at = v_now, decided_at = v_now,
           decided_by_clerk_id = trim(p_actor_id), decision_reason = nullif(trim(p_reason), '')
     where id = v_proposal.id returning * into v_proposal;
    insert into public.action_field_role_transfer_audit (
      action_id, proposal_id, event_code, actor_clerk_id,
      previous_primary_user_id, next_primary_user_id
    ) values (
      p_action_id, v_proposal.id, 'rejected', trim(p_actor_id),
      v_proposal.current_primary_user_id, v_proposal.successor_user_id
    );
  end if;

  return v_proposal;
end;
$$;

revoke all on function public.propose_action_field_role_transfer(uuid, text, text, boolean) from public, anon, authenticated;
revoke all on function public.respond_action_field_role_transfer(uuid, uuid, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.propose_action_field_role_transfer(uuid, text, text, boolean) to service_role;
grant execute on function public.respond_action_field_role_transfer(uuid, uuid, text, text, boolean, text) to service_role;

create or replace function public.revoke_action_field_roles_for_unconfirmed_registration()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    update public.action_field_role_assignments
       set assignment_status = 'revoked',
           updated_at = timezone('utc', now())
     where action_id = old.action_id
       and user_id = old.user_id
       and assignment_status = 'active';
    return old;
  end if;
  if new.registration_status <> 'confirmed' then
    update public.action_field_role_assignments
       set assignment_status = 'revoked',
           updated_at = timezone('utc', now())
     where action_id = new.action_id
       and user_id = new.user_id
       and assignment_status = 'active';
  end if;
  return new;
end;
$$;

drop trigger if exists action_field_roles_registration_boundary on public.action_registrations;
create trigger action_field_roles_registration_boundary
after insert or update of action_id, registration_status or delete
on public.action_registrations
for each row execute function public.revoke_action_field_roles_for_unconfirmed_registration();

-- Reconcile rows created before this forward migration without deleting their
-- history. A later confirmation does not automatically restore assignments.
update public.action_field_role_assignments assignment
   set assignment_status = 'revoked', updated_at = timezone('utc', now())
  from public.action_registrations registration
 where registration.action_id = assignment.action_id
   and registration.user_id = assignment.user_id
   and registration.registration_status <> 'confirmed'
   and assignment.assignment_status = 'active';

revoke all on function public.revoke_action_field_roles_for_unconfirmed_registration() from public, anon, authenticated;
