-- CANDIDATE pgTAP structural tests, to integrate in apps/web/supabase/tests.
begin;
select plan(32);
select has_table('public','organizations');
select has_table('public','organization_memberships');
select has_table('public','action_organizations');
select has_table('public','organization_campaigns');
select has_table('public','organization_sites');
select has_table('public','organization_campaign_actions');
select has_table('public','organization_audit');
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
select is(
  public.bootstrap_organization('test-enterprise-alpha','alpha-ref','admin-reviewer','00000000-0000-4000-8000-000000000111'),
  (select id from public.organizations where partner_entry_id='test-enterprise-alpha'),
  'bootstrap creates one stable organization identity');
select is(
  (select clerk_user_id from public.organization_memberships where organization_id=(select id from public.organizations where partner_entry_id='test-enterprise-alpha') and member_role='owner'),
  'clerk-owner-a',
  'verified applicant, not reviewing admin, receives initial ownership');
select is(
  (select count(*)::integer from public.list_my_organizations('clerk-owner-a')),
  1,
  'an owner lists only their own active organization');
select throws_ok($test$select * from public.read_organization_workspace((select id from public.organizations where partner_entry_id='test-enterprise-beta'),'clerk-owner-a',0)$test$,'42501','scope unavailable','membership in another organization cannot read its workspace');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a','invite',null::uuid,'clerk-successor','manager',null::uuid,'00000000-0000-4000-8000-000000000121')$test$,'owner can invite a targeted manager');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-successor','accept',(select id from public.organization_memberships where clerk_user_id='clerk-successor'),null::text,null::text,null::uuid,'00000000-0000-4000-8000-000000000122')$test$,'invited account can accept only its own invitation');
select is((select count(*)::integer from public.organization_memberships where clerk_user_id='clerk-successor' and state='active' and member_role='manager'),1,'acceptance activates the invited manager');
select lives_ok($test$select public.mutate_organization_membership((select id from public.organizations where partner_entry_id='test-enterprise-alpha'),'clerk-owner-a','transfer_owner',(select id from public.organization_memberships where clerk_user_id='clerk-successor'),null::text,null::text,null::uuid,'00000000-0000-4000-8000-000000000123')$test$,'owner can atomically transfer responsibility to an active manager');
select is((select member_role from public.organization_memberships where clerk_user_id='clerk-owner-a'),'manager','former owner becomes a manager after transfer');
select is((select member_role from public.organization_memberships where clerk_user_id='clerk-successor'),'owner','successor becomes the organization owner');
select * from finish();
rollback;
