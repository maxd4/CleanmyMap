-- PURPOSE: permit active organization members to read only the aggregate report scope.
-- CALLER: authenticated application API through service_role only.
-- AUTHORIZATION_BOUNDARY: organization_report_action_ids validates current membership and organization state.
-- IDEMPOTENCY: CREATE OR REPLACE updates the single canonical scope resolver.
-- ATOMICITY: function replacement is transactional.
-- FAILURE_BEHAVIOR: foreign or inactive scopes raise 42501; invalid bounds raise 22023.
-- SEARCH_PATH: fixed to public, pg_temp.
-- GRANTS: service_role only; no direct browser execution.
create or replace function public.organization_report_action_ids(p_org uuid,p_actor text,p_site uuid,p_campaign uuid,p_from date,p_to date,p_limit integer)
returns table(action_id uuid)
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_role text; v_site uuid;
begin
  v_role:=public.organization_actor_role(p_org,p_actor);
  if coalesce(v_role,'') not in ('owner','manager','site_manager','member') then raise exception using errcode='42501',message='scope unavailable'; end if;
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
