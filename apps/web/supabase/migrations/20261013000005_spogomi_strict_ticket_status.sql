-- SPOGOMI Lot 11B: align SQL composition eligibility with the strict ticket
-- status registry. Forward-only; no real ticket export or private data.

create or replace function public.spogomi_ticket_is_cancelled(
  p_ticket_status text,
  p_ticket_deleted boolean
)
returns boolean
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select coalesce(p_ticket_deleted, false)
    or lower(coalesce(p_ticket_status, '')) ~* 'annul|cancel|supprim|deleted|refus|refund|rembours|refunded';
$$;

-- Keep the published reconciler as the transaction owner, but wrap it so the
-- forward-only SQL status vocabulary also protects initial rows and reimports.
alter function public.spogomi_reconcile_cachan_ticket_rows(uuid, uuid, jsonb)
  rename to spogomi_reconcile_cachan_ticket_rows_legacy;

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
  v_result jsonb;
  v_row jsonb;
  v_prior record;
  v_current public.spogomi_participants%rowtype;
  v_row_number integer;
  v_external_reference text;
  v_previous_cancelled boolean;
  v_new_cancelled boolean;
  v_human_decision boolean;
  v_has_prior boolean;
  v_changed_rows jsonb;
  v_conflict_rows jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI ticket reconciliation requires the server role';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception using errcode = 'invalid_parameter_value', message = 'Cachan ticket rows must be a JSON array';
  end if;

  -- The legacy function locks the event and all referenced rows while it
  -- reconciles them. Capture the protected decision state first under the same
  -- event lock so the corrective pass cannot observe a stale participant.
  perform 1 from public.spogomi_events where id = p_event_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found';
  end if;
  create temporary table spogomi_ticket_status_prior on commit drop as
    select p.id,
           p.external_reference,
           p.ticket_status,
           p.ticket_deleted,
           p.registration_status,
           p.attendance_status,
           p.account_link_status,
           p.clerk_id,
           p.identity_status,
           p.team_id,
           to_jsonb(p) as previous_snapshot
      from public.spogomi_participants p
     where p.event_id = p_event_id
       and p.source_system = 'cachan_ticketing'
       and p.external_reference in (
         select nullif(btrim(item ->> 'externalReference'), '')
           from jsonb_array_elements(p_rows) item
       );
  perform 1
    from public.spogomi_participants p
   where p.event_id = p_event_id
     and p.source_system = 'cachan_ticketing'
     and p.external_reference in (select external_reference from spogomi_ticket_status_prior)
   for update;

  v_result := public.spogomi_reconcile_cachan_ticket_rows_legacy(p_event_id, p_roster_import_id, p_rows);
  v_changed_rows := coalesce(v_result -> 'changedRows', '[]'::jsonb);
  v_conflict_rows := coalesce(v_result -> 'conflictRows', '[]'::jsonb);

  for v_row in select value from jsonb_array_elements(p_rows) loop
    v_row_number := nullif(v_row ->> 'rowNumber', '')::integer;
    v_external_reference := nullif(btrim(v_row ->> 'externalReference'), '');
    v_new_cancelled := public.spogomi_ticket_is_cancelled(
      nullif(v_row ->> 'ticketStatus', ''),
      coalesce((v_row ->> 'ticketDeleted')::boolean, false)
    );
    select * into v_prior
      from spogomi_ticket_status_prior
     where external_reference = v_external_reference;
    v_has_prior := found;
    select * into v_current
      from public.spogomi_participants
     where id = coalesce(case when v_has_prior then v_prior.id else null end, (
       select p.id
         from public.spogomi_participants p
        where p.event_id = p_event_id
          and p.source_system = 'cachan_ticketing'
          and p.external_reference = v_external_reference
     ));
    if not found then continue; end if;

    if not v_has_prior then
      if v_new_cancelled and v_current.registration_status <> 'withdrawn' then
        update public.spogomi_participants
           set registration_status = 'withdrawn', updated_at = now()
         where id = v_current.id and event_id = p_event_id;
      end if;
      continue;
    end if;

    v_previous_cancelled := public.spogomi_ticket_is_cancelled(v_prior.ticket_status, v_prior.ticket_deleted);
    v_human_decision := v_prior.attendance_status <> 'unknown'
      or v_prior.account_link_status = 'verified'
      or v_prior.clerk_id is not null
      or v_prior.identity_status = 'identified'
      or v_prior.team_id is not null;

    if v_new_cancelled and not v_human_decision then
      if v_current.registration_status <> 'withdrawn' then
        update public.spogomi_participants
           set registration_status = 'withdrawn', updated_at = now()
         where id = v_current.id and event_id = p_event_id;
        insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
        values (p_event_id, p_roster_import_id, v_current.id, 'ticket_cancelled', v_prior.previous_snapshot, v_row)
        on conflict (roster_import_id, participant_id, change_kind) do nothing;
        v_changed_rows := v_changed_rows || to_jsonb(v_row_number);
      end if;
    elsif v_new_cancelled and v_human_decision then
      insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
      values (p_event_id, p_roster_import_id, v_current.id, 'ticket_cancellation_conflict', v_prior.previous_snapshot, v_row)
      on conflict (roster_import_id, participant_id, change_kind) do nothing;
      v_conflict_rows := v_conflict_rows || to_jsonb(v_row_number);
    elsif v_previous_cancelled and not v_new_cancelled and v_prior.registration_status = 'withdrawn' and not v_human_decision then
      update public.spogomi_participants
         set registration_status = 'registered', updated_at = now()
       where id = v_current.id and event_id = p_event_id;
      insert into public.spogomi_roster_import_changes(event_id, roster_import_id, participant_id, change_kind, previous_snapshot, current_snapshot)
      values (p_event_id, p_roster_import_id, v_current.id, 'ticket_reactivated', v_prior.previous_snapshot, v_row)
      on conflict (roster_import_id, participant_id, change_kind) do nothing;
      v_changed_rows := v_changed_rows || to_jsonb(v_row_number);
    end if;
  end loop;

  return jsonb_set(
    jsonb_set(v_result, '{changedRows}', v_changed_rows, true),
    '{conflictRows}', v_conflict_rows, true
  );
end;
$$;

revoke all on function public.spogomi_reconcile_cachan_ticket_rows_legacy(uuid, uuid, jsonb) from public, anon, authenticated;
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
  if old.team_id is not distinct from new.team_id then return new; end if;
  if coalesce(v_context, '') not in ('composition_confirm', 'composition_manual_move') then
    raise exception using errcode = '42501', message = 'Direct SPOGOMI team changes require the protected composition procedure';
  end if;
  select state into v_event_state from public.spogomi_events where id = new.event_id;
  if v_event_state not in ('draft', 'registration_open') then
    raise exception using errcode = 'check_violation', message = 'SPOGOMI composition changes require a versioned correction procedure after preparation';
  end if;
  if new.team_id is not null and new.source_system = 'cachan_ticketing'
     and public.spogomi_ticket_is_cancelled(new.ticket_status, new.ticket_deleted) then
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
  if old.state is not distinct from new.state or new.state <> 'composition_locked' then return new; end if;
  if coalesce(current_setting('spogomi.composition_write_context', true), '') <> 'composition_lock'
     or exists (select 1 from public.spogomi_teams where event_id = new.id and composition_state <> 'locked')
     or exists (
       select 1 from public.spogomi_participants
        where event_id = new.id
          and registration_status = 'registered'
          and source_system = 'cachan_ticketing'
          and public.spogomi_ticket_is_cancelled(ticket_status, ticket_deleted)
     ) then
    raise exception using errcode = '42501', message = 'SPOGOMI event locking requires an eligible, atomically prepared composition';
  end if;
  return new;
end;
$$;

comment on function public.spogomi_ticket_is_cancelled(text, boolean) is
  'Strict SQL-side cancellation predicate aligned with the synthetic Cachan import contract; not a universal Weezevent status registry.';
