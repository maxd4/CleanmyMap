-- PURPOSE: retain only abandoned pending drafts after one calendar month and
--          keep public statistics on the last approved/published snapshot.
-- CALLER: the existing maintenance cron through the service-role RPCs.
-- AUTHORIZATION_BOUNDARY: snapshots, retention and dependency inspection are
--                         service-role-only; the physical purge requires an
--                         explicit dry-run action id list.
-- IDEMPOTENCY: the version transition is append-only per publication event;
--              the purge is safe to retry because deleted rows disappear and
--              every candidate is rechecked while locked.
-- ATOMICITY: a publication transition captures quantities and participants in
--            one transaction; a purge locks, validates dependencies and
--            deletes one action with its persisted timestamp predicate.
-- FAILURE_BEHAVIOR: unresolved dependencies, concurrent changes and foreign
--                   key races block a row without aborting the batch.
-- SEARCH_PATH: every function pins pg_catalog and public explicitly.

create table if not exists public.action_statistical_versions (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  version_number bigint not null,
  created_at timestamptz not null default timezone('utc', now()),
  source_updated_at timestamptz not null,
  approved_at timestamptz,
  published_at timestamptz,
  publication_kind text not null,
  status text not null,
  action_phase text not null,
  review_state text not null,
  access_mode text not null,
  moderation_visibility text not null,
  data_provenance text not null,
  action_date date not null,
  location_label text not null,
  actor_name text,
  organizer_type text,
  action_context text,
  waste_kg numeric,
  cigarette_butts integer,
  volunteers_count integer,
  children_count integer,
  adult_count integer,
  retired_count integer,
  duration_minutes integer,
  notes text,
  preparation_data jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  constraint action_statistical_versions_kind_check
    check (publication_kind in ('approved_published', 'legacy_approved_unpublished')),
  constraint action_statistical_versions_provenance_check
    check (data_provenance in ('unknown', 'real', 'test')),
  constraint action_statistical_versions_identity_unique
    unique (action_id, version_number)
);

create unique index if not exists action_statistical_versions_current_uidx
  on public.action_statistical_versions(action_id)
  where is_current;

create index if not exists action_statistical_versions_action_source_idx
  on public.action_statistical_versions(action_id, source_updated_at desc);

comment on table public.action_statistical_versions is
  'Immutable statistical snapshots. Pending edits never replace the current approved/public version.';
comment on column public.action_statistical_versions.publication_kind is
  'approved_published for a real publication transition; legacy_approved_unpublished preserves historical rows whose publication date is unknown.';

alter table public.action_statistical_versions enable row level security;
drop policy if exists action_statistical_versions_service_only
  on public.action_statistical_versions;
create policy action_statistical_versions_service_only
on public.action_statistical_versions
for all
using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');

revoke all on table public.action_statistical_versions from public, anon, authenticated;
grant all on table public.action_statistical_versions to service_role;

create or replace function public.is_action_statistical_version_admissible(
  p_status text,
  p_action_phase text,
  p_access_mode text,
  p_moderation_visibility text,
  p_review_state text,
  p_action_date date,
  p_data_provenance text,
  p_publication_kind text,
  p_as_of_date date
)
returns boolean
language sql
stable
parallel safe
set search_path = pg_catalog, public
as $$
  select p_status = 'approved'
    and coalesce(p_action_phase, 'post_action_complete') = 'post_action_complete'
    and coalesce(p_access_mode, 'public') = 'public'
    and coalesce(p_moderation_visibility, 'visible') = 'visible'
    and coalesce(p_review_state, 'not_required') in ('not_required', 'approved')
    and p_action_date <= p_as_of_date
    and coalesce(p_data_provenance, 'unknown') <> 'test'
    and p_publication_kind in ('approved_published', 'legacy_approved_unpublished');
$$;

revoke all on function public.is_action_statistical_version_admissible(
  text, text, text, text, text, date, text, text, date
) from public, anon, authenticated;
grant execute on function public.is_action_statistical_version_admissible(
  text, text, text, text, text, date, text, text, date
) to service_role;

-- Preserve the five approved historical rows exactly as they are. In
-- particular, a NULL published_at remains NULL and no form composition is
-- inferred. These rows are explicitly labelled as historical only in the
-- snapshot, not reclassified in actions.
insert into public.action_statistical_versions (
  action_id, version_number, created_at, source_updated_at, approved_at,
  published_at, publication_kind, status, action_phase, review_state,
  access_mode, moderation_visibility, data_provenance, action_date,
  location_label, actor_name, organizer_type, action_context, waste_kg,
  cigarette_butts, volunteers_count, children_count, adult_count,
  retired_count, duration_minutes, notes, preparation_data, is_current
)
select
  a.id, 1, a.created_at, a.updated_at, a.review_decided_at, a.published_at,
  case when a.published_at is null
    then 'legacy_approved_unpublished' else 'approved_published' end,
  a.status, coalesce(a.action_phase, 'post_action_complete'),
  coalesce(a.review_state, 'not_required'), coalesce(a.access_mode, 'public'),
  coalesce(a.moderation_visibility, 'visible'), coalesce(a.data_provenance, 'unknown'),
  a.action_date, a.location_label, a.actor_name, a.organizer_type,
  a.action_context, a.waste_kg, a.cigarette_butts, a.volunteers_count,
  a.children_count, a.adult_count, a.retired_count, a.duration_minutes,
  a.notes, coalesce(a.preparation_data, '{}'::jsonb), true
from public.actions a
where a.status = 'approved'
  and coalesce(a.action_phase, 'post_action_complete') = 'post_action_complete'
  and coalesce(a.access_mode, 'public') = 'public'
  and coalesce(a.moderation_visibility, 'visible') = 'visible'
  and coalesce(a.review_state, 'not_required') in ('not_required', 'approved')
  and coalesce(a.data_provenance, 'unknown') <> 'test'
on conflict (action_id, version_number) do nothing;

create or replace function public.capture_action_statistical_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_version_number bigint;
begin
  if new.status <> 'approved'
     or coalesce(new.action_phase, 'post_action_complete') <> 'post_action_complete'
     or coalesce(new.access_mode, 'public') <> 'public'
     or coalesce(new.moderation_visibility, 'visible') <> 'visible'
     or coalesce(new.review_state, 'not_required') not in ('not_required', 'approved')
     or new.published_at is null
     or coalesce(new.data_provenance, 'unknown') = 'test' then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status = 'approved'
     and coalesce(old.action_phase, 'post_action_complete') = 'post_action_complete'
     and coalesce(old.access_mode, 'public') = 'public'
     and coalesce(old.moderation_visibility, 'visible') = 'visible'
     and coalesce(old.review_state, 'not_required') in ('not_required', 'approved')
     and old.published_at is not null
     and coalesce(old.data_provenance, 'unknown') <> 'test' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('cleanmymap.action-statistical-version:' || new.id::text, 0));
  update public.action_statistical_versions
  set is_current = false
  where action_id = new.id and is_current;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
  from public.action_statistical_versions
  where action_id = new.id;

  insert into public.action_statistical_versions (
    action_id, version_number, source_updated_at, approved_at, published_at,
    publication_kind, status, action_phase, review_state, access_mode,
    moderation_visibility, data_provenance, action_date, location_label,
    actor_name, organizer_type, action_context, waste_kg, cigarette_butts,
    volunteers_count, children_count, adult_count, retired_count,
    duration_minutes, notes, preparation_data, is_current
  ) values (
    new.id, v_version_number, new.updated_at, new.review_decided_at,
    new.published_at, 'approved_published', new.status,
    coalesce(new.action_phase, 'post_action_complete'),
    coalesce(new.review_state, 'not_required'), coalesce(new.access_mode, 'public'),
    coalesce(new.moderation_visibility, 'visible'), coalesce(new.data_provenance, 'unknown'),
    new.action_date, new.location_label, new.actor_name, new.organizer_type,
    new.action_context, new.waste_kg, new.cigarette_butts, new.volunteers_count,
    new.children_count, new.adult_count, new.retired_count, new.duration_minutes,
    new.notes, coalesce(new.preparation_data, '{}'::jsonb), true
  );
  return new;
end;
$$;

revoke all on function public.capture_action_statistical_version() from public, anon, authenticated;
grant execute on function public.capture_action_statistical_version() to service_role;

drop trigger if exists aaa_capture_action_statistical_version on public.actions;
create trigger aaa_capture_action_statistical_version
after insert or update on public.actions
for each row execute function public.capture_action_statistical_version();

create or replace function public.action_collection_reference_averages_v1()
returns table (
  waste_per_volunteer numeric,
  butts_per_volunteer numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with eligible_versions as (
    select v.waste_kg, v.cigarette_butts, v.volunteers_count::numeric as volunteers_count
    from public.action_statistical_versions v
    where v.is_current
      and public.is_action_statistical_version_admissible(
        v.status, v.action_phase, v.access_mode, v.moderation_visibility,
        v.review_state, v.action_date, v.data_provenance, v.publication_kind,
        current_date
      )
      and v.volunteers_count > 0
      and (
        (v.waste_kg is not null and v.waste_kg >= 0 and v.waste_kg <= 100000)
        or
        (v.cigarette_butts is not null and v.cigarette_butts >= 0 and v.cigarette_butts <= 5000000)
      )
  )
  select
    avg(waste_kg / volunteers_count) filter (where waste_kg is not null and waste_kg >= 0 and waste_kg <= 100000),
    avg(cigarette_butts::numeric / volunteers_count) filter (where cigarette_butts is not null and cigarette_butts >= 0 and cigarette_butts <= 5000000),
    count(*) filter (where waste_kg is not null and waste_kg >= 0 and waste_kg <= 100000)::integer,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0 and cigarette_butts <= 5000000)::integer,
    count(*)::integer,
    'action-collection-reference-averages-v1'::text,
    now()
  from eligible_versions;
$$;

revoke all on function public.action_collection_reference_averages_v1() from public;
grant execute on function public.action_collection_reference_averages_v1() to anon, authenticated;

create or replace function public.action_collection_context_reference_averages_v1()
returns table (
  action_context text,
  waste_per_effective_unit numeric,
  butts_per_effective_unit numeric,
  waste_source_count integer,
  butts_source_count integer,
  eligible_action_count integer,
  formula_version text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
with eligible as (
  select v.action_context, v.waste_kg, v.cigarette_butts,
    case when v.action_context in ('citizen', 'company')
      then v.adult_count + 0.5 * v.children_count + 0.5 * v.retired_count
      when v.action_context = 'school' then v.adult_count + 0.45 * v.children_count
      else null end as waste_units,
    case when v.action_context in ('citizen', 'company')
      then v.adult_count + 0.5 * v.children_count + 0.5 * v.retired_count
      when v.action_context = 'school' then v.adult_count
      else null end as butts_units
  from public.action_statistical_versions v
  where v.is_current
    and public.is_action_statistical_version_admissible(
      v.status, v.action_phase, v.access_mode, v.moderation_visibility,
      v.review_state, v.action_date, v.data_provenance, v.publication_kind,
      current_date
    )
    and v.action_context is not null
    and v.children_count is not null and v.adult_count is not null
    and v.retired_count is not null
    and v.children_count + v.adult_count + v.retired_count = v.volunteers_count
    and (v.action_context <> 'school' or v.retired_count = 0)
), grouped as (
  select action_context,
    avg(waste_kg / nullif(waste_units, 0)) filter (where waste_kg is not null and waste_kg >= 0 and waste_units > 0) as waste_average,
    avg(cigarette_butts::numeric / nullif(butts_units, 0)) filter (where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0) as butts_average,
    count(*) filter (where waste_kg is not null and waste_kg >= 0 and waste_units > 0)::integer as waste_count,
    count(*) filter (where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0)::integer as butts_count,
    count(*) filter (where (waste_kg is not null and waste_kg >= 0 and waste_units > 0) or (cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0))::integer as eligible_count
  from eligible group by action_context
)
select action_context, waste_average, butts_average, waste_count, butts_count,
  eligible_count, 'contextual-effective-units-v1'::text, now()
from grouped order by action_context;
$$;

revoke all on function public.action_collection_context_reference_averages_v1() from public;
grant execute on function public.action_collection_context_reference_averages_v1() to anon, authenticated;

-- Keep the last snapshot in the existing impact pipeline. A pending edit may
-- temporarily clear published_at/review_state; the current action still gates
-- visibility, while quantities and participants come from the snapshot.
alter function public.build_public_impact_action_contribution(public.actions)
  rename to build_public_impact_action_contribution_unversioned;

create or replace function public.build_public_impact_action_contribution(
  p_action public.actions
)
returns public.public_impact_action_contributions
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_snapshot public.action_statistical_versions%rowtype;
  v_effective public.actions;
  v_contribution public.public_impact_action_contributions;
  v_eligible boolean := false;
begin
  select * into v_snapshot
  from public.action_statistical_versions v
  where v.action_id = p_action.id
    and v.is_current
    and public.is_action_statistical_version_admissible(
      v.status, v.action_phase, v.access_mode, v.moderation_visibility,
      v.review_state, v.action_date, v.data_provenance, v.publication_kind,
      current_date
    );

  if found then
    v_effective := jsonb_populate_record(p_action, jsonb_build_object(
      'updated_at', v_snapshot.source_updated_at,
      'action_date', v_snapshot.action_date,
      'location_label', v_snapshot.location_label,
      'actor_name', v_snapshot.actor_name,
      'organizer_type', v_snapshot.organizer_type,
      'action_context', v_snapshot.action_context,
      'waste_kg', v_snapshot.waste_kg,
      'cigarette_butts', v_snapshot.cigarette_butts,
      'volunteers_count', v_snapshot.volunteers_count,
      'children_count', v_snapshot.children_count,
      'adult_count', v_snapshot.adult_count,
      'retired_count', v_snapshot.retired_count,
      'duration_minutes', v_snapshot.duration_minutes,
      'notes', v_snapshot.notes,
      'preparation_data', v_snapshot.preparation_data,
      'status', v_snapshot.status,
      'action_phase', v_snapshot.action_phase,
      'review_state', v_snapshot.review_state,
      'access_mode', v_snapshot.access_mode,
      'moderation_visibility', v_snapshot.moderation_visibility,
      'data_provenance', v_snapshot.data_provenance,
      'published_at', v_snapshot.published_at
    ));
    v_eligible := p_action.status in ('approved', 'pending')
      and coalesce(p_action.action_phase, 'post_action_complete') in ('post_action_complete', 'post_action_draft')
      and coalesce(p_action.access_mode, 'public') = 'public'
      and coalesce(p_action.moderation_visibility, 'visible') = 'visible'
      and coalesce(p_action.review_state, 'not_required') <> 'rejected'
      and coalesce(p_action.data_provenance, 'unknown') <> 'test'
      and p_action.action_date <= current_date;
  else
    v_effective := p_action;
  end if;

  select * into v_contribution
  from public.build_public_impact_action_contribution_unversioned(v_effective);
  v_contribution.eligible_non_temporal := v_eligible;
  return v_contribution;
end;
$$;

revoke all on function public.build_public_impact_action_contribution_unversioned(public.actions)
  from public, anon, authenticated, service_role;
revoke all on function public.build_public_impact_action_contribution(public.actions)
  from public, anon, authenticated;
grant execute on function public.build_public_impact_action_contribution(public.actions)
  to service_role;

create or replace function public.load_public_landing_action_summary_incremental()
returns table (
  visible_actions bigint,
  distinct_locations bigint,
  waste_kg numeric,
  waste_source_count bigint,
  cigarette_butts bigint,
  volunteers bigint,
  participants_total bigint,
  total_duration_minutes bigint,
  action_distribution jsonb,
  classification_warnings jsonb,
  butts_by_condition jsonb,
  methodology_version text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_state public.public_impact_action_aggregate_state%rowtype;
begin
  select * into v_state
  from public.public_impact_action_aggregate_state
  where state_id = true;
  if not found or v_state.initialized_at is null then
    raise exception 'Public Impact incremental state is not initialized; run rebuild=true';
  end if;

  return query
  select v_state.visible_actions, v_state.distinct_locations, v_state.waste_kg,
    (
      select count(*)::bigint
      from public.public_impact_action_contributions c
      join public.action_statistical_versions v
        on v.action_id = c.action_id and v.is_current
      where c.eligible_non_temporal
        and c.action_date >= v_state.floor_date
        and c.action_date <= current_date
        and v.waste_kg is not null
        and v.waste_kg >= 0
    ),
    v_state.cigarette_butts, v_state.participants_total, v_state.participants_total,
    v_state.total_duration_minutes,
    coalesce((select jsonb_agg(jsonb_build_object('key', d.category_key, 'category', d.category_label, 'count', d.action_count)
      order by case when d.category_key like 'spontaneous:%' then 1 else 2 end,
        case when d.category_key like 'spontaneous:%' then split_part(d.category_key, ':', 2)::bigint else 0::bigint end,
        d.category_label) from public.public_impact_action_distribution_counts d), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('code', w.warning_code, 'count', w.warning_count)
      order by w.warning_code) from public.public_impact_action_warning_counts w), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('condition', b.condition, 'count', b.cigarette_butts, 'massContributions', b.mass_contributions)
      order by b.condition) from public.public_impact_action_butt_condition_counts b), '[]'::jsonb),
    v_state.methodology_version;
end;
$$;

revoke all on function public.load_public_landing_action_summary_incremental() from public, anon, authenticated;
grant execute on function public.load_public_landing_action_summary_incremental() to service_role;

create table if not exists public.maintenance_action_retention_runs (
  run_id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  as_of timestamptz not null,
  cutoff timestamptz not null,
  dry_run boolean not null,
  batch_size integer not null,
  scanned_count integer not null default 0,
  eligible_count integer not null default 0,
  deleted_count integer not null default 0,
  blocked_count integer not null default 0,
  conflict_count integer not null default 0,
  failed_count integer not null default 0,
  reason_counts jsonb not null default '{}'::jsonb,
  status text not null default 'running'
);

alter table public.maintenance_action_retention_runs enable row level security;
drop policy if exists maintenance_action_retention_runs_service_only
  on public.maintenance_action_retention_runs;
create policy maintenance_action_retention_runs_service_only
on public.maintenance_action_retention_runs
for all using ((select auth.role()) = 'service_role')
with check ((select auth.role()) = 'service_role');
revoke all on table public.maintenance_action_retention_runs from public, anon, authenticated;
grant all on table public.maintenance_action_retention_runs to service_role;

create or replace function public.action_retention_dependency_reasons(p_action_id uuid)
returns table (reason text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_fk record;
  v_key record;
  v_predicate text;
  v_has_dependency boolean;
begin
  for v_fk in
    select c.oid, c.conname, c.conrelid,
      child_ns.nspname as child_schema, child_rel.relname as child_table,
      c.conkey, c.confkey
    from pg_constraint c
    join pg_class child_rel on child_rel.oid = c.conrelid
    join pg_namespace child_ns on child_ns.oid = child_rel.relnamespace
    where c.contype = 'f'
      and c.confrelid = 'public.actions'::regclass
      and c.convalidated
      and child_rel.relkind in ('r', 'p')
  loop
    v_predicate := '';
    for v_key in
      select child_att.attname as child_column, parent_att.attname as parent_column
      from unnest(v_fk.conkey) with ordinality child_keys(attnum, ordinality)
      join unnest(v_fk.confkey) with ordinality parent_keys(attnum, ordinality)
        on parent_keys.ordinality = child_keys.ordinality
      join pg_attribute child_att on child_att.attrelid = v_fk.conrelid
        and child_att.attnum = child_keys.attnum
      join pg_attribute parent_att on parent_att.attrelid = 'public.actions'::regclass
        and parent_att.attnum = parent_keys.attnum
      order by child_keys.ordinality
    loop
      v_predicate := v_predicate || case when v_predicate = '' then '' else ' and ' end ||
        format('child.%I = (select parent.%I from public.actions parent where parent.id = $1)', v_key.child_column, v_key.parent_column);
    end loop;
    execute format(
      'select exists (select 1 from %I.%I child where %s)',
      v_fk.child_schema, v_fk.child_table, v_predicate
    ) into v_has_dependency using p_action_id;
    if v_has_dependency then
      reason := format('foreign_key:%I.%I:%I', v_fk.child_schema, v_fk.child_table, v_fk.conname);
      return next;
    end if;
  end loop;

  if to_regclass('public.app_notifications') is not null
     and exists (
       select 1 from public.app_notifications n
       where coalesce(n.payload->>'actionId', n.payload->>'action_id') = p_action_id::text
     ) then
    reason := 'notification_payload';
    return next;
  end if;

  if to_regclass('public.app_messages') is not null
     and exists (select 1 from public.app_messages m where m.action_id = p_action_id) then
    reason := 'message_reference';
    return next;
  end if;

  if to_regclass('storage.objects') is not null
     and exists (
       select 1 from storage.objects o
       where o.bucket_id = 'action-photos'
         and o.name like p_action_id::text || '/%'
     ) then
    reason := 'storage_object';
    return next;
  end if;
end;
$$;

revoke all on function public.action_retention_dependency_reasons(uuid)
  from public, anon, authenticated;
grant execute on function public.action_retention_dependency_reasons(uuid) to service_role;

create or replace function public.purge_inactive_action_records(
  p_as_of timestamptz default timezone('utc', now()),
  p_dry_run boolean default true,
  p_batch_size integer default 100,
  p_expected_action_ids uuid[] default null
)
returns table (
  action_id uuid,
  outcome text,
  reason text,
  last_activity_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cutoff timestamptz := p_as_of - interval '1 month';
  v_started_at timestamptz := timezone('utc', now());
  v_candidate record;
  v_deleted_id uuid;
  v_dependency_reasons text[];
  v_outcome text;
  v_reason text;
  v_scanned integer := 0;
  v_eligible integer := 0;
  v_deleted integer := 0;
  v_blocked integer := 0;
  v_conflict integer := 0;
  v_failed integer := 0;
begin
  if coalesce((select auth.role()), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Action retention is service-role only';
  end if;
  if p_batch_size < 1 or p_batch_size > 500 then
    raise exception 'Action retention batch size must be between 1 and 500';
  end if;
  if not p_dry_run and p_expected_action_ids is null then
    raise exception 'Physical retention requires the explicit dry-run action id list';
  end if;

  for v_candidate in
    select a.id, a.updated_at,
      greatest(a.updated_at, a.created_at) as last_activity_at
    from public.actions a
    where a.status = 'pending'
      and coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft', 'post_action_complete')
      and a.published_at is null
      and a.public_visibility_started_at is null
      and a.results_published_at is null
      and coalesce(a.review_state, 'not_required') not in ('pending_review', 'approved')
      and a.review_submitted_at is null
      and greatest(a.updated_at, a.created_at) < v_cutoff
      and not exists (
        select 1 from public.action_statistical_versions v
        where v.action_id = a.id
      )
      and (p_dry_run or a.id = any(p_expected_action_ids))
    order by greatest(a.updated_at, a.created_at), a.id
    limit p_batch_size
    for update of a skip locked
  loop
    v_scanned := v_scanned + 1;
    v_outcome := 'blocked';
    v_reason := 'eligibility_changed';
    begin
      if not exists (
        select 1 from public.actions a
        where a.id = v_candidate.id
          and a.status = 'pending'
          and coalesce(a.action_phase, 'post_action_complete') in ('pre_action', 'post_action_draft', 'post_action_complete')
          and a.published_at is null
          and a.public_visibility_started_at is null
          and a.results_published_at is null
          and coalesce(a.review_state, 'not_required') not in ('pending_review', 'approved')
          and a.review_submitted_at is null
          and greatest(a.updated_at, a.created_at) < v_cutoff
          and not exists (select 1 from public.action_statistical_versions v where v.action_id = a.id)
          and a.updated_at = v_candidate.updated_at
        for update
      ) then
        v_outcome := 'conflict';
        v_reason := 'eligibility_or_timestamp_changed';
        v_conflict := v_conflict + 1;
      else
        select coalesce(array_agg(d.reason order by d.reason), '{}'::text[])
          into v_dependency_reasons
        from public.action_retention_dependency_reasons(v_candidate.id) d;
        if coalesce(array_length(v_dependency_reasons, 1), 0) > 0 then
          v_outcome := 'blocked';
          v_reason := 'dependencies_present';
          v_blocked := v_blocked + 1;
        elsif p_dry_run then
          v_outcome := 'would_delete';
          v_reason := 'eligible_after_recheck';
          v_eligible := v_eligible + 1;
        else
          v_deleted_id := null;
          delete from public.actions a
          where a.id = v_candidate.id
            and a.updated_at = v_candidate.updated_at
            and a.status = 'pending'
            and a.published_at is null
            and a.public_visibility_started_at is null
            and a.results_published_at is null
            and coalesce(a.review_state, 'not_required') not in ('pending_review', 'approved')
            and a.review_submitted_at is null
          returning a.id into v_deleted_id;
          if v_deleted_id is null then
            v_outcome := 'conflict';
            v_reason := 'delete_timestamp_conflict';
            v_conflict := v_conflict + 1;
          else
            v_outcome := 'deleted';
            v_reason := 'eligible_and_dependency_free';
            v_eligible := v_eligible + 1;
            v_deleted := v_deleted + 1;
          end if;
        end if;
      end if;
    exception
      when foreign_key_violation then
        v_outcome := 'blocked';
        v_reason := 'foreign_key_race';
        v_blocked := v_blocked + 1;
      when others then
        v_outcome := 'failed';
        v_reason := 'row_processing_failed';
        v_failed := v_failed + 1;
    end;

    action_id := v_candidate.id;
    outcome := v_outcome;
    reason := v_reason;
    last_activity_at := v_candidate.last_activity_at;
    return next;
  end loop;

  insert into public.maintenance_action_retention_runs (
    started_at, completed_at, as_of, cutoff, dry_run, batch_size,
    scanned_count, eligible_count, deleted_count, blocked_count,
    conflict_count, failed_count, reason_counts, status
  ) values (
    v_started_at, timezone('utc', now()), p_as_of, v_cutoff, p_dry_run,
    p_batch_size, v_scanned, v_eligible, v_deleted, v_blocked, v_conflict,
    v_failed, jsonb_build_object(
      'would_delete', case when p_dry_run then v_eligible else 0 end,
      'deleted', v_deleted, 'blocked', v_blocked,
      'conflict', v_conflict, 'failed', v_failed
    ), 'completed'
  );
end;
$$;

revoke all on function public.purge_inactive_action_records(timestamptz, boolean, integer, uuid[])
  from public, anon, authenticated;
grant execute on function public.purge_inactive_action_records(timestamptz, boolean, integer, uuid[])
  to service_role;

comment on function public.purge_inactive_action_records(timestamptz, boolean, integer, uuid[]) is
  'Daily retention entry point. Dry-run first; physical deletion accepts only that explicit candidate id list and rechecks eligibility, activity and dependencies under row locks.';
