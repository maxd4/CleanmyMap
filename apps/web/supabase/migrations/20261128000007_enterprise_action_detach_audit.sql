-- Audited unlink of an action that its existing creator/organizer may manage.
-- PURPOSE: detach an organization/site association without deleting the Action.
-- CALLERS: authenticated server organization mutation route.
-- AUTHORIZATION_BOUNDARY: active organization role plus existing Action rights; service_role RPC only.
-- IDEMPOTENCY: exact request replay is recorded and returned by organization_audit_replay.
-- ATOMICITY: association, cascading campaign links and audit row change in one transaction.
-- FAILURE_BEHAVIOR: invalid scope, actor rights or request aborts without detaching.
-- SEARCH_PATH: pinned to public, pg_catalog.

create function public.organization_action_detach_enabled()
returns boolean
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select true
$$;

create function public.unlink_organization_action(
  p_org uuid,
  p_actor text,
  p_action uuid,
  p_site uuid,
  p_request uuid
)
returns void
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_role text;
  v_actor_site uuid;
  v_ref text;
  v_payload jsonb;
begin
  perform public.organization_lock_enabled(p_org);
  v_role := public.organization_actor_role(p_org, p_actor);
  if coalesce(v_role, '') not in ('owner', 'manager', 'site_manager') then
    raise exception using errcode = '42501', message = 'manager required';
  end if;

  select site_id into v_actor_site
  from public.organization_memberships
  where organization_id = p_org and clerk_user_id = p_actor and state = 'active';
  if v_role = 'site_manager' and p_site is distinct from v_actor_site then
    raise exception using errcode = '42501', message = 'site unavailable';
  end if;

  v_payload := jsonb_build_object('action', p_action, 'site', p_site);
  if public.organization_audit_replay(p_request, p_org, p_actor, 'unlink_action', v_payload) then
    return;
  end if;

  select o.organizer_ref into v_ref
  from public.organizations o
  where o.id = p_org;
  if not found then
    raise exception using errcode = '42501', message = 'organization unavailable';
  end if;

  perform 1
  from public.action_organizations l
  join public.actions a on a.id = l.action_id
  where l.organization_id = p_org
    and l.action_id = p_action
    and l.site_id is not distinct from p_site
    and a.organizer_type = 'company'
    and a.organizer_id = v_ref
    and a.cancelled_at is null
    and a.status not in ('rejected', 'cancelled')
    and a.moderation_visibility = 'visible'
    and coalesce(a.data_provenance, 'unknown') <> 'test'
    and (a.created_by_clerk_id = p_actor or exists (
      select 1 from public.action_organizers ao
      where ao.action_id = a.id and ao.organizer_clerk_id = p_actor
    ))
  for update of l, a;
  if not found then
    raise exception using errcode = '42501', message = 'action unavailable';
  end if;

  delete from public.action_organizations
  where organization_id = p_org and action_id = p_action and site_id is not distinct from p_site;

  insert into public.organization_audit(request_id, organization_id, actor_clerk_id, operation, payload)
  values (p_request, p_org, p_actor, 'unlink_action', v_payload);
end;
$$;

revoke all on function public.organization_action_detach_enabled() from public, anon, authenticated, service_role;
revoke all on function public.unlink_organization_action(uuid, text, uuid, uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.organization_action_detach_enabled() to service_role;
grant execute on function public.unlink_organization_action(uuid, text, uuid, uuid, uuid) to service_role;
