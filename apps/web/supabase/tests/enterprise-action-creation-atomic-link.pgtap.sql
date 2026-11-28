-- Structural and privilege contract for the canonical atomic enterprise link.
begin;
select plan(7);
select ok(
  position('public.link_organization_action(' in pg_get_functiondef('public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure)) > 0,
  'canonical creation delegates organization authorization to link_organization_action'
);
select ok(
  position('create_action_with_relations_legacy(' in pg_get_functiondef('public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure)) < position('public.link_organization_action(' in pg_get_functiondef('public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure)),
  'action insertion and association occur in the same wrapper transaction'
);
select ok(
  not has_function_privilege('authenticated','public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)','EXECUTE'),
  'browser roles cannot invoke canonical creation directly'
);
select ok(
  has_function_privilege('service_role','public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)','EXECUTE'),
  'server role retains canonical creation access'
);
select ok(
  position('set search_path = public, pg_catalog' in lower(pg_get_functiondef('public.create_action_with_relations(jsonb,jsonb,jsonb,text,text,text,boolean)'::regprocedure))) > 0,
  'security definer pins its search path'
);
select ok(has_function_privilege('service_role','public.organization_action_creation_enabled()','EXECUTE'),'server can test whether atomic association support is available');
select ok(not has_function_privilege('authenticated','public.organization_action_creation_enabled()','EXECUTE'),'browser cannot probe the server capability directly');
select * from finish();
rollback;
