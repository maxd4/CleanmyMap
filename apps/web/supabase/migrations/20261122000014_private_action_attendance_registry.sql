-- PURPOSE: private, stable per-action identities and observed attendance, separate from registrations and final participation.
-- CALLER: authenticated application server through service_role-only RPC; browser roles have no table or function grants.
-- AUTHORIZATION_BOUNDARY: HTTP server verifies creator/action_organizers/admin before the privileged call; RLS denies all browser roles.
-- IDEMPOTENCY: mutation RPC deduplicates action-scoped request UUIDs; confirmed-registration sync uses a partial unique Clerk identity.
-- ATOMICITY: each mutation, revision check and before/after audit entry executes in one PostgreSQL transaction.
-- FAILURE_BEHAVIOR: stale revisions raise SQLSTATE 40001 (mapped to HTTP 409); all effects roll back.
-- SEARCH_PATH: SECURITY DEFINER functions pin search_path to pg_catalog, public.
-- GRANTS: execute only for service_role; no public, anon or authenticated access.

create table public.action_attendance_entries (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  display_label text not null check (display_label = btrim(regexp_replace(normalize(display_label, NFC), '[[:space:]]+', ' ', 'g')) and length(display_label) between 1 and 160),
  clerk_user_id text null,
  provenance text not null check (provenance in ('confirmed_registration', 'organizer_entry', 'organizer_link')),
  attendance_status text not null default 'unknown' check (attendance_status in ('unknown', 'present', 'absent')),
  observed_at timestamptz null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null,
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz null,
  deleted_by text null,
  constraint action_attendance_entries_observation_check check (
    (attendance_status = 'unknown' and observed_at is null) or
    (attendance_status in ('present', 'absent') and observed_at is not null)
  ),
  constraint action_attendance_entries_delete_audit_check check ((deleted_at is null) = (deleted_by is null))
);

create unique index action_attendance_entries_action_clerk_unique
  on public.action_attendance_entries(action_id, clerk_user_id)
  where clerk_user_id is not null;
create index action_attendance_entries_action_active_idx
  on public.action_attendance_entries(action_id, created_at, id)
  where deleted_at is null;

create table public.action_attendance_entry_audit (
  id bigint generated always as identity primary key,
  action_id uuid not null references public.actions(id) on delete cascade,
  entry_id uuid not null,
  actor_id text not null,
  request_id uuid not null,
  operation text not null check (operation in ('add', 'rename', 'delete', 'link', 'mark')),
  before_value jsonb null,
  after_value jsonb not null,
  created_at timestamptz not null default now(),
  unique (action_id, request_id)
);

alter table public.action_attendance_entries enable row level security;
alter table public.action_attendance_entry_audit enable row level security;
revoke all on public.action_attendance_entries, public.action_attendance_entry_audit from public, anon, authenticated;
grant select, insert, update, delete on public.action_attendance_entries to service_role;
grant select, insert on public.action_attendance_entry_audit to service_role;
grant usage, select on sequence public.action_attendance_entry_audit_id_seq to service_role;

create or replace function public.sync_confirmed_registration_to_attendance_entry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_label text;
  v_entry public.action_attendance_entries%rowtype;
begin
  if new.registration_status <> 'confirmed' then
    return new;
  end if;
  select coalesce(nullif(btrim(p.display_name), ''), 'Compte lié')
    into v_label from public.profiles p where p.id = new.user_id;
  insert into public.action_attendance_entries (
    action_id, display_label, clerk_user_id, provenance, attendance_status,
    created_by, updated_by
  ) values (
    new.action_id, btrim(regexp_replace(normalize(coalesce(v_label, 'Compte lié'), NFC), '[[:space:]]+', ' ', 'g')),
    new.user_id, 'confirmed_registration', 'unknown', 'system:confirmed-registration', 'system:confirmed-registration'
  ) on conflict (action_id, clerk_user_id) where clerk_user_id is not null do nothing
  returning * into v_entry;
  if found then
    insert into public.action_attendance_entry_audit(action_id, entry_id, actor_id, request_id, operation, before_value, after_value)
    values (new.action_id, v_entry.id, 'system:confirmed-registration', gen_random_uuid(), 'add', null, to_jsonb(v_entry));
  end if;
  return new;
end;
$$;

drop trigger if exists action_registrations_attendance_registry_sync on public.action_registrations;
create trigger action_registrations_attendance_registry_sync
after insert or update of registration_status on public.action_registrations
for each row execute function public.sync_confirmed_registration_to_attendance_entry();

insert into public.action_attendance_entries (
  action_id, display_label, clerk_user_id, provenance, attendance_status, created_by, updated_by
)
select r.action_id,
       btrim(regexp_replace(normalize(coalesce(nullif(btrim(p.display_name), ''), 'Compte lié'), NFC), '[[:space:]]+', ' ', 'g')),
  r.user_id, 'confirmed_registration', 'unknown', 'system:confirmed-registration', 'system:confirmed-registration'
from public.action_registrations r
left join public.profiles p on p.id = r.user_id
where r.registration_status = 'confirmed'
on conflict (action_id, clerk_user_id) where clerk_user_id is not null do nothing;

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
  select a.event_start_at into v_start_at from public.actions a where a.id = p_action_id for update;
  if not found then raise exception 'action_not_found' using errcode = 'P0002'; end if;
  select after_value, actor_id, operation into v_result, v_existing_actor, v_existing_operation from public.action_attendance_entry_audit
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
    if length(v_label) not between 1 and 160 then raise exception 'input_invalid' using errcode = '22023'; end if;
    insert into public.action_attendance_entries(action_id, display_label, clerk_user_id, provenance, attendance_status, observed_at, created_by, updated_by)
    values (p_action_id, v_label, v_clerk, case when v_clerk is null then 'organizer_entry' else 'organizer_link' end,
      coalesce(p_payload->>'attendance_status', 'unknown'),
      case when p_payload->>'attendance_status' = 'present' then now() else null end,
      p_actor_clerk_id, p_actor_clerk_id)
    returning * into v_entry;
  else
    select * into v_entry from public.action_attendance_entries
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
      update public.action_attendance_entries set display_label = v_label, revision = revision + 1, updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id returning * into v_entry;
    elsif p_operation = 'link' then
      v_clerk := nullif(btrim(p_payload->>'clerk_user_id'), '');
      if v_clerk is null then raise exception 'input_invalid' using errcode = '22023'; end if;
      update public.action_attendance_entries set clerk_user_id = v_clerk, provenance = 'organizer_link', revision = revision + 1, updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id and clerk_user_id is null returning * into v_entry;
      if not found then raise exception 'entry_already_linked' using errcode = '23505'; end if;
    elsif p_operation = 'delete' then
      update public.action_attendance_entries set deleted_at = coalesce(deleted_at, now()), deleted_by = coalesce(deleted_by, p_actor_clerk_id), revision = revision + 1, updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id returning * into v_entry;
    elsif p_operation = 'mark' then
      if p_payload->>'attendance_status' not in ('present', 'absent', 'unknown') then raise exception 'input_invalid' using errcode = '22023'; end if;
      if p_payload->>'attendance_status' <> 'unknown' and (v_start_at is null or now() < v_start_at) then
        raise exception 'attendance_before_start' using errcode = 'P0001';
      end if;
      update public.action_attendance_entries set attendance_status = p_payload->>'attendance_status',
        observed_at = case when p_payload->>'attendance_status' = 'unknown' then null else now() end,
        revision = revision + 1, updated_at = now(), updated_by = p_actor_clerk_id
       where id = p_entry_id returning * into v_entry;
    else
      raise exception 'operation_invalid' using errcode = '22023';
    end if;
  end if;
  v_result := to_jsonb(v_entry);
  insert into public.action_attendance_entry_audit(action_id, entry_id, actor_id, request_id, operation, before_value, after_value)
  values (p_action_id, v_entry.id, p_actor_clerk_id, p_request_id, p_operation, v_before, v_result);
  return v_result;
end;
$$;

revoke all on function public.sync_confirmed_registration_to_attendance_entry() from public, anon, authenticated, service_role;
revoke all on function public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.mutate_action_attendance_entry(uuid, text, uuid, text, uuid, integer, jsonb) to service_role;
