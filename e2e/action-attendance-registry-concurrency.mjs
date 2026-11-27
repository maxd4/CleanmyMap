import assert from "node:assert/strict";
import { runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const actionId = "33333333-3333-4333-8333-333333333391";
const retryRequestId = "33333333-3333-4333-8333-333333333392";
const renameARequestId = "33333333-3333-4333-8333-333333333393";
const renameBRequestId = "33333333-3333-4333-8333-333333333394";
const restoreARequestId = "33333333-3333-4333-8333-333333333395";
const restoreBRequestId = "33333333-3333-4333-8333-333333333396";
const writerAName = "attendance-registry-writer-a";
const writerBName = "attendance-registry-writer-b";
const restoreWriterAName = "attendance-registry-restore-a";
const restoreWriterBName = "attendance-registry-restore-b";
const run = (sql, timeoutMs = 15_000) => runLocalPsqlQuery(sql, { timeoutMs, rawError: true, tuplesOnly: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForActivity(sql, marker, timeoutMs = 8_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const observation = await run(sql);
    if (observation.stdout.includes(marker)) return;
    await pause(50);
  }
  throw new Error(`Timed out waiting for PostgreSQL activity marker ${marker}`);
}

const cleanup = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-registry-cleanup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
delete from public.actions where id = '${actionId}'::uuid and created_by_clerk_id = 'attendance-registry-setup';
commit;
`;

try {
  await run(cleanup);
  await run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-registry-setup"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    insert into public.actions (id, created_by_clerk_id, action_date, location_label, status, action_phase)
    values ('${actionId}'::uuid, 'attendance-registry-setup', current_date + 1, 'Attendance registry concurrency', 'approved', 'pre_action');
    do $$
    declare v_first jsonb; v_retry jsonb;
    begin
      v_first := public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-registry-actor', '${retryRequestId}'::uuid, 'add', null, null, '{"display_label":"Concurrent person"}'::jsonb);
      v_retry := public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-registry-actor', '${retryRequestId}'::uuid, 'add', null, null, '{"display_label":"Concurrent person"}'::jsonb);
      if v_first->>'id' <> v_retry->>'id' then raise exception 'idempotent retry returned another registry identity'; end if;
      raise notice 'ATTENDANCE_RETRY_ID=%', v_first->>'id';
    end $$;
    commit;
  `);

  const entryResult = await run(`select id from public.action_attendance_entries where action_id = '${actionId}'::uuid and display_label = 'Concurrent person' and deleted_at is null;`);
  const entryId = entryResult.stdout.trim();
  assert.match(entryId, /^[0-9a-f-]{36}$/i, "the idempotent add must leave one stable entry");

  const writerA = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-registry-a"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${writerAName}', true);
    select public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-registry-a', '${renameARequestId}'::uuid, 'rename', '${entryId}'::uuid, 1, '{"display_label":"Winner"}'::jsonb);
    select pg_sleep(1.5);
    commit;
  `);
  await waitForActivity(`select case when exists (select 1 from pg_stat_activity where application_name = '${writerAName}' and state = 'active' and wait_event = 'PgSleep') then 'WRITER_A_LOCKED' else 'WRITER_A_NOT_LOCKED' end;`, "WRITER_A_LOCKED");
  const writerB = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-registry-b"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${writerBName}', true);
    select public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-registry-b', '${renameBRequestId}'::uuid, 'rename', '${entryId}'::uuid, 1, '{"display_label":"Loser"}'::jsonb);
    commit;
  `);
  await waitForActivity(`select case when exists (select 1 from pg_stat_activity where application_name = '${writerBName}' and wait_event_type = 'Lock') then 'WRITER_B_WAITING' else 'WRITER_B_NOT_WAITING' end;`, "WRITER_B_WAITING");
  await writerA;
  let staleFailure;
  try {
    await writerB;
  } catch (error) {
    staleFailure = error;
  }
  assert.ok(staleFailure, "the second update must fail after the first commits");
  assert.match(`${staleFailure.message ?? ""}\n${staleFailure.stderr ?? ""}\n${staleFailure.stdout ?? ""}`, /40001|revision_conflict/i);

  const final = await run(`select display_label || ':' || revision::text || ':' || (select count(*)::text from public.action_attendance_entry_audit where action_id = e.action_id and entry_id = e.id and operation = 'rename') from public.action_attendance_entries e where e.id = '${entryId}'::uuid;`);
  assert.equal(final.stdout.trim(), "Winner:2:1", "only the winning update and its audit record must persist");

  await run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-reactivation-setup"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    select public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-reactivation-setup', '33333333-3333-4333-8333-333333333397'::uuid, 'add', null, null, '{"display_label":"Linked person","clerk_user_id":"attendance-registry-linked-member"}'::jsonb);
    select public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-reactivation-setup', '33333333-3333-4333-8333-333333333398'::uuid, 'delete', (select id from public.action_attendance_entries where action_id = '${actionId}'::uuid and clerk_user_id = 'attendance-registry-linked-member'), 1, '{}'::jsonb);
    commit;
  `);
  const linkedEntryResult = await run(`select id from public.action_attendance_entries where action_id = '${actionId}'::uuid and clerk_user_id = 'attendance-registry-linked-member';`);
  const linkedEntryId = linkedEntryResult.stdout.trim();
  assert.match(linkedEntryId, /^[0-9a-f-]{36}$/i, "the removed linked account must retain its registry identity");

  const restoreWriterA = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-reactivation-a"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${restoreWriterAName}', true);
    select public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-reactivation-a', '${restoreARequestId}'::uuid, 'add', null, null, '{"display_label":"Restored person A","clerk_user_id":"attendance-registry-linked-member"}'::jsonb);
    select pg_sleep(1.5);
    commit;
  `);
  await waitForActivity(`select case when exists (select 1 from pg_stat_activity where application_name = '${restoreWriterAName}' and state = 'active' and wait_event = 'PgSleep') then 'RESTORE_A_LOCKED' else 'RESTORE_A_NOT_LOCKED' end;`, "RESTORE_A_LOCKED");
  const restoreWriterB = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-reactivation-b"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${restoreWriterBName}', true);
    select public.mutate_action_attendance_entry('${actionId}'::uuid, 'attendance-reactivation-b', '${restoreBRequestId}'::uuid, 'add', null, null, '{"display_label":"Restored person B","clerk_user_id":"attendance-registry-linked-member"}'::jsonb);
    commit;
  `);
  await waitForActivity(`select case when exists (select 1 from pg_stat_activity where application_name = '${restoreWriterBName}' and wait_event_type = 'Lock') then 'RESTORE_B_WAITING' else 'RESTORE_B_NOT_WAITING' end;`, "RESTORE_B_WAITING");
  await restoreWriterA;
  let duplicateRestoreFailure;
  try {
    await restoreWriterB;
  } catch (error) {
    duplicateRestoreFailure = error;
  }
  assert.ok(duplicateRestoreFailure, "the second concurrent restore must fail after the first commits");
  assert.match(`${duplicateRestoreFailure.message ?? ""}\n${duplicateRestoreFailure.stderr ?? ""}\n${duplicateRestoreFailure.stdout ?? ""}`, /23505|entry_already_linked/i);
  const restored = await run(`select id::text || ':' || attendance_status || ':' || revision::text || ':' || (select count(*)::text from public.action_attendance_entry_audit where action_id = e.action_id and entry_id = e.id and request_id in ('${restoreARequestId}'::uuid, '${restoreBRequestId}'::uuid)) from public.action_attendance_entries e where e.id = '${linkedEntryId}'::uuid and deleted_at is null;`);
  assert.equal(restored.stdout.trim(), `${linkedEntryId}:unknown:3:1`, "one concurrent restore must preserve one stable unknown identity and one audit");
  console.log("EXECUTED_DB_CONTRACT: Attendance registry idempotent retry, two-session revision conflict and explicit reactivation uniqueness passed.");
} finally {
  await run(cleanup);
}
