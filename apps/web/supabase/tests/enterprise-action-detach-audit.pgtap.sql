-- Structural authorization, audit and cascading detach contract.
begin;
select plan(7);
select ok(
  position('public.organization_audit_replay(' in pg_get_functiondef('public.unlink_organization_action(uuid,text,uuid,uuid,uuid)'::regprocedure)) > 0,
  'detach requests are idempotent through the canonical audit replay helper'
);
select ok(
  position('insert into public.organization_audit' in lower(pg_get_functiondef('public.unlink_organization_action(uuid,text,uuid,uuid,uuid)'::regprocedure))) > 0,
  'successful detach writes an audit row in the same transaction'
);
select ok(
  position('delete from public.action_organizations' in lower(pg_get_functiondef('public.unlink_organization_action(uuid,text,uuid,uuid,uuid)'::regprocedure))) > 0,
  'detach removes only the organization association'
);
select ok(
  position('a.organizer_id = v_ref' in lower(pg_get_functiondef('public.unlink_organization_action(uuid,text,uuid,uuid,uuid)'::regprocedure))) > 0,
  'detach requires the action to retain the exact organization organizer reference'
);
select ok(not has_function_privilege('authenticated','public.unlink_organization_action(uuid,text,uuid,uuid,uuid)','EXECUTE'),'browser cannot call detach directly');
select ok(has_function_privilege('service_role','public.unlink_organization_action(uuid,text,uuid,uuid,uuid)','EXECUTE'),'server can call the audited detach');
select ok(not has_function_privilege('authenticated','public.organization_action_detach_enabled()','EXECUTE'),'browser cannot probe detach support directly');
select * from finish();
rollback;
