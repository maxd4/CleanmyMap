import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const userId = "m7c-concurrent-user";
const sourceId = "m7c-concurrent-source";
const barrierKeys = { first: 918273646001n, second: 918273646002n };

async function runQuery(sql, { timeoutMs = 20_000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await execFileAsync(
      supabaseCommand,
      ["supabase", "db", "query", "--workdir", "apps/web", "--local", sql],
      {
        cwd: root,
        shell: process.platform === "win32",
        maxBuffer: 8 * 1024 * 1024,
        signal: controller.signal,
      },
    );
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Gamification PostgreSQL concurrency query failed.\n${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function assertEphemeralDestination() {
  let result;
  try {
    result = await execFileAsync(
      supabaseCommand,
      ["supabase", "status", "--workdir", "apps/web", "--output", "json"],
      { cwd: root, shell: process.platform === "win32", maxBuffer: 2 * 1024 * 1024 },
    );
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: ephemeral Supabase status is unavailable.\n${detail}`);
  }
  const start = result.stdout.indexOf("{");
  if (start < 0) throw new Error("DB_SEMANTICS_NOT_EXECUTED: Supabase status did not return JSON.");
  const status = JSON.parse(result.stdout.slice(start));
  const apiUrl = new URL(status.API_URL ?? "");
  assert.ok(
    apiUrl.hostname === "127.0.0.1" || apiUrl.hostname === "localhost",
    "Refusing a Gamification concurrency proof against a non-local destination",
  );
}

const cleanupSql = `
begin;
set local role postgres;
delete from public.app_notifications where user_id = '${userId}';
delete from public.progression_events where user_id = '${userId}';
delete from public.progression_profiles where user_id = '${userId}';
commit;
`;

function barrierSql(participant, ownKey, otherKey) {
  return `
select pg_advisory_lock(${ownKey});
do $$
declare
  v_ready boolean := false;
  v_attempt integer;
begin
  for v_attempt in 1..100 loop
    if pg_try_advisory_lock(${otherKey}) then
      perform pg_advisory_unlock(${otherKey});
      perform pg_sleep(0.05);
    else
      v_ready := true;
      exit;
    end if;
  end loop;
  if not v_ready then
    raise exception 'M7C concurrency barrier timed out for ${participant}';
  end if;
  raise notice 'M7C_CONCURRENCY_READY=${participant} pid=%', pg_backend_pid();
end;
$$;
`;
}

function sessionSql(participant, ownKey, otherKey) {
  return `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"system"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${barrierSql(participant, ownKey, otherKey)}
do $$
declare
  v_result jsonb;
begin
  v_result := public.apply_gamification_reconciliation(
    '${userId}',
    '[]'::jsonb,
    '[{"event_type":"action_declare_validation","source_table":"actions","source_id":"${sourceId}","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-26","metadata":{"gamificationEngine":"CURRENT_RECONCILABLE","logicalId":"${userId}:organisation:actions:${sourceId}::validated","mechanicId":"organisation","rulesVersion":"gamification-2026.10-v1"}}]'::jsonb,
    '[]'::jsonb,
    '{}'::bigint[],
    null,
    '{"xp_total":1,"xp_pending":0,"xp_validated":1,"current_level":1,"potential_level":2,"current_applied_rules_revision":16}'::jsonb,
    '{"reconciliationId":"m7c-concurrent-receipt","occurredAt":"2026-10-26T12:00:00Z","hasUserVisibleChanges":true}'::jsonb,
    null
  );
  raise notice 'M7C_CONCURRENCY_RESULT=${participant} status=% reason=%', v_result ->> 'status', v_result ->> 'reason';
end;
$$;
select pg_advisory_unlock(${ownKey});
commit;
`;
}

function output(result) {
  return `${result.value?.stdout ?? ""}\n${result.value?.stderr ?? ""}`;
}

async function main() {
  await assertEphemeralDestination();
  await runQuery(cleanupSql);
  const results = await Promise.allSettled([
    runQuery(sessionSql("A", barrierKeys.first, barrierKeys.second)),
    runQuery(sessionSql("B", barrierKeys.second, barrierKeys.first)),
  ]);
  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length > 0) {
    throw new Error(rejected.map((result) => result.reason?.message ?? String(result.reason)).join("\n"));
  }

  const outputs = results.map(output);
  const ready = outputs.flatMap((value) => [...value.matchAll(/M7C_CONCURRENCY_READY=[^ ]+ pid=(\d+)/g)]);
  assert.equal(ready.length, 2, "both PostgreSQL sessions must reach the barrier");
  assert.equal(new Set(ready.map((match) => match[1])).size, 2, "the proof must use two PostgreSQL backends");
  assert.equal(outputs.filter((value) => /M7C_CONCURRENCY_RESULT=[^ ]+ status=applied/.test(value)).length, 1, "exactly one same-user reconciliation may apply");
  assert.equal(outputs.filter((value) => /M7C_CONCURRENCY_RESULT=[^ ]+ status=conflict/.test(value)).length, 1, "the stale same-user reconciliation must conflict");
  assert.equal(outputs.filter((value) => /reason=profile_created_after_snapshot/.test(value)).length, 1, "the losing session must observe the profile CAS conflict");

  const finalState = await runQuery(`
select json_build_object(
  'events', (select count(*) from public.progression_events where user_id = '${userId}' and source_id = '${sourceId}'),
  'profiles', (select count(*) from public.progression_profiles where user_id = '${userId}'),
  'receipts', (select count(*) from public.app_notifications where user_id = '${userId}' and type = 'gamification_reconciliation'),
  'xp_validated', (select xp_validated from public.progression_profiles where user_id = '${userId}')
) as result;
`);
  assert.match(finalState.stdout, /"events"\s*:\s*1/);
  assert.match(finalState.stdout, /"profiles"\s*:\s*1/);
  assert.match(finalState.stdout, /"receipts"\s*:\s*1/);
  assert.match(finalState.stdout, /"xp_validated"\s*:\s*1/);

  await runQuery(cleanupSql);
  console.log("EXECUTED_DB_CONTRACT: Gamification reconciliation two-session lock, CAS, atomicity and idempotence passed.");
}

main().catch(async (error) => {
  try {
    await runQuery(cleanupSql);
  } catch (cleanupError) {
    console.error(cleanupError);
  }
  console.error(error);
  process.exitCode = 1;
});
