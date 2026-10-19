-- Ephemeral PostgreSQL contract for the forward-only role-attestation repair.
-- This file is executed only after a local `supabase db reset`; it must never
-- be sent to a linked or production database.

begin;
set local role postgres;

delete from public.action_role_attestation_audit where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_role_attestations where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_field_role_assignments where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_organizers where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_participants where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.actions where id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.app_notifications
 where user_id = 'role-attestation-contract-user'
   and payload ->> 'actionId' = '11111111-1111-4111-8111-111111111111';

insert into public.actions (
  id, created_by_clerk_id, actor_name, action_date, location_label,
  waste_kg, cigarette_butts, volunteers_count, duration_minutes,
  status, published_at, type, action_phase, preparation_data, moderation_visibility
) values (
  '11111111-1111-4111-8111-111111111111'::uuid,
  'role-attestation-contract-reviewer', 'Role attestation contract', '2030-01-15',
  'Ephemeral role attestation contract', 0, 0, 1, 30, 'approved',
  '2030-01-15T12:00:00Z'::timestamptz, 'action', 'post_action_complete', '{}'::jsonb, 'visible'
);
insert into public.action_organizers (action_id, organizer_clerk_id, organizer_label, is_primary)
values ('11111111-1111-4111-8111-111111111111'::uuid, 'role-attestation-contract-reviewer', 'Contract reviewer', true);
insert into public.action_participants (action_id, user_id, participation_status, participation_source)
values ('11111111-1111-4111-8111-111111111111'::uuid, 'role-attestation-contract-user', 'confirmed', 'group_form');
insert into public.action_field_role_assignments (
  action_id, user_id, role_code, assignment_status, assigned_by_clerk_id
) values (
  '11111111-1111-4111-8111-111111111111'::uuid,
  'role-attestation-contract-user', 'group_lead', 'active', 'role-attestation-contract-reviewer'
);
commit;

begin;
set local role service_role;

-- First confirmation is valid and creates exactly one audit revision/notice.
select public.review_action_role_attestation(
  '11111111-1111-4111-8111-111111111111', 'role-attestation-contract-user',
  'group_lead', 'confirm', 'role-attestation-contract-reviewer', null, false
);
do $$
declare v_status text; v_audit_count bigint; v_notice_count bigint;
begin
  select verification_status into v_status
    from public.action_role_attestations
   where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
  select count(*) into v_audit_count from public.action_role_attestation_audit where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
  select count(*) into v_notice_count from public.app_notifications where user_id = 'role-attestation-contract-user' and payload ->> 'actionId' = '11111111-1111-4111-8111-111111111111';
  if v_status <> 'confirmed' or v_audit_count <> 1 or v_notice_count <> 1 then
    raise exception 'first confirmation contract failed';
  end if;
end $$;

-- An identical retry is a strict no-op.
select public.review_action_role_attestation(
  '11111111-1111-4111-8111-111111111111', 'role-attestation-contract-user',
  'group_lead', 'confirm', 'role-attestation-contract-reviewer', null, false
);
do $$
declare v_audit_count bigint; v_notice_count bigint;
begin
  select count(*) into v_audit_count from public.action_role_attestation_audit where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
  select count(*) into v_notice_count from public.app_notifications where user_id = 'role-attestation-contract-user' and payload ->> 'actionId' = '11111111-1111-4111-8111-111111111111';
  if v_audit_count <> 1 or v_notice_count <> 1 then raise exception 'idempotent retry created a side effect'; end if;
end $$;
commit;

begin
set local role service_role;
do $$
begin
  begin
    perform public.review_action_role_attestation(
      '11111111-1111-4111-8111-111111111111', 'role-attestation-contract-user',
      'group_lead', 'reject', 'role-attestation-contract-reviewer', null, false
    );
    raise exception 'rejection without a reason was accepted';
  exception when others then
    if sqlerrm not like '%action_role_attestation_reason_required%' then raise; end if;
  end;
  begin
    perform public.review_action_role_attestation(
      '11111111-1111-4111-8111-111111111111', 'role-attestation-contract-user',
      'group_lead', 'confirm', 'role-attestation-contract-reviewer', null, false
    );
    raise exception 'terminal correction without a reason was accepted';
  exception when others then
    if sqlerrm not like '%action_role_attestation_correction_reason_required%' then raise; end if;
  end;
end $$;
commit;

begin;
set local role service_role;
select public.review_action_role_attestation(
  '11111111-1111-4111-8111-111111111111', 'role-attestation-contract-user',
  'group_lead', 'reject', 'role-attestation-contract-reviewer', 'explicit rejection', false
);
do $$
declare v_status text; v_audit_count bigint; v_notice_count bigint;
begin
  select verification_status into v_status from public.action_role_attestations where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
  select count(*) into v_audit_count from public.action_role_attestation_audit where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
  select count(*) into v_notice_count from public.app_notifications where user_id = 'role-attestation-contract-user' and payload ->> 'actionId' = '11111111-1111-4111-8111-111111111111';
  if v_status <> 'rejected' or v_audit_count <> 2 or v_notice_count <> 2 then raise exception 'reasoned correction contract failed'; end if;
end $$;

-- A self-review remains pending and does not emit a terminal notification.
select public.review_action_role_attestation(
  '11111111-1111-4111-8111-111111111111', 'role-attestation-contract-user',
  'group_lead', 'confirm', 'role-attestation-contract-user', 'self review pending', false
);
do $$
declare v_status text; v_notice_count bigint;
begin
  select verification_status into v_status from public.action_role_attestations where action_id = '11111111-1111-4111-111111111111'::uuid;
  select count(*) into v_notice_count from public.app_notifications where user_id = 'role-attestation-contract-user' and payload ->> 'actionId' = '11111111-1111-4111-8111-111111111111';
  if v_status <> 'pending' or v_notice_count <> 2 then raise exception 'self-review pending contract failed'; end if;
end $$;
commit;

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.action_role_attestations'::regclass)
     or not (select relrowsecurity from pg_class where oid = 'public.action_role_attestation_audit'::regclass) then
    raise exception 'role attestation RLS is disabled';
  end if;
  if has_table_privilege('anon', 'public.action_role_attestations', 'SELECT')
     or has_table_privilege('authenticated', 'public.action_role_attestations', 'SELECT')
     or has_function_privilege('anon', 'public.review_action_role_attestation(uuid,text,text,text,text,text,boolean)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.review_action_role_attestation(uuid,text,text,text,text,text,boolean)', 'EXECUTE') then
    raise exception 'browser roles retain role attestation access';
  end if;
  if not has_function_privilege('service_role', 'public.review_action_role_attestation(uuid,text,text,text,text,text,boolean)', 'EXECUTE') then
    raise exception 'service_role lost role attestation execution';
  end if;
end $$;

begin;
set local role postgres;
delete from public.action_role_attestation_audit where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_role_attestations where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_field_role_assignments where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_organizers where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.action_participants where action_id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.actions where id = '11111111-1111-4111-8111-111111111111'::uuid;
delete from public.app_notifications where user_id = 'role-attestation-contract-user' and payload ->> 'actionId' = '11111111-1111-4111-8111-111111111111';
commit;
