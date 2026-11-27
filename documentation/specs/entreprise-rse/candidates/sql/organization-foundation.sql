-- CANDIDATE only. Allocate next migration version after linked preflight.
-- Identity: existing accepted partner entry plus explicitly verified organizer reference.
-- HTTP AuthN/AuthZ: service_role only; actor comes from Clerk, never client JSON.
-- All organization writes serialize on the organization row. No browser table grants.
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  partner_entry_id text not null unique references public.partner_annuaire_entries(id) on delete restrict,
  organizer_ref text not null unique check (length(btrim(organizer_ref)) between 1 and 255),
  verified_by_clerk_id text not null check (length(btrim(verified_by_clerk_id)) between 1 and 255),
  verified_at timestamptz not null default now(),
  disabled_at timestamptz
);
create table public.organization_sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  unique (organization_id, id)
);
create unique index organization_sites_active_name_unique
  on public.organization_sites (organization_id, lower(btrim(name))) where archived_at is null;
create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  clerk_user_id text not null check (length(btrim(clerk_user_id)) between 1 and 255),
  member_role text not null check (member_role in ('owner','manager','site_manager','member')),
  site_id uuid,
  state text not null check (state in ('pending','active','declined','revoked')),
  invited_at timestamptz not null default now(),
  expires_at timestamptz,
  changed_at timestamptz not null default now(),
  unique (organization_id, clerk_user_id),
  foreign key (organization_id, site_id) references public.organization_sites(organization_id,id) on delete restrict,
  check ((member_role = 'site_manager') = (site_id is not null)),
  check (state <> 'pending' or (expires_at is not null and member_role <> 'owner'))
);
create index organization_memberships_actor_idx on public.organization_memberships(clerk_user_id, state, organization_id);
create table public.action_organizations (
  action_id uuid primary key references public.actions(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  site_id uuid,
  linked_by_clerk_id text not null,
  linked_at timestamptz not null default now(),
  unique (organization_id, action_id),
  foreign key (organization_id, site_id) references public.organization_sites(organization_id,id) on delete restrict
);
create index action_organizations_scope_idx on public.action_organizations(organization_id, site_id, action_id);
create table public.organization_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 120),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  target_actions integer check (target_actions between 1 and 10000),
  state text not null default 'draft' check (state in ('draft','active','completed','archived')),
  unique (organization_id,id)
);
create table public.organization_campaign_actions (
  organization_id uuid not null,
  campaign_id uuid not null,
  action_id uuid not null,
  primary key (campaign_id, action_id),
  foreign key (organization_id,campaign_id) references public.organization_campaigns(organization_id,id) on delete restrict,
  foreign key (organization_id,action_id) references public.action_organizations(organization_id,action_id) on delete cascade
);
create index organization_campaign_actions_action_idx on public.organization_campaign_actions(action_id);
create table public.organization_audit (
  request_id uuid primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_clerk_id text not null,
  operation text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now()
);
create index organization_audit_org_idx on public.organization_audit(organization_id,occurred_at desc);

do $$
declare t text;
begin
  foreach t in array array['organizations','organization_sites','organization_memberships','action_organizations','organization_campaigns','organization_campaign_actions','organization_audit']
  loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on table public.%I from public, anon, authenticated, service_role',t);
  end loop;
end $$;

-- Helper not exposed even to service_role. It is called inside definer functions.
create function public.organization_actor_role(p_org uuid,p_actor text)
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select m.member_role
    from public.organization_memberships m
    join public.organizations o on o.id=m.organization_id
    join public.partner_annuaire_entries e on e.id=o.partner_entry_id
    join public.partner_onboarding_requests p on p.id=e.source_request_id
   where m.organization_id=p_org and m.clerk_user_id=p_actor and m.state='active'
     and o.disabled_at is null and e.publication_status='accepted' and p.status='accepted'
     and p.organization_type in ('entreprise','commerce')
     and (m.site_id is null or exists (
       select 1 from public.organization_sites s where s.organization_id=p_org and s.id=m.site_id and s.archived_at is null
     ))
$$;
revoke all on function public.organization_actor_role(uuid,text) from public,anon,authenticated,service_role;

-- Lock and check accepted evidence. Revoking the source suspends organization access.
create function public.organization_lock_enabled(p_org uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  perform 1 from public.organizations o
    join public.partner_annuaire_entries e on e.id=o.partner_entry_id
    join public.partner_onboarding_requests p on p.id=e.source_request_id
    where o.id=p_org and o.disabled_at is null and e.publication_status='accepted' and p.status='accepted'
      and p.organization_type in ('entreprise','commerce') for update of o for share of e,p;
  if not found then raise exception using errcode='42501',message='organization unavailable'; end if;
end $$;
revoke all on function public.organization_lock_enabled(uuid) from public,anon,authenticated,service_role;

-- Call after checking actor permission. Exact replay returns true, conflicting request ID fails.
create function public.organization_audit_replay(p_request uuid,p_org uuid,p_actor text,p_operation text,p_payload jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare previous public.organization_audit%rowtype;
begin
  select * into previous from public.organization_audit where request_id=p_request;
  if found then
    if previous.organization_id=p_org and previous.actor_clerk_id=p_actor and previous.operation=p_operation and previous.payload=p_payload then return true; end if;
    raise exception using errcode='22023',message='request conflict';
  end if;
  return false;
end $$;
revoke all on function public.organization_audit_replay(uuid,uuid,text,text,jsonb) from public,anon,authenticated,service_role;

-- Bootstrap is admin-only at HTTP boundary. Verify mandate manually before calling.
-- The initial owner must be the verified submitting Clerk account; an accepted directory entry alone does not call this RPC.
create function public.bootstrap_organization(p_entry text,p_ref text,p_actor text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_owner text; v_org uuid; v_existing_ref text;
begin
  if nullif(btrim(p_actor),'') is null or nullif(btrim(p_ref),'') is null then raise exception using errcode='22023',message='invalid input'; end if;
  select p.submitted_by_user_id into v_owner
    from public.partner_annuaire_entries e join public.partner_onboarding_requests p on p.id=e.source_request_id
    where e.id=p_entry and e.publication_status='accepted' and p.status='accepted' and p.organization_type in ('entreprise','commerce') for update of e,p;
  if not found then raise exception using errcode='42501',message='verified mandate required'; end if;
  select o.id,o.organizer_ref into v_org,v_existing_ref from public.organizations o where o.partner_entry_id=p_entry;
  if found then
    if v_existing_ref<>p_ref then raise exception using errcode='22023',message='identity conflict'; end if;
    return v_org;
  end if;
  insert into public.organizations(partner_entry_id,organizer_ref,verified_by_clerk_id)
    values(p_entry,p_ref,p_actor) returning id into v_org;
  insert into public.organization_memberships(organization_id,clerk_user_id,member_role,state)
    values(v_org,v_owner,'owner','active');
  insert into public.organization_audit(request_id,organization_id,actor_clerk_id,operation,payload)
    values(p_request,v_org,p_actor,'bootstrap',jsonb_build_object('entry',p_entry,'ref',p_ref));
  return v_org;
end $$;

create function public.mutate_organization_membership(
  p_org uuid,p_actor text,p_operation text,p_membership uuid,p_target text,p_role text,p_site uuid,p_request uuid
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor_role text; v_target public.organization_memberships%rowtype; v_payload jsonb;
begin
  perform public.organization_lock_enabled(p_org);
  v_actor_role:=public.organization_actor_role(p_org,p_actor);
  v_payload:=jsonb_build_object('membership',p_membership,'target',p_target,'role',p_role,'site',p_site);
  if p_operation in ('accept','decline') then
    select * into v_target from public.organization_memberships where id=p_membership and organization_id=p_org and clerk_user_id=p_actor;
    if not found then raise exception using errcode='42501',message='invitation unavailable'; end if;
    if public.organization_audit_replay(p_request,p_org,p_actor,p_operation,v_payload) then return; end if;
    if v_target.state<>'pending' or v_target.expires_at<=now() or
       (v_target.site_id is not null and not exists(select 1 from public.organization_sites where organization_id=p_org and id=v_target.site_id and archived_at is null)) then
      raise exception using errcode='42501',message='invitation unavailable';
    end if;
    update public.organization_memberships set state=case when p_operation='accept' then 'active' else 'declined' end,changed_at=now()
      where id=v_target.id;
  else
    if v_actor_role is distinct from 'owner' then raise exception using errcode='42501',message='owner required'; end if;
    if public.organization_audit_replay(p_request,p_org,p_actor,p_operation,v_payload) then return; end if;
    if p_operation='invite' then
      if p_target is null or p_target=p_actor or p_role is null or p_role not in ('manager','site_manager','member') or
         ((p_role='site_manager')<>(p_site is not null)) then raise exception using errcode='22023',message='invalid invitation'; end if;
      if p_site is not null and not exists(select 1 from public.organization_sites where organization_id=p_org and id=p_site and archived_at is null)
        then raise exception using errcode='22023',message='invalid site'; end if;
      insert into public.organization_memberships(organization_id,clerk_user_id,member_role,site_id,state,expires_at)
        values(p_org,p_target,p_role,p_site,'pending',now()+interval '14 days')
        on conflict (organization_id,clerk_user_id) do update set member_role=excluded.member_role,site_id=excluded.site_id,state='pending',invited_at=now(),expires_at=excluded.expires_at,changed_at=now()
          where organization_memberships.state='revoked' or (organization_memberships.state='pending' and organization_memberships.expires_at<=now());
      if not found then raise exception using errcode='22023',message='membership already exists'; end if;
    elsif p_operation in ('revoke','promote_owner') then
      select * into v_target from public.organization_memberships where id=p_membership and organization_id=p_org;
      if not found or v_target.state not in ('active','pending') then raise exception using errcode='42501',message='membership unavailable'; end if;
      if p_operation='promote_owner' then
        if v_target.state<>'active' or v_target.member_role<>'manager' then raise exception using errcode='22023',message='active manager required'; end if;
        update public.organization_memberships set member_role='owner',site_id=null,changed_at=now() where id=v_target.id;
      else
        if v_target.member_role='owner' and v_target.state='active' and
          (select count(*) from public.organization_memberships where organization_id=p_org and member_role='owner' and state='active')<=1
          then raise exception using errcode='22023',message='last owner'; end if;
        update public.organization_memberships set state='revoked',changed_at=now() where id=v_target.id;
      end if;
    else raise exception using errcode='22023',message='invalid operation'; end if;
  end if;
  insert into public.organization_audit(request_id,organization_id,actor_clerk_id,operation,payload)
    values(p_request,p_org,p_actor,p_operation,v_payload);
end $$;

create function public.mutate_organization_site(p_org uuid,p_actor text,p_site uuid,p_name text,p_archive boolean,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_site uuid; v_payload jsonb;
begin
  perform public.organization_lock_enabled(p_org);
  if coalesce(public.organization_actor_role(p_org,p_actor),'') not in ('owner','manager') then raise exception using errcode='42501',message='manager required'; end if;
  v_site:=coalesce(p_site,p_request); -- stable ID for create retry
  v_payload:=jsonb_build_object('site',v_site,'name',p_name,'archive',p_archive);
  if public.organization_audit_replay(p_request,p_org,p_actor,'site',v_payload) then return v_site; end if;
  if p_site is null and not p_archive then
    insert into public.organization_sites(id,organization_id,name) values(v_site,p_org,btrim(p_name));
  elsif p_archive then
    if exists(select 1 from public.organization_memberships where organization_id=p_org and site_id=v_site and state in ('pending','active'))
      then raise exception using errcode='22023',message='remove site membership first'; end if;
    update public.organization_sites set archived_at=now() where id=v_site and organization_id=p_org and archived_at is null;
    if not found then raise exception using errcode='42501',message='site unavailable'; end if;
  else
    update public.organization_sites set name=btrim(p_name) where id=v_site and organization_id=p_org and archived_at is null;
    if not found then raise exception using errcode='42501',message='site unavailable'; end if;
  end if;
  insert into public.organization_audit(request_id,organization_id,actor_clerk_id,operation,payload)
    values(p_request,p_org,p_actor,'site',v_payload);
  return v_site;
end $$;

-- Explicit action association. Membership is not a right to edit the action.
-- Only an existing creator/organizer may associate an action carrying the exact verified organizer reference.
create function public.link_organization_action(p_org uuid,p_actor text,p_action uuid,p_site uuid,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_actor_site uuid; v_payload jsonb; v_ref text; v_link public.action_organizations%rowtype;
begin
  perform public.organization_lock_enabled(p_org);
  v_role:=public.organization_actor_role(p_org,p_actor);
  if coalesce(v_role,'') not in ('owner','manager','site_manager') then raise exception using errcode='42501',message='manager required'; end if;
  select site_id into v_actor_site from public.organization_memberships where organization_id=p_org and clerk_user_id=p_actor;
  if v_role='site_manager' and p_site is distinct from v_actor_site then raise exception using errcode='42501',message='site unavailable'; end if;
  if p_site is not null and not exists(select 1 from public.organization_sites where organization_id=p_org and id=p_site and archived_at is null)
    then raise exception using errcode='42501',message='site unavailable'; end if;
  select organizer_ref into v_ref from public.organizations where id=p_org;
  perform 1 from public.actions a where a.id=p_action and a.organizer_type='company' and a.organizer_id=v_ref
    and a.cancelled_at is null and a.status not in ('rejected','cancelled') and a.moderation_visibility='visible'
    and coalesce(a.data_provenance,'unknown') <> 'test'
    and (a.created_by_clerk_id=p_actor or exists(select 1 from public.action_organizers ao where ao.action_id=a.id and ao.organizer_clerk_id=p_actor))
    for update of a;
  if not found then raise exception using errcode='42501',message='action unavailable'; end if;
  v_payload:=jsonb_build_object('action',p_action,'site',p_site);
  if public.organization_audit_replay(p_request,p_org,p_actor,'link_action',v_payload) then return; end if;
  insert into public.action_organizations(action_id,organization_id,site_id,linked_by_clerk_id) values(p_action,p_org,p_site,p_actor)
    on conflict(action_id) do nothing;
  select * into v_link from public.action_organizations where action_id=p_action;
  if v_link.organization_id<>p_org or v_link.site_id is distinct from p_site then raise exception using errcode='42501',message='action unavailable'; end if;
  insert into public.organization_audit(request_id,organization_id,actor_clerk_id,operation,payload)
    values(p_request,p_org,p_actor,'link_action',v_payload);
end $$;

create function public.mutate_organization_campaign(p_org uuid,p_actor text,p_campaign uuid,p_title text,p_start date,p_end date,p_target integer,p_state text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_state text; v_payload jsonb;
begin
  perform public.organization_lock_enabled(p_org);
  if coalesce(public.organization_actor_role(p_org,p_actor),'') not in ('owner','manager') then raise exception using errcode='42501',message='manager required'; end if;
  v_id:=coalesce(p_campaign,p_request);
  v_payload:=jsonb_build_object('campaign',v_id,'title',p_title,'start',p_start,'end',p_end,'target',p_target,'state',p_state);
  if public.organization_audit_replay(p_request,p_org,p_actor,'campaign',v_payload) then return v_id; end if;
  if p_campaign is null then
    if p_state is distinct from 'draft' then raise exception using errcode='22023',message='draft required'; end if;
    insert into public.organization_campaigns(id,organization_id,title,starts_on,ends_on,target_actions)
      values(v_id,p_org,btrim(p_title),p_start,p_end,p_target);
  else
    select state into v_state from public.organization_campaigns where id=v_id and organization_id=p_org;
    if not found then raise exception using errcode='42501',message='campaign unavailable'; end if;
    if not ((v_state='draft' and p_state in ('draft','active','archived')) or (v_state='active' and p_state in ('active','completed')) or (v_state='completed' and p_state='archived'))
      then raise exception using errcode='22023',message='invalid transition'; end if;
    update public.organization_campaigns set title=case when v_state in ('draft','active') then btrim(p_title) else title end,
      starts_on=case when v_state='draft' then p_start else starts_on end,ends_on=case when v_state='draft' then p_end else ends_on end,
      target_actions=case when v_state='draft' then p_target else target_actions end,state=p_state
      where id=v_id and organization_id=p_org;
  end if;
  insert into public.organization_audit(request_id,organization_id,actor_clerk_id,operation,payload)
    values(p_request,p_org,p_actor,'campaign',v_payload);
  return v_id;
end $$;

create function public.link_organization_campaign_action(p_org uuid,p_actor text,p_campaign uuid,p_action uuid,p_remove boolean,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_payload jsonb;
begin
  perform public.organization_lock_enabled(p_org);
  if coalesce(public.organization_actor_role(p_org,p_actor),'') not in ('owner','manager') then raise exception using errcode='42501',message='manager required'; end if;
  v_payload:=jsonb_build_object('campaign',p_campaign,'action',p_action,'remove',p_remove);
  if public.organization_audit_replay(p_request,p_org,p_actor,'campaign_action',v_payload) then return; end if;
  if not exists(select 1 from public.organization_campaigns where id=p_campaign and organization_id=p_org and state in ('draft','active'))
    or not exists(select 1 from public.action_organizations where action_id=p_action and organization_id=p_org)
    then raise exception using errcode='42501',message='resource unavailable'; end if;
  if p_remove then delete from public.organization_campaign_actions where organization_id=p_org and campaign_id=p_campaign and action_id=p_action;
  else insert into public.organization_campaign_actions values(p_org,p_campaign,p_action) on conflict do nothing; end if;
  insert into public.organization_audit(request_id,organization_id,actor_clerk_id,operation,payload)
    values(p_request,p_org,p_actor,'campaign_action',v_payload);
end $$;

-- List only the signed-in account's relations. Pending invitations never grant data access.
create function public.list_my_organizations(p_actor text)
returns table(organization_id uuid,organization_name text,membership_id uuid,member_role text,state text)
language sql stable security definer set search_path=public,pg_temp as $$
  select o.id,p.organization_name,m.id,m.member_role,m.state
  from public.organization_memberships m join public.organizations o on o.id=m.organization_id
    join public.partner_annuaire_entries e on e.id=o.partner_entry_id
    join public.partner_onboarding_requests p on p.id=e.source_request_id
  where m.clerk_user_id=p_actor and o.disabled_at is null and e.publication_status='accepted' and p.status='accepted'
    and ((m.state='active' and public.organization_actor_role(o.id,p_actor) is not null) or (m.state='pending' and m.expires_at>now()))
  order by p.organization_name,o.id
$$;

-- Never fallback to public/global when a private scope is empty. Limit+1 detects truncation.
-- Returned IDs only; report and dashboard consumers resolve canonical Actions data separately.
create function public.organization_report_action_ids(p_org uuid,p_actor text,p_site uuid,p_campaign uuid,p_from date,p_to date,p_limit integer)
returns table(action_id uuid)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_role text; v_site uuid;
begin
  v_role:=public.organization_actor_role(p_org,p_actor);
  if coalesce(v_role,'') not in ('owner','manager','site_manager') then raise exception using errcode='42501',message='scope unavailable'; end if;
  select m.site_id into v_site from public.organization_memberships m where m.organization_id=p_org and m.clerk_user_id=p_actor;
  if (v_role='site_manager' and p_site is not null and p_site<>v_site) or (v_role='site_manager' and p_campaign is not null)
     then raise exception using errcode='42501',message='scope unavailable'; end if;
  if p_site is not null and not exists(select 1 from public.organization_sites s where s.organization_id=p_org and s.id=p_site) then raise exception using errcode='42501',message='scope unavailable'; end if;
  if p_campaign is not null and not exists(select 1 from public.organization_campaigns c where c.organization_id=p_org and c.id=p_campaign) then raise exception using errcode='42501',message='scope unavailable'; end if;
  if p_from is null or p_to is null or p_from>p_to or p_to-p_from>3660 or p_limit is null or p_limit not between 1 and 1001
    then raise exception using errcode='22023',message='invalid scope'; end if;
  return query select a.id from public.action_organizations l join public.organizations o on o.id=l.organization_id
    join public.actions a on a.id=l.action_id
    where l.organization_id=p_org and (v_site is null or l.site_id=v_site) and (p_site is null or l.site_id=p_site)
      and (p_campaign is null or exists(select 1 from public.organization_campaign_actions c where c.organization_id=p_org and c.campaign_id=p_campaign and c.action_id=a.id))
      and a.organizer_type='company' and a.organizer_id=o.organizer_ref and a.status='approved'
      and a.action_phase='post_action_complete' and a.published_at is not null and a.moderation_visibility='visible'
      and a.cancelled_at is null and coalesce(a.review_state,'not_required') in ('not_required','approved')
      and coalesce(a.data_provenance,'unknown') <> 'test'
      and a.access_mode in ('public','invite_link') and a.action_date>=p_from and a.action_date<=p_to
    order by a.action_date desc,a.id desc limit p_limit;
end $$;

-- All externally callable functions: service-role only.
revoke all on function public.bootstrap_organization(text,text,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.mutate_organization_membership(uuid,text,text,uuid,text,text,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.mutate_organization_site(uuid,text,uuid,text,boolean,uuid) from public,anon,authenticated,service_role;
revoke all on function public.link_organization_action(uuid,text,uuid,uuid,uuid) from public,anon,authenticated,service_role;
revoke all on function public.mutate_organization_campaign(uuid,text,uuid,text,date,date,integer,text,uuid) from public,anon,authenticated,service_role;
revoke all on function public.link_organization_campaign_action(uuid,text,uuid,uuid,boolean,uuid) from public,anon,authenticated,service_role;
revoke all on function public.list_my_organizations(text) from public,anon,authenticated,service_role;
revoke all on function public.organization_report_action_ids(uuid,text,uuid,uuid,date,date,integer) from public,anon,authenticated,service_role;
grant execute on function public.bootstrap_organization(text,text,text,uuid) to service_role;
grant execute on function public.mutate_organization_membership(uuid,text,text,uuid,text,text,uuid,uuid) to service_role;
grant execute on function public.mutate_organization_site(uuid,text,uuid,text,boolean,uuid) to service_role;
grant execute on function public.link_organization_action(uuid,text,uuid,uuid,uuid) to service_role;
grant execute on function public.mutate_organization_campaign(uuid,text,uuid,text,date,date,integer,text,uuid) to service_role;
grant execute on function public.link_organization_campaign_action(uuid,text,uuid,uuid,boolean,uuid) to service_role;
grant execute on function public.list_my_organizations(text) to service_role;
grant execute on function public.organization_report_action_ids(uuid,text,uuid,uuid,date,date,integer) to service_role;

-- Minimal workspace, without raw Clerk IDs or personal participation data.
-- Explicit page bounds for potentially growing collections.
create function public.read_organization_workspace(p_org uuid,p_actor text,p_offset integer)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_role text; v_site uuid; v_name text; v_ref text; v_members jsonb; v_sites jsonb; v_campaigns jsonb;
  v_actions jsonb; v_candidates jsonb; v_has_more boolean; v_candidates_more boolean;
begin
  v_role:=public.organization_actor_role(p_org,p_actor);
  if v_role is null then raise exception using errcode='42501',message='scope unavailable'; end if;
  if p_offset is null or p_offset not between 0 and 10000 then raise exception using errcode='22023',message='invalid page'; end if;
  select m.site_id into v_site from public.organization_memberships m where m.organization_id=p_org and m.clerk_user_id=p_actor;
  select p.organization_name,o.organizer_ref into v_name,v_ref
    from public.organizations o join public.partner_annuaire_entries e on e.id=o.partner_entry_id
    join public.partner_onboarding_requests p on p.id=e.source_request_id where o.id=p_org;
  v_members:='[]'; v_sites:='[]'; v_campaigns:='[]'; v_actions:='[]'; v_candidates:='[]';
  v_has_more:=false; v_candidates_more:=false;
  if v_role='owner' then
    -- Membership metadata is private to the owner; profile label is a display projection only.
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_members from (
      select m.id,m.member_role,m.state,m.site_id,m.clerk_user_id=p_actor as is_self,
        coalesce(nullif(btrim(p.display_name),''),'Compte sans nom') as label,m.expires_at
      from public.organization_memberships m left join public.profiles p on p.id=m.clerk_user_id
      where m.organization_id=p_org and m.state in ('active','pending')
      order by m.state,m.member_role,m.id limit 101
    ) x;
  end if;
  if v_role in ('owner','manager','site_manager') then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_sites from (
      select s.id,s.name,s.archived_at from public.organization_sites s
        where s.organization_id=p_org and (v_site is null or s.id=v_site) order by s.name,s.id limit 101
    ) x;
    with rows as (
      select a.id,a.action_date,a.action_phase,a.status,l.site_id,
        coalesce(nullif(btrim(a.preparation_data->>'actionTitle'),''),a.location_label,'Action') as title,
        (a.created_by_clerk_id=p_actor or exists(select 1 from public.action_organizers ao where ao.action_id=a.id and ao.organizer_clerk_id=p_actor)) as can_manage
      from public.action_organizations l join public.actions a on a.id=l.action_id
      where l.organization_id=p_org and (v_site is null or l.site_id=v_site)
        and a.organizer_type='company' and a.organizer_id=v_ref and coalesce(a.data_provenance,'unknown')<>'test'
        and a.moderation_visibility='visible' and a.cancelled_at is null and a.status not in ('cancelled','rejected')
        and coalesce(a.review_state,'not_required') in ('not_required','approved')
      order by a.action_date desc,a.id desc offset p_offset limit 101
    )
    select coalesce(jsonb_agg(to_jsonb(rows) order by rows.action_date desc,rows.id desc),'[]'),count(*)>100
      into v_actions,v_has_more from rows;
    if v_has_more then v_actions:=v_actions-100; end if;
    with rows as (
      select a.id,a.action_date,a.action_phase,a.status,
        coalesce(nullif(btrim(a.preparation_data->>'actionTitle'),''),a.location_label,'Action') as title
      from public.actions a
      where a.organizer_type='company' and a.organizer_id=v_ref and a.moderation_visibility='visible'
        and a.cancelled_at is null and a.status not in ('rejected','cancelled') and coalesce(a.data_provenance,'unknown')<>'test'
        and (a.created_by_clerk_id=p_actor or exists(select 1 from public.action_organizers ao where ao.action_id=a.id and ao.organizer_clerk_id=p_actor))
        and not exists(select 1 from public.action_organizations l where l.action_id=a.id)
      order by a.action_date desc,a.id desc limit 101
    )
    select coalesce(jsonb_agg(to_jsonb(rows) order by rows.action_date desc,rows.id desc),'[]'),count(*)>100
      into v_candidates,v_candidates_more from rows;
    if v_candidates_more then v_candidates:=v_candidates-100; end if;
  end if;
  if v_role in ('owner','manager') then
    select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_campaigns from (
      select c.id,c.title,c.starts_on,c.ends_on,c.target_actions,c.state,
        (select count(*) from public.organization_campaign_actions ca join public.actions a on a.id=ca.action_id
          join public.action_organizations l on l.action_id=a.id and l.organization_id=p_org
          where ca.campaign_id=c.id and ca.organization_id=p_org and a.organizer_id=v_ref and a.organizer_type='company'
            and a.status='approved' and a.action_phase='post_action_complete' and a.published_at is not null and a.cancelled_at is null
            and a.moderation_visibility='visible' and coalesce(a.review_state,'not_required') in ('not_required','approved')
            and coalesce(a.data_provenance,'unknown')<>'test' and a.action_date between c.starts_on and c.ends_on
            and a.access_mode in ('public','invite_link')) as completed_actions
      from public.organization_campaigns c where c.organization_id=p_org order by c.starts_on desc,c.id limit 101
    ) x;
  end if;
  return jsonb_build_object('id',p_org,'name',v_name,'role',v_role,'site_id',v_site,
    'members',v_members,'sites',v_sites,'campaigns',v_campaigns,'actions',v_actions,
    'actions_has_more',v_has_more,'link_candidates',v_candidates,'candidates_has_more',v_candidates_more);
end $$;
revoke all on function public.read_organization_workspace(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.read_organization_workspace(uuid,text,integer) to service_role;
