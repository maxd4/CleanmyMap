import assert from "node:assert/strict";
import { resolveLocalEphemeralDbUrl, runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const orgA = "11111111-1111-4111-8111-111111119001";
const orgB = "22222222-2222-4222-8222-222222229002";
const actionA = "00000000-0000-4000-8000-000000009001";
const actionB = "00000000-0000-4000-8000-000000009002";
const hashCollision = "a".repeat(64);
const hashOrgConflict = "b".repeat(64);
const hashLockOrder = "c".repeat(64);
const hashSuppressA = "d".repeat(64);
const hashSuppressB = "e".repeat(64);
const hashExpired = "f".repeat(64);
const hashDistinctA = "1".repeat(64);
const hashDistinctB = "2".repeat(64);
const hashLockExpire = "3".repeat(64);
const hashLockExpireComplete = "4".repeat(64);

const run = (sql, step = "query", timeoutMs = 20_000) => runLocalPsqlQuery(sql, {
  timeoutMs,
  errorLabel: `External action sync PostgreSQL concurrency failed at step=${step}`,
});

function barrierSql(ownKey, otherKey) {
  return `
select pg_advisory_lock(${ownKey});
do $$
declare
  v_ready boolean := false;
  v_attempt integer;
begin
  for v_attempt in 1..200 loop
    if pg_try_advisory_lock(${otherKey}) then
      perform pg_advisory_unlock(${otherKey});
      perform pg_sleep(0.05);
    else
      v_ready := true;
      exit;
    end if;
  end loop;
  if not v_ready then raise exception 'External action sync concurrency barrier timed out'; end if;
end;
$$;
`;
}

const cleanupSql = `
begin;
set local role postgres;
delete from private.external_action_sync_suppression_audit where operation_id like 'sync-conc-%';
delete from private.external_action_sync_references where external_event_id like 'conc-event-%';
delete from private.external_action_sync_identities where identity_hash in ('${hashCollision}', '${hashOrgConflict}', '${hashLockOrder}', '${hashSuppressA}', '${hashSuppressB}', '${hashExpired}', '${hashDistinctA}', '${hashDistinctB}', '${hashLockExpire}', '${hashLockExpireComplete}');
delete from public.actions where id in ('${actionA}'::uuid, '${actionB}'::uuid, '00000000-0000-4000-8000-000000009011'::uuid, '00000000-0000-4000-8000-000000009012'::uuid);
delete from public.organizer_directory_entries where id in ('${orgA}', '${orgB}');
commit;
`;

async function setup() {
  await resolveLocalEphemeralDbUrl();
  await run(cleanupSql, "setup_cleanup");
  await run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"external-sync-concurrency-setup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
insert into public.organizer_directory_entries(id, name, normalized_name, organizer_type, created_by_clerk_id)
values ('${orgA}', 'Sync Conc Org A', 'sync conc org a', 'association', 'sync-conc'),
       ('${orgB}', 'Sync Conc Org B', 'sync conc org b', 'association', 'sync-conc');
insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase, organizer_type, organizer_id, organizer_name)
values ('${actionA}'::uuid, 'sync-conc', current_date + 5, 'Lieu Conc A', 'pending', 'pre_action', 'association', '${orgA}', 'Sync Conc Org A'),
       ('${actionB}'::uuid, 'sync-conc', current_date + 6, 'Lieu Conc B', 'pending', 'pre_action', 'association', '${orgA}', 'Sync Conc Org A');
commit;
`, "setup_insert");
}

async function testConcurrentReservationCollision() {
  const token1 = "10000000-0000-4000-8000-000000000001";
  const token2 = "10000000-0000-4000-8000-000000000002";
  const makeSession = (index, token, ownKey, otherKey) => run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-${index}"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(ownKey, otherKey)}
select 'RESULT:' || reservation_status || ':' || identity_hash
from public.reserve_external_action_sync_reference(
  '${hashCollision}', '${orgA}', 'sync-conc-${index}', '${token}'::uuid,
  'jagis_pour_la_nature', 'conc-event-collision', 'https://example.test/c-${index}', 'r-${index}',
  '{"session":${index}}'::jsonb, '${"1".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`);
  const [res1, res2] = await Promise.all([
    makeSession(1, token1, 928173645101n, 928173645102n),
    makeSession(2, token2, 928173645102n, 928173645101n),
  ]);
  const statuses = [res1.stdout, res2.stdout].map((out) => out.match(/RESULT:([a-z_]+):/)?.[1]).sort();
  assert.deepEqual(statuses, ["busy", "reserved"]);
}

async function testConcurrentForeignOwnerCollision() {
  const token1 = "20000000-0000-4000-8000-000000000001";
  const token2 = "20000000-0000-4000-8000-000000000002";
  const s1 = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-org-a"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645111n, 928173645112n)}
select 'RESULT:' || reservation_status
from public.reserve_external_action_sync_reference(
  '${hashOrgConflict}', '${orgA}', 'sync-conc-a', '${token1}'::uuid,
  'jagis_pour_la_nature', 'conc-event-org', 'https://example.test/org-a', 'ra',
  '{"org":"a"}'::jsonb, '${"2".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`, "foreign_owner_a");
  const s2 = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-org-b"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645112n, 928173645111n)}
select 'RESULT:' || reservation_status
from public.reserve_external_action_sync_reference(
  '${hashOrgConflict}', '${orgB}', 'sync-conc-b', '${token2}'::uuid,
  'jagis_pour_la_nature', 'conc-event-org', 'https://example.test/org-b', 'rb',
  '{"org":"b"}'::jsonb, '${"3".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`, "foreign_owner_b");
  const [r1, r2] = await Promise.all([s1, s2]);
  const statuses = [r1.stdout, r2.stdout].map((out) => out.match(/RESULT:([a-z_]+)/)?.[1]).sort();
  assert.deepEqual(statuses, ["identity_conflict", "reserved"]);
}

async function testLockOrderReserveVsCompleteAndSuppress() {
  const token = "30000000-0000-4000-8000-000000000001";
  await run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-lock-setup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select * from public.reserve_external_action_sync_reference(
  '${hashLockOrder}', '${orgA}', 'sync-conc', '${token}'::uuid,
  'fondation_de_la_mer', 'conc-event-lock', 'https://example.test/lock', 'r1',
  '{"lock":1}'::jsonb, '${"4".repeat(64)}'
);
commit;
`);

  // Session 1 completes identity -> links actionA (locks identities -> references).
  // Session 2 concurrently reserves existing reference (must lock identities -> references without deadlock).
  const sComplete = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-complete"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645103n, 928173645104n)}
select 'COMPLETE:' || public.complete_external_action_sync_identity('${hashLockOrder}', '${token}'::uuid, '${actionA}'::uuid);
select pg_sleep(0.25);
commit;
`);
  const sReserve = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-reserve"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645104n, 928173645103n)}
select 'RESERVE:' || reservation_status
from public.reserve_external_action_sync_reference(
  '${hashLockOrder}', '${orgA}', 'sync-conc', '${token}'::uuid,
  'fondation_de_la_mer', 'conc-event-lock', 'https://example.test/lock', 'r2',
  '{"lock":2}'::jsonb, '${"5".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`);
  const [cRes, rRes] = await Promise.all([sComplete, sReserve]);
  assert.match(cRes.stdout, /COMPLETE:linked/);
  assert.match(rRes.stdout, /RESERVE:(?:reserved|linked)/);

  // Now test concurrent suppress vs reserve on the same linked reference: zero deadlock, and if suppress wins, reserve returns suppressed
  const sSuppress = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-suppress"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645105n, 928173645106n)}
select 'SUPPRESS:' || public.suppress_external_action_sync_action('${actionA}'::uuid, 'admin-conc', 'sync-conc-op-lock', 'test lock order');
select pg_sleep(0.25);
commit;
`);
  const sReserveAfter = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-reserve-after"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645106n, 928173645105n)}
select 'RESERVE_AFTER:' || reservation_status
from public.reserve_external_action_sync_reference(
  '${hashLockOrder}', '${orgA}', 'sync-conc', '${token}'::uuid,
  'fondation_de_la_mer', 'conc-event-lock', 'https://example.test/lock', 'r3',
  '{"lock":3}'::jsonb, '${"6".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`);
  const [supRes, resAfter] = await Promise.all([sSuppress, sReserveAfter]);
  assert.match(supRes.stdout, /SUPPRESS:suppressed/);
  assert.match(resAfter.stdout, /RESERVE_AFTER:(?:linked|suppressed)/);
}

async function testConcurrentSuppressionOperationIdCollisionAndIdempotency() {
  const tokenA = "40000000-0000-4000-8000-000000000001";
  const tokenB = "40000000-0000-4000-8000-000000000002";
  // Use fresh UUIDs for this test so actionA's tombstone from previous test does not interfere
  const action1 = "00000000-0000-4000-8000-000000009011";
  const action2 = "00000000-0000-4000-8000-000000009012";
  await run(`
begin;
set local role postgres;
delete from public.actions where id in ('${action1}'::uuid, '${action2}'::uuid);
commit;
`, "sup_cleanup_actions");
  await run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-sup-setup2"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
insert into public.actions(id, created_by_clerk_id, action_date, location_label, status, action_phase, organizer_type, organizer_id, organizer_name)
values ('${action1}'::uuid, 'sync-conc', current_date + 7, 'Lieu Sup 1', 'pending', 'pre_action', 'association', '${orgA}', 'Sync Conc Org A'),
       ('${action2}'::uuid, 'sync-conc', current_date + 8, 'Lieu Sup 2', 'pending', 'pre_action', 'association', '${orgA}', 'Sync Conc Org A');
select * from public.reserve_external_action_sync_reference(
  '${hashSuppressA}', '${orgA}', 'sync-conc', '${tokenA}'::uuid,
  'jagis_pour_la_nature', 'conc-event-sup-1', 'https://example.test/s1', 'r1', '{"s":1}'::jsonb, '${"7".repeat(64)}'
);
select public.complete_external_action_sync_identity('${hashSuppressA}', '${tokenA}'::uuid, '${action1}'::uuid);
select * from public.reserve_external_action_sync_reference(
  '${hashSuppressB}', '${orgA}', 'sync-conc', '${tokenB}'::uuid,
  'jagis_pour_la_nature', 'conc-event-sup-2', 'https://example.test/s2', 'r1', '{"s":2}'::jsonb, '${"8".repeat(64)}'
);
select public.complete_external_action_sync_identity('${hashSuppressB}', '${tokenB}'::uuid, '${action2}'::uuid);
commit;
`, "sup_setup_sync");

  // Two sessions race with the SAME operation_id on DIFFERENT actions
  const s1 = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-sup-1"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645107n, 928173645108n)}
select 'SUP1:' || public.suppress_external_action_sync_action('${action1}'::uuid, 'admin-1', 'sync-conc-op-collision', 'collision test 1');
select pg_sleep(0.25);
commit;
`);
  const s2 = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-sup-2"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645108n, 928173645107n)}
select 'SUP2:' || public.suppress_external_action_sync_action('${action2}'::uuid, 'admin-1', 'sync-conc-op-collision', 'collision test 2');
select pg_sleep(0.25);
commit;
`);
  const [r1, r2] = await Promise.all([s1, s2]);
  const outcomes = [
    r1.stdout.match(/SUP1:([a-z_]+)/)?.[1],
    r2.stdout.match(/SUP2:([a-z_]+)/)?.[1],
  ].sort();
  assert.deepEqual(outcomes, ["operation_conflict", "suppressed"]);

  // Verify exactly one action is suppressed and the loser action remains active
  const state = await run(`
begin;
set local role service_role;
select count(*) filter (where suppressed_at is not null) || ':' || count(*) filter (where suppressed_at is null)
from private.external_action_sync_identities
where identity_hash in ('${hashSuppressA}', '${hashSuppressB}');
commit;
`);
  assert.match(state.stdout, /1:1/);

  // Concurrent identical replay on the winning action is idempotent
  const winnerAction = r1.stdout.includes("SUP1:suppressed") ? action1 : action2;
  const winnerReason = r1.stdout.includes("SUP1:suppressed") ? "collision test 1" : "collision test 2";
  const [rep1, rep2] = await Promise.all([
    run(`begin; set local role service_role; select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-rep-1"}', true); select set_config('request.jwt.claim.role', 'service_role', true); select 'REP:' || public.suppress_external_action_sync_action('${winnerAction}'::uuid, 'admin-1', 'sync-conc-op-collision', '${winnerReason}'); commit;`, "rep1"),
    run(`begin; set local role service_role; select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-rep-2"}', true); select set_config('request.jwt.claim.role', 'service_role', true); select 'REP:' || public.suppress_external_action_sync_action('${winnerAction}'::uuid, 'admin-1', 'sync-conc-op-collision', '${winnerReason}'); commit;`, "rep2"),
  ]);
  assert.match(rep1.stdout, /REP:suppressed/);
  assert.match(rep2.stdout, /REP:suppressed/);

  await run(`
begin;
set local role postgres;
delete from private.external_action_sync_suppression_audit where operation_id = 'sync-conc-op-collision';
delete from private.external_action_sync_references where identity_hash in ('${hashSuppressA}', '${hashSuppressB}');
delete from private.external_action_sync_identities where identity_hash in ('${hashSuppressA}', '${hashSuppressB}');
delete from public.actions where id in ('${action1}'::uuid, '${action2}'::uuid);
commit;
`, "sup_cleanup");
}

async function testConcurrentExpiredTokenVsTakeover() {
  const expiredToken = "50000000-0000-4000-8000-000000000001";
  const takeoverToken = "50000000-0000-4000-8000-000000000002";
  await run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-exp-setup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select * from public.reserve_external_action_sync_reference(
  '${hashExpired}', '${orgA}', 'sync-conc', '${expiredToken}'::uuid,
  'jagis_pour_la_nature', 'conc-event-expired', 'https://example.test/exp', 'r1', '{"exp":1}'::jsonb, '${"9".repeat(64)}'
);
commit;
`, "exp_setup_reserve");
  await run(`
begin;
set local role postgres;
update private.external_action_sync_identities
   set claim_expires_at = now() - interval '2 minutes'
 where identity_hash = '${hashExpired}';
commit;
`, "exp_setup_expire");

  const sExpired = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-exp-1"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645109n, 928173645110n)}
select 'EXP:' || reservation_status
from public.reserve_external_action_sync_reference(
  '${hashExpired}', '${orgA}', 'sync-conc', '${expiredToken}'::uuid,
  'jagis_pour_la_nature', 'conc-event-expired', 'https://example.test/exp', 'r2', '{"exp":2}'::jsonb, '${"a".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`);
  const sTakeover = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-exp-2"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(928173645110n, 928173645109n)}
select 'TAKEOVER:' || reservation_status
from public.reserve_external_action_sync_reference(
  '${hashExpired}', '${orgA}', 'sync-conc', '${takeoverToken}'::uuid,
  'jagis_pour_la_nature', 'conc-event-expired', 'https://example.test/exp-takeover', 'r3', '{"exp":3}'::jsonb, '${"b".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`);
  const [expRes, takeRes] = await Promise.all([sExpired, sTakeover]);
  assert.match(expRes.stdout, /EXP:(?:claim_expired|busy)/);
  assert.match(takeRes.stdout, /TAKEOVER:reserved/);
}

async function testDistinctIdentityHashReferenceCollision() {
  const tokenA = "60000000-0000-4000-8000-000000000001";
  const tokenB = "60000000-0000-4000-8000-000000000002";
  const makeSession = (index, hash, token, ownKey, otherKey) => run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-distinct-${index}"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(ownKey, otherKey)}
select 'RESULT:' || reservation_status || ':' || identity_hash
from public.reserve_external_action_sync_reference(
  '${hash}', '${orgA}', 'sync-conc-distinct-${index}', '${token}'::uuid,
  'jagis_pour_la_nature', 'conc-event-distinct-hash', 'https://example.test/distinct-${index}', 'rd-${index}',
  '{"distinct":${index}}'::jsonb, '${"c".repeat(64)}'
);
select pg_sleep(0.25);
commit;
`, `distinct_${index}`);

  const [r1, r2] = await Promise.all([
    makeSession(1, hashDistinctA, tokenA, 928173645121n, 928173645122n),
    makeSession(2, hashDistinctB, tokenB, 928173645122n, 928173645121n),
  ]);
  const m1 = r1.stdout.match(/RESULT:([a-z_]+):([0-9a-f]{64})/);
  const m2 = r2.stdout.match(/RESULT:([a-z_]+):([0-9a-f]{64})/);
  assert.ok(m1 && m2, `Unexpected distinct-hash collision output: ${r1.stdout} | ${r2.stdout}`);
  assert.deepEqual([m1[1], m2[1]].sort(), ["busy", "reserved"]);
  const winnerHash = m1[1] === "reserved" ? hashDistinctA : hashDistinctB;
  const loserHash = winnerHash === hashDistinctA ? hashDistinctB : hashDistinctA;
  assert.equal(m1[2], winnerHash);
  assert.equal(m2[2], winnerHash);

  const residual = await run(`
begin;
set local role service_role;
select 'COUNTS:' ||
  (select count(*) from private.external_action_sync_identities where identity_hash = '${winnerHash}') || ':' ||
  (select count(*) from private.external_action_sync_identities where identity_hash = '${loserHash}') || ':' ||
  (select count(*) from private.external_action_sync_references where source_id = 'jagis_pour_la_nature' and external_event_id = 'conc-event-distinct-hash' and identity_hash = '${winnerHash}');
commit;
`, "distinct_residual");
  assert.match(residual.stdout, /COUNTS:1:0:1/);
}

async function testExpirationDuringLockWaitAndCompletionRejection() {
  const tokenReserve = "70000000-0000-4000-8000-000000000001";
  const tokenComplete = "70000000-0000-4000-8000-000000000002";

  // Setup both identities with short 0.35s leases
  await run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-lock-exp-setup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select * from public.reserve_external_action_sync_reference(
  '${hashLockExpire}', '${orgA}', 'sync-conc', '${tokenReserve}'::uuid,
  'jagis_pour_la_nature', 'conc-event-lock-exp-1', 'https://example.test/le1', 'r1', '{"le":1}'::jsonb, '${"d".repeat(64)}'
);
select * from public.reserve_external_action_sync_reference(
  '${hashLockExpireComplete}', '${orgA}', 'sync-conc', '${tokenComplete}'::uuid,
  'jagis_pour_la_nature', 'conc-event-lock-exp-2', 'https://example.test/le2', 'r1', '{"le":2}'::jsonb, '${"e".repeat(64)}'
);
commit;
`, "lock_exp_setup");

  await run(`
begin;
set local role postgres;
update private.external_action_sync_identities
   set claim_expires_at = clock_timestamp() + interval '0.45 seconds'
 where identity_hash in ('${hashLockExpire}', '${hashLockExpireComplete}');
commit;
`, "lock_exp_arm");

  // Session 1 acquires FOR UPDATE before expiration and holds it past 0.45s.
  // Session 2 starts its transaction BEFORE expiration (now() < claim_expires_at),
  // waits on Session 1's lock until after expiration, and must observe claim_expired via clock_timestamp().
  const holderReserve = run(`
begin;
set local role postgres;
select 1 from private.external_action_sync_identities where identity_hash = '${hashLockExpire}' for update;
select pg_advisory_lock(928173645131);
select pg_sleep(0.8);
commit;
`, "lock_exp_holder_reserve");

  const waiterReserve = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-lock-exp-res"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
declare v_ok boolean := false;
begin
  for i in 1..200 loop
    if not pg_try_advisory_lock(928173645131) then
      v_ok := true;
      exit;
    end if;
    perform pg_advisory_unlock(928173645131);
    perform pg_sleep(0.02);
  end loop;
  if not v_ok then raise exception 'Lock-wait barrier timed out'; end if;
end $$;
select 'LOCK_WAIT_RESERVE:' || reservation_status
from public.reserve_external_action_sync_reference(
  '${hashLockExpire}', '${orgA}', 'sync-conc', '${tokenReserve}'::uuid,
  'jagis_pour_la_nature', 'conc-event-lock-exp-1', 'https://example.test/le1-new', 'r2', '{"le":2}'::jsonb, '${"f".repeat(64)}'
);
commit;
`, "lock_exp_waiter_reserve");

  const holderComplete = run(`
begin;
set local role postgres;
select 1 from private.external_action_sync_identities where identity_hash = '${hashLockExpireComplete}' for update;
select pg_advisory_lock(928173645132);
select pg_sleep(0.8);
commit;
`, "lock_exp_holder_complete");

  const waiterComplete = run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"sync-conc-lock-exp-comp"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
declare v_ok boolean := false;
begin
  for i in 1..200 loop
    if not pg_try_advisory_lock(928173645132) then
      v_ok := true;
      exit;
    end if;
    perform pg_advisory_unlock(928173645132);
    perform pg_sleep(0.02);
  end loop;
  if not v_ok then raise exception 'Lock-wait completion barrier timed out'; end if;
end $$;
select 'LOCK_WAIT_COMPLETE:' || public.complete_external_action_sync_identity(
  '${hashLockExpireComplete}', '${tokenComplete}'::uuid, '${actionA}'::uuid
);
commit;
`, "lock_exp_waiter_complete");

  const [, wRes, , wComp] = await Promise.all([holderReserve, waiterReserve, holderComplete, waiterComplete]);
  assert.match(wRes.stdout, /LOCK_WAIT_RESERVE:claim_expired/);
  assert.match(wComp.stdout, /LOCK_WAIT_COMPLETE:claim_expired/);

  const unlinked = await run(`
begin;
set local role service_role;
select 'UNLINKED:' || count(*) filter (where action_id is null)
from private.external_action_sync_identities
where identity_hash in ('${hashLockExpire}', '${hashLockExpireComplete}');
commit;
`, "lock_exp_verify_unlinked");
  assert.match(unlinked.stdout, /UNLINKED:2/);
}

let currentPhase = "INIT";

async function main() {
  try {
    currentPhase = "SETUP";
    await setup();
    currentPhase = "RESERVE_COLLISION";
    await testConcurrentReservationCollision();
    currentPhase = "FOREIGN_OWNER";
    await testConcurrentForeignOwnerCollision();
    currentPhase = "LOCK_ORDER";
    await testLockOrderReserveVsCompleteAndSuppress();
    currentPhase = "SUPPRESS_COLLISION";
    await testConcurrentSuppressionOperationIdCollisionAndIdempotency();
    currentPhase = "EXPIRED_TAKEOVER";
    await testConcurrentExpiredTokenVsTakeover();
    currentPhase = "DISTINCT_HASH_COLLISION";
    await testDistinctIdentityHashReferenceCollision();
    currentPhase = "LOCK_WAIT_EXPIRATION";
    await testExpirationDuringLockWaitAndCompletionRejection();
    console.log("EXECUTED_DB_CONTRACT: External action sync two-session reservation, lock-order, expiration and suppression idempotency contract passed.");
  } catch (error) {
    const isAssertion = error?.code === "ERR_ASSERTION" || error?.name === "AssertionError";
    console.log(`TERRITORIAL_PHASE=${currentPhase}_${isAssertion ? "ASSERT" : "SQL"}`);
    process.exitCode = 1;
  } finally {
    await run(cleanupSql, "cleanup").catch(() => {});
  }
}

await main();
