-- SUPABASE-ADVISORY-HARDENING real PostgreSQL contract.
-- The CI lane executes this against the canonical ephemeral database. Every
-- fixture is transaction-local and the final ROLLBACK removes it.

begin;

do $$
declare
  v_options text[];
  v_columns text[];
  v_public_function_definer boolean;
  v_private_function_definer boolean;
  v_service_role oid;
  v_expected record;
  v_policy record;
  v_table text;
begin
  select c.reloptions
    into v_options
    from pg_class c
   where c.oid = 'public.public_profiles'::regclass;

  if not ('security_barrier=true' = any(coalesce(v_options, '{}'::text[]))
      and 'security_invoker=true' = any(coalesce(v_options, '{}'::text[]))) then
    raise exception 'SUPABASE-ADVISORY view options do not preserve barrier and invoker semantics';
  end if;

  select array_agg(column_name order by ordinal_position)
    into v_columns
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'public_profiles';
  if v_columns is distinct from array['id', 'display_name', 'handle', 'avatar_url']::text[] then
    raise exception 'SUPABASE-ADVISORY public_profiles columns changed: %', v_columns;
  end if;

  select p.prosecdef
    into v_public_function_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'current_profile_arrondissement'
     and p.pronargs = 0;
  select p.prosecdef
    into v_private_function_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and p.proname = 'current_profile_arrondissement'
     and p.pronargs = 0;
  if coalesce(v_public_function_definer, true) then
    raise exception 'SUPABASE-ADVISORY public.current_profile_arrondissement remains SECURITY DEFINER';
  end if;
  if not coalesce(v_private_function_definer, false) then
    raise exception 'SUPABASE-ADVISORY private.current_profile_arrondissement is not SECURITY DEFINER';
  end if;

  if has_schema_privilege('anon', 'private', 'USAGE')
    or not has_schema_privilege('authenticated', 'private', 'USAGE')
    or not has_schema_privilege('service_role', 'private', 'USAGE')
    or has_function_privilege('anon', 'private.current_profile_arrondissement()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'private.current_profile_arrondissement()', 'EXECUTE')
    or not has_function_privilege('service_role', 'private.current_profile_arrondissement()', 'EXECUTE')
    or has_function_privilege('anon', 'public.current_profile_arrondissement()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.current_profile_arrondissement()', 'EXECUTE')
    or not has_function_privilege('service_role', 'public.current_profile_arrondissement()', 'EXECUTE') then
    raise exception 'SUPABASE-ADVISORY current_profile_arrondissement function grants are incorrect';
  end if;

  if position('private.current_profile_arrondissement()' in pg_get_functiondef(
      'public.current_profile_arrondissement()'::regprocedure)) = 0 then
    raise exception 'SUPABASE-ADVISORY public facade does not delegate to private helper';
  end if;

  select oid into v_service_role from pg_roles where rolname = 'service_role';
  if v_service_role is null then
    raise exception 'SUPABASE-ADVISORY service_role is absent';
  end if;

  for v_expected in
    select * from (values
      ('spogomi_identity_assistance_requests_service_only', 'spogomi_identity_assistance_requests'),
      ('spogomi_identity_assistance_request_events_service_only', 'spogomi_identity_assistance_request_events'),
      ('spogomi_identity_assistance_invitations_service_only', 'spogomi_identity_assistance_invitations'),
      ('spogomi_team_join_requests_service_only', 'spogomi_team_join_requests'),
      ('spogomi_team_join_request_events_service_only', 'spogomi_team_join_request_events'),
      ('spogomi_events_service_write', 'spogomi_events'),
      ('spogomi_teams_service_write', 'spogomi_teams'),
      ('spogomi_result_items_service_write', 'spogomi_result_items'),
      ('spogomi_event_routes_service_write', 'spogomi_event_routes'),
      ('spogomi_team_access_grants_service_only', 'spogomi_team_access_grants'),
      ('spogomi_team_access_sessions_service_only', 'spogomi_team_access_sessions'),
      ('spogomi_result_audit_events_service_append', 'spogomi_result_audit_events'),
      ('spogomi_participants_service_only', 'spogomi_participants'),
      ('spogomi_category_rules_service_write', 'spogomi_category_rules'),
      ('spogomi_result_submissions_service_write', 'spogomi_result_submissions'),
      ('spogomi_result_reviews_service_append', 'spogomi_result_reviews'),
      ('spogomi_event_reviewers_service_only', 'spogomi_event_reviewers'),
      ('spogomi_divisions_service_write', 'spogomi_divisions')
    ) as expected(policy_name, table_name)
  loop
    select p.*
      into v_policy
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = v_expected.table_name
       and p.polname = v_expected.policy_name;
    if not found or v_policy.polroles <> array[v_service_role]::oid[] then
      raise exception 'SUPABASE-ADVISORY policy % on % is not service_role-only', v_expected.policy_name, v_expected.table_name;
    end if;
    if position('SELECT AUTH.ROLE()' in upper(coalesce(pg_get_expr(v_policy.polqual, v_policy.polrelid), '') || ' ' || coalesce(pg_get_expr(v_policy.polwithcheck, v_policy.polrelid), ''))) = 0 then
      raise exception 'SUPABASE-ADVISORY policy % on % is not initplan-wrapped', v_expected.policy_name, v_expected.table_name;
    end if;
  end loop;

  foreach v_table in array array[
    'spogomi_events', 'spogomi_teams', 'spogomi_divisions',
    'spogomi_category_rules', 'spogomi_event_routes',
    'spogomi_result_items', 'spogomi_result_submissions'
  ]
  loop
    if has_table_privilege('anon', 'public.' || v_table, 'INSERT')
      or has_table_privilege('anon', 'public.' || v_table, 'UPDATE')
      or has_table_privilege('anon', 'public.' || v_table, 'DELETE')
      or has_table_privilege('authenticated', 'public.' || v_table, 'INSERT')
      or has_table_privilege('authenticated', 'public.' || v_table, 'UPDATE')
      or has_table_privilege('authenticated', 'public.' || v_table, 'DELETE') then
      raise exception 'SUPABASE-ADVISORY client write privilege unexpectedly exists on %', v_table;
    end if;
  end loop;

end
$$;

set local role service_role;
insert into public.profiles (id, display_name, metadata)
values
  ('supabase-advisory-owner', 'Supabase advisory owner', '{"zoneName":"Paris 11"}'::jsonb),
  ('supabase-advisory-other', 'Supabase advisory other', '{"zoneName":"Paris 12"}'::jsonb);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"supabase-advisory-owner"}', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'supabase-advisory-owner', true);
do $$
declare
  v_arrondissement integer;
begin
  select public.current_profile_arrondissement() into v_arrondissement;
  if v_arrondissement <> 11 then
    raise exception 'SUPABASE-ADVISORY owner arrondissement fallback returned %', v_arrondissement;
  end if;
end
$$;

select set_config('request.jwt.claims', '{"role":"authenticated","sub":"supabase-advisory-other"}', true);
select set_config('request.jwt.claim.sub', 'supabase-advisory-other', true);
do $$
declare
  v_arrondissement integer;
begin
  select public.current_profile_arrondissement() into v_arrondissement;
  if v_arrondissement <> 12 then
    raise exception 'SUPABASE-ADVISORY JWT ownership lookup returned %', v_arrondissement;
  end if;
end
$$;
reset role;

rollback;
