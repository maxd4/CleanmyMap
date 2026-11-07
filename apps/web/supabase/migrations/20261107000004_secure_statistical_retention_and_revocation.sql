-- PURPOSE: keep retention safe around derived Impact rows and revalidate the
--          current action boundary before exposing an immutable snapshot.
-- CALLER: retention maintenance and public collection reference RPCs.
-- AUTHORIZATION_BOUNDARY: retention remains service_role-only; reference RPCs
--                         keep their existing public/service boundaries.
-- IDEMPOTENCY: derived non-eligible Impact rows are reconciled by the action
--              delete trigger; visibility changes never create a new snapshot.
-- ATOMICITY: row locks, snapshot decisions and contribution cleanup remain in
--            the caller transaction.
-- FAILURE_BEHAVIOR: unresolved business dependencies still block deletion;
--                   concurrent activity returns conflict and is not removed.
-- SEARCH_PATH: every function fixes pg_catalog and public explicitly.
-- GRANTS: no new write capability is exposed to browser roles.

-- This predicate is the current-action half of the public Impact eligibility
-- contract. The immutable snapshot remains the sole source of quantities and
-- composition; this function only answers whether the action is currently
-- allowed to expose that already-published snapshot.
create or replace function public.is_current_public_action_statistical_eligible(
  p_status text,
  p_action_phase text,
  p_access_mode text,
  p_moderation_visibility text,
  p_review_state text,
  p_data_provenance text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p_status in ('approved', 'pending')
    and coalesce(p_action_phase, 'post_action_complete')
      in ('post_action_complete', 'post_action_draft')
    and coalesce(p_access_mode, 'public') = 'public'
    and coalesce(p_moderation_visibility, 'visible') = 'visible'
    and coalesce(p_review_state, 'not_required') <> 'rejected'
    and coalesce(p_data_provenance, 'unknown') <> 'test';
$$;

revoke all on function public.is_current_public_action_statistical_eligible(
  text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.is_current_public_action_statistical_eligible(
  text, text, text, text, text, text
) to public, anon, authenticated, service_role;

-- Eligibility metadata is not a calculation input. A hidden/private action can
-- therefore be rehabilitated without manufacturing a statistical revision;
-- the reference RPCs re-check the current action row below.
create or replace function public.capture_action_statistical_version()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_current public.action_statistical_versions%rowtype;
  v_version_number bigint;
  v_is_admissible boolean;
  v_same_payload boolean;
begin
  v_is_admissible := new.status = 'approved'
    and coalesce(new.action_phase, 'post_action_complete') = 'post_action_complete'
    and coalesce(new.access_mode, 'public') = 'public'
    and coalesce(new.moderation_visibility, 'visible') = 'visible'
    and coalesce(new.review_state, 'not_required') in ('not_required', 'approved')
    and new.published_at is not null
    and coalesce(new.data_provenance, 'unknown') <> 'test';

  if not v_is_admissible then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('cleanmymap.action-statistical-version:' || new.id::text, 0)
  );

  select * into v_current
  from public.action_statistical_versions
  where action_id = new.id and is_current
  for update;

  v_same_payload := found
    and (
      v_current.publication_kind = 'approved_published'
      or (
        v_current.publication_kind = 'legacy_approved_unpublished'
        and new.published_at is null
      )
    )
    and v_current.action_date is not distinct from new.action_date
    and v_current.location_label is not distinct from new.location_label
    and v_current.actor_name is not distinct from new.actor_name
    and v_current.organizer_type is not distinct from new.organizer_type
    and v_current.action_context is not distinct from new.action_context
    and v_current.department_code is not distinct from new.department_code
    and v_current.department_name is not distinct from new.department_name
    and v_current.waste_kg is not distinct from new.waste_kg
    and v_current.cigarette_butts is not distinct from new.cigarette_butts
    and v_current.volunteers_count is not distinct from new.volunteers_count
    and v_current.children_count is not distinct from new.children_count
    and v_current.adult_count is not distinct from new.adult_count
    and v_current.retired_count is not distinct from new.retired_count
    and v_current.duration_minutes is not distinct from new.duration_minutes
    and v_current.notes is not distinct from new.notes
    and v_current.preparation_data is not distinct from coalesce(new.preparation_data, '{}'::jsonb);

  if v_same_payload then
    return new;
  end if;

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
    department_code, department_name, actor_name, organizer_type,
    action_context, waste_kg, cigarette_butts, volunteers_count,
    children_count, adult_count, retired_count, duration_minutes, notes,
    preparation_data, is_current
  ) values (
    new.id, v_version_number, new.updated_at, new.review_decided_at,
    new.published_at, 'approved_published', new.status,
    coalesce(new.action_phase, 'post_action_complete'),
    coalesce(new.review_state, 'not_required'), coalesce(new.access_mode, 'public'),
    coalesce(new.moderation_visibility, 'visible'),
    coalesce(new.data_provenance, 'unknown'), new.action_date, new.location_label,
    new.department_code, new.department_name, new.actor_name,
    new.organizer_type, new.action_context, new.waste_kg,
    new.cigarette_butts, new.volunteers_count, new.children_count,
    new.adult_count, new.retired_count, new.duration_minutes, new.notes,
    coalesce(new.preparation_data, '{}'::jsonb), true
  );

  return new;
end;
$$;

revoke all on function public.capture_action_statistical_version()
  from public, anon, authenticated;
grant execute on function public.capture_action_statistical_version()
  to service_role;

-- Impact contributions for abandoned pending actions are derived, non-eligible
-- rows. Their BEFORE DELETE trigger removes the row and adjusts no aggregate
-- counters. Every other FK remains a blocking dependency, including all
-- business tables and any eligible Impact contribution.
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
        format('child.%I = (select parent.%I from public.actions parent where parent.id = $1)',
          v_key.child_column, v_key.parent_column);
    end loop;

    if v_fk.child_schema = 'public'
       and v_fk.child_table = 'public_impact_action_contributions' then
      execute format(
        'select exists (select 1 from %I.%I child where %s
          and (coalesce(child.eligible_non_temporal, false)
            or coalesce(child.eligible_temporal, false)))',
        v_fk.child_schema, v_fk.child_table, v_predicate
      ) into v_has_dependency using p_action_id;
      if not v_has_dependency then
        continue;
      end if;
    else
      execute format(
        'select exists (select 1 from %I.%I child where %s)',
        v_fk.child_schema, v_fk.child_table, v_predicate
      ) into v_has_dependency using p_action_id;
    end if;

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
grant execute on function public.action_retention_dependency_reasons(uuid)
  to service_role;

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
    join public.actions a on a.id = v.action_id
    where v.is_current
      and public.is_current_public_action_statistical_eligible(
        a.status, a.action_phase, a.access_mode,
        a.moderation_visibility, a.review_state, a.data_provenance
      )
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

create or replace function public.action_collection_context_reference_averages_v1(
  p_as_of_date date
)
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
security invoker
set search_path = public, pg_catalog
as $$
with bounded as (
  select least(coalesce(p_as_of_date, current_date), current_date) as as_of_date
), versions_at_date as (
  select distinct on (v.action_id) v.*
  from public.action_statistical_versions v
  cross join bounded b
  where timezone('utc', v.source_updated_at)::date <= b.as_of_date
  order by v.action_id, v.version_number desc
), eligible as (
  select
    v.action_context,
    v.waste_kg,
    v.cigarette_butts,
    case
      when v.action_context in ('citizen', 'company')
        then v.adult_count + 0.5 * v.children_count + 0.5 * v.retired_count
      when v.action_context = 'school'
        then v.adult_count + 0.45 * v.children_count
      else null
    end as waste_units,
    case
      when v.action_context in ('citizen', 'company')
        then v.adult_count + 0.5 * v.children_count + 0.5 * v.retired_count
      when v.action_context = 'school'
        then v.adult_count
      else null
    end as butts_units
  from versions_at_date v
  join public.actions a on a.id = v.action_id
  cross join bounded b
  where public.is_current_public_action_statistical_eligible(
      a.status, a.action_phase, a.access_mode,
      a.moderation_visibility, a.review_state, a.data_provenance
    )
    and public.is_action_statistical_version_admissible(
      v.status, v.action_phase, v.access_mode, v.moderation_visibility,
      v.review_state, v.action_date, v.data_provenance, v.publication_kind,
      b.as_of_date
    )
    and v.action_context is not null
    and v.children_count is not null
    and v.adult_count is not null
    and v.retired_count is not null
    and v.children_count + v.adult_count + v.retired_count = v.volunteers_count
    and (v.action_context <> 'school' or v.retired_count = 0)
), grouped as (
  select
    action_context,
    avg(waste_kg / nullif(waste_units, 0)) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    ) as waste_average,
    avg(cigarette_butts::numeric / nullif(butts_units, 0)) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    ) as butts_average,
    count(*) filter (
      where waste_kg is not null and waste_kg >= 0 and waste_units > 0
    )::integer as waste_count,
    count(*) filter (
      where cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0
    )::integer as butts_count,
    count(*) filter (
      where (waste_kg is not null and waste_kg >= 0 and waste_units > 0)
         or (cigarette_butts is not null and cigarette_butts >= 0 and butts_units > 0)
    )::integer as eligible_count
  from eligible
  group by action_context
)
select
  action_context,
  case when waste_count >= 2 then waste_average else null end,
  case when butts_count >= 2 then butts_average else null end,
  waste_count,
  butts_count,
  eligible_count,
  'contextual-effective-units-v1'::text,
  now()
from grouped
order by action_context;
$$;

revoke all on function public.action_collection_context_reference_averages_v1(date)
  from public, anon, authenticated;
grant execute on function public.action_collection_context_reference_averages_v1(date)
  to service_role;
