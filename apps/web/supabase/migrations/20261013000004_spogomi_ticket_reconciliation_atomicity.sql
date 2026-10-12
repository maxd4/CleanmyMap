-- SPOGOMI corrective lot: atomic Cachan reconciliation and historical-proof transition.
-- Forward-only. No production ticket data or source exports belong in this migration.

alter table public.spogomi_roster_imports
  add column if not exists source_proof_status text;

update public.spogomi_roster_imports
   set source_proof_status = case
     when status = 'confirmed' then 'legacy_unavailable'
     else 'pending'
   end
 where source_proof_status is null;

alter table public.spogomi_roster_imports
  alter column source_proof_status set default 'pending',
  alter column source_proof_status set not null;

alter table public.spogomi_roster_imports
  drop constraint if exists spogomi_roster_imports_source_proof_status_check;

alter table public.spogomi_roster_imports
  add constraint spogomi_roster_imports_source_proof_status_check
  check (source_proof_status in ('pending', 'complete', 'legacy_unavailable', 'incomplete'));

comment on column public.spogomi_roster_imports.source_proof_status is
  'Detailed row proof state. legacy_unavailable identifies imports confirmed before row-level proof existed; it is not a claim that their old snapshot can be reconstructed.';

create or replace function public.spogomi_reconcile_cachan_ticket_rows(
  p_event_id uuid,
  p_roster_import_id uuid,
  p_rows jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  -- PURPOSE: reconcile one Cachan ticket export while preserving each ticket UUID.
  -- CALLER: server-only import confirmation after Clerk organizer authorization.
  -- AUTHORIZATION_BOUNDARY: service_role only; RLS remains enabled on private tables.
  -- IDEMPOTENCY: same import row and fingerprint replay without a second history event.
  -- ATOMICITY: event lock, participant mutations and both histories share this transaction.
  -- FAILURE_BEHAVIOR: any SQL error rolls back every mutation; retry uses preserved rows.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: execute is revoked from public roles and granted only to service_role below.
  v_event public.spogomi_events%rowtype;
  v_import public.spogomi_roster_imports%rowtype;
  v_prior public.spogomi_participants%rowtype;
  v_history public.spogomi_roster_import_rows%rowtype;
  v_row jsonb;
  v_row_number integer;
  v_external_reference text;
  v_source_row_id text;
  v_source_fingerprint text;
  v_order_reference text;
  v_order_alternative_reference text;
  v_ticket_status text;
  v_ticket_deleted boolean;
  v_name text;
  v_group_preference text;
  v_participant_id uuid;
  v_prior_created_at timestamptz;
  v_previous_cancelled boolean;
  v_new_cancelled boolean;
  v_cancellation_changed boolean;
  v_human_decision boolean;
  v_stale_replay boolean;
  v_has_prior boolean;
  v_has_history boolean;
  v_registration_status text;
  v_participant_ids jsonb := '{}'::jsonb;
  v_changed_rows jsonb := '[]'::jsonb;
  v_conflict_rows jsonb := '[]'::jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using
      errcode = 'insufficient_privilege',
      message = 'SPOGOMI ticket reconciliation requires the server role';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using
      errcode = 'invalid_parameter_value',
      message = 'Cachan ticket rows must be a JSON array';
  end if;

  -- Serialise all imports for one event. This also makes the external-reference
  -- lookup and the stale-import comparison observe one current database state.
  select * into v_event
    from public.spogomi_events
   where id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;

  select * into v_import
    from public.spogomi_roster_imports
   where id = p_roster_import_id
     and event_id = p_event_id
   for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI roster import not found';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_rows) item
     group by item ->> 'externalReference'
    having count(*) > 1
  ) then
    raise exception using errcode = 'unique_violation', message = 'A Cachan ticket reference appears more than once in the import';
  end if;
  if exists (
    select 1
      from jsonb_array_elements(p_rows) item
     group by (item ->> 'rowNumber')::integer
    having count(*) > 1
  ) then
    raise exception using errcode = 'unique_violation', message = 'A source row appears more than once in the import';
  end if;

  for v_row in
    select value
      from jsonb_array_elements(p_rows)
     order by (value ->> 'rowNumber')::integer
  loop
    v_row_number := nullif(v_row ->> 'rowNumber', '')::integer;
    v_external_reference := nullif(btrim(v_row ->> 'externalReference'), '');
    v_source_row_id := nullif(v_row ->> 'sourceRowId', '');
    v_source_fingerprint := nullif(btrim(v_row ->> 'sourceFingerprint'), '');
    v_order_reference := nullif(v_row ->> 'orderReference', '');
    v_order_alternative_reference := nullif(v_row ->> 'orderAlternativeReference', '');
    v_ticket_status := nullif(v_row ->> 'ticketStatus', '');
    v_name := nullif(v_row ->> 'name', '');
    v_group_preference := nullif(v_row ->> 'groupPreference', '');

    if v_row_number is null or v_row_number <= 1 or v_external_reference is null or v_source_fingerprint is null then
      raise exception using errcode = 'check_violation', message = 'A Cachan ticket row is missing its stable reference or fingerprint';
    end if;
    if v_row ->> 'sourceSystem' is distinct from 'cachan_ticketing' then
      raise exception using errcode = 'check_violation', message = 'The atomic ticket reconciler accepts Cachan ticket rows only';
    end if;
    if jsonb_typeof(v_row -> 'ticketDeleted') <> 'boolean' then
      raise exception using errcode = 'check_violation', message = 'The ticket deletion state must be explicit';
    end if;
    v_ticket_deleted := (v_row ->> 'ticketDeleted')::boolean;

    -- A source-row collision is never silently overwritten. An identical
    -- history row is the only replay that may continue without writing it again.
    select * into v_history
      from public.spogomi_roster_import_rows
     where roster_import_id = p_roster_import_id
       and source_row_number = v_row_number
     for update;
    v_has_history := found;
    if v_has_history then
      if v_history.source_fingerprint is distinct from v_source_fingerprint
         or v_history.source_snapshot ->> 'externalReference' is distinct from v_external_reference then
        raise exception using errcode = 'serialization_failure', message = 'A confirmed Cachan import row changed while it was being replayed';
      end if;
      v_participant_id := v_history.participant_id;
      v_participant_ids := v_participant_ids || jsonb_build_object(v_external_reference, v_participant_id::text);
      continue;
    end if;

    select * into v_prior
      from public.spogomi_participants
     where event_id = p_event_id
       and source_system = 'cachan_ticketing'
       and external_reference = v_external_reference
     for update;
    v_has_prior := found;
    v_stale_replay := false;
    if v_has_prior and v_prior.roster_import_id is not null and v_prior.roster_import_id <> p_roster_import_id then
      select created_at into v_prior_created_at
        from public.spogomi_roster_imports
       where id = v_prior.roster_import_id
         and event_id = p_event_id;
      v_stale_replay := v_prior_created_at is not null and v_prior_created_at > v_import.created_at;
    end if;

    if not v_has_prior then
      v_new_cancelled := v_ticket_deleted or coalesce(v_ticket_status, '') ~* 'annul|cancel|supprim|deleted|refus|refund';
      insert into public.spogomi_participants(
        event_id, external_reference, source_system, roster_import_id,
        source_row_number, source_row_id, source_fingerprint,
        group_preference, display_name, ticket_status, ticket_deleted,
        identity_status, registration_status, attendance_status, account_link_status
      ) values (
        p_event_id, v_external_reference, 'cachan_ticketing', p_roster_import_id,
        v_row_number, v_source_row_id, v_source_fingerprint,
        v_group_preference, v_name, v_ticket_status, v_ticket_deleted,
        case when v_name is null then 'unknown' else 'identified' end,
        case when v_new_cancelled then 'withdrawn' else 'registered' end,
        'unknown', 'unlinked'
      )
      returning id into v_participant_id;
    elsif not v_stale_replay then
      v_previous_cancelled := v_prior.ticket_deleted or coalesce(v_prior.ticket_status, '') ~* 'annul|cancel|supprim|deleted|refus|refund';
      v_new_cancelled := v_ticket_deleted or coalesce(v_ticket_status, '') ~* 'annul|cancel|supprim|deleted|refus|refund';
      v_cancellation_changed := v_previous_cancelled is distinct from v_new_cancelled;
      v_human_decision := v_prior.attendance_status <> 'unknown'
        or v_prior.account_link_status = 'verified'
        or v_prior.clerk_id is not null
        or v_prior.identity_status = 'identified'
        or v_prior.team_id is not null;
      v_registration_status := v_prior.registration_status;
      if v_cancellation_changed and v_new_cancelled and not v_human_decision then
        v_registration_status := 'withdrawn';
      elsif v_cancellation_changed and not v_new_cancelled and v_prior.registration_status = 'withdrawn' then
        v_registration_status := 'registered';
      end if;

      update public.spogomi_participants
         set roster_import_id = p_roster_import_id,
             source_row_number = v_row_number,
             source_row_id = v_source_row_id,
             source_fingerprint = v_source_fingerprint,
             external_reference = v_external_reference,
             order_reference = v_order_reference,
             order_alternative_reference = v_order_alternative_reference,
             source_system = 'cachan_ticketing',
             ticket_status = v_ticket_status,
             ticket_deleted = v_ticket_deleted,
             registration_status = v_registration_status,
             updated_at = now()
       where id = v_prior.id
         and event_id = p_event_id;
      v_participant_id := v_prior.id;

      if v_cancellation_changed then
        insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
        values (p_event_id, p_roster_import_id, v_participant_id,
          case when v_new_cancelled then 'ticket_cancelled' else 'ticket_reactivated' end,
          to_jsonb(v_prior), v_row)
        on conflict (roster_import_id, participant_id, change_kind) do nothing;
        v_changed_rows := v_changed_rows || to_jsonb(v_row_number);
        if v_human_decision and v_new_cancelled then
          insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
          values (p_event_id, p_roster_import_id, v_participant_id, 'ticket_cancellation_conflict', to_jsonb(v_prior), v_row)
          on conflict (roster_import_id, participant_id, change_kind) do nothing;
          v_conflict_rows := v_conflict_rows || to_jsonb(v_row_number);
        end if;
      end if;
      if v_prior.ticket_status is distinct from v_ticket_status then
        insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
        values (p_event_id, p_roster_import_id, v_participant_id, 'ticket_status_changed', to_jsonb(v_prior), v_row)
        on conflict (roster_import_id, participant_id, change_kind) do nothing;
        v_changed_rows := v_changed_rows || to_jsonb(v_row_number);
      end if;
      if v_prior.order_reference is distinct from v_order_reference then
        insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
        values (p_event_id, p_roster_import_id, v_participant_id, 'ticket_order_changed', to_jsonb(v_prior), v_row)
        on conflict (roster_import_id, participant_id, change_kind) do nothing;
        v_changed_rows := v_changed_rows || to_jsonb(v_row_number);
      end if;
      if v_prior.order_alternative_reference is distinct from v_order_alternative_reference then
        insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
        values (p_event_id, p_roster_import_id, v_participant_id, 'ticket_advanced_order_changed', to_jsonb(v_prior), v_row)
        on conflict (roster_import_id, participant_id, change_kind) do nothing;
        v_changed_rows := v_changed_rows || to_jsonb(v_row_number);
      end if;
      if v_prior.display_name is distinct from v_name then
        insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
        values (p_event_id, p_roster_import_id, v_participant_id, 'ticket_identity_changed', to_jsonb(v_prior), v_row)
        on conflict (roster_import_id, participant_id, change_kind) do nothing;
        v_changed_rows := v_changed_rows || to_jsonb(v_row_number);
      end if;
    else
      v_participant_id := v_prior.id;
    end if;

    v_participant_ids := v_participant_ids || jsonb_build_object(v_external_reference, v_participant_id::text);
    insert into public.spogomi_roster_import_rows(
      event_id, roster_import_id, participant_id, source_row_number,
      source_row_id, source_fingerprint, source_snapshot
    ) values (
      p_event_id, p_roster_import_id, v_participant_id, v_row_number,
      v_source_row_id, v_source_fingerprint, v_row
    );
  end loop;

  return jsonb_build_object(
    'participantIdsByReference', v_participant_ids,
    'changedRows', v_changed_rows,
    'conflictRows', v_conflict_rows
  );
end;
$$;

revoke all on function public.spogomi_reconcile_cachan_ticket_rows(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.spogomi_reconcile_cachan_ticket_rows(uuid, uuid, jsonb) to service_role;

create or replace function public.guard_spogomi_participant_team_change()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event_state text;
  v_context text := current_setting('spogomi.composition_write_context', true);
begin
  if old.team_id is not distinct from new.team_id then
    return new;
  end if;
  if coalesce(v_context, '') not in ('composition_confirm', 'composition_manual_move') then
    raise exception using errcode = '42501', message = 'Direct SPOGOMI team changes require the protected composition procedure';
  end if;
  select state into v_event_state from public.spogomi_events where id = new.event_id;
  if v_event_state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI composition changes require a versioned correction procedure after preparation';
  end if;
  if new.team_id is not null
     and new.source_system = 'cachan_ticketing'
     and (new.ticket_deleted or coalesce(new.ticket_status, '') ~* 'annul|cancel|supprim|deleted|refus|refund') then
    raise exception using errcode = 'check_violation', message = 'A cancelled Cachan ticket requires explicit organizer arbitration before composition';
  end if;
  if public.spogomi_team_requires_composition_correction(new.event_id, old.team_id)
     or public.spogomi_team_requires_composition_correction(new.event_id, new.team_id) then
    raise exception using errcode = 'check_violation', message = 'This SPOGOMI team requires an explicit audited correction procedure';
  end if;
  return new;
end;
$$;

create or replace function public.guard_spogomi_event_composition_lock()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if old.state is not distinct from new.state or new.state <> 'composition_locked' then
    return new;
  end if;
  if coalesce(current_setting('spogomi.composition_write_context', true), '') <> 'composition_lock'
     or exists (select 1 from public.spogomi_teams where event_id = new.id and composition_state <> 'locked')
     or exists (
       select 1
         from public.spogomi_participants
        where event_id = new.id
          and registration_status = 'registered'
          and source_system = 'cachan_ticketing'
          and (ticket_deleted or coalesce(ticket_status, '') ~* 'annul|cancel|supprim|deleted|refus|refund')
     ) then
    raise exception using errcode = '42501', message = 'SPOGOMI event locking requires an eligible, atomically prepared composition';
  end if;
  return new;
end;
$$;

comment on function public.spogomi_reconcile_cachan_ticket_rows(uuid, uuid, jsonb) is
  'Atomic private Cachan ticket reconciliation. Commercial ticket state remains source-owned; protected human decisions are never revoked automatically.';
