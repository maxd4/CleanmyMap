import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const userId = "quiz-rpc-concurrent";
const barrierKeys = { first: 918273646101n, second: 918273646102n };

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
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Quiz progression concurrency query failed.\n${detail}`);
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
  assert.ok(apiUrl.hostname === "127.0.0.1" || apiUrl.hostname === "localhost");
}

const cleanupSql = `
begin;
set local role postgres;
delete from public.progression_events where user_id = '${userId}';
delete from public.quiz_type_progress where user_id = '${userId}';
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
    raise exception 'QUIZ_RPC_CONCURRENCY barrier timed out for ${participant}';
  end if;
  raise notice 'QUIZ_RPC_CONCURRENCY_READY=${participant} pid=%', pg_backend_pid();
end;
$$;
`;
}

function sessionSql(participant, questionType, ownKey, otherKey) {
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
  v_result := public.record_quiz_progression(
    '${userId}',
    '${questionType}',
    array['quiz-a', 'quiz-b'],
    '[
      {"metric":"type","threshold":50,"user_id":"${userId}","event_type":"quiz_question_type_milestone","source_table":"quiz_type_progress","source_id":"${userId}-${questionType}-50","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-28","metadata":{}},
      {"metric":"balance","threshold":1,"user_id":"${userId}","event_type":"quiz_question_type_balance_milestone","source_table":"quiz_type_balance_progress","source_id":"${userId}-balanced-1","status_phase":"validated","weight":1,"xp_base":1,"xp_awarded":1,"occurred_on":"2026-10-28","metadata":{}}
    ]'::jsonb
  );
  raise notice 'QUIZ_RPC_CONCURRENCY_RESULT=${participant} correct=% balanced=% inserted=%', v_result ->> 'correct_count', v_result ->> 'balanced_count', jsonb_array_length(v_result -> 'inserted_events');
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
    runQuery(sessionSql("A", "quiz-a", barrierKeys.first, barrierKeys.second)),
    runQuery(sessionSql("B", "quiz-b", barrierKeys.second, barrierKeys.first)),
  ]);
  const rejected = results.filter((result) => result.status === "rejected");
  if (rejected.length > 0) {
    throw new Error(rejected.map((result) => result.reason?.message ?? String(result.reason)).join("\n"));
  }

  const outputs = results.map(output);
  const ready = outputs.flatMap((value) => [...value.matchAll(/QUIZ_RPC_CONCURRENCY_READY=[^ ]+ pid=(\d+)/g)]);
  assert.equal(ready.length, 2, "both PostgreSQL sessions must reach the barrier");
  assert.equal(new Set(ready.map((match) => match[1])).size, 2, "the proof must use two PostgreSQL backends");
  assert.equal(outputs.filter((value) => /QUIZ_RPC_CONCURRENCY_RESULT=[^ ]+ correct=1/.test(value)).length, 2, "both question types advance exactly once");
  assert.equal(outputs.filter((value) => /balanced=1/.test(value)).length, 1, "the serialized second answer observes the balanced threshold");
  assert.equal(outputs.filter((value) => /inserted=1/.test(value)).length, 1, "exactly one balanced event is inserted");

  const finalState = await runQuery(`
select json_build_object(
  'types', (select count(*) from public.quiz_type_progress where user_id = '${userId}' and correct_count = 1),
  'balanced_events', (select count(*) from public.progression_events where user_id = '${userId}' and source_id = '${userId}-balanced-1'),
  'type_events', (select count(*) from public.progression_events where user_id = '${userId}' and event_type = 'quiz_question_type_milestone')
) as result;
`);
  assert.match(finalState.stdout, /"types"\s*:\s*2/);
  assert.match(finalState.stdout, /"balanced_events"\s*:\s*1/);
  assert.match(finalState.stdout, /"type_events"\s*:\s*0/);

  await runQuery(cleanupSql);
  console.log("EXECUTED_DB_CONTRACT: Quiz progression two-session user lock and balanced milestone passed.");
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
