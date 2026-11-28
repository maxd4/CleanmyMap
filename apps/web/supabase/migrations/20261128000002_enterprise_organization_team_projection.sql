-- PURPOSE: expose a minimized team roster to active organization members.
-- CALLER: authenticated application routes through service_role only.
-- AUTHORIZATION_BOUNDARY: actor must have an active, non-suspended organization role.
-- IDEMPOTENCY: stable read projection; no writes.
-- ATOMICITY: single SQL statement.
-- FAILURE_BEHAVIOR: unavailable scope raises 42501; pending invitations are owner-only.
-- SEARCH_PATH: fixed to public, pg_temp.
-- GRANTS: service_role only; no direct browser execution.
create function public.read_organization_team_members(p_org uuid,p_actor text)
returns table(membership_id uuid,member_role text,state text,site_id uuid,is_self boolean,label text,expires_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_role text; v_site uuid;
begin
  v_role:=public.organization_actor_role(p_org,p_actor);
  if v_role is null then raise exception using errcode='42501',message='scope unavailable'; end if;
  select m.site_id into v_site from public.organization_memberships m
    where m.organization_id=p_org and m.clerk_user_id=p_actor and m.state='active';
  return query
    select m.id,m.member_role,m.state,m.site_id,(m.clerk_user_id=p_actor),
      coalesce(nullif(btrim(p.display_name),''),'Compte sans nom'),m.expires_at
    from public.organization_memberships m
    left join public.profiles p on p.id=m.clerk_user_id
    where m.organization_id=p_org
      and (m.state='active' or (v_role='owner' and m.state='pending' and m.expires_at>now()))
      and (v_role<>'site_manager' or m.site_id=v_site)
    order by m.state,m.member_role,m.id
    limit 101;
end $$;
revoke all on function public.read_organization_team_members(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.read_organization_team_members(uuid,text) to service_role;

-- PURPOSE: let an active member leave its own organization without weakening the last-owner invariant.
-- CALLER: authenticated application route through service_role only.
-- AUTHORIZATION_BOUNDARY: actor is derived from the Clerk session by the route; SQL verifies the active membership.
-- IDEMPOTENCY: exact request replay succeeds; conflicting request reuse fails.
-- ATOMICITY: membership revocation and audit row share one transaction.
-- FAILURE_BEHAVIOR: unavailable or suspended scope raises 42501; last active owner raises 22023.
-- SEARCH_PATH: fixed to public, pg_temp.
-- GRANTS: service_role only; no direct browser execution.
create function public.leave_organization(p_org uuid,p_actor text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_membership public.organization_memberships%rowtype; v_payload jsonb:='{}'::jsonb;
begin
  perform public.organization_lock_enabled(p_org);
  if public.organization_audit_replay(p_request,p_org,p_actor,'leave',v_payload) then return; end if;
  select * into v_membership from public.organization_memberships
    where organization_id=p_org and clerk_user_id=p_actor and state='active' for update;
  if not found then raise exception using errcode='42501',message='membership unavailable'; end if;
  if v_membership.member_role='owner' and
    (select count(*) from public.organization_memberships where organization_id=p_org and member_role='owner' and state='active')<=1
    then raise exception using errcode='22023',message='last owner'; end if;
  update public.organization_memberships set state='revoked',changed_at=now() where id=v_membership.id;
  insert into public.organization_audit(request_id,organization_id,actor_clerk_id,operation,payload)
    values(p_request,p_org,p_actor,'leave',v_payload);
end $$;
revoke all on function public.leave_organization(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.leave_organization(uuid,text,uuid) to service_role;

-- PURPOSE: provide the admin application with a bounded queue of accepted, not-yet-activated mandates.
-- CALLER: admin-only API validates the Clerk admin before invoking this service-role RPC.
-- AUTHORIZATION_BOUNDARY: SQL grant is service_role only; the API is the sole external caller.
-- IDEMPOTENCY: read-only projection; organizations already activated are omitted.
-- ATOMICITY: one bounded SQL statement.
-- FAILURE_BEHAVIOR: returns at most 101 rows so the API can signal a partial queue.
-- SEARCH_PATH: fixed to public, pg_temp.
-- GRANTS: service_role only; raw submitting Clerk IDs never reach the browser response.
create function public.list_organization_bootstrap_queue()
returns table(entry_id text,organization_name text,organization_type text,legal_identity text,submitted_by_clerk_id text)
language sql stable security definer set search_path=public,pg_temp as $$
  select e.id,p.organization_name,p.organization_type,p.legal_identity,p.submitted_by_user_id
    from public.partner_annuaire_entries e
    join public.partner_onboarding_requests p on p.id=e.source_request_id
   where e.publication_status='accepted'
     and p.status='accepted'
     and p.organization_type in ('entreprise','commerce')
     and not exists (select 1 from public.organizations o where o.partner_entry_id=e.id)
   order by e.reviewed_at desc nulls last,e.id
   limit 101
$$;
revoke all on function public.list_organization_bootstrap_queue() from public,anon,authenticated,service_role;
grant execute on function public.list_organization_bootstrap_queue() to service_role;
