-- PURPOSE: action-scoped delegation to edit the existing pre/post-action form.
-- AUTHORIZATION: HTTP verifies the creator, primary organizer, or ACTIVE_ROLE admin/max.
-- ATOMICITY: grant/revoke, idempotency and before/after audit commit together.
-- DIRECT ACCESS: no browser-role table or RPC access; the server performs Clerk verification.

create table public.action_form_editors (
  action_id uuid not null references public.actions(id) on delete cascade,
  clerk_user_id text not null check (btrim(clerk_user_id) <> ''),
  granted_by_clerk_id text not null check (btrim(granted_by_clerk_id) <> ''),
  granted_at timestamptz not null default now(),
  primary key (action_id, clerk_user_id)
);

create table public.action_form_editor_audit (
  id bigint generated always as identity primary key,
  action_id uuid not null references public.actions(id) on delete cascade,
  request_id uuid not null,
  actor_clerk_id text not null,
  target_clerk_id text not null,
  operation text not null check (operation in ('grant', 'revoke')),
  before_granted boolean not null,
  after_granted boolean not null,
  created_at timestamptz not null default now(),
  unique (action_id, request_id)
);

alter table public.action_form_editors enable row level security;
alter table public.action_form_editor_audit enable row level security;
revoke all on public.action_form_editors, public.action_form_editor_audit from public, anon, authenticated, service_role;
grant select on public.action_form_editors to service_role;
grant select, insert on public.action_form_editor_audit to service_role;
grant usage, select on sequence public.action_form_editor_audit_id_seq to service_role;

create or replace function public.mutate_action_form_editor(
  p_action_id uuid,
  p_actor_clerk_id text,
  p_active_role text,
  p_target_clerk_id text,
  p_request_id uuid,
  p_operation text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_existing_actor text;
  v_existing_target text;
  v_existing_operation text;
  v_result jsonb;
  v_before boolean;
  v_after boolean;
  v_creator_clerk_id text;
begin
  if p_action_id is null or nullif(btrim(p_actor_clerk_id), '') is null
     or nullif(btrim(p_target_clerk_id), '') is null or p_request_id is null
     or p_operation is null or p_operation not in ('grant', 'revoke') then
    raise exception 'input_invalid' using errcode = '22023';
  end if;

  select created_by_clerk_id into v_creator_clerk_id
    from public.actions where id = p_action_id for update;
  if not found then raise exception 'action_not_found' using errcode = 'P0002'; end if;

  if coalesce(p_active_role, '') not in ('admin', 'max')
     and coalesce(v_creator_clerk_id, '') <> p_actor_clerk_id
     and not exists (
       select 1 from public.action_organizers
        where action_id = p_action_id and organizer_clerk_id = p_actor_clerk_id and is_primary
     ) then
    raise exception 'form_editor_management_forbidden' using errcode = '42501';
  end if;

  select actor_clerk_id, target_clerk_id, operation,
         jsonb_build_object('actionId', action_id, 'userId', target_clerk_id,
                            'granted', after_granted, 'alreadyProcessed', true)
    into v_existing_actor, v_existing_target, v_existing_operation, v_result
    from public.action_form_editor_audit
   where action_id = p_action_id and request_id = p_request_id;
  if found then
    if v_existing_actor <> p_actor_clerk_id or v_existing_target <> p_target_clerk_id
       or v_existing_operation <> p_operation then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return v_result;
  end if;

  select exists (select 1 from public.action_form_editors
                  where action_id = p_action_id and clerk_user_id = p_target_clerk_id)
    into v_before;
  if p_operation = 'grant' then
    insert into public.action_form_editors(action_id, clerk_user_id, granted_by_clerk_id)
    values (p_action_id, p_target_clerk_id, p_actor_clerk_id)
    on conflict (action_id, clerk_user_id) do nothing;
  else
    delete from public.action_form_editors
     where action_id = p_action_id and clerk_user_id = p_target_clerk_id;
  end if;
  select exists (select 1 from public.action_form_editors
                  where action_id = p_action_id and clerk_user_id = p_target_clerk_id)
    into v_after;

  insert into public.action_form_editor_audit(
    action_id, request_id, actor_clerk_id, target_clerk_id, operation,
    before_granted, after_granted
  ) values (
    p_action_id, p_request_id, p_actor_clerk_id, p_target_clerk_id, p_operation,
    v_before, v_after
  );
  return jsonb_build_object('actionId', p_action_id, 'userId', p_target_clerk_id,
                            'granted', v_after, 'alreadyProcessed', false);
end;
$$;

revoke all on function public.mutate_action_form_editor(uuid, text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.mutate_action_form_editor(uuid, text, text, text, uuid, text) to service_role;

-- Extend the existing version-2 restore entry point without changing its base
-- transaction or making older backups incompatible.
create or replace function public.restore_action_backup_with_form_editors(p_backup jsonb)
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

  if p_backup->'tables' ? 'action_form_editors' or p_backup->'tables' ? 'action_form_editor_audit' then
    if jsonb_typeof(p_backup->'tables'->'action_form_editors') is distinct from 'array'
       or jsonb_typeof(p_backup->'tables'->'action_form_editor_audit') is distinct from 'array' then
      raise exception 'Incomplete action form editor backup tables';
    end if;

    insert into public.action_form_editors(action_id, clerk_user_id, granted_by_clerk_id, granted_at)
    select r.action_id, r.clerk_user_id, r.granted_by_clerk_id, r.granted_at
    from jsonb_to_recordset(p_backup->'tables'->'action_form_editors') as r(
      action_id uuid, clerk_user_id text, granted_by_clerk_id text, granted_at timestamptz
    );

    insert into public.action_form_editor_audit(
      action_id, request_id, actor_clerk_id, target_clerk_id, operation,
      before_granted, after_granted, created_at
    )
    select r.action_id, r.request_id, r.actor_clerk_id, r.target_clerk_id,
      r.operation, r.before_granted, r.after_granted, r.created_at
    from jsonb_to_recordset(p_backup->'tables'->'action_form_editor_audit') as r(
      action_id uuid, request_id uuid, actor_clerk_id text,
      target_clerk_id text, operation text, before_granted boolean,
      after_granted boolean, created_at timestamptz
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.restore_action_backup_with_form_editors(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup_with_form_editors(jsonb) to service_role;

create or replace function public.restore_action_backup_with_collection_attribution(p_backup jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Forbidden';
  end if;
  return public.restore_action_backup_with_form_editors(p_backup);
end;
$$;

revoke all on function public.restore_action_backup_with_collection_attribution(jsonb) from public, anon, authenticated;
grant execute on function public.restore_action_backup_with_collection_attribution(jsonb) to service_role;
