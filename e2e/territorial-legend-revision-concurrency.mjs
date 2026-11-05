import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const actionId = "00000000-0000-4000-8000-000000000014";
const advisoryKeys = { stale: 918273646014n, fresh: 918273646015n };

async function runQuery(sql, { timeoutMs = 30_000 } = {}) {
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
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: Territorial revision concurrency query failed.\n${detail}`);
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
  assert.ok(apiUrl.hostname === "127.0.0.1" || apiUrl.hostname === "localhost", "Refusing a non-local PostgreSQL destination");
}

const winner = (userId, fingerprint) => `jsonb_build_array(jsonb_build_object(
  'user_id', '${userId}', 'campaign_year', extract(year from (current_date - 10))::integer,
  'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris',
  'effective_on', current_date - 10, 'score', 2, 'rank', 1, 'tie_size', 1,
  'source_fingerprint', '${fingerprint}'
))`;

const cleanupSql = `
begin;
set local role postgres;
delete from public.action_participants where action_id = '${actionId}'::uuid;
delete from public.actions where id = '${actionId}'::uuid;
delete from public.territorial_legend_award_proofs where user_id in ('legend-revision-stale', 'legend-revision-fresh');
delete from public.territorial_legend_hold_periods where user_id in ('legend-revision-stale', 'legend-revision-fresh');
commit;
`;

const setupSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"territorial-revision-test"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
insert into public.actions (id, created_by_clerk_id, action_date, location_label, status)
values ('${actionId}'::uuid, 'territorial-revision-test', current_date, 'Territorial revision contract', 'approved');
insert into public.action_participants (action_id, user_id)
values ('${actionId}'::uuid, 'territorial-revision-participant');
commit;
`;

const staleSessionSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"territorial-revision-stale"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
create temp table territorial_revision_stale_state (revision timestamptz) on commit drop;
insert into territorial_revision_stale_state select public.get_territorial_legend_fact_revision();
select pg_advisory_lock(${advisoryKeys.stale});
select pg_advisory_lock(${advisoryKeys.fresh});
select pg_advisory_unlock(${advisoryKeys.fresh});
select public.reconcile_territorial_legend_snapshot(
  current_date - 10,
  ${winner("legend-revision-stale", "stale-before-delete")},
  (select revision from territorial_revision_stale_state)
);
select pg_advisory_unlock(${advisoryKeys.stale});
commit;
`;

const freshSessionSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"territorial-revision-fresh"}', true);
select pg_advisory_lock(${advisoryKeys.fresh});
do $$
declare
  v_attempt integer;
begin
  for v_attempt in 1..100 loop
    if not pg_try_advisory_lock(${advisoryKeys.stale}) then
      exit;
    end if;
    perform pg_advisory_unlock(${advisoryKeys.stale});
    perform pg_sleep(0.05);
  end loop;
end;
$$;
delete from public.action_participants where action_id = '${actionId}'::uuid;
select public.reconcile_territorial_legend_snapshot(
  current_date - 10,
  ${winner("legend-revision-fresh", "fresh-after-delete")},
  public.get_territorial_legend_fact_revision()
);
commit;
select pg_advisory_unlock(${advisoryKeys.fresh});
`;

function output(result) {
  return `${result.value?.stdout ?? ""}\n${result.value?.stderr ?? ""}`;
}

async function main() {
  await assertEphemeralDestination();
  await runQuery(cleanupSql);
  await runQuery(setupSql);
  const results = await Promise.allSettled([
    runQuery(staleSessionSql),
    runQuery(freshSessionSql),
  ]);
  const [staleResult, freshResult] = results;
  assert.equal(freshResult.status, "fulfilled", freshResult.status === "rejected" ? freshResult.reason?.message : "fresh reconciliation failed");
  assert.equal(staleResult.status, "rejected", "stale reconciliation must be rejected after the deletion");
  assert.match(staleResult.reason?.message ?? "", /older fact revision/);
  assert.match(output(freshResult), /fresh-after-delete/);
  assert.match(output(freshResult), /applied/);

  const finalState = await runQuery(`
select json_build_object(
  'fresh', (select count(*) from public.territorial_legend_hold_periods where user_id = 'legend-revision-fresh' and validity_status = 'active'),
  'stale', (select count(*) from public.territorial_legend_hold_periods where user_id = 'legend-revision-stale' and validity_status = 'active')
) as result;
`);
  assert.match(finalState.stdout, /"fresh"\s*:\s*1/);
  assert.match(finalState.stdout, /"stale"\s*:\s*0/);
  await runQuery(cleanupSql);
  console.log("EXECUTED_DB_CONTRACT: Territorial legend monotone fact revision and stale same-day reconciliation concurrency passed.");
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
