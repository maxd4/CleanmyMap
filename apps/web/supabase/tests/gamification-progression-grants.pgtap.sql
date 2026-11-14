begin;

select plan(24);

-- RLS does not cover TRUNCATE and must not be used as a substitute for SQL
-- privilege revocation. These attempts exercise the effective boundary.
set local role anon;
select throws_ok($$select * from public.progression_events limit 1$$, '42501', null, 'anon SELECT on progression events is denied');
select throws_ok($$insert into public.progression_events (user_id, event_type, source_table, source_id, status_phase, weight, xp_base, xp_awarded, occurred_on) values ('m7-grant-anon', 'forged', 'actions', 'm7-grant-anon', 'validated', 1, 1, 1, current_date)$$, '42501', null, 'anon INSERT on progression events is denied');
select throws_ok($$update public.progression_events set xp_awarded = xp_awarded where false$$, '42501', null, 'anon UPDATE on progression events is denied');
select throws_ok($$truncate table public.progression_events$$, '42501', null, 'anon TRUNCATE on progression events is denied');
select throws_ok($$select * from public.progression_profiles limit 1$$, '42501', null, 'anon SELECT on progression profiles is denied');
select throws_ok($$insert into public.progression_profiles (user_id) values ('m7-grant-anon')$$, '42501', null, 'anon INSERT on progression profiles is denied');
select throws_ok($$update public.progression_profiles set xp_total = xp_total where false$$, '42501', null, 'anon UPDATE on progression profiles is denied');
select throws_ok($$truncate table public.progression_profiles$$, '42501', null, 'anon TRUNCATE on progression profiles is denied');

reset role;
set local role authenticated;
select throws_ok($$select * from public.progression_events limit 1$$, '42501', null, 'authenticated SELECT on progression events is denied');
select throws_ok($$insert into public.progression_events (user_id, event_type, source_table, source_id, status_phase, weight, xp_base, xp_awarded, occurred_on) values ('m7-grant-authenticated', 'forged', 'actions', 'm7-grant-authenticated', 'validated', 1, 1, 1, current_date)$$, '42501', null, 'authenticated INSERT on progression events is denied');
select throws_ok($$update public.progression_events set xp_awarded = xp_awarded where false$$, '42501', null, 'authenticated UPDATE on progression events is denied');
select throws_ok($$truncate table public.progression_events$$, '42501', null, 'authenticated TRUNCATE on progression events is denied');
select throws_ok($$select * from public.progression_profiles limit 1$$, '42501', null, 'authenticated SELECT on progression profiles is denied');
select throws_ok($$insert into public.progression_profiles (user_id) values ('m7-grant-authenticated')$$, '42501', null, 'authenticated INSERT on progression profiles is denied');
select throws_ok($$update public.progression_profiles set xp_total = xp_total where false$$, '42501', null, 'authenticated UPDATE on progression profiles is denied');
select throws_ok($$truncate table public.progression_profiles$$, '42501', null, 'authenticated TRUNCATE on progression profiles is denied');

reset role;

select ok(has_table_privilege('service_role', 'public.progression_events', 'SELECT'), 'service_role can SELECT progression events');
select ok(has_table_privilege('service_role', 'public.progression_events', 'INSERT'), 'service_role can INSERT progression events');
select ok(has_table_privilege('service_role', 'public.progression_events', 'UPDATE'), 'service_role can UPDATE progression events');
select ok(has_table_privilege('service_role', 'public.progression_events', 'TRUNCATE'), 'service_role can TRUNCATE progression events');
select ok(has_table_privilege('service_role', 'public.progression_profiles', 'SELECT'), 'service_role can SELECT progression profiles');
select ok(has_table_privilege('service_role', 'public.progression_profiles', 'INSERT'), 'service_role can INSERT progression profiles');
select ok(has_table_privilege('service_role', 'public.progression_profiles', 'UPDATE'), 'service_role can UPDATE progression profiles');
select ok(has_table_privilege('service_role', 'public.progression_profiles', 'TRUNCATE'), 'service_role can TRUNCATE progression profiles');

select * from finish();
rollback;
