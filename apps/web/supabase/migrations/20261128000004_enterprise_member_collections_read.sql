-- PURPOSE: expose the shared, bounded organization collection projection to active members.
-- CALLER: authenticated application API through service_role only.
-- AUTHORIZATION_BOUNDARY: active membership is checked inside the SECURITY DEFINER function.
-- IDEMPOTENCY: stable read projection; no writes.
-- ATOMICITY: one bounded SQL statement.
-- FAILURE_BEHAVIOR: inactive or foreign scope raises 42501; private actions are omitted.
-- SEARCH_PATH: fixed to public, pg_temp.
-- GRANTS: service_role only; no direct browser execution.
create function public.read_organization_member_collections(p_org uuid,p_actor text,p_offset integer)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_role text; v_site uuid; v_name text; v_sites jsonb; v_campaigns jsonb; v_actions jsonb; v_has_more boolean;
begin
  v_role:=public.organization_actor_role(p_org,p_actor);
  if v_role is distinct from 'member' then
    raise exception using errcode='42501',message='scope unavailable';
  end if;
  if p_offset is null or p_offset not between 0 and 10000 then
    raise exception using errcode='22023',message='invalid page';
  end if;
  select m.site_id into v_site from public.organization_memberships m
    where m.organization_id=p_org and m.clerk_user_id=p_actor and m.state='active';
  select p.organization_name into v_name
    from public.organizations o join public.partner_annuaire_entries e on e.id=o.partner_entry_id
    join public.partner_onboarding_requests p on p.id=e.source_request_id where o.id=p_org;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_sites from (
    select s.id,s.name,s.archived_at from public.organization_sites s
    where s.organization_id=p_org and (v_site is null or s.id=v_site) order by s.name,s.id limit 101
  ) x;
  select coalesce(jsonb_agg(to_jsonb(x)),'[]') into v_campaigns from (
    select c.id,c.title,c.starts_on,c.ends_on,c.target_actions,c.state,
      (select count(*) from public.organization_campaign_actions ca
        join public.actions a on a.id=ca.action_id
        join public.action_organizations l on l.action_id=a.id and l.organization_id=p_org
        where ca.campaign_id=c.id and ca.organization_id=p_org
          and a.organizer_id=(select o.organizer_ref from public.organizations o where o.id=p_org)
          and a.organizer_type='company' and a.status='approved' and a.action_phase='post_action_complete'
          and a.published_at is not null and a.cancelled_at is null and a.moderation_visibility='visible'
          and coalesce(a.review_state,'not_required') in ('not_required','approved')
          and coalesce(a.data_provenance,'unknown')<>'test' and a.action_date between c.starts_on and c.ends_on
          and a.access_mode in ('public','invite_link')) as completed_actions
    from public.organization_campaigns c where c.organization_id=p_org and c.state in ('active','completed')
    order by c.starts_on desc,c.id limit 101
  ) x;
  with rows as (
    select a.id,a.action_date,a.action_phase,a.status,l.site_id,
      coalesce(nullif(btrim(a.preparation_data->>'actionTitle'),''),a.location_label,'Action') as title,
      (a.created_by_clerk_id=p_actor or exists(select 1 from public.action_organizers ao where ao.action_id=a.id and ao.organizer_clerk_id=p_actor)) as can_manage
    from public.action_organizations l join public.actions a on a.id=l.action_id
    where l.organization_id=p_org and (v_site is null or l.site_id=v_site)
      and a.organizer_type='company'
      and a.organizer_id=(select o.organizer_ref from public.organizations o where o.id=p_org)
      and a.moderation_visibility='visible' and a.cancelled_at is null
      and a.status not in ('cancelled','rejected')
      and coalesce(a.review_state,'not_required') in ('not_required','approved')
      and coalesce(a.data_provenance,'unknown')<>'test'
      and a.access_mode in ('public','invite_link')
    order by a.action_date desc,a.id desc offset p_offset limit 101
  )
  select coalesce(jsonb_agg(to_jsonb(rows) order by rows.action_date desc,rows.id desc),'[]'),count(*)>100
    into v_actions,v_has_more from rows;
  if v_has_more then v_actions:=v_actions-100; end if;
  return jsonb_build_object('id',p_org,'name',v_name,'role',v_role,'site_id',v_site,
    'sites',v_sites,'campaigns',v_campaigns,'actions',v_actions,'actions_has_more',v_has_more,
    'link_candidates','[]'::jsonb,'candidates_has_more',false);
end $$;
revoke all on function public.read_organization_member_collections(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.read_organization_member_collections(uuid,text,integer) to service_role;
