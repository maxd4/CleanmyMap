import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const generationId = "10000000-0000-4000-8000-000000000051";
const quotaUserId = "reports-concurrency-quota-user";
const artifactIds = [
  "10000000-0000-4000-8000-000000000061",
  "10000000-0000-4000-8000-000000000062",
];
const barrierKeys = {
  quotaA: 918273645001n,
  quotaB: 918273645002n,
  artifactA: 918273645003n,
  artifactB: 918273645004n,
};

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
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Reports PostgreSQL concurrency query failed.\n${detail}`);
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
  let status;
  try {
    status = JSON.parse(result.stdout.slice(start));
  } catch (error) {
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Supabase status JSON is invalid. ${error.message}`);
  }
  const apiUrl = new URL(status.API_URL ?? "");
  assert.ok(
    apiUrl.hostname === "127.0.0.1" || apiUrl.hostname === "localhost",
    "Refusing a Reports concurrency proof against a non-local destination",
  );
}

const cleanupSql = `
begin;
set local role postgres;
delete from public.report_generation_pdf_artifacts
 where generation_id = '${generationId}'::uuid;
delete from public.report_generations where id = '${generationId}'::uuid;
delete from public.report_generation_daily_quota where user_id = '${quotaUserId}';
commit;
`;

const setupSql = `
begin;
set local role postgres;
insert into public.report_generations (
  id, generated_at, created_by_clerk_id, title, filename, period_id,
  scope_kind, scope_value, scope_label, detail_level, modules, snapshot
) values (
  '${generationId}'::uuid, '2030-01-15T12:00:00Z'::timestamptz,
  'reports-concurrency-owner', 'Synthetic Reports concurrency',
  'synthetic-reports-concurrency.pdf', 'full_history', 'global', '',
  'Synthetic global', 'default', '{"impact":true}'::jsonb,
  '{"schemaVersion":2,"kpis":{"actions":0}}'::jsonb
);
commit;
`;

function concurrentSessionBarrierSql(participant, ownKey, otherKey) {
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
    raise exception 'Reports concurrency barrier timed out for ${participant}';
  end if;
  raise notice 'REPORTS_CONCURRENCY_READY=${participant} pid=%', pg_backend_pid();
end;
$$;
`;
}

function quotaSessionSql(participant, ownKey, otherKey) {
  return `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${concurrentSessionBarrierSql(participant, ownKey, otherKey)}
do $$
declare
  v_allowed boolean;
begin
  select allowed into v_allowed
    from public.reserve_report_generation_daily_quota('${quotaUserId}');
  if v_allowed then
    raise notice 'REPORTS_QUOTA_RESULT=allowed';
  else
    raise notice 'REPORTS_QUOTA_RESULT=denied';
  end if;
  -- Keep the unique-key reservation open so the other session must race the
  -- same INSERT and observe the committed winner, not a sequential shortcut.
  perform pg_sleep(1);
end;
$$;
select pg_advisory_unlock(${ownKey});
commit;
`;
}

function artifactSessionSql(artifactId, participant, ownKey, otherKey) {
  return `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
${concurrentSessionBarrierSql(participant, ownKey, otherKey)}
do $$
declare
  v_constraint text;
begin
  begin
insert into public.report_generation_pdf_artifacts (
  id, generation_id, created_by_clerk_id, theme, renderer_version,
  storage_path, status
) values (
  '${artifactId}'::uuid, '${generationId}'::uuid,
  'reports-concurrency-owner', 'scientific', 'synthetic-concurrency-v1',
  'reports/synthetic/concurrency-${artifactId}.pdf', 'rendering'
);
    raise notice 'REPORTS_ARTIFACT_RESULT=inserted participant=${participant}';
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint <> 'report_generation_pdf_artifacts_unique_variant' then
      raise exception 'Unexpected Reports artifact uniqueness conflict: %', v_constraint;
    end if;
    raise notice 'REPORTS_ARTIFACT_RESULT=conflict participant=${participant}';
  end;
end;
$$;
-- Hold the unique variant until the competing session has reached the insert.
select pg_sleep(1);
select pg_advisory_unlock(${ownKey});
commit;
`;
}

async function runConcurrent(label, sqls) {
  const results = await Promise.allSettled(sqls.map((sql) => runQuery(sql)));
  if (results.some((result) => result.status === "rejected")) {
    const failures = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message ?? String(result.reason));
    throw new Error(`${label} concurrency query failed:\n${failures.join("\n")}`);
  }
  return results;
}

function resultOutput(result) {
  return `${result.value?.stdout ?? ""}\n${result.value?.stderr ?? ""}`;
}

function assertDistinctConcurrentSessions(label, results) {
  const outputs = results.map(resultOutput);
  const ready = outputs.flatMap((output) => [...output.matchAll(/REPORTS_CONCURRENCY_READY=[^ ]+ pid=(\d+)/g)]);
  assert.equal(ready.length, results.length, `${label}: every session must reach the concurrency barrier`);
  assert.equal(new Set(ready.map((match) => match[1])).size, results.length, `${label}: sessions must use distinct PostgreSQL backends`);
  return outputs;
}

async function main() {
  await assertEphemeralDestination();
  await runQuery(cleanupSql);
  await runQuery(setupSql);

  const quotaResults = await runConcurrent("quota", [
    quotaSessionSql("quota-a", barrierKeys.quotaA, barrierKeys.quotaB),
    quotaSessionSql("quota-b", barrierKeys.quotaB, barrierKeys.quotaA),
  ]);
  const quotaOutput = assertDistinctConcurrentSessions("quota", quotaResults);
  assert.equal(quotaOutput.filter((output) => output.includes("REPORTS_QUOTA_RESULT=allowed")).length, 1);
  assert.equal(quotaOutput.filter((output) => output.includes("REPORTS_QUOTA_RESULT=denied")).length, 1);

  const quotaRows = await runQuery(`
select count(*)::text as reservation_count
  from public.report_generation_daily_quota
 where user_id = '${quotaUserId}'
   and quota_day = (statement_timestamp() at time zone 'Europe/Paris')::date;
`);
  assert.match(quotaRows.stdout, /1/);

  const artifactResults = await runConcurrent("artifact", [
    artifactSessionSql(artifactIds[0], "artifact-a", barrierKeys.artifactA, barrierKeys.artifactB),
    artifactSessionSql(artifactIds[1], "artifact-b", barrierKeys.artifactB, barrierKeys.artifactA),
  ]);
  const artifactOutput = assertDistinctConcurrentSessions("artifact", artifactResults);
  assert.equal(artifactOutput.filter((output) => output.includes("REPORTS_ARTIFACT_RESULT=inserted")).length, 1);
  assert.equal(artifactOutput.filter((output) => output.includes("REPORTS_ARTIFACT_RESULT=conflict")).length, 1);

  const artifactRows = await runQuery(`
select count(*)::text as artifact_count
  from public.report_generation_pdf_artifacts
 where generation_id = '${generationId}'::uuid
   and theme = 'scientific'
   and renderer_version = 'synthetic-concurrency-v1';
`);
  assert.match(artifactRows.stdout, /1/);

  await runQuery(cleanupSql);
  console.log("EXECUTED_DB_CONTRACT: Reports quota and PDF artifact two-session concurrency contract passed.");
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
