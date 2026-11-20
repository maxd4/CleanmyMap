-- Collection qualification belongs to the canonical final participation row.
-- NULL on historical rows remains unknown; no presence is inferred as collection.
alter table public.actions
  add column if not exists collectors_count integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'actions_collectors_count_check'
      and conrelid = 'public.actions'::regclass
  ) then
    alter table public.actions
      add constraint actions_collectors_count_check
      check (collectors_count is null or (
        collectors_count between 0 and 500
        and (volunteers_count is null or collectors_count <= volunteers_count)
      ));
  end if;
end;
$$;

comment on column public.actions.collectors_count is
  'Known number of physically present people who collected; NULL means unknown. Independent of age, disability, and support needs.';

alter table public.action_participants
  add column if not exists collection_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'action_participants_collection_status_check'
      and conrelid = 'public.action_participants'::regclass
  ) then
    alter table public.action_participants
      add constraint action_participants_collection_status_check
      check (collection_status is null or collection_status in ('collected', 'not_collected'));
  end if;
end;
$$;

comment on column public.action_participants.collection_status is
  'Whether this confirmed participant personally collected: collected, not_collected, or NULL when unknown. Independent of age, disability, and support needs.';

create or replace function public.persist_action_participant_collection_status(
  p_action_id uuid,
  p_participant_id uuid,
  p_reviewer_user_id text,
  p_admin_override boolean,
  p_expected_participant_updated_at timestamptz,
  p_collection_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_action public.actions%rowtype;
  v_participant public.action_participants%rowtype;
  v_reviewer_active_role text;
  v_admin_override boolean := false;
  v_result jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_reviewer_user_id, '')), '') is null then
    return jsonb_build_object('ok', false, 'code', 'reviewer_missing');
  end if;
  if p_collection_status is not null and p_collection_status not in ('collected', 'not_collected') then
    return jsonb_build_object('ok', false, 'code', 'invalid_collection_status');
  end if;

  select * into v_action from public.actions where id = p_action_id for update;
  if not found or v_action.status <> 'approved' or v_action.action_phase is distinct from 'post_action_complete' then
    return jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible');
  end if;
  select * into v_participant from public.action_participants
   where action_id = p_action_id and id = p_participant_id for update;
  if not found or v_participant.participation_status <> 'confirmed' then
    return jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible');
  end if;
  perform 1 from public.action_organizers as ao
   where ao.action_id = p_action_id order by ao.organizer_clerk_id, ao.id for update;

  if coalesce(p_admin_override, false) then
    select p.active_role_label into v_reviewer_active_role
      from public.profiles as p where p.id = p_reviewer_user_id for update;
    v_admin_override := v_reviewer_active_role in ('admin', 'max');
  end if;
  if not (
    v_admin_override or v_action.created_by_clerk_id = p_reviewer_user_id or exists (
      select 1 from public.action_organizers as ao
       where ao.action_id = p_action_id and ao.organizer_clerk_id = p_reviewer_user_id
    )
  ) then
    return jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible');
  end if;
  if p_expected_participant_updated_at is null
     or v_participant.updated_at is distinct from p_expected_participant_updated_at then
    return jsonb_build_object('ok', false, 'code', 'revision_conflict', 'currentUpdatedAt', v_participant.updated_at);
  end if;
  if v_participant.collection_status is not distinct from p_collection_status then
    return jsonb_build_object('ok', true, 'changed', false, 'id', v_participant.id, 'updatedAt', v_participant.updated_at);
  end if;
  update public.action_participants as ap
     set collection_status = p_collection_status
   where ap.action_id = p_action_id and ap.id = p_participant_id
     and ap.participation_status = 'confirmed'
   returning jsonb_build_object('ok', true, 'changed', true, 'id', ap.id, 'updatedAt', ap.updated_at) into v_result;
  return coalesce(v_result, jsonb_build_object('ok', false, 'code', 'impact_target_not_eligible'));
end;
$$;

revoke all on function public.persist_action_participant_collection_status(uuid, uuid, text, boolean, timestamptz, text) from public, anon, authenticated;
grant execute on function public.persist_action_participant_collection_status(uuid, uuid, text, boolean, timestamptz, text) to service_role;

create or replace function public.action_collection_reference_averages_v2()
returns table (
  waste_per_collector numeric,
  butts_per_collector numeric,
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
  with eligible_actions as (
    select a.waste_kg, a.cigarette_butts, a.collectors_count::numeric as collectors_count
    from public.actions a
    where public.is_current_public_action_statistical_eligible(
      a.status, a.action_phase, a.access_mode,
      a.moderation_visibility, a.review_state, a.data_provenance
    )
      and a.collectors_count > 0
      and (
        (a.waste_kg is not null and a.waste_kg between 0 and 100000)
        or (a.cigarette_butts is not null and a.cigarette_butts between 0 and 5000000)
      )
  )
  select
    avg(waste_kg / collectors_count) filter (where waste_kg is not null and waste_kg between 0 and 100000),
    avg(cigarette_butts::numeric / collectors_count) filter (where cigarette_butts is not null and cigarette_butts between 0 and 5000000),
    count(*) filter (where waste_kg is not null and waste_kg between 0 and 100000)::integer,
    count(*) filter (where cigarette_butts is not null and cigarette_butts between 0 and 5000000)::integer,
    count(*)::integer,
    'action-collection-reference-averages-v2'::text,
    now()
  from eligible_actions;
$$;

revoke all on function public.action_collection_reference_averages_v2() from public;
grant execute on function public.action_collection_reference_averages_v2() to anon, authenticated;

-- Restore wrapper keeps the version-2 backup format and adds the new typed
-- attribution fields after the established transactional restore path.
create or replace function public.restore_action_backup_with_collection_attribution(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_result jsonb;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  v_result := public.restore_action_backup_with_individual_butts_lots(p_backup);

  update public.actions a
  set collectors_count = r.collectors_count
  from jsonb_to_recordset(p_backup->'tables'->'actions') as r(id uuid, collectors_count integer)
  where a.id = r.id;

  update public.action_participants ap
  set collection_status = r.collection_status
  from jsonb_to_recordset(p_backup->'tables'->'action_participants') as r(id uuid, collection_status text)
  where ap.id = r.id;

  return v_result;
end;
$$;

revoke all on function public.restore_action_backup_with_collection_attribution(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup_with_collection_attribution(jsonb) to service_role;
