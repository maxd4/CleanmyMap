-- SPOGOMI forward-only repair: make mode immutability a table invariant and
-- reconcile controlled composition metadata updates with regulation guards.
-- Existing migrations remain immutable; this migration replaces only the
-- trigger function and leaves the deferred parent/division triggers intact.

-- PURPOSE: protect existing SPOGOMI mode values while allowing the server-only
-- composition metadata RPC to adjust valid team-size bounds before lock/result.
-- CALLER: row trigger for public.spogomi_events.
-- AUTHORIZATION_BOUNDARY: service_role RPC sets event_metadata_update; direct
-- callers cannot change mode and cannot use the composition exception outside
-- that controlled context.
-- IDEMPOTENCY: create or replace and trigger recreation are replay-safe.
-- ATOMICITY: the row decision and the event write share the caller transaction.
-- FAILURE_BEHAVIOR: mode conversion, uncontrolled composition writes, locked
-- composition, current results and unversioned regulation changes fail closed.
-- SEARCH_PATH: fixed to pg_catalog, public.
-- GRANTS: existing trigger execution remains invoker-bound; function grants are
-- preserved below for compatibility with the historical security contract.
create or replace function public.prevent_spogomi_regulation_change_after_submission()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_context text := current_setting('spogomi.composition_write_context', true);
  v_composition_only boolean := old.mode is not distinct from new.mode
    and old.team_size_config is distinct from new.team_size_config
    and old.regulation_version is not distinct from new.regulation_version
    and old.regulation_status is not distinct from new.regulation_status
    and old.regulation_source_reference is not distinct from new.regulation_source_reference
    and old.regulation_config is not distinct from new.regulation_config;
begin
  if old.mode is distinct from new.mode then
    raise exception using
      errcode = 'check_violation',
      message = 'The SPOGOMI mode of an existing event is immutable';
  end if;

  if v_composition_only then
    if coalesce(v_context, '') <> 'event_metadata_update' then
      raise exception using
        errcode = '42501',
        message = 'SPOGOMI composition changes require the controlled metadata procedure';
    end if;
    if old.state not in ('draft', 'registration_open')
       or exists (
         select 1
           from public.spogomi_teams team
          where team.event_id = old.id
            and public.spogomi_team_requires_composition_correction(old.id, team.id)
       ) then
      raise exception using
        errcode = 'check_violation',
        message = 'SPOGOMI composition is immutable after lock';
    end if;
    if exists (
      select 1
        from public.spogomi_result_submissions result_submission
       where result_submission.event_id = old.id
         and result_submission.status in ('submitted', 'provisional', 'certified')
    ) then
      raise exception using
        errcode = 'serialization_failure',
        message = 'The SPOGOMI composition is locked by a current result';
    end if;
    return new;
  end if;

  if old.team_size_config is distinct from new.team_size_config
     or old.regulation_version is distinct from new.regulation_version
     or old.regulation_status is distinct from new.regulation_status
     or old.regulation_source_reference is distinct from new.regulation_source_reference
     or old.regulation_config is distinct from new.regulation_config then
    if old.regulation_version is not distinct from new.regulation_version then
      raise exception using
        errcode = 'check_violation',
        message = 'A SPOGOMI regulation change requires a new version';
    end if;
    if exists (
      select 1
        from public.spogomi_result_submissions result_submission
       where result_submission.event_id = old.id
         and result_submission.status in ('submitted', 'provisional', 'certified')
    ) then
      raise exception using
        errcode = 'serialization_failure',
        message = 'The SPOGOMI regulation is locked by a current result';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists spogomi_events_regulation_change_guard on public.spogomi_events;
create trigger spogomi_events_regulation_change_guard
before update on public.spogomi_events
for each row execute function public.prevent_spogomi_regulation_change_after_submission();

revoke all on function public.prevent_spogomi_regulation_change_after_submission() from public, anon, authenticated;

comment on function public.prevent_spogomi_regulation_change_after_submission() is
  'Existing SPOGOMI modes are immutable at the table boundary; only the server metadata RPC may change unlocked team-size composition without a regulation-version change, while true regulation changes remain versioned and result-locked.';
