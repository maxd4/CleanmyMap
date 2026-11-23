-- PURPOSE: purge operational identities, team composition and nominative audit snapshots 90 days after an action ends.
-- CALLER: the existing daily action-retention maintenance job through service_role.
-- AUTHORIZATION_BOUNDARY: no browser role may read or execute this RPC; the job uses the server-only Supabase client.
-- IDEMPOTENCY: deleted operational rows disappear from the candidate set; replay of the same IDs returns already_purged.
-- ATOMICITY: one call locks action rows and deletes their identity, team and audit rows in a single transaction.
-- FAILURE_BEHAVIOR: the whole selected batch rolls back on an unexpected SQL error; changed windows return conflict.
-- SEARCH_PATH: SECURITY DEFINER function pins search_path to pg_catalog, public.
-- GRANTS: execute only for service_role; no public, anon or authenticated access.

create or replace function public.action_attendance_data_expires_at(p_action_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    a.event_end_at,
    ((a.action_date + 1)::timestamp at time zone coalesce(nullif(btrim(a.action_timezone), ''), 'Europe/Paris'))
      - interval '1 microsecond'
  ) + interval '90 days'
  from public.actions a
  where a.id = p_action_id;
$$;

revoke all on function public.action_attendance_data_expires_at(uuid) from public, anon, authenticated, service_role;

-- Keep the confirmed-registration sync from recreating purged operational
-- identities if a historical registration is changed after its retention date.
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

create or replace function public.purge_expired_action_attendance_data(
  p_as_of timestamptz default timezone('utc', now()),
  p_dry_run boolean default true,
  p_batch_size integer default 100,
  p_expected_action_ids uuid[] default null
)
returns table (
  action_id uuid,
  outcome text,
  reason text,
  action_ended_at timestamptz,
  expires_at timestamptz,
  entry_count integer,
  entry_audit_count integer,
  team_count integer,
  team_audit_count integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_candidate record;
  v_end_at timestamptz;
  v_expiry timestamptz;
  v_entries integer;
  v_entry_audits integer;
  v_teams integer;
  v_team_audits integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Action attendance retention is service-role only' using errcode = '42501';
  end if;
  if p_as_of is null or p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'Action attendance retention parameters are invalid' using errcode = '22023';
  end if;
  if not p_dry_run and p_expected_action_ids is null then
    raise exception 'Action attendance retention requires the explicit dry-run action id list' using errcode = '22023';
  end if;
  if not p_dry_run and cardinality(p_expected_action_ids) > p_batch_size then
    raise exception 'Action attendance retention candidate list exceeds the batch size' using errcode = '22023';
  end if;

  for v_candidate in
    select a.id,
      public.action_attendance_data_expires_at(a.id) as calculated_expires_at
    from public.actions a
    where (
      (p_dry_run and coalesce(
        public.action_attendance_data_expires_at(a.id),
        'infinity'::timestamptz
      ) <= p_as_of and (
        exists (select 1 from public.action_attendance_entries e where e.action_id = a.id)
        or exists (select 1 from public.action_attendance_entry_audit e where e.action_id = a.id)
        or exists (select 1 from public.action_attendance_teams t where t.action_id = a.id)
        or exists (select 1 from public.action_attendance_team_audit t where t.action_id = a.id)
      ))
      or (not p_dry_run and a.id = any(p_expected_action_ids))
    )
    order by public.action_attendance_data_expires_at(a.id), a.id
    limit p_batch_size
    for update of a skip locked
  loop
    action_id := v_candidate.id;
    -- Re-read the retention window after acquiring the action row lock so a
    -- concurrent schedule change cannot cause an early deletion.
    select public.action_attendance_data_expires_at(v_candidate.id) into v_expiry;
    v_end_at := case when v_expiry is null then null else v_expiry - interval '90 days' end;
    action_ended_at := v_end_at;
    expires_at := v_expiry;

    select count(*)::integer into v_entries from public.action_attendance_entries e where e.action_id = v_candidate.id;
    select count(*)::integer into v_entry_audits from public.action_attendance_entry_audit e where e.action_id = v_candidate.id;
    select count(*)::integer into v_teams from public.action_attendance_teams t where t.action_id = v_candidate.id;
    select count(*)::integer into v_team_audits from public.action_attendance_team_audit t where t.action_id = v_candidate.id;
    entry_count := v_entries;
    entry_audit_count := v_entry_audits;
    team_count := v_teams;
    team_audit_count := v_team_audits;

    if v_entries + v_entry_audits + v_teams + v_team_audits = 0 then
      outcome := 'already_purged';
      reason := 'no_operational_identity_rows';
    elsif v_expiry is null or v_expiry > p_as_of then
      outcome := 'conflict';
      reason := 'retention_window_changed';
    elsif p_dry_run then
      outcome := 'would_purge';
      reason := '90_day_operational_retention_elapsed';
    else
      delete from public.action_attendance_team_audit t where t.action_id = v_candidate.id;
      delete from public.action_attendance_entry_audit e where e.action_id = v_candidate.id;
      delete from public.action_attendance_teams t where t.action_id = v_candidate.id;
      delete from public.action_attendance_entries e where e.action_id = v_candidate.id;
      outcome := 'purged';
      reason := '90_day_operational_retention_elapsed';
    end if;
    return next;
  end loop;
end;
$$;

revoke all on function public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])
  from public, anon, authenticated;
grant execute on function public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[])
  to service_role;

comment on function public.purge_expired_action_attendance_data(timestamptz, boolean, integer, uuid[]) is
  'Daily action-retention extension. Dry-run returns action IDs and aggregate row counts only. Physical purge deletes all private attendance entries, their before/after audits, teams, memberships and team audit snapshots after the action end plus 90 days. It never deletes actions, registrations, final participation, statistical versions or legally necessary records held in those separate contracts.';

comment on function public.action_attendance_data_expires_at(uuid) is
  'Canonical operational identity-retention expiry: 90 days after event_end_at, or the last microsecond of local action_date for legacy rows without a recorded event end.';
