-- SPOGOMI parent editions and typed divisions.
--
-- The existing spogomi_events row is the canonical parent edition.  This
-- migration does not create a second event or action hierarchy: action_id
-- remains unique on the parent and every pre-existing event is backfilled with
-- exactly one deterministic division matching its former mode.

alter table public.spogomi_events
  drop constraint if exists spogomi_events_mode_check;

alter table public.spogomi_events
  add constraint spogomi_events_mode_check
  check (mode in ('casual', 'world_cup', 'mixed'));

create table public.spogomi_divisions (
  id uuid primary key,
  event_id uuid not null references public.spogomi_events(id) on delete cascade,
  division_type text not null check (division_type in ('casual', 'world_cup')),
  division_key text not null check (division_key in ('casual', 'world_cup')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id),
  unique (event_id, division_type),
  unique (event_id, division_key),
  check (division_type = division_key)
);

-- md5(event_id || ':' || division_type) is stable across retries and does not
-- reinterpret any existing row. New mixed editions use the same formula.
insert into public.spogomi_divisions (id, event_id, division_type, division_key)
select md5(e.id::text || ':' || e.mode)::uuid,
       e.id,
       e.mode,
       e.mode
  from public.spogomi_events e
 where e.mode in ('casual', 'world_cup')
on conflict (event_id, division_type) do nothing;

create or replace function public.spogomi_assert_parent_divisions(p_event_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_mode text;
  v_count integer;
  v_casual integer;
  v_world_cup integer;
  v_creation_state text;
begin
  select mode, creation_state
    into v_mode, v_creation_state
    from public.spogomi_events
   where id = p_event_id;

  -- Creation is two-phase for compatibility with the existing action/event
  -- recovery protocol. The ready transition below is the commit boundary.
  if not found then
    return;
  end if;
  select count(*)::integer,
         count(*) filter (where division_type = 'casual')::integer,
         count(*) filter (where division_type = 'world_cup')::integer
    into v_count, v_casual, v_world_cup
    from public.spogomi_divisions
   where event_id = p_event_id;
  if v_creation_state = 'event_pending' and v_count = 0 then
    return;
  end if;
  if v_mode in ('casual', 'world_cup') and (v_count <> 1 or v_casual + v_world_cup <> 1) then
    raise exception using errcode = 'check_violation', message = 'A single-mode SPOGOMI edition requires exactly one matching division';
  end if;
  if v_mode = 'mixed' and (v_count <> 2 or v_casual <> 1 or v_world_cup <> 1) then
    raise exception using errcode = 'check_violation', message = 'A mixed SPOGOMI edition requires exactly one Casual and one World Cup division';
  end if;
end;
$$;

create or replace function public.spogomi_divisions_parent_integrity_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  perform public.spogomi_assert_parent_divisions(coalesce(new.event_id, old.event_id));
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.spogomi_events_parent_integrity_trigger()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  perform public.spogomi_assert_parent_divisions(new.id);
  return new;
end;
$$;

create or replace function public.spogomi_divisions_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger spogomi_divisions_set_updated_at
before update on public.spogomi_divisions
for each row execute function public.spogomi_divisions_set_updated_at();

create constraint trigger spogomi_divisions_parent_integrity
after insert or update or delete on public.spogomi_divisions
deferrable initially deferred
for each row execute function public.spogomi_divisions_parent_integrity_trigger();

create constraint trigger spogomi_events_parent_integrity
after insert or update of mode, creation_state on public.spogomi_events
deferrable initially deferred
for each row execute function public.spogomi_events_parent_integrity_trigger();

-- The creation service calls this function after the action and parent event
-- reservation. It is the one transaction that materializes the requested
-- divisions, and is safe to replay with the same event and mode.
create or replace function public.spogomi_ensure_parent_divisions(
  p_event_id uuid,
  p_mode text
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_event public.spogomi_events%rowtype;
  v_type text;
  v_types text[];
  v_result jsonb;
begin
  -- PURPOSE: atomically create or resume the typed divisions of one parent edition.
  -- CALLER: server-side SPOGOMI creation/recovery service.
  -- AUTHORIZATION_BOUNDARY: service_role only; HTTP AuthN/AuthZ stays in the route.
  -- IDEMPOTENCY: deterministic ids plus unique(event_id, division_type) make replay a no-op.
  -- ATOMICITY: parent lock and all division upserts share this transaction.
  -- FAILURE_BEHAVIOR: an existing parent with a different mode or division set aborts.
  -- SEARCH_PATH: fixed to pg_catalog, public.
  -- GRANTS: execute is revoked from public roles and granted only to service_role.
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception using errcode = 'insufficient_privilege', message = 'SPOGOMI division creation requires the server role';
  end if;
  if p_mode not in ('casual', 'world_cup', 'mixed') then
    raise exception using errcode = 'invalid_parameter_value', message = 'Invalid SPOGOMI parent mode';
  end if;
  select * into v_event from public.spogomi_events where id = p_event_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'SPOGOMI parent edition not found';
  end if;
  if v_event.mode <> p_mode then
    raise exception using errcode = 'serialization_failure', message = 'SPOGOMI parent mode cannot change during creation recovery';
  end if;
  v_types := case when p_mode = 'mixed' then array['casual', 'world_cup'] else array[p_mode] end;
  foreach v_type in array v_types loop
    insert into public.spogomi_divisions (id, event_id, division_type, division_key)
    values (md5(p_event_id::text || ':' || v_type)::uuid, p_event_id, v_type, v_type)
    on conflict (event_id, division_type) do nothing;
  end loop;
  perform public.spogomi_assert_parent_divisions(p_event_id);
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'type', division_type) order by division_type), '[]'::jsonb)
    into v_result
    from public.spogomi_divisions
   where event_id = p_event_id;
  return v_result;
end;
$$;

revoke all on function public.spogomi_assert_parent_divisions(uuid) from public, anon, authenticated;
revoke all on function public.spogomi_ensure_parent_divisions(uuid, text) from public, anon, authenticated;
grant execute on function public.spogomi_ensure_parent_divisions(uuid, text) to service_role;

-- During the rollout, legacy single-division writes can still omit the new
-- column. They are resolved only when the parent has exactly one division;
-- mixed editions fail closed and require an explicit division_id. This keeps
-- old editions writable without ever guessing between two divisions.
create or replace function public.spogomi_fill_legacy_single_division()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_division_id uuid;
  v_division_count integer;
begin
  if new.division_id is not null then
    return new;
  end if;
  select count(*)::integer, min(id)
    into v_division_count, v_division_id
    from public.spogomi_divisions
   where event_id = new.event_id;
  if v_division_count = 1 then
    new.division_id := v_division_id;
    return new;
  end if;
  raise exception using errcode = 'check_violation', message = 'A SPOGOMI row on a mixed edition requires an explicit division_id';
end;
$$;

do $$
declare
  v_table text;
  v_tables text[] := array[
    'spogomi_teams', 'spogomi_participants', 'spogomi_category_rules',
    'spogomi_result_submissions', 'spogomi_result_items', 'spogomi_result_reviews',
    'spogomi_roster_imports', 'spogomi_roster_import_changes', 'spogomi_roster_import_rows',
    'spogomi_team_access_grants', 'spogomi_team_access_sessions', 'spogomi_result_audit_events',
    'spogomi_event_reviewers', 'spogomi_environment_category_mappings',
    'spogomi_identity_link_events', 'spogomi_recognition_attestations',
    'spogomi_recognition_attestation_history', 'spogomi_official_rankings',
    'spogomi_official_ranking_history', 'spogomi_collection_awards',
    'spogomi_collection_award_history', 'spogomi_team_composition_history',
    'spogomi_team_composition_mutation_audit', 'spogomi_volunteer_certificates',
    'spogomi_volunteer_certificate_history'
  ];
begin
  foreach v_table in array v_tables loop
    execute format('alter table public.%I add column if not exists division_id uuid', v_table);
    execute format('update public.%I child set division_id = division.id from public.spogomi_divisions division where child.event_id = division.event_id and child.division_id is null and (select count(*) from public.spogomi_divisions d where d.event_id = child.event_id) = 1', v_table);
    execute format('alter table public.%I alter column division_id set not null', v_table);
    if not exists (select 1 from pg_constraint where conname = v_table || '_division_event_fk') then
      execute format('alter table public.%I add constraint %I foreign key (division_id, event_id) references public.spogomi_divisions(id, event_id) on delete restrict', v_table, v_table || '_division_event_fk');
    end if;
    execute format('drop trigger if exists %I on public.%I', v_table || '_fill_single_division', v_table);
    execute format('create trigger %I before insert or update of event_id, division_id on public.%I for each row execute function public.spogomi_fill_legacy_single_division()', v_table || '_fill_single_division', v_table);
    execute format('create index if not exists %I on public.%I(event_id, division_id)', v_table || '_event_division_idx', v_table);
  end loop;
end;
$$;

-- Each referenced row now carries the same stable division key as its parent.
create unique index spogomi_teams_id_event_division_unique on public.spogomi_teams(id, event_id, division_id);
create unique index spogomi_participants_id_event_division_unique on public.spogomi_participants(id, event_id, division_id);
create unique index spogomi_category_rules_id_event_division_unique on public.spogomi_category_rules(id, event_id, division_id);
create unique index spogomi_result_submissions_id_event_division_unique on public.spogomi_result_submissions(id, event_id, division_id);
create unique index spogomi_result_submissions_id_event_team_division_unique
  on public.spogomi_result_submissions(id, event_id, team_id, division_id);
create unique index spogomi_roster_imports_id_event_division_unique on public.spogomi_roster_imports(id, event_id, division_id);
create unique index spogomi_team_access_grants_id_event_division_unique on public.spogomi_team_access_grants(id, event_id, division_id);
create unique index spogomi_official_rankings_id_event_division_unique on public.spogomi_official_rankings(id, event_id, division_id);
create unique index spogomi_collection_awards_id_event_division_unique on public.spogomi_collection_awards(id, event_id, division_id);
create unique index spogomi_volunteer_certificates_id_event_division_unique on public.spogomi_volunteer_certificates(id, event_id, division_id);

alter table public.spogomi_teams
  drop constraint if exists spogomi_teams_event_id_team_number_key,
  add constraint spogomi_teams_event_division_team_number_key unique (event_id, division_id, team_number);

drop index if exists public.spogomi_teams_event_public_name_key_unique;
create unique index spogomi_teams_event_division_public_name_key_unique
  on public.spogomi_teams(event_id, division_id, public.spogomi_team_public_name_key(public_name));

alter table public.spogomi_category_rules
  drop constraint if exists spogomi_category_rules_event_id_regulation_version_code_key,
  add constraint spogomi_category_rules_event_division_regulation_code_key unique (event_id, division_id, regulation_version, code);

-- Cross-entity constraints prevent a row from pointing at another division of
-- the same parent. Existing event-scoped constraints remain in place for
-- compatibility and are strengthened by these composite references.
alter table public.spogomi_participants
  add constraint spogomi_participants_team_same_division_fk
  foreign key (team_id, event_id, division_id)
  references public.spogomi_teams(id, event_id, division_id) on delete restrict;

alter table public.spogomi_teams
  add constraint spogomi_teams_certified_submission_same_division_fk
  foreign key (certified_submission_id, event_id, id, division_id)
  references public.spogomi_result_submissions(id, event_id, team_id, division_id) on delete restrict;

alter table public.spogomi_result_submissions
  add constraint spogomi_result_submissions_team_same_division_fk
  foreign key (team_id, event_id, division_id)
  references public.spogomi_teams(id, event_id, division_id) on delete cascade,
  add constraint spogomi_result_submissions_replacement_same_division_fk
  foreign key (replaces_submission_id, event_id, division_id)
  references public.spogomi_result_submissions(id, event_id, division_id) on delete restrict;

alter table public.spogomi_result_items
  add constraint spogomi_result_items_submission_same_division_fk
  foreign key (submission_id, event_id, division_id)
  references public.spogomi_result_submissions(id, event_id, division_id) on delete cascade,
  add constraint spogomi_result_items_category_same_division_fk
  foreign key (category_rule_id, event_id, division_id)
  references public.spogomi_category_rules(id, event_id, division_id) on delete restrict;

alter table public.spogomi_result_reviews
  add constraint spogomi_result_reviews_submission_same_division_fk
  foreign key (submission_id, event_id, division_id)
  references public.spogomi_result_submissions(id, event_id, division_id) on delete cascade,
  add constraint spogomi_result_reviews_replacement_same_division_fk
  foreign key (replaces_submission_id, event_id, division_id)
  references public.spogomi_result_submissions(id, event_id, division_id) on delete restrict;

alter table public.spogomi_environment_category_mappings
  add constraint spogomi_environment_mappings_category_same_division_fk
  foreign key (category_rule_id, event_id, division_id)
  references public.spogomi_category_rules(id, event_id, division_id) on delete restrict;

alter table public.spogomi_roster_import_changes
  add constraint spogomi_roster_changes_import_same_division_fk
  foreign key (roster_import_id, event_id, division_id)
  references public.spogomi_roster_imports(id, event_id, division_id) on delete restrict,
  add constraint spogomi_roster_changes_participant_same_division_fk
  foreign key (participant_id, event_id, division_id)
  references public.spogomi_participants(id, event_id, division_id) on delete restrict;

alter table public.spogomi_roster_import_rows
  add constraint spogomi_roster_rows_import_same_division_fk
  foreign key (roster_import_id, event_id, division_id)
  references public.spogomi_roster_imports(id, event_id, division_id) on delete restrict,
  add constraint spogomi_roster_rows_participant_same_division_fk
  foreign key (participant_id, event_id, division_id)
  references public.spogomi_participants(id, event_id, division_id) on delete restrict;

alter table public.spogomi_team_access_grants
  add constraint spogomi_access_grants_team_same_division_fk
  foreign key (team_id, event_id, division_id)
  references public.spogomi_teams(id, event_id, division_id) on delete cascade;

alter table public.spogomi_team_access_sessions
  add constraint spogomi_access_sessions_grant_same_division_fk
  foreign key (grant_id, event_id, division_id)
  references public.spogomi_team_access_grants(id, event_id, division_id) on delete cascade,
  add constraint spogomi_access_sessions_team_same_division_fk
  foreign key (team_id, event_id, division_id)
  references public.spogomi_teams(id, event_id, division_id) on delete cascade;

alter table public.spogomi_result_audit_events
  add constraint spogomi_result_audit_team_same_division_fk
  foreign key (team_id, event_id, division_id)
  references public.spogomi_teams(id, event_id, division_id) on delete cascade,
  add constraint spogomi_result_audit_submission_same_division_fk
  foreign key (submission_id, event_id, division_id)
  references public.spogomi_result_submissions(id, event_id, division_id) on delete cascade;

alter table public.spogomi_identity_link_events
  add constraint spogomi_identity_link_participant_same_division_fk
  foreign key (participant_id, event_id, division_id)
  references public.spogomi_participants(id, event_id, division_id) on delete cascade;

alter table public.spogomi_recognition_attestations
  add constraint spogomi_attestation_participant_same_division_fk
  foreign key (participant_id, event_id, division_id)
  references public.spogomi_participants(id, event_id, division_id) on delete cascade;

alter table public.spogomi_recognition_attestation_history
  add constraint spogomi_attestation_history_participant_same_division_fk
  foreign key (participant_id, event_id, division_id)
  references public.spogomi_participants(id, event_id, division_id) on delete restrict;

alter table public.spogomi_official_rankings
  add constraint spogomi_ranking_team_same_division_fk
  foreign key (team_id, event_id, division_id)
  references public.spogomi_teams(id, event_id, division_id) on delete cascade;

alter table public.spogomi_official_ranking_history
  add constraint spogomi_ranking_history_team_same_division_fk
  foreign key (team_id, event_id, division_id)
  references public.spogomi_teams(id, event_id, division_id) on delete restrict;

alter table public.spogomi_collection_award_history
  add constraint spogomi_award_history_same_division_fk
  foreign key (award_id, event_id, division_id)
  references public.spogomi_collection_awards(id, event_id, division_id) on delete restrict;

alter table public.spogomi_volunteer_certificate_history
  add constraint spogomi_certificate_history_same_division_fk
  foreign key (certificate_id, event_id, division_id)
  references public.spogomi_volunteer_certificates(id, event_id, division_id) on delete restrict;

alter table public.spogomi_team_composition_history
  add constraint spogomi_composition_history_division_fk
  foreign key (division_id, event_id)
  references public.spogomi_divisions(id, event_id) on delete cascade;

alter table public.spogomi_team_composition_mutation_audit
  add constraint spogomi_composition_audit_division_fk
  foreign key (division_id, event_id)
  references public.spogomi_divisions(id, event_id) on delete cascade;

alter table public.spogomi_divisions enable row level security;
revoke all on table public.spogomi_divisions from public, anon, authenticated;
grant select on table public.spogomi_divisions to authenticated;
grant all on table public.spogomi_divisions to service_role;
create policy spogomi_divisions_service_write on public.spogomi_divisions
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
create policy spogomi_divisions_organizer_read on public.spogomi_divisions
for select using (
  exists (
    select 1 from public.spogomi_events e
     where e.id = event_id and public.is_spogomi_action_organizer(e.action_id)
  )
);

comment on table public.spogomi_divisions is
  'Canonical typed divisions of a SPOGOMI parent edition. Existing single-mode events are preserved with one deterministic division; mixed requires exactly casual plus world_cup.';
comment on column public.spogomi_divisions.id is
  'Stable division identifier: md5(parent event id || division type)::uuid for deterministic creation/recovery.';
comment on column public.spogomi_participants.division_id is
  'Explicit participant division assignment. Legacy single-division writes may be resolved only when exactly one division exists; mixed writes must provide this value.';
comment on column public.spogomi_events.action_id is
  'One canonical CleanMyMap action per SPOGOMI parent edition; divisions never create actions. The existing unique constraint remains authoritative.';
