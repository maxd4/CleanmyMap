-- SPOGOMI forward-only repair: terminal admission rows are immutable and
-- organizer-owned event/division writes stamp the verified Clerk actor.
-- Historical migrations remain unchanged. The existing mutation algorithms are
-- retained behind private implementation names; the public RPC boundaries set
-- a transaction-local context immediately after their service-role checks.

-- A replay of the same terminal decision is still handled by the transition
-- RPC before UPDATE. A direct no-op UPDATE is accepted without changing the
-- row; every other terminal-row rewrite is rejected atomically.
create or replace function public.guard_spogomi_admission_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.status in ('approved', 'rejected', 'cancelled') then
    if new.status is distinct from old.status then
      raise exception using errcode = '40001', message = 'spogomi_admission_transition_not_allowed';
    end if;
    if (to_jsonb(old) - 'updated_at') is distinct from (to_jsonb(new) - 'updated_at') then
      raise exception using errcode = '40001', message = 'spogomi_admission_terminal_immutable';
    end if;
    return old;
  end if;

  if not public.spogomi_admission_transition_allowed(old.status, new.status) then
    raise exception using errcode = '40001', message = 'spogomi_admission_transition_not_allowed';
  end if;
  if new.status = 'approved' and new.request_kind in ('registration', 'team_join')
     and not exists (
       select 1 from public.spogomi_participants participant
        where participant.id = new.matched_participant_id
          and participant.event_id = new.event_id
          and participant.clerk_id = new.requester_clerk_id
          and participant.account_link_status = 'verified'
          and participant.registration_status = 'registered'
     ) then
    raise exception using errcode = '42501', message = 'spogomi_admission_approval_requires_verified_participant';
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_admission_transition_guard on public.spogomi_team_join_requests;
create trigger spogomi_admission_transition_guard
before update on public.spogomi_team_join_requests
for each row execute function public.guard_spogomi_admission_transition();

comment on function public.guard_spogomi_admission_transition() is
  'Pending admission transitions remain governed by the transition matrix; approved, rejected and cancelled rows reject substantive rewrites and make direct no-op replays inert.';

-- Keep the published event mutation algorithm intact while making actor
-- attribution part of its server-owned entry point. A caller-provided GUC is
-- overwritten from the identity already checked by the Web owner RPC.
alter function public.spogomi_update_event_metadata(
  uuid, bigint, text, text, text, timestamptz, timestamptz, text, jsonb, text, text
) rename to spogomi_update_event_metadata_apply;

revoke all on function public.spogomi_update_event_metadata_apply(
  uuid, bigint, text, text, timestamptz, timestamptz, text, jsonb, text, text
) from public, anon, authenticated, service_role;

create or replace function public.spogomi_update_event_metadata(
  p_event_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text,
  p_name text,
  p_location_label text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_mode text,
  p_team_size_config jsonb,
  p_public_visibility text,
  p_public_results_visibility text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI event updates require the server role';
  end if;
  if p_actor_clerk_id is null or length(btrim(p_actor_clerk_id)) = 0 then
    raise exception using errcode = 'check_violation', message = 'A composition actor is required';
  end if;
  perform set_config('spogomi.change_actor', btrim(p_actor_clerk_id), true);
  return public.spogomi_update_event_metadata_apply(
    p_event_id, p_expected_revision, p_actor_clerk_id, p_name, p_location_label,
    p_starts_at, p_ends_at, p_mode, p_team_size_config, p_public_visibility,
    p_public_results_visibility
  );
end;
$$;

revoke all on function public.spogomi_update_event_metadata(
  uuid, bigint, text, text, timestamptz, timestamptz, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.spogomi_update_event_metadata(
  uuid, bigint, text, text, timestamptz, timestamptz, text, jsonb, text, text
) to service_role;

comment on function public.spogomi_update_event_metadata(
  uuid, bigint, text, text, timestamptz, timestamptz, text, jsonb, text, text
) is
  'Server-only organizer metadata boundary. It stamps the verified actor in a transaction-local context before delegating to the existing locked mutation algorithm.';

-- The nine-argument division RPC is the compatibility owner used by the
-- eleven-argument configuration RPC after its category/mapping validation.
-- Wrapping this owner covers both direct legacy calls and the current Web RPC.
alter function public.spogomi_update_division_regulation(
  uuid, uuid, bigint, text, text, text, text, jsonb, jsonb
) rename to spogomi_update_division_regulation_apply;

revoke all on function public.spogomi_update_division_regulation_apply(
  uuid, uuid, bigint, text, text, text, text, jsonb, jsonb
) from public, anon, authenticated, service_role;

create or replace function public.spogomi_update_division_regulation(
  p_event_id uuid,
  p_division_id uuid,
  p_expected_revision bigint,
  p_actor_clerk_id text,
  p_regulation_version text,
  p_regulation_status text,
  p_regulation_source_reference text,
  p_regulation_config jsonb,
  p_team_size_config jsonb
)
returns public.spogomi_divisions
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then
    raise exception using errcode = '42501', message = 'SPOGOMI division regulation update is forbidden';
  end if;
  perform set_config('spogomi.change_actor', btrim(p_actor_clerk_id), true);
  return public.spogomi_update_division_regulation_apply(
    p_event_id, p_division_id, p_expected_revision, p_actor_clerk_id,
    p_regulation_version, p_regulation_status, p_regulation_source_reference,
    p_regulation_config, p_team_size_config
  );
end;
$$;

revoke all on function public.spogomi_update_division_regulation(
  uuid, uuid, bigint, text, text, text, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.spogomi_update_division_regulation(
  uuid, uuid, bigint, text, text, text, text, jsonb, jsonb
) to service_role;

comment on function public.spogomi_update_division_regulation(
  uuid, uuid, bigint, text, text, text, text, jsonb, jsonb
) is
  'Compatibility division-regulation boundary. It stamps the verified actor before delegating to the existing event lock, revision and result-protection algorithm.';

comment on function public.spogomi_event_change_actor() is
  'Returns the transaction-local actor stamped by an owner RPC, then a JWT actor when present, and system only for genuinely system-owned writes.';
