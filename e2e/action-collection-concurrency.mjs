import assert from "node:assert/strict";
import { runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const actionId = "33333333-3333-4333-8333-333333333321";
const firstId = "33333333-3333-4333-8333-333333333322";
const secondId = "33333333-3333-4333-8333-333333333323";
const firstApp = "cleanmymap-collection-writer-a";
const secondApp = "cleanmymap-collection-writer-b";

const run = (sql, timeoutMs = 15_000) => runLocalPsqlQuery(sql, { timeoutMs, rawError: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cleanup = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"collection-concurrency-cleanup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
delete from public.action_participants where id in ('${firstId}'::uuid, '${secondId}'::uuid);
delete from public.actions
 where id = '${actionId}'::uuid
   and created_by_clerk_id = 'collection-concurrency-setup';
commit;
`;

try {
  await run(cleanup);
  await run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"collection-concurrency-setup"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    insert into public.actions (id, created_by_clerk_id, action_date, location_label, status, volunteers_count, collectors_count)
    values ('${actionId}'::uuid, 'collection-concurrency-setup', current_date, 'Collection write serialization', 'approved', 2, 1);
    insert into public.action_participants (id, action_id, user_id, participation_status)
    values ('${firstId}'::uuid, '${actionId}'::uuid, 'collection-concurrency-a', 'confirmed'),
           ('${secondId}'::uuid, '${actionId}'::uuid, 'collection-concurrency-b', 'confirmed');
    commit;
  `);

  const writerA = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${firstApp}', true);
    update public.action_participants set collection_status = 'collected' where id = '${firstId}'::uuid;
    select pg_sleep(1.5);
    commit;
  `);
  await pause(150);
  const writerB = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${secondApp}', true);
    update public.action_participants set collection_status = 'collected' where id = '${secondId}'::uuid;
    commit;
  `);

  let observedWait = false;
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const observation = await run(`
      select case when exists (
        select 1 from pg_stat_activity
         where application_name = '${secondApp}' and wait_event_type = 'Lock'
      ) then 'LOCK_WAIT_OBSERVED' else 'NO_LOCK_WAIT' end;
    `);
    if (observation.stdout.includes("LOCK_WAIT_OBSERVED")) {
      observedWait = true;
      break;
    }
    await pause(50);
  }
  assert.equal(observedWait, true, "second collector write must wait on the shared action row");
  await writerA;
  let concurrentFailure;
  try {
    await writerB;
  } catch (error) {
    concurrentFailure = error;
  }
  assert.ok(concurrentFailure, "the second collector confirmation must fail after acquiring the action lock");
  assert.match(`${concurrentFailure.stderr ?? ""}\n${concurrentFailure.stdout ?? ""}`, /23514|Confirmed collectors exceed/i);

  const invariant = await run(`
    select case when (
      select count(*) from public.action_participants
       where action_id = '${actionId}'::uuid and participation_status = 'confirmed' and collection_status = 'collected'
    ) <= (select collectors_count from public.actions where id = '${actionId}'::uuid)
    then 'COLLECTION_INVARIANT_PRESERVED' else 'COLLECTION_INVARIANT_BROKEN' end;
  `);
  assert.match(invariant.stdout, /COLLECTION_INVARIANT_PRESERVED/);
  console.log("Action collection count write serialization and concurrency contract passed.");
} finally {
  await run(cleanup);
}
