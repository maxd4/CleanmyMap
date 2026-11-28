-- Organization isolation and lifecycle behavior executed against the replayed PostgreSQL schema.
begin;
select plan(72);
select has_table('public','organizations','organization table exists');
select has_table('public','organization_memberships','membership table exists');
select has_table('public','action_organizations','action association table exists');
select has_table('public','organization_campaigns','campaign table exists');
select has_table('public','organization_sites','site table exists');
select has_table('public','organization_campaign_actions','campaign action table exists');
select has_table('public','organization_audit','audit table exists');
select ok((select bool_and(relrowsecurity) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('organizations','organization_memberships','organization_sites','action_organizations','organization_campaigns','organization_campaign_actions','organization_audit')), 'all seven tables have RLS');
select ok(not has_table_privilege('anon','public.organizations','SELECT'),'anonymous cannot read organizations');
select ok(not has_table_privilege('authenticated','public.organization_memberships','SELECT'),'browser cannot read memberships');
select ok(not has_table_privilege('authenticated','public.action_organizations','SELECT'),'browser cannot read action links');
select ok(not has_table_privilege('authenticated','public.organization_audit','SELECT'),'browser cannot read audit');
select ok(not has_table_privilege('service_role','public.organization_memberships','UPDATE'),'service cannot mutate membership table directly');
select ok(not has_function_privilege('authenticated','public.bootstrap_organization(text,text,text,uuid)','EXECUTE'),'browser cannot bootstrap');
select ok(not has_function_privilege('authenticated','public.mutate_organization_membership(uuid,text,text,uuid,text,text,uuid,uuid)','EXECUTE'),'browser cannot change memberships');
select ok(not has_function_privilege('anon','public.organization_report_action_ids(uuid,text,uuid,uuid,date,date,integer)','EXECUTE'),'anonymous cannot resolve report scope');
select ok(not has_function_privilege('authenticated','public.organization_report_action_ids(uuid,text,uuid,uuid,date,date,integer)','EXECUTE'),'browser cannot resolve report scope');
select ok(has_function_privilege('service_role','public.organization_report_action_ids(uuid,text,uuid,uuid,date,date,integer)','EXECUTE'),'server can resolve scope');
select ok(not has_function_privilege('service_role','public.organization_actor_role(uuid,text)','EXECUTE'),'helper not externally callable');
select ok(not has_function_privilege('service_role','public.organization_lock_enabled(uuid)','EXECUTE'),'lock helper not externally callable');
select ok(not has_function_privilege('anon','public.read_organization_team_members(uuid,text)','EXECUTE'),'anonymous cannot read a team roster');
select ok(not has_function_privilege('authenticated','public.read_organization_team_members(uuid,text)','EXECUTE'),'browser cannot read a team roster directly');
select ok(has_function_privilege('service_role','public.read_organization_team_members(uuid,text)','EXECUTE'),'server can read a team roster');
select ok(not has_function_privilege('anon','public.leave_organization(uuid,text,uuid)','EXECUTE'),'anonymous cannot leave an organization');
select ok(not has_function_privilege('authenticated','public.leave_organization(uuid,text,uuid)','EXECUTE'),'browser cannot call the leave RPC directly');
select ok(has_function_privilege('service_role','public.leave_organization(uuid,text,uuid)','EXECUTE'),'server can perform a session-scoped leave');
select ok(not has_function_privilege('anon','public.list_organization_bootstrap_queue()','EXECUTE'),'anonymous cannot read the mandate review queue');
select ok(not has_function_privilege('authenticated','public.list_organization_bootstrap_queue()','EXECUTE'),'browser cannot read the mandate review queue');
select ok(has_function_privilege('service_role','public.list_organization_bootstrap_queue()','EXECUTE'),'admin API server can read the mandate review queue');
select throws_ok($test$select public.organization_report_action_ids('00000000-0000-4000-8000-000000000001','unknown',null,null,'2026-01-01','2026-12-31',10)$test$,'42501','scope unavailable','unknown scope fails closed');
select throws_ok($test$select public.bootstrap_organization('unknown','unknown','actor','00000000-0000-4000-8000-000000000001')$test$,'42501','verified mandate required','unknown partner cannot bootstrap');
insert into public.partner_onboarding_requests(id,submitted_by_user_id,organization_name,organization_type,legal_identity,contact_name,contact_channel,contact_details,motivation,status,creator_state)
values
  ('00000000-0000-4000-8000-000000000101','clerk-owner-a','Entreprise Alpha','entreprise','alpha-ref','Référent Alpha','email','alpha@example.test','Test transactionnel','accepted','accepted'),
  ('00000000-0000-4000-8000-000000000102','clerk-owner-b','Entreprise Beta','entreprise','beta-ref','Référent Beta','email','beta@example.test','Test transactionnel','accepted','accepted');
insert into public.partner_annuaire_entries(id,source_request_id,publication_status,reviewed_at,reviewed_by_user_id,public_data)
values
  ('test-enterprise-alpha','00000000-0000-4000-8000-000000000101','accepted',now(),'admin-reviewer','{"name":"Entreprise Alpha"}'),
  ('test-enterprise-beta','00000000-0000-4000-8000-000000000102','accepted',now(),'admin-reviewer','{"name":"Entreprise Beta"}');
select is((select count(*)::integer from public.list_organization_bootstrap_queue()),2,'review queue exposes only the two accepted, not-yet-activated organization mandates');
select ok(
  public.bootstrap_organization('test-enterprise-alpha','alpha-ref','admin-reviewer','00000000-0000-4000-8000-000000000111') is not null,
  'bootstrap returns the new organization identity');
select ok(
  public.bootstrap_organization('test-enterprise-beta','beta-ref','admin-reviewer','00000000-0000-4000-8000-000000000112') is not null,
  'bootstrap creates a real Beta organization');
select is(
  (select count(*)::integer from public.organizations where partner_entry_id='test-enterprise-alpha'),
  1,
  'bootstrap creates one stable organization identity');
select is((select count(*)::integer from public.organizations where partner_entry_id='test-enterprise-beta'),1,'Beta has a persisted organization identity');
select isnt((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),(select id from public.organizations where partner_entry_id='test-enterprise-beta'),'Alpha and Beta have distinct non-null organization IDs');
select lives_ok($test$select public.mutate_organization_site((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a',null::uuid,'Alpha Centre',false,'00000000-0000-4000-8000-000000000131')$test$,'Alpha owner creates a scoped establishment');
select lives_ok($test$select public.mutate_organization_site((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-b',null::uuid,'Beta Centre',false,'00000000-0000-4000-8000-000000000132')$test$,'Beta owner creates a separate scoped establishment');
select is((select count(*)::integer from public.organization_sites s join public.organizations o on o.id=s.organization_id where o.partner_entry_id in ('test-enterprise-alpha','test-enterprise-beta')),2,'each real organization owns its own establishment');
select is(
  (select clerk_user_id from public.organization_memberships where organization_id=(select id from public.organizations where partner_entry_id='test-enterprise-alpha') and member_role='owner'),
  'clerk-owner-a',
  'verified applicant, not reviewing admin, receives initial ownership');
-- Published action triggers enforce the same service-role boundary as the API.
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"enterprise-fixture"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
insert into public.actions(id,created_by_clerk_id,organizer_id,organizer_type,action_date,action_phase,status,published_at,location_label,moderation_visibility,access_mode)
values
  ('00000000-0000-4000-8000-000000000141','clerk-owner-a','alpha-ref','company','2026-11-20','post_action_complete','approved',now(),'Alpha site','visible','public'),
  ('00000000-0000-4000-8000-000000000142','clerk-owner-b','beta-ref','company','2026-11-21','post_action_complete','approved',now(),'Beta site','visible','public');
reset role;
select lives_ok($test$select public.link_organization_action((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a','00000000-0000-4000-8000-000000000141',null::uuid,'00000000-0000-4000-8000-000000000151')$test$,'Alpha owner links an action belonging to Alpha');
select lives_ok($test$select public.link_organization_action((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-b','00000000-0000-4000-8000-000000000142',null::uuid,'00000000-0000-4000-8000-000000000152')$test$,'Beta owner links an action belonging to Beta');
select throws_ok($test$select public.link_organization_action((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a','00000000-0000-4000-8000-000000000142',null::uuid,'00000000-0000-4000-8000-000000000153')$test$,'42501','action unavailable','Alpha cannot attach Beta action');
select is((select count(*)::integer from public.organization_report_action_ids((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a',null,null,'2026-01-01','2027-01-01',10)),1,'Alpha report scope includes only its own action');
select is((select count(*)::integer from public.organization_report_action_ids((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-b',null,null,'2026-01-01','2027-01-01',10)),1,'Beta report scope includes only its own action');
select throws_ok($test$select * from public.organization_report_action_ids((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-a',null,null,'2026-01-01','2027-01-01',10)$test$,'42501','scope unavailable','Alpha cannot query Beta report scope');
select is(
  (select count(*)::integer from public.list_my_organizations('clerk-owner-a')),
  1,
  'an owner lists only their own active organization');
select throws_ok($test$select * from public.read_organization_workspace((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-a',0)$test$,'42501','scope unavailable','membership in another organization cannot read its workspace');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a','invite',null::uuid,'clerk-successor','manager',null::uuid,'00000000-0000-4000-8000-000000000121')$test$,'owner can invite a targeted manager');
select is((select count(*)::integer from public.read_organization_team_members((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a')),2,'owner can see active members and its pending invitation');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-successor','accept',(select id from public.organization_memberships where clerk_user_id='clerk-successor'),null::text,null::text,null::uuid,'00000000-0000-4000-8000-000000000122')$test$,'invited account can accept only its own invitation');
select is((select count(*)::integer from public.organization_memberships where clerk_user_id='clerk-successor' and state='active' and member_role='manager'),1,'acceptance activates the invited manager');
select is((select count(*)::integer from public.read_organization_team_members((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-successor')),2,'ordinary active manager can read the minimized active team roster');
select throws_ok($test$select * from public.read_organization_team_members((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-a')$test$,'42501','scope unavailable','Alpha member cannot read the real Beta roster');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a','invite',null::uuid,'clerk-member-c','member',null::uuid,'00000000-0000-4000-8000-000000000124')$test$,'owner can invite an ordinary member');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-member-c','accept',(select id from public.organization_memberships where clerk_user_id='clerk-member-c'),null::text,null::text,null::uuid,'00000000-0000-4000-8000-000000000125')$test$,'ordinary invitee can accept only its own invitation');
select is((select count(*)::integer from public.read_organization_team_members((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-member-c')),3,'ordinary active member can read the minimized team roster');
select ok(not exists(select 1 from public.read_organization_team_members((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-member-c') m cross join lateral jsonb_object_keys(to_jsonb(m)) as keys(key) where keys.key='clerk_user_id'),'team projection contains no raw Clerk account identifier');
select lives_ok($test$select public.leave_organization((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-member-c','00000000-0000-4000-8000-000000000126')$test$,'active member can leave its organization');
select lives_ok($test$select public.leave_organization((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-member-c','00000000-0000-4000-8000-000000000126')$test$,'leave request replay is idempotent');
select is((select state from public.organization_memberships where clerk_user_id='clerk-member-c'),'revoked','leaving revokes only the caller membership');
select throws_ok($test$select public.leave_organization((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-b','00000000-0000-4000-8000-000000000161')$test$,'22023','last owner','last active owner cannot leave before responsibility is transferred');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a','transfer_owner',(select id from public.organization_memberships where clerk_user_id='clerk-successor'),null::text,null::text,null::uuid,'00000000-0000-4000-8000-000000000123')$test$,'owner can atomically transfer responsibility to an active manager');
select is((select member_role from public.organization_memberships where clerk_user_id='clerk-owner-a'),'manager','former owner becomes a manager after transfer');
select is((select member_role from public.organization_memberships where clerk_user_id='clerk-successor'),'owner','successor becomes the organization owner');
update public.organizations set disabled_at=now() where partner_entry_id='test-enterprise-alpha';
select is((select count(*)::integer from public.list_my_organizations('clerk-successor')),0,'disabled organization is absent from the active membership listing');
select throws_ok($test$select * from public.read_organization_workspace((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-successor',0)$test$,'42501','scope unavailable','disabled organization blocks workspace reads');
select throws_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-successor','invite',null::uuid,'clerk-new-member','member',null::uuid,'00000000-0000-4000-8000-000000000171')$test$,'42501','organization unavailable','disabled organization blocks membership mutations');
update public.partner_onboarding_requests set status='rejected' where id='00000000-0000-4000-8000-000000000102';
select is((select count(*)::integer from public.list_my_organizations('clerk-owner-b')),0,'revoked mandate removes the organization from its owner listing');
select throws_ok($test$select * from public.read_organization_workspace((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-b',0)$test$,'42501','scope unavailable','revoked mandate blocks workspace reads');
select is((select count(*)::integer from public.list_my_organizations('clerk-member-c')),0,'revoked membership cannot be listed after a member leaves');
select * from finish();
rollback;
