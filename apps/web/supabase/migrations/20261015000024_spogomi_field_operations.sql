-- SPOGOMI: field operations for timing, returns, incidents and measurements.
-- These records are deliberately separate from team result submissions. They
-- provide auditable terrain evidence without certifying or publishing scores.

alter table public.spogomi_event_reviewers
  drop constraint if exists spogomi_event_reviewers_role_check;

alter table public.spogomi_event_reviewers
  add constraint spogomi_event_reviewers_role_check
  check (role in ('observer', 'referee', 'checkin', 'timekeeper', 'weigher', 'data_entry', 'arbiter', 'certifier'));

alter table public.spogomi_event_access_audit
  drop constraint if exists spogomi_event_access_audit_access_role_check;

alter table public.spogomi_event_access_audit
  add constraint spogomi_event_access_audit_access_role_check
  check (access_role in ('observer', 'referee', 'checkin', 'timekeeper', 'weigher', 'data_entry', 'arbiter', 'certifier'));

create table public.spogomi_field_operations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  division_id uuid not null,
  timezone_name text not null check (length(btrim(timezone_name)) > 0),
  regulation_version text not null check (length(btrim(regulation_version)) > 0),
  phase text not null default 'planned' check (phase in ('planned', 'collection', 'sorting', 'weighing', 'closed')),
  official_start_at timestamptz,
  collection_limit_at timestamptz,
  collection_end_at timestamptz,
  sorting_limit_at timestamptz,
  weighing_start_at timestamptz,
  weighing_end_at timestamptz,
  updated_by_clerk_id text not null check (length(btrim(updated_by_clerk_id)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, division_id),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade,
  check (collection_limit_at is null or official_start_at is null or collection_limit_at >= official_start_at),
  check (collection_end_at is null or official_start_at is null or collection_end_at >= official_start_at),
  check (sorting_limit_at is null or collection_end_at is null or sorting_limit_at >= collection_end_at),
  check (weighing_start_at is null or sorting_limit_at is null or weighing_start_at >= sorting_limit_at),
  check (weighing_end_at is null or weighing_start_at is null or weighing_end_at >= weighing_start_at)
);

create table public.spogomi_field_operation_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  division_id uuid not null,
  operation_id uuid not null references public.spogomi_field_operations(id) on delete cascade,
  action text not null check (action in ('configured', 'phase_started', 'corrected', 'closed')),
  phase text not null check (phase in ('planned', 'collection', 'sorting', 'weighing', 'closed')),
  occurred_at timestamptz not null default now(),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text not null check (length(btrim(reason)) > 0),
  provenance text not null check (length(btrim(provenance)) > 0),
  snapshot jsonb not null default '{}'::jsonb,
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade
);

create table public.spogomi_team_returns (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  division_id uuid not null,
  team_id uuid not null,
  actual_return_at timestamptz not null,
  return_status text not null check (return_status in ('returned', 'late')),
  note text,
  recorded_by_clerk_id text not null check (length(btrim(recorded_by_clerk_id)) > 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, division_id, team_id),
  foreign key (team_id, event_id, division_id) references public.spogomi_teams(id, event_id, division_id) on delete cascade
);

create table public.spogomi_team_return_history (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.spogomi_team_returns(id) on delete cascade,
  event_id uuid not null,
  division_id uuid not null,
  team_id uuid not null,
  actual_return_at timestamptz not null,
  return_status text not null check (return_status in ('returned', 'late')),
  note text,
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text not null check (length(btrim(reason)) > 0),
  created_at timestamptz not null default now(),
  foreign key (team_id, event_id, division_id) references public.spogomi_teams(id, event_id, division_id) on delete cascade
);

create table public.spogomi_field_incidents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  division_id uuid not null,
  team_id uuid,
  category text not null check (category in ('delay', 'warning', 'boundary_violation', 'safety', 'sorting', 'contest', 'disqualification', 'correction', 'cancellation')),
  observed_at timestamptz not null,
  location text,
  raw_observation text not null check (length(btrim(raw_observation)) > 0),
  decision_status text not null default 'open' check (decision_status in ('open', 'decided', 'cancelled')),
  decision_kind text not null default 'none' check (decision_kind in ('none', 'warning', 'penalty', 'disqualification', 'correction', 'cancelled')),
  decision_points numeric,
  rule_reference text,
  justification text,
  score_effect jsonb not null default '{}'::jsonb,
  observed_by_clerk_id text not null check (length(btrim(observed_by_clerk_id)) > 0),
  decided_by_clerk_id text,
  decided_at timestamptz,
  correction_of uuid references public.spogomi_field_incidents(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade,
  foreign key (team_id, event_id, division_id) references public.spogomi_teams(id, event_id, division_id) on delete restrict,
  check (decision_points is null or decision_points >= 0),
  check (decision_kind = 'none' or (length(btrim(coalesce(rule_reference, ''))) > 0 and length(btrim(coalesce(justification, ''))) > 0)),
  check ((decision_status = 'open' and decided_by_clerk_id is null and decided_at is null) or decision_status <> 'open'),
  check (decision_status = 'open' or (decided_by_clerk_id is not null and decided_at is not null))
);

create table public.spogomi_field_incident_history (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.spogomi_field_incidents(id) on delete cascade,
  event_id uuid not null,
  division_id uuid not null,
  action text not null check (action in ('observed', 'decided', 'corrected', 'cancelled')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text not null check (length(btrim(reason)) > 0),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade
);

create table public.spogomi_operational_measurements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  division_id uuid not null,
  team_id uuid not null,
  category_rule_id uuid not null,
  revision integer not null check (revision > 0),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'certified', 'rejected', 'superseded')),
  measurement_kind text not null check (measurement_kind in ('mass', 'count', 'volume')),
  unit text not null check (length(btrim(unit)) > 0),
  quantity numeric check (quantity is null or quantity >= 0),
  mass_grams numeric check (mass_grams is null or mass_grams >= 0),
  object_count numeric check (object_count is null or (object_count >= 0 and object_count = trunc(object_count))),
  measurement_method text not null check (length(btrim(measurement_method)) > 0),
  provenance text not null check (length(btrim(provenance)) > 0),
  source_kind text not null default 'field_entry' check (source_kind in ('field_entry', 'import_excel')),
  source_reference text,
  entered_by_clerk_id text not null check (length(btrim(entered_by_clerk_id)) > 0),
  certified_by_clerk_id text,
  certified_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, category_rule_id, revision),
  foreign key (team_id, event_id, division_id) references public.spogomi_teams(id, event_id, division_id) on delete cascade,
  foreign key (category_rule_id, event_id, division_id) references public.spogomi_category_rules(id, event_id, division_id) on delete restrict,
  check (num_nonnulls(quantity, mass_grams, object_count) = 1),
  check ((measurement_kind = 'mass' and mass_grams is not null and quantity is null and object_count is null)
      or (measurement_kind = 'count' and object_count is not null and quantity is null and mass_grams is null)
      or (measurement_kind = 'volume' and quantity is not null and mass_grams is null and object_count is null)),
  check ((status = 'certified' and certified_by_clerk_id is not null and certified_at is not null)
      or (status <> 'certified' and certified_by_clerk_id is null and certified_at is null)),
  check (status <> 'rejected' or length(btrim(coalesce(rejection_reason, ''))) > 0)
);

create table public.spogomi_measurement_history (
  id uuid primary key default gen_random_uuid(),
  measurement_id uuid not null references public.spogomi_operational_measurements(id) on delete cascade,
  event_id uuid not null,
  division_id uuid not null,
  action text not null check (action in ('created', 'submitted', 'certified', 'rejected', 'superseded')),
  actor_clerk_id text not null check (length(btrim(actor_clerk_id)) > 0),
  reason text not null check (length(btrim(reason)) > 0),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade
);

create table public.spogomi_measurement_imports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  division_id uuid not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  import_key text not null,
  file_name text not null check (length(btrim(file_name)) > 0),
  format text not null check (format in ('xlsx', 'xls', 'ods', 'csv', 'tsv')),
  sheet_name text not null,
  column_mapping jsonb not null default '{}'::jsonb,
  status text not null default 'previewed' check (status in ('previewed', 'confirmed', 'rejected')),
  imported_by_clerk_id text not null check (length(btrim(imported_by_clerk_id)) > 0),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, division_id, content_sha256),
  unique (event_id, division_id, import_key),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade
);

create table public.spogomi_measurement_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.spogomi_measurement_imports(id) on delete cascade,
  event_id uuid not null,
  division_id uuid not null,
  row_number integer not null check (row_number > 0),
  team_number integer,
  team_id uuid,
  category_code text,
  category_rule_id uuid,
  measurement_kind text,
  unit text,
  quantity numeric,
  mass_grams numeric,
  object_count numeric,
  measurement_method text,
  provenance text,
  selected boolean not null default false,
  diagnostics jsonb not null default '[]'::jsonb,
  unique (import_id, row_number),
  foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete cascade,
  foreign key (team_id, event_id, division_id) references public.spogomi_teams(id, event_id, division_id) on delete restrict,
  foreign key (category_rule_id, event_id, division_id) references public.spogomi_category_rules(id, event_id, division_id) on delete restrict
);

create index spogomi_field_operation_history_scope_idx on public.spogomi_field_operation_history(event_id, division_id, occurred_at desc);
create index spogomi_team_returns_scope_idx on public.spogomi_team_returns(event_id, division_id, actual_return_at);
create index spogomi_field_incidents_scope_idx on public.spogomi_field_incidents(event_id, division_id, observed_at desc);
create index spogomi_operational_measurements_scope_idx on public.spogomi_operational_measurements(event_id, division_id, team_id, category_rule_id, revision desc);

alter table public.spogomi_field_operations enable row level security;
alter table public.spogomi_field_operation_history enable row level security;
alter table public.spogomi_team_returns enable row level security;
alter table public.spogomi_team_return_history enable row level security;
alter table public.spogomi_field_incidents enable row level security;
alter table public.spogomi_field_incident_history enable row level security;
alter table public.spogomi_operational_measurements enable row level security;
alter table public.spogomi_measurement_history enable row level security;
alter table public.spogomi_measurement_imports enable row level security;
alter table public.spogomi_measurement_import_rows enable row level security;

revoke all on table public.spogomi_field_operations, public.spogomi_field_operation_history, public.spogomi_team_returns, public.spogomi_team_return_history, public.spogomi_field_incidents, public.spogomi_field_incident_history, public.spogomi_operational_measurements, public.spogomi_measurement_history, public.spogomi_measurement_imports, public.spogomi_measurement_import_rows from public, anon, authenticated;
grant all on table public.spogomi_field_operations, public.spogomi_field_operation_history, public.spogomi_team_returns, public.spogomi_team_return_history, public.spogomi_field_incidents, public.spogomi_field_incident_history, public.spogomi_operational_measurements, public.spogomi_measurement_history, public.spogomi_measurement_imports, public.spogomi_measurement_import_rows to service_role;

create or replace function public.spogomi_set_operational_access(
  p_event_id uuid,
  p_subject_clerk_id text,
  p_access_role text,
  p_operation text,
  p_actor_clerk_id text
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_reviewer public.spogomi_event_reviewers%rowtype; v_changed boolean := false;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI operational access is server-only'; end if;
  if p_access_role not in ('timekeeper', 'weigher', 'data_entry', 'arbiter', 'certifier') then raise exception using errcode = 'check_violation', message = 'SPOGOMI operational access role is invalid'; end if;
  if p_operation not in ('grant', 'revoke') then raise exception using errcode = 'check_violation', message = 'SPOGOMI operational access operation is invalid'; end if;
  if length(btrim(coalesce(p_subject_clerk_id, ''))) = 0 or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI operational access identities are required'; end if;
  if not exists (select 1 from public.spogomi_events where id = p_event_id) then raise exception using errcode = 'no_data_found', message = 'SPOGOMI event not found'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_event_id, p_subject_clerk_id, p_access_role), 0));
  select * into v_reviewer from public.spogomi_event_reviewers where event_id = p_event_id and clerk_id = btrim(p_subject_clerk_id) and role = p_access_role for update;
  if p_operation = 'grant' then
    if not found then
      insert into public.spogomi_event_reviewers (event_id, clerk_id, role, assigned_by_clerk_id, revoked_at) values (p_event_id, btrim(p_subject_clerk_id), p_access_role, btrim(p_actor_clerk_id), null) returning * into v_reviewer;
      v_changed := true;
    elsif v_reviewer.revoked_at is not null then
      update public.spogomi_event_reviewers set assigned_by_clerk_id = btrim(p_actor_clerk_id), revoked_at = null, updated_at = now() where id = v_reviewer.id returning * into v_reviewer;
      v_changed := true;
    end if;
  elsif found and v_reviewer.revoked_at is null then
    update public.spogomi_event_reviewers set revoked_at = now(), updated_at = now() where id = v_reviewer.id returning * into v_reviewer;
    v_changed := true;
  end if;
  if v_changed then
    insert into public.spogomi_event_access_audit (event_id, subject_clerk_id, access_role, operation, actor_clerk_id, details)
    values (p_event_id, btrim(p_subject_clerk_id), p_access_role, case when p_operation = 'grant' then 'granted' else 'revoked' end, btrim(p_actor_clerk_id), jsonb_build_object('reviewer_id', v_reviewer.id, 'scope', 'field_operations'));
  end if;
  return jsonb_build_object('changed', v_changed, 'event_id', p_event_id, 'clerk_id', btrim(p_subject_clerk_id), 'role', p_access_role);
end; $$;

revoke all on function public.spogomi_set_operational_access(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_set_operational_access(uuid, text, text, text, text) to service_role;

create or replace function public.spogomi_configure_field_operation(
  p_event_id uuid, p_division_id uuid, p_timezone_name text, p_regulation_version text,
  p_official_start_at timestamptz, p_collection_limit_at timestamptz, p_sorting_limit_at timestamptz,
  p_weighing_start_at timestamptz, p_weighing_end_at timestamptz, p_actor_clerk_id text,
  p_reason text, p_provenance text
) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_operation public.spogomi_field_operations%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI field operations are server-only'; end if;
  if not exists (select 1 from public.spogomi_divisions where id = p_division_id and event_id = p_event_id) then raise exception using errcode = 'no_data_found', message = 'SPOGOMI division not found'; end if;
  if length(btrim(coalesce(p_timezone_name, ''))) = 0 or length(btrim(coalesce(p_regulation_version, ''))) = 0 or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 or length(btrim(coalesce(p_reason, ''))) = 0 or length(btrim(coalesce(p_provenance, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI operation configuration provenance is required'; end if;
  insert into public.spogomi_field_operations (event_id, division_id, timezone_name, regulation_version, official_start_at, collection_limit_at, sorting_limit_at, weighing_start_at, weighing_end_at, updated_by_clerk_id)
  values (p_event_id, p_division_id, btrim(p_timezone_name), btrim(p_regulation_version), p_official_start_at, p_collection_limit_at, p_sorting_limit_at, p_weighing_start_at, p_weighing_end_at, btrim(p_actor_clerk_id))
  on conflict (event_id, division_id) do update set timezone_name = excluded.timezone_name, regulation_version = excluded.regulation_version, official_start_at = excluded.official_start_at, collection_limit_at = excluded.collection_limit_at, sorting_limit_at = excluded.sorting_limit_at, weighing_start_at = excluded.weighing_start_at, weighing_end_at = excluded.weighing_end_at, updated_by_clerk_id = excluded.updated_by_clerk_id, updated_at = now()
  returning * into v_operation;
  insert into public.spogomi_field_operation_history (event_id, division_id, operation_id, action, phase, actor_clerk_id, reason, provenance, snapshot)
  values (p_event_id, p_division_id, v_operation.id, 'configured', v_operation.phase, p_actor_clerk_id, p_reason, p_provenance, to_jsonb(v_operation));
  return to_jsonb(v_operation);
end; $$;

revoke all on function public.spogomi_configure_field_operation(uuid, uuid, text, text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_configure_field_operation(uuid, uuid, text, text, timestamptz, timestamptz, timestamptz, timestamptz, timestamptz, text, text, text) to service_role;

create or replace function public.spogomi_launch_field_phase(p_event_id uuid, p_division_id uuid, p_phase text, p_at timestamptz, p_actor_clerk_id text, p_reason text, p_provenance text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_operation public.spogomi_field_operations%rowtype; v_action text;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI field phases are server-only'; end if;
  if p_phase not in ('collection', 'sorting', 'weighing', 'closed') then raise exception using errcode = 'check_violation', message = 'SPOGOMI field phase is invalid'; end if;
  select * into v_operation from public.spogomi_field_operations where event_id = p_event_id and division_id = p_division_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI field operation is not configured'; end if;
  if p_phase = 'collection' then update public.spogomi_field_operations set official_start_at = coalesce(official_start_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id;
  elsif p_phase = 'sorting' then update public.spogomi_field_operations set collection_end_at = coalesce(collection_end_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id;
  elsif p_phase = 'weighing' then update public.spogomi_field_operations set weighing_start_at = coalesce(weighing_start_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id;
  else update public.spogomi_field_operations set weighing_end_at = coalesce(weighing_end_at, p_at), phase = p_phase, updated_by_clerk_id = p_actor_clerk_id, updated_at = now() where id = v_operation.id; end if;
  select * into v_operation from public.spogomi_field_operations where id = v_operation.id;
  v_action := case when p_phase = 'closed' then 'closed' else 'phase_started' end;
  insert into public.spogomi_field_operation_history (event_id, division_id, operation_id, action, phase, actor_clerk_id, reason, provenance, snapshot) values (p_event_id, p_division_id, v_operation.id, v_action, v_operation.phase, p_actor_clerk_id, p_reason, p_provenance, to_jsonb(v_operation));
  return to_jsonb(v_operation);
end; $$;

revoke all on function public.spogomi_launch_field_phase(uuid, uuid, text, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_launch_field_phase(uuid, uuid, text, timestamptz, text, text, text) to service_role;

create or replace function public.spogomi_record_team_return(p_event_id uuid, p_division_id uuid, p_team_id uuid, p_actual_return_at timestamptz, p_note text, p_actor_clerk_id text, p_reason text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_return public.spogomi_team_returns%rowtype; v_status text;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI team returns are server-only'; end if;
  if length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 or length(btrim(coalesce(p_reason, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI return actor and reason are required'; end if;
  if not exists (select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id) then raise exception using errcode = 'no_data_found', message = 'SPOGOMI team not found'; end if;
  select case when f.collection_limit_at is not null and p_actual_return_at > f.collection_limit_at then 'late' else 'returned' end into v_status from public.spogomi_field_operations f where f.event_id = p_event_id and f.division_id = p_division_id;
  insert into public.spogomi_team_returns (event_id, division_id, team_id, actual_return_at, return_status, note, recorded_by_clerk_id)
  values (p_event_id, p_division_id, p_team_id, p_actual_return_at, v_status, nullif(btrim(p_note), ''), p_actor_clerk_id)
  on conflict (event_id, division_id, team_id) do update set actual_return_at = excluded.actual_return_at, return_status = excluded.return_status, note = excluded.note, recorded_by_clerk_id = excluded.recorded_by_clerk_id, version = public.spogomi_team_returns.version + 1, updated_at = now()
  returning * into v_return;
  insert into public.spogomi_team_return_history (return_id, event_id, division_id, team_id, actual_return_at, return_status, note, actor_clerk_id, reason) values (v_return.id, p_event_id, p_division_id, p_team_id, v_return.actual_return_at, v_return.return_status, v_return.note, p_actor_clerk_id, p_reason);
  return to_jsonb(v_return);
end; $$;

revoke all on function public.spogomi_record_team_return(uuid, uuid, uuid, timestamptz, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_record_team_return(uuid, uuid, uuid, timestamptz, text, text, text) to service_role;

create or replace function public.spogomi_record_field_incident(p_event_id uuid, p_division_id uuid, p_team_id uuid, p_category text, p_observed_at timestamptz, p_location text, p_raw_observation text, p_actor_clerk_id text, p_reason text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_incident public.spogomi_field_incidents%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI incidents are server-only'; end if;
  if length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 or length(btrim(coalesce(p_raw_observation, ''))) = 0 or length(btrim(coalesce(p_reason, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI incident observation provenance is required'; end if;
  if p_team_id is not null and not exists (select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id) then raise exception using errcode = 'no_data_found', message = 'SPOGOMI incident team not found'; end if;
  insert into public.spogomi_field_incidents (event_id, division_id, team_id, category, observed_at, location, raw_observation, observed_by_clerk_id) values (p_event_id, p_division_id, p_team_id, p_category, p_observed_at, nullif(btrim(p_location), ''), p_raw_observation, p_actor_clerk_id) returning * into v_incident;
  insert into public.spogomi_field_incident_history (incident_id, event_id, division_id, action, actor_clerk_id, reason, snapshot) values (v_incident.id, p_event_id, p_division_id, 'observed', p_actor_clerk_id, p_reason, to_jsonb(v_incident));
  return to_jsonb(v_incident);
end; $$;

revoke all on function public.spogomi_record_field_incident(uuid, uuid, uuid, text, timestamptz, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_record_field_incident(uuid, uuid, uuid, text, timestamptz, text, text, text, text) to service_role;

create or replace function public.spogomi_decide_field_incident(p_event_id uuid, p_division_id uuid, p_incident_id uuid, p_decision_kind text, p_decision_points numeric, p_rule_reference text, p_justification text, p_score_effect jsonb, p_actor_clerk_id text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_incident public.spogomi_field_incidents%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI incident decisions are server-only'; end if;
  if p_decision_kind not in ('warning', 'penalty', 'disqualification', 'correction', 'cancelled') then raise exception using errcode = 'check_violation', message = 'SPOGOMI incident decision is invalid'; end if;
  if length(btrim(coalesce(p_rule_reference, ''))) = 0 or length(btrim(coalesce(p_justification, ''))) = 0 or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI incident rule and justification are required'; end if;
  select * into v_incident from public.spogomi_field_incidents where id = p_incident_id and event_id = p_event_id and division_id = p_division_id for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI incident not found'; end if;
  update public.spogomi_field_incidents set decision_status = case when p_decision_kind = 'cancelled' then 'cancelled' else 'decided' end, decision_kind = p_decision_kind, decision_points = p_decision_points, rule_reference = btrim(p_rule_reference), justification = btrim(p_justification), score_effect = coalesce(p_score_effect, '{}'::jsonb), decided_by_clerk_id = p_actor_clerk_id, decided_at = now(), updated_at = now() where id = p_incident_id returning * into v_incident;
  insert into public.spogomi_field_incident_history (incident_id, event_id, division_id, action, actor_clerk_id, reason, snapshot) values (v_incident.id, p_event_id, p_division_id, case when p_decision_kind = 'cancelled' then 'cancelled' else 'decided' end, p_actor_clerk_id, p_justification, to_jsonb(v_incident));
  return to_jsonb(v_incident);
end; $$;

revoke all on function public.spogomi_decide_field_incident(uuid, uuid, uuid, text, numeric, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.spogomi_decide_field_incident(uuid, uuid, uuid, text, numeric, text, text, jsonb, text) to service_role;

create or replace function public.spogomi_upsert_operational_measurement(p_event_id uuid, p_division_id uuid, p_team_id uuid, p_category_rule_id uuid, p_measurement_kind text, p_unit text, p_quantity numeric, p_mass_grams numeric, p_object_count numeric, p_measurement_method text, p_provenance text, p_source_kind text, p_source_reference text, p_actor_clerk_id text, p_reason text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_previous public.spogomi_operational_measurements%rowtype; v_measurement public.spogomi_operational_measurements%rowtype; v_revision integer;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI measurements are server-only'; end if;
  if p_measurement_kind not in ('mass', 'count', 'volume') or p_source_kind not in ('field_entry', 'import_excel') or length(btrim(coalesce(p_unit, ''))) = 0 or length(btrim(coalesce(p_measurement_method, ''))) = 0 or length(btrim(coalesce(p_provenance, ''))) = 0 or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 or length(btrim(coalesce(p_reason, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI measurement fields are incomplete'; end if;
  if num_nonnulls(p_quantity, p_mass_grams, p_object_count) <> 1 then raise exception using errcode = 'check_violation', message = 'SPOGOMI measurement must keep one quantity type'; end if;
  if p_measurement_kind = 'mass' and p_mass_grams is null or p_measurement_kind = 'count' and p_object_count is null or p_measurement_kind = 'volume' and p_quantity is null then raise exception using errcode = 'check_violation', message = 'SPOGOMI measurement kind does not match its value'; end if;
  if not exists (select 1 from public.spogomi_teams where id = p_team_id and event_id = p_event_id and division_id = p_division_id) or not exists (select 1 from public.spogomi_category_rules where id = p_category_rule_id and event_id = p_event_id and division_id = p_division_id and measurement_kind = p_measurement_kind and unit = p_unit) then raise exception using errcode = 'no_data_found', message = 'SPOGOMI measurement scope or category is invalid'; end if;
  perform pg_advisory_xact_lock(hashtextextended(format('%s:%s:%s', p_team_id, p_category_rule_id, p_division_id), 0));
  select * into v_previous from public.spogomi_operational_measurements where team_id = p_team_id and category_rule_id = p_category_rule_id and event_id = p_event_id and division_id = p_division_id and status not in ('superseded', 'rejected') order by revision desc limit 1 for update;
  if found then update public.spogomi_operational_measurements set status = 'superseded', updated_at = now() where id = v_previous.id; end if;
  select coalesce(max(revision), 0) + 1 into v_revision from public.spogomi_operational_measurements where team_id = p_team_id and category_rule_id = p_category_rule_id;
  insert into public.spogomi_operational_measurements (event_id, division_id, team_id, category_rule_id, revision, measurement_kind, unit, quantity, mass_grams, object_count, measurement_method, provenance, source_kind, source_reference, entered_by_clerk_id) values (p_event_id, p_division_id, p_team_id, p_category_rule_id, v_revision, p_measurement_kind, btrim(p_unit), p_quantity, p_mass_grams, p_object_count, btrim(p_measurement_method), btrim(p_provenance), p_source_kind, nullif(btrim(p_source_reference), ''), btrim(p_actor_clerk_id)) returning * into v_measurement;
  if found then insert into public.spogomi_measurement_history (measurement_id, event_id, division_id, action, actor_clerk_id, reason, snapshot) values (v_measurement.id, p_event_id, p_division_id, 'created', p_actor_clerk_id, p_reason, to_jsonb(v_measurement)); end if;
  return to_jsonb(v_measurement);
end; $$;

revoke all on function public.spogomi_upsert_operational_measurement(uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_upsert_operational_measurement(uuid, uuid, uuid, uuid, text, text, numeric, numeric, numeric, text, text, text, text, text, text) to service_role;

create or replace function public.spogomi_decide_operational_measurement(p_event_id uuid, p_division_id uuid, p_measurement_id uuid, p_decision text, p_rejection_reason text, p_actor_clerk_id text) returns jsonb
language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_measurement public.spogomi_operational_measurements%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI measurement decisions are server-only'; end if;
  if p_decision not in ('certified', 'rejected') or length(btrim(coalesce(p_actor_clerk_id, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI measurement decision is invalid'; end if;
  select * into v_measurement from public.spogomi_operational_measurements where id = p_measurement_id and event_id = p_event_id and division_id = p_division_id and status not in ('superseded', 'rejected') for update;
  if not found then raise exception using errcode = 'no_data_found', message = 'SPOGOMI measurement not found'; end if;
  if p_decision = 'certified' and v_measurement.entered_by_clerk_id = p_actor_clerk_id then raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI measurement self-certification is forbidden'; end if;
  if p_decision = 'rejected' and length(btrim(coalesce(p_rejection_reason, ''))) = 0 then raise exception using errcode = 'check_violation', message = 'SPOGOMI rejection reason is required'; end if;
  update public.spogomi_operational_measurements set status = p_decision, rejection_reason = case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end, certified_by_clerk_id = case when p_decision = 'certified' then p_actor_clerk_id else null end, certified_at = case when p_decision = 'certified' then now() else null end, updated_at = now() where id = v_measurement.id returning * into v_measurement;
  insert into public.spogomi_measurement_history (measurement_id, event_id, division_id, action, actor_clerk_id, reason, snapshot) values (v_measurement.id, p_event_id, p_division_id, p_decision, p_actor_clerk_id, coalesce(p_rejection_reason, 'measurement certified'), to_jsonb(v_measurement));
  return to_jsonb(v_measurement);
end; $$;

revoke all on function public.spogomi_decide_operational_measurement(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.spogomi_decide_operational_measurement(uuid, uuid, uuid, text, text, text) to service_role;
