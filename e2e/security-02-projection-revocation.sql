-- SECURITY-02 real PostgreSQL contract.
-- Every application-role assertion runs under an independent SET ROLE state;
-- the CI workflow executes this contract on the ephemeral PostgreSQL instance.
-- The fixture is transaction-local and is never persisted.

begin;

do $$
begin
  if exists (
    select 1
    from public.profiles
    where id in ('security-02-stale-admin', 'security-02-stale-elu', 'security-02-stale-max')
  ) then
    raise exception 'SECURITY-02 fixture id already exists';
  end if;
end
$$;

set local role service_role;
insert into public.profiles (id, display_name, role_label, active_role_label, metadata)
values
  ('security-02-stale-admin', 'Security 02 stale admin', 'admin', 'admin', '{}'::jsonb),
  ('security-02-stale-elu', 'Security 02 stale elu', 'elu', 'elu', '{}'::jsonb),
  ('security-02-stale-max', 'Security 02 stale max', 'max', 'max', '{}'::jsonb);

do $$
declare
  v_conversation_id uuid;
  v_owner_id text;
begin
  select c.id, a.created_by_clerk_id
  into v_conversation_id, v_owner_id
  from public.action_conversations c
  join public.actions a on a.id = c.action_id
  where a.published_at is not null
    and coalesce(a.moderation_visibility, 'public') <> 'hidden'
  order by c.created_at
  limit 1;

  if v_conversation_id is null or v_owner_id is null then
    raise exception 'SECURITY-02 requires a published action conversation fixture';
  end if;

  perform set_config('security02.conversation_id', v_conversation_id::text, true);
  perform set_config('security02.owner_id', v_owner_id, true);
end
$$;

reset role;

do $$
begin
  if has_function_privilege('authenticated', 'public.current_profile_role_label()', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.current_profile_active_role()', 'EXECUTE')
  then
    raise exception 'SECURITY-02 authenticated role projection helpers remain executable';
  end if;
  if not has_function_privilege('service_role', 'public.current_profile_role_label()', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.current_profile_active_role()', 'EXECUTE')
  then
    raise exception 'SECURITY-02 server projection helpers are unavailable';
  end if;
end
$$;

-- A stale admin, elu, or max projection cannot open or mutate the global
-- admin_elu channel through a direct authenticated Supabase session.
do $$
declare
  v_user_id text;
  v_count bigint;
begin
  foreach v_user_id in array array['security-02-stale-admin', 'security-02-stale-elu', 'security-02-stale-max']
  loop
    set local role authenticated;
    perform set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_user_id)::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    perform set_config('request.jwt.claim.sub', v_user_id, true);

    select count(*) into v_count
    from public.app_messages
    where channel_type = 'admin_elu';
    if v_count <> 0 then
      raise exception 'SECURITY-02 stale % projection exposed admin_elu rows', v_user_id;
    end if;

    begin
      insert into public.app_messages (sender_id, channel_type, content)
      values (v_user_id, 'admin_elu', 'SECURITY-02 stale projection write');
      raise exception 'SECURITY-02 stale % projection inserted admin_elu message', v_user_id;
    exception when insufficient_privilege then
      null;
    end;

    reset role;
  end loop;
end
$$;

-- A valid Clerk-authorized server operation may use the technical service role;
-- this SQL proof only checks that the technical path exists, never that the
-- service role itself authenticates a user.
set local role service_role;
insert into public.app_messages (sender_id, channel_type, content)
values ('security-02-stale-admin', 'admin_elu', 'SECURITY-02 service path fixture');
reset role;

-- The legitimate action owner keeps the relation-based discussion contract.
set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'role', 'authenticated',
  'sub', current_setting('security02.owner_id', true)
)::text, true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', current_setting('security02.owner_id', true), true);

do $$
begin
  if not exists (
    select 1
    from public.action_conversations
    where id = current_setting('security02.conversation_id', true)::uuid
  ) then
    raise exception 'SECURITY-02 legitimate action owner lost relation-based discussion access';
  end if;
end
$$;

-- A different account, including one whose stale projection says admin, does
-- not inherit the action discussion capability.
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"security-02-stale-admin"}', true);
select set_config('request.jwt.claim.sub', 'security-02-stale-admin', true);
do $$
begin
  if exists (
    select 1
    from public.action_conversations
    where id = current_setting('security02.conversation_id', true)::uuid
  ) then
    raise exception 'SECURITY-02 stale admin projection exposed an unrelated action discussion';
  end if;
end
$$;

-- Anonymous, unauthenticated, and expired-session states fail closed as well.
reset role;
set local role anon;
do $$
begin
  if exists (select 1 from public.app_messages where channel_type = 'admin_elu') then
    raise exception 'SECURITY-02 anonymous session read admin_elu';
  end if;
exception when insufficient_privilege then
  null;
end
$$;

rollback;
