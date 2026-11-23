-- PURPOSE: allow an organizer to explicitly restore a soft-deleted linked roster identity while preserving its stable ID and audit history.
-- CALLER: authenticated application server through the existing service_role mutation RPC.
-- AUTHORIZATION_BOUNDARY: HTTP server verifies creator/action_organizers/admin; browser roles have no table or function grants.
-- IDEMPOTENCY: add retries resolve from the existing action-scoped request audit; confirmed-registration sync never restores a deleted row.
-- ATOMICITY: index change, active-row restoration, revision increment and before/after audit are transactional.
-- FAILURE_BEHAVIOR: an already-active linked identity raises 23505; stale/invalid requests retain the established error contract.
-- SEARCH_PATH: SECURITY DEFINER functions pin search_path to pg_catalog, public.
-- GRANTS: mutation RPC remains service_role-only; no public, anon or authenticated access.

drop index public.action_attendance_entries_action_clerk_unique;
create unique index action_attendance_entries_action_clerk_unique
  on public.action_attendance_entries(action_id, clerk_user_id)
  where clerk_user_id is not null and deleted_at is null;

create or replace function public.sync_confirmed_registration_to_attendance_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_label text;
  v_entry public.action_attendance_entries%rowtype;
  v_expires_at timestamptz;
begin
  if new.registration_status <> 'confirmed' then
    return new;
  end if;

  v_expires_at := public.action_attendance_data_expires_at(new.action_id);
  if v_expires_at is null or v_expires_at <= now() then
    return new;
  end if;

  -- A soft-deleted entry is an explicit organizer decision, not a missing row.
  if exists (
    select 1 from public.action_attendance_entries e
     where e.action_id = new.action_id
       and e.clerk_user_id = new.user_id
       and e.deleted_at is not null
  ) then
    return new;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), 'Compte lié')
    into v_label from public.profiles p where p.id = new.user_id;
  insert into public.action_attendance_entries (
    action_id, display_label, clerk_user_id, provenance, attendance_status,
    created_by, updated_by
  ) values (
    new.action_id,
    btrim(regexp_replace(normalize(coalesce(v_label, 'Compte lié'), NFC), '[[:space:]]+', ' ', 'g')),
    new.user_id,
    'confirmed_registration',
    'unknown',
    'system:confirmed-registration',
    'system:confirmed-registration'
  ) on conflict (action_id, clerk_user_id)
    where clerk_user_id is not null and deleted_at is null
    do nothing
  returning * into v_entry;

  if found then
    insert into public.action_attendance_entry_audit(
      action_id, entry_id, actor_id, request_id, operation, before_value, after_value
    ) values (
      new.action_id, v_entry.id, 'system:confirmed-registration', gen_random_uuid(),
      'add', null, to_jsonb(v_entry)
    );
  end if;
  return new;
end;
$$;

create or replace function public.mutate_action_attendance_entry(
  p_action_id uuid,
  p_actor_clerk_id text,
  p_request_id uuid,
  p_operation text,
  p_entry_id uuid,
  p_expected_revision integer,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_entry public.action_attendance_entries%rowtype;
  v_before jsonb;
  v_result jsonb;
  v_start_at timestamptz;
  v_label text;
  v_clerk text;
  v_existing_actor text;
  v_existing_operation text;
begin
  if p_actor_clerk_id is null or btrim(p_actor_clerk_id) = '' or p_request_id is null then
    raise exception 'input_invalid' using errcode = '22023';
  end if;
  select a.event_start_at into v_start_at
    from public.actions a where a.id = p_action_id for update;
  if not found then raise exception 'action_not_found' using errcode = 'P0002'; end if;

  select after_value, actor_id, operation
    into v_result, v_existing_actor, v_existing_operation
    from public.action_attendance_entry_audit
   where action_id = p_action_id and request_id = p_request_id;
  if found then
    if v_existing_actor <> p_actor_clerk_id or v_existing_operation <> p_operation then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return v_result;
  end if;

  if p_operation = 'add' then
    v_label := btrim(regexp_replace(normalize(coalesce(p_payload->>'display_label', ''), NFC), '[[:space:]]+', ' ', 'g'));
    v_clerk := nullif(btrim(p_payload->>'clerk_user_id'), '');
    if coalesce(p_payload->>'attendance_status', 'unknown') not in ('unknown', 'present') then
      raise exception 'input_invalid' using errcode = '22023';
    end if;
    if p_payload->>'attendance_status' = 'present' and (v_start_at is null or now() < v_start_at) then
      raise exception 'attendance_before_start' using errcode = 'P0001';
    end if;
    if length(v_label) not between 1 and 160 then
      raise exception 'input_invalid' using errcode = '22023';
    end if;

    if v_clerk is not null then
      select * into v_entry
        from public.action_attendance_entries
       where action_id = p_action_id and clerk_user_id = v_clerk
       for update;
      if found then
        if v_entry.deleted_at is null then
          raise exception 'entry_already_linked' using errcode = '23505';
        end if;
        v_before := to_jsonb(v_entry);
        update public.action_attendance_entries
           set display_label = v_label,
               provenance = 'organizer_link',
               attendance_status = 'unknown',
               observed_at = null,
               deleted_at = null,
               deleted_by = null,
               revision = revision + 1,
               updated_at = now(),
               updated_by = p_actor_clerk_id
         where id = v_entry.id
         returning * into v_entry;
      else
        insert into public.action_attendance_entries(
          action_id, display_label, clerk_user_id, provenance, attendance_status,
          observed_at, created_by, updated_by
        ) values (
          p_action_id, v_label, v_clerk, 'organizer_link',
          coalesce(p_payload->>'attendance_status', 'unknown'),
          case when p_payload->>'attendance_status' = 'present' then now() else null end,
          p_actor_clerk_id, p_actor_clerk_id
        ) returning * into v_entry;
      end if;
    else
      insert into public.action_attendance_entries(
        action_id, display_label, clerk_user_id, provenance, attendance_status,
        observed_at, created_by, updated_by
      ) values (
        p_action_id, v_label, null, 'organizer_entry',
        coalesce(p_payload->>'attendance_status', 'unknown'),
        case when p_payload->>'attendance_status' = 'present' then now() else null end,
        p_actor_clerk_id, p_actor_clerk_id
      ) returning * into v_entry;
    end if;
  else
    select * into v_entry
      from public.action_attendance_entries
     where id = p_entry_id and action_id = p_action_id for update;
    if not found then raise exception 'entry_not_found' using errcode = 'P0002'; end if;
    if v_entry.deleted_at is not null then raise exception 'entry_not_found' using errcode = 'P0002'; end if;
    v_before := to_jsonb(v_entry);
    if v_entry.revision <> p_expected_revision then
      raise exception 'revision_conflict' using errcode = '40001';
    end if;

    if p_operation = 'rename' then
      v_label := btrim(regexp_replace(normalize(coalesce(p_payload->>'display_label', ''), NFC), '[[:space:]]+', ' ', 'g'));
      if length(v_label) not between 1 and 160 then raise exception 'input_invalid' using errcode = '22023'; end if;
      update public.action_attendance_entries
         set display_label = v_label, revision = revision + 1, updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id returning * into v_entry;
    elsif p_operation = 'link' then
      v_clerk := nullif(btrim(p_payload->>'clerk_user_id'), '');
      if v_clerk is null then raise exception 'input_invalid' using errcode = '22023'; end if;
      update public.action_attendance_entries
         set clerk_user_id = v_clerk, provenance = 'organizer_link', revision = revision + 1,
             updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id and clerk_user_id is null returning * into v_entry;
      if not found then raise exception 'entry_already_linked' using errcode = '23505'; end if;
    elsif p_operation = 'delete' then
      update public.action_attendance_entries
         set deleted_at = coalesce(deleted_at, now()), deleted_by = coalesce(deleted_by, p_actor_clerk_id),
             revision = revision + 1, updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id returning * into v_entry;
    elsif p_operation = 'mark' then
      if p_payload->>'attendance_status' not in ('present', 'absent', 'unknown') then
        raise exception 'input_invalid' using errcode = '22023';
      end if;
      if p_payload->>'attendance_status' <> 'unknown' and (v_start_at is null or now() < v_start_at) then
        raise exception 'attendance_before_start' using errcode = 'P0001';
      end if;
      update public.action_attendance_entries
         set attendance_status = p_payload->>'attendance_status',
             observed_at = case when p_payload->>'attendance_status' = 'unknown' then null else now() end,
             revision = revision + 1, updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id returning * into v_entry;
    else
      raise exception 'operation_invalid' using errcode = '22023';
    end if;
  end if;

  v_result := to_jsonb(v_entry);
  insert into public.action_attendance_entry_audit(
    action_id, entry_id, actor_id, request_id, operation, before_value, after_value
  ) values (
    p_action_id, v_entry.id, p_actor_clerk_id, p_request_id, p_operation, v_before, v_result
  );
  return v_result;
end;
$$;

revoke all on function public.sync_confirmed_registration_to_attendance_entry() from public, anon, authenticated, service_role;
revoke all on function public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb) to service_role;
