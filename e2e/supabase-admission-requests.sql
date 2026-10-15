-- SPOGOMI admission request PostgreSQL contract.
-- Synthetic mixed-division fixtures only; the transaction is rolled back.
-- This proves the RPC boundary, replay scope, authorization ordering, dates,
-- audit atomicity and the absence of CleanMyMap participation side effects.

begin;

select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  v_action_id uuid := gen_random_uuid();
  v_event_id uuid := gen_random_uuid();
  v_casual_id uuid := md5(v_event_id::text || ':casual')::uuid;
  v_world_cup_id uuid := md5(v_event_id::text || ':world_cup')::uuid;
  v_team_casual uuid := gen_random_uuid();
  v_team_world_cup uuid := gen_random_uuid();
  v_request_id uuid;
  v_replay_id uuid;
  v_status text;
  v_team_id uuid;
  v_division_id uuid;
  v_created_at timestamptz;
  v_replay_created_at timestamptz;
  v_decided_at timestamptz;
  v_replay_decided_at timestamptz;
  v_cancel_request_id uuid;
  v_rejected_request_id uuid;
  v_decision jsonb;
  v_audit_count integer;
  v_action_participants_before bigint;
  v_action_participants_after bigint;
begin
  insert into public.actions (id, created_by_clerk_id, action_date, location_label)
  values (v_action_id, 'admission-db-contract', current_date, 'SPOGOMI admission contract');

  insert into public.spogomi_events (
    id, action_id, created_by_clerk_id, name, location_label, mode,
    state, starts_at, regulation_version, regulation_status, regulation_config,
    team_size_config, creation_state, public_visibility
  ) values (
    v_event_id, v_action_id, 'admission-db-contract', 'SPOGOMI admission contract',
    'SPOGOMI contract', 'mixed', 'registration_open', now(), 'contract-v1',
    'complete', '{}'::jsonb, '{}'::jsonb, 'event_pending', 'published'
  );

  insert into public.spogomi_divisions (
    id, event_id, division_type, division_key, regulation_version,
    regulation_status, regulation_config, team_size_config
  ) values
    (
      v_casual_id, v_event_id, 'casual', 'casual', 'contract-v1', 'complete',
      '{"registrationPolicy":{"directRegistrationOpen":true}}'::jsonb, '{}'::jsonb
    ),
    (
      v_world_cup_id, v_event_id, 'world_cup', 'world_cup', 'contract-v1', 'complete',
      '{"registrationPolicy":{"directRegistrationOpen":true,"worldCupDirectRegistrationAllowed":true}}'::jsonb, '{}'::jsonb
    );

  insert into public.spogomi_teams (id, event_id, division_id, team_number, public_name)
  values
    (v_team_casual, v_event_id, v_casual_id, 1, 'Contract Casual'),
    (v_team_world_cup, v_event_id, v_world_cup_id, 1, 'Contract World Cup');

  -- Same event/account/kind/division/team replays the same pending request.
  select request_id, request_status, request_team_id, request_division_id
    into v_request_id, v_status, v_team_id, v_division_id
    from public.create_spogomi_admission_request(
      v_event_id, null, 'admission-owner', 'registration', v_casual_id, 'Casual request'
    );
  if v_status <> 'pending' or v_team_id is not null or v_division_id <> v_casual_id then
    raise exception 'initial admission request has the wrong projection';
  end if;

  select created_at into v_created_at
    from public.spogomi_team_join_requests where id = v_request_id;
  select request_id, request_status into v_replay_id, v_status
    from public.create_spogomi_admission_request(
      v_event_id, null, 'admission-owner', 'registration', v_casual_id, 'Changed context must not replace the request'
    );
  if v_replay_id <> v_request_id or v_status <> 'pending' then
    raise exception 'same-scope admission replay did not converge';
  end if;
  select created_at into v_replay_created_at
    from public.spogomi_team_join_requests where id = v_replay_id;
  if v_replay_created_at <> v_created_at then
    raise exception 'same-scope replay changed created_at';
  end if;
  select count(*) into v_audit_count
    from public.spogomi_team_join_request_events where request_id = v_request_id;
  if v_audit_count <> 1 then
    raise exception 'same-scope replay added a duplicate audit event';
  end if;

  -- A mixed-edition replay in another division is an explicit conflict.
  begin
    perform public.create_spogomi_admission_request(
      v_event_id, null, 'admission-owner', 'registration', v_world_cup_id, 'World Cup request'
    );
    raise exception 'cross-division admission replay was silently accepted';
  exception when others then
    if sqlstate <> '23505' or position('spogomi_admission_request_scope_conflict' in sqlerrm) = 0 then
      raise;
    end if;
  end;
  if (select count(*) from public.spogomi_team_join_requests where event_id = v_event_id and requester_clerk_id = 'admission-owner' and status in ('pending', 'approved')) <> 1 then
    raise exception 'cross-division conflict created a second active request';
  end if;

  -- A team-join replay also compares the effective team, not only the kind.
  select request_id into v_request_id
    from public.create_spogomi_admission_request(
      v_event_id, v_team_casual, 'team-owner', 'team_join', v_casual_id, ''
    );
  begin
    perform public.create_spogomi_admission_request(
      v_event_id, v_team_world_cup, 'team-owner', 'team_join', v_world_cup_id, ''
    );
    raise exception 'cross-team admission replay was silently accepted';
  exception when others then
    if sqlstate <> '23505' or position('spogomi_admission_request_scope_conflict' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  -- Only the owner may cancel, including when the request is already cancelled.
  select request_id into v_cancel_request_id
    from public.create_spogomi_admission_request(
      v_event_id, null, 'cancel-owner', 'registration', v_casual_id, 'Cancel me'
    );
  v_decision := public.transition_spogomi_admission_request(
    v_cancel_request_id, v_event_id, 'cancelled', 'requester', 'cancel-owner', null,
    null, null, null, null
  );
  if v_decision ->> 'status' <> 'cancelled' then
    raise exception 'owner cancellation did not resolve the request';
  end if;
  select decided_at into v_decided_at
    from public.spogomi_team_join_requests where id = v_cancel_request_id;
  v_decision := public.transition_spogomi_admission_request(
    v_cancel_request_id, v_event_id, 'cancelled', 'requester', 'cancel-owner', null,
    null, null, null, null
  );
  select decided_at into v_replay_decided_at
    from public.spogomi_team_join_requests where id = v_cancel_request_id;
  if v_replay_decided_at <> v_decided_at or v_decision ->> 'status' <> 'cancelled' then
    raise exception 'owner cancellation replay changed the persisted decision';
  end if;
  begin
    perform public.transition_spogomi_admission_request(
      v_cancel_request_id, v_event_id, 'cancelled', 'requester', 'other-account', null,
      null, null, null, null
    );
    raise exception 'another account cancelled an already-cancelled request';
  exception when others then
    if sqlstate <> '42501' or position('spogomi_admission_requester_required' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  -- Admin approval is authorized, repeatable and does not create participation.
  select count(*) into v_action_participants_before from public.action_participants;
  v_decision := public.transition_spogomi_admission_request(
    v_request_id, v_event_id, 'approved', 'admin', 'admin-1', 'admin',
    null, 'Independent registration proof', 'Approved by review', 'Registration accepted'
  );
  if v_decision ->> 'status' <> 'approved' then
    raise exception 'admin approval did not resolve the request';
  end if;
  select decided_at into v_decided_at
    from public.spogomi_team_join_requests where id = v_request_id;
  v_decision := public.transition_spogomi_admission_request(
    v_request_id, v_event_id, 'approved', 'admin', 'admin-1', 'admin',
    null, null, null, null
  );
  select decided_at into v_replay_decided_at
    from public.spogomi_team_join_requests where id = v_request_id;
  if v_decision ->> 'status' <> 'approved' or v_replay_decided_at <> v_decided_at then
    raise exception 'admin approval replay changed the persisted decision';
  end if;
  select count(*) into v_action_participants_after from public.action_participants;
  if v_action_participants_after <> v_action_participants_before then
    raise exception 'admission approval created a CleanMyMap participation';
  end if;

  -- Self-approval must be rejected before any idempotent return.
  begin
    perform public.transition_spogomi_admission_request(
      v_request_id, v_event_id, 'approved', 'admin', 'admission-owner', 'admin',
      null, null, null, null
    );
    raise exception 'requester self-approval was accepted';
  exception when others then
    if sqlstate <> '42501' or position('spogomi_admission_admin_required' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  -- Rejection is repeatable only for admin|max, never for an organizer role.
  select request_id into v_rejected_request_id
    from public.create_spogomi_admission_request(
      v_event_id, null, 'reject-owner', 'registration', v_casual_id, 'Reject me'
    );
  v_decision := public.transition_spogomi_admission_request(
    v_rejected_request_id, v_event_id, 'rejected', 'admin', 'admin-1', 'admin',
    null, null, 'Not eligible', 'Registration rejected'
  );
  v_decision := public.transition_spogomi_admission_request(
    v_rejected_request_id, v_event_id, 'rejected', 'admin', 'admin-1', 'admin',
    null, null, null, null
  );
  if v_decision ->> 'status' <> 'rejected' then
    raise exception 'admin rejection replay did not remain rejected';
  end if;
  begin
    perform public.transition_spogomi_admission_request(
      v_rejected_request_id, v_event_id, 'rejected', 'admin', 'organizer-1', 'organizer',
      null, null, null, null
    );
    raise exception 'non-admin decision replay was accepted';
  exception when others then
    if sqlstate <> '42501' or position('spogomi_admission_admin_required' in sqlerrm) = 0 then
      raise;
    end if;
  end;
end;
$$;

rollback;
