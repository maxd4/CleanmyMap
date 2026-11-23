-- PURPOSE: private, optional teams over stable action attendance entry IDs.
-- CALLER: authenticated action manager through the existing attendance registry route and a service_role-only RPC.
-- AUTHORIZATION_BOUNDARY: route reuses creator/organizer/admin authorization; RLS denies direct browser access.
-- IDEMPOTENCY: action-scoped request IDs are recorded with the actor and operation.
-- ATOMICITY: action serialization, revision checks, membership/leader changes and audit commit in one transaction.
-- FAILURE_BEHAVIOR: stale affected-team revisions raise 40001; invalid/cross-action references fail before writes.
-- SEARCH_PATH: SECURITY DEFINER functions pin search_path to pg_catalog, public.
-- GRANTS: execute only for service_role; no public, anon or authenticated access.

alter table public.action_attendance_entries
  add constraint action_attendance_entries_action_id_id_unique unique (action_id, id);

create table public.action_attendance_teams (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null references public.actions(id) on delete cascade,
  name text not null,
  normalized_name text generated always as (
    lower(btrim(regexp_replace(normalize(name, NFC), '[[:space:]]+', ' ', 'g')))
  ) stored,
  leader_entry_id uuid null,
  revision integer not null default 1 check (revision > 0),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  constraint action_attendance_teams_action_id_id_unique unique (action_id, id),
  constraint action_attendance_teams_name_check check (
    name = btrim(regexp_replace(normalize(name, NFC), '[[:space:]]+', ' ', 'g'))
    and length(name) between 1 and 80
  ),
  constraint action_attendance_teams_action_name_unique unique (action_id, normalized_name),
  constraint action_attendance_teams_leader_same_action_fk
    foreign key (action_id, leader_entry_id)
    references public.action_attendance_entries(action_id, id)
);

create table public.action_attendance_team_members (
  action_id uuid not null,
  entry_id uuid not null,
  team_id uuid not null,
  revision integer not null default 1 check (revision > 0),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  primary key (action_id, entry_id),
  constraint action_attendance_team_members_entry_unique unique (entry_id),
  constraint action_attendance_team_members_entry_same_action_fk
    foreign key (action_id, entry_id)
    references public.action_attendance_entries(action_id, id) on delete cascade,
  constraint action_attendance_team_members_team_same_action_fk
    foreign key (action_id, team_id)
    references public.action_attendance_teams(action_id, id) on delete cascade
);

create index action_attendance_team_members_action_team_idx
  on public.action_attendance_team_members(action_id, team_id, entry_id);

create table public.action_attendance_team_audit (
  id bigint generated always as identity primary key,
  action_id uuid not null references public.actions(id) on delete cascade,
  team_id uuid null,
  actor_id text not null,
  request_id uuid not null,
  operation text not null check (operation in ('team_create', 'team_rename', 'team_delete', 'member_assign', 'leader_set', 'member_removed_with_entry')),
  before_value jsonb null,
  after_value jsonb not null,
  created_at timestamptz not null default now(),
  unique (action_id, request_id)
);

alter table public.action_attendance_teams enable row level security;
alter table public.action_attendance_team_members enable row level security;
alter table public.action_attendance_team_audit enable row level security;
revoke all on public.action_attendance_teams, public.action_attendance_team_members, public.action_attendance_team_audit from public, anon, authenticated, service_role;
grant select on public.action_attendance_teams, public.action_attendance_team_members, public.action_attendance_team_audit to service_role;

create or replace function public.action_attendance_team_snapshot(p_action_id uuid, p_team_ids uuid[])
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'team', to_jsonb(t),
      'member_entry_ids', coalesce((
        select jsonb_agg(m.entry_id order by m.created_at, m.entry_id)
        from public.action_attendance_team_members m
        where m.action_id = t.action_id and m.team_id = t.id
      ), '[]'::jsonb)
    ) order by t.created_at, t.id
  ), '[]'::jsonb)
  from public.action_attendance_teams t
  where t.action_id = p_action_id and t.id = any(coalesce(p_team_ids, '{}'::uuid[]));
$$;

create or replace function public.mutate_action_attendance_team(
  p_action_id uuid,
  p_actor_clerk_id text,
  p_request_id uuid,
  p_operation text,
  p_team_id uuid default null,
  p_entry_id uuid default null,
  p_target_team_id uuid default null,
  p_expected_revisions jsonb default '[]'::jsonb,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action_id uuid;
  v_existing_actor text;
  v_existing_operation text;
  v_result jsonb;
  v_before jsonb;
  v_after jsonb;
  v_entry_action_id uuid;
  v_entry_deleted_at timestamptz;
  v_source_team_id uuid;
  v_target_team_id uuid;
  v_team_ids uuid[] := '{}'::uuid[];
  v_team_name text;
  v_leader_entry_id uuid;
  v_team record;
begin
  if p_actor_clerk_id is null or btrim(p_actor_clerk_id) = '' or p_request_id is null
     or p_operation is null or p_operation not in ('team_create', 'team_rename', 'team_delete', 'member_assign', 'leader_set')
     or jsonb_typeof(coalesce(p_expected_revisions, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) <> 'object' then
    raise exception 'input_invalid' using errcode = '22023';
  end if;

  select a.id into v_action_id from public.actions a where a.id = p_action_id for update;
  if not found then raise exception 'action_not_found' using errcode = 'P0002'; end if;

  select after_value, actor_id, operation into v_result, v_existing_actor, v_existing_operation
  from public.action_attendance_team_audit where action_id = p_action_id and request_id = p_request_id;
  if found then
    if v_existing_actor <> p_actor_clerk_id or v_existing_operation <> p_operation then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return v_result;
  end if;

  if p_operation = 'team_create' then
    v_team_name := btrim(regexp_replace(normalize(coalesce(p_payload->>'name', ''), NFC), '[[:space:]]+', ' ', 'g'));
    if length(v_team_name) not between 1 and 80 then raise exception 'team_name_invalid' using errcode = '22023'; end if;
    insert into public.action_attendance_teams(action_id, name, created_by, updated_by)
    values (p_action_id, v_team_name, p_actor_clerk_id, p_actor_clerk_id)
    returning id into p_team_id;
    v_team_ids := array[p_team_id];
  else
    if p_operation in ('team_rename', 'team_delete', 'leader_set') then
      if p_team_id is null then raise exception 'team_not_found' using errcode = 'P0002'; end if;
      v_team_ids := array[p_team_id];
    elsif p_operation = 'member_assign' then
      if p_entry_id is null then raise exception 'entry_not_found' using errcode = 'P0002'; end if;
      select e.action_id, e.deleted_at into v_entry_action_id, v_entry_deleted_at
      from public.action_attendance_entries e where e.action_id = p_action_id and e.id = p_entry_id for update;
      if not found or v_entry_deleted_at is not null then raise exception 'entry_not_found' using errcode = 'P0002'; end if;
      select m.team_id into v_source_team_id from public.action_attendance_team_members m
      where m.action_id = p_action_id and m.entry_id = p_entry_id for update;
      v_target_team_id := p_target_team_id;
      if v_target_team_id is not null and not exists (
        select 1 from public.action_attendance_teams t where t.action_id = p_action_id and t.id = v_target_team_id
      ) then raise exception 'team_not_found' using errcode = 'P0002'; end if;
      v_team_ids := array_remove(array[v_source_team_id, v_target_team_id], null);
    end if;

    for v_team in
      select t.id, t.revision from public.action_attendance_teams t
      where t.action_id = p_action_id and t.id = any(v_team_ids)
      order by t.id for update
    loop
      if not exists (
        select 1 from jsonb_array_elements(p_expected_revisions) as revision_item(value)
        where revision_item.value->>'teamId' = v_team.id::text
          and revision_item.value->>'revision' ~ '^[0-9]+$'
          and (revision_item.value->>'revision')::integer = v_team.revision
      ) then raise exception 'revision_conflict' using errcode = '40001'; end if;
    end loop;

    if p_operation in ('team_rename', 'team_delete', 'leader_set')
       and not exists (select 1 from public.action_attendance_teams t where t.action_id = p_action_id and t.id = p_team_id) then
      raise exception 'team_not_found' using errcode = 'P0002';
    end if;
  end if;

  v_before := case when p_operation = 'team_create' then '[]'::jsonb
    else public.action_attendance_team_snapshot(p_action_id, v_team_ids) end;

  if p_operation = 'team_create' then
    null;
  elsif p_operation = 'team_rename' then
    v_team_name := btrim(regexp_replace(normalize(coalesce(p_payload->>'name', ''), NFC), '[[:space:]]+', ' ', 'g'));
    if length(v_team_name) not between 1 and 80 then raise exception 'team_name_invalid' using errcode = '22023'; end if;
    update public.action_attendance_teams set name = v_team_name, revision = revision + 1, updated_by = p_actor_clerk_id, updated_at = now()
    where action_id = p_action_id and id = p_team_id;
  elsif p_operation = 'team_delete' then
    delete from public.action_attendance_teams where action_id = p_action_id and id = p_team_id;
  elsif p_operation = 'leader_set' then
    v_leader_entry_id := nullif(p_payload->>'leaderEntryId', '')::uuid;
    if v_leader_entry_id is not null and not exists (
      select 1 from public.action_attendance_team_members m
      join public.action_attendance_entries e on e.action_id = m.action_id and e.id = m.entry_id
      where m.action_id = p_action_id and m.team_id = p_team_id and m.entry_id = v_leader_entry_id and e.deleted_at is null
    ) then raise exception 'leader_not_member' using errcode = '22023'; end if;
    update public.action_attendance_teams set leader_entry_id = v_leader_entry_id, revision = revision + 1, updated_by = p_actor_clerk_id, updated_at = now()
    where action_id = p_action_id and id = p_team_id and leader_entry_id is distinct from v_leader_entry_id;
  elsif p_operation = 'member_assign' then
    if v_source_team_id is distinct from v_target_team_id then
      if v_source_team_id is not null then
        update public.action_attendance_teams set
          leader_entry_id = case when leader_entry_id = p_entry_id then null else leader_entry_id end,
          revision = revision + 1, updated_by = p_actor_clerk_id, updated_at = now()
        where action_id = p_action_id and id = v_source_team_id;
        delete from public.action_attendance_team_members where action_id = p_action_id and entry_id = p_entry_id;
      end if;
      if v_target_team_id is not null then
        insert into public.action_attendance_team_members(action_id, entry_id, team_id, created_by, updated_by)
        values (p_action_id, p_entry_id, v_target_team_id, p_actor_clerk_id, p_actor_clerk_id);
        update public.action_attendance_teams set revision = revision + 1, updated_by = p_actor_clerk_id, updated_at = now()
        where action_id = p_action_id and id = v_target_team_id;
      end if;
    end if;
  end if;

  v_after := public.action_attendance_team_snapshot(p_action_id, v_team_ids);
  v_result := jsonb_build_object('actionId', p_action_id, 'teams', v_after, 'alreadyProcessed', false);
  insert into public.action_attendance_team_audit(action_id, team_id, actor_id, request_id, operation, before_value, after_value)
  values (p_action_id, p_team_id, p_actor_clerk_id, p_request_id, p_operation, v_before, v_result);
  return v_result;
end;
$$;

create or replace function public.detach_deleted_action_attendance_team_member()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_team_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_actor_id text := coalesce(nullif(btrim(new.updated_by), ''), 'system:attendance-entry-deleted');
begin
  if old.deleted_at is null and new.deleted_at is not null then
    select m.team_id into v_team_id from public.action_attendance_team_members m
    where m.action_id = new.action_id and m.entry_id = new.id;
    if v_team_id is not null then
      v_before := public.action_attendance_team_snapshot(new.action_id, array[v_team_id]);
      delete from public.action_attendance_team_members where action_id = new.action_id and entry_id = new.id;
      update public.action_attendance_teams set leader_entry_id = null, revision = revision + 1,
        updated_by = v_actor_id, updated_at = now()
      where action_id = new.action_id and id = v_team_id;
      v_after := public.action_attendance_team_snapshot(new.action_id, array[v_team_id]);
      insert into public.action_attendance_team_audit(action_id, team_id, actor_id, request_id, operation, before_value, after_value)
      values (new.action_id, v_team_id, v_actor_id, gen_random_uuid(), 'member_removed_with_entry', v_before, v_after);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists action_attendance_team_member_entry_delete on public.action_attendance_entries;
create trigger action_attendance_team_member_entry_delete
after update of deleted_at on public.action_attendance_entries
for each row execute function public.detach_deleted_action_attendance_team_member();

revoke all on function public.action_attendance_team_snapshot(uuid, uuid[]) from public, anon, authenticated, service_role;
revoke all on function public.mutate_action_attendance_team(uuid, text, uuid, text, uuid, uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.detach_deleted_action_attendance_team_member() from public, anon, authenticated, service_role;
grant execute on function public.mutate_action_attendance_team(uuid, text, uuid, text, uuid, uuid, uuid, jsonb, jsonb) to service_role;
