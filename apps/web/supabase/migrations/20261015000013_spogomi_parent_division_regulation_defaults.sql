-- SPOGOMI: forward-only repair for parent division materialization.
-- 00012 made division regulation columns mandatory; this replaces the older
-- creation/recovery function so new inserts always satisfy that contract.

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
  v_is_mixed boolean;
begin
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
  v_is_mixed := p_mode = 'mixed';
  v_types := case when v_is_mixed then array['casual', 'world_cup'] else array[p_mode] end;
  foreach v_type in array v_types loop
    insert into public.spogomi_divisions (
      id, event_id, division_type, division_key,
      regulation_version, regulation_status, regulation_source_reference,
      regulation_config, team_size_config
    ) values (
      md5(p_event_id::text || ':' || v_type)::uuid, p_event_id, v_type, v_type,
      case when v_is_mixed then 'pending' else v_event.regulation_version end,
      case when v_is_mixed then 'incomplete' else v_event.regulation_status end,
      case when v_is_mixed then null else v_event.regulation_source_reference end,
      case when v_is_mixed then '{}'::jsonb else v_event.regulation_config end,
      case when v_is_mixed then '{}'::jsonb else v_event.team_size_config end
    ) on conflict (event_id, division_type) do nothing;
  end loop;
  perform public.spogomi_assert_parent_divisions(p_event_id);
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'type', division_type) order by division_type), '[]'::jsonb)
    into v_result from public.spogomi_divisions where event_id = p_event_id;
  return v_result;
end;
$$;

revoke all on function public.spogomi_ensure_parent_divisions(uuid, text) from public, anon, authenticated;
grant execute on function public.spogomi_ensure_parent_divisions(uuid, text) to service_role;

comment on function public.spogomi_ensure_parent_divisions(uuid, text) is
  'Idempotent parent division materialization with division-owned regulation defaults; simple editions inherit their historical parent rules, mixed editions start incomplete until each division is configured.';
