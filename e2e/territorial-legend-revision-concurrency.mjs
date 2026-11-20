import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLocalEphemeralDbUrl, runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const actionId = "00000000-0000-4000-8000-000000000014";
const TERRITORIAL_REVISION_PATTERN = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}[+-]\d{2}:\d{2})$/;

export function parseTerritorialRevisionNotice(output) {
  const matches = [...output.matchAll(/TERRITORIAL_OLD_REVISION=([^\r\n]+)/g)];
  assert.equal(matches.length, 1, "the stale session must emit exactly one fact revision");
  const revision = matches[0][1];
  assert.match(revision, TERRITORIAL_REVISION_PATTERN, "the fact revision must be a complete ISO-8601 timestamp with microseconds and timezone");
  assert.equal(Number.isNaN(Date.parse(revision)), false, "the fact revision must be a valid timestamp");
  return revision;
}

async function runQuery(sql, phase, { timeoutMs = 30_000 } = {}) {
  try {
    return await runLocalPsqlQuery(sql, { timeoutMs, errorLabel: `Territorial revision ${phase} failed` });
  } catch (error) {
    throw new Error(`TERRITORIAL_PHASE=${phase}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function assertEphemeralDestination() {
  await resolveLocalEphemeralDbUrl();
}

const winner = (userId, fingerprint) => `jsonb_build_array(jsonb_build_object(
  'user_id', '${userId}', 'campaign_year', extract(year from (current_date - 10))::integer,
  'level', 'commune', 'territory_code', '75056', 'territory_label', 'Paris',
  'effective_on', current_date - 10, 'score', 2, 'rank', 1, 'tie_size', 1,
  'source_fingerprint', '${fingerprint}'
))`;

const cleanupSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"territorial-revision-cleanup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
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

const readOldRevisionSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"territorial-revision-stale"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
begin
  raise notice 'TERRITORIAL_OLD_REVISION=%', to_char(public.get_territorial_legend_fact_revision(), 'YYYY-MM-DD"T"HH24:MI:SS.USOF');
  raise notice 'TERRITORIAL_SESSION=stale-read pid=%', pg_backend_pid();
end;
$$;
commit;
`;

const freshSessionSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"territorial-revision-fresh"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
declare
  v_result jsonb;
begin
  raise notice 'TERRITORIAL_SESSION=fresh pid=%', pg_backend_pid();
delete from public.action_participants where action_id = '${actionId}'::uuid;
  v_result := public.reconcile_territorial_legend_snapshot(
    current_date - 10,
    ${winner("legend-revision-fresh", "fresh-after-delete")},
    public.get_territorial_legend_fact_revision()
  );
  raise notice 'TERRITORIAL_FRESH_RESULT=%', v_result::text;
end;
$$;
commit;
`;

function staleSessionSql(oldRevision) {
  return `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"territorial-revision-stale"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
do $$
begin
  raise notice 'TERRITORIAL_SESSION=stale-publish pid=%', pg_backend_pid();
  perform public.reconcile_territorial_legend_snapshot(
    current_date - 10,
    ${winner("legend-revision-stale", "stale-before-delete")},
    '${oldRevision}'::timestamptz
  );
  raise exception 'stale territorial publication unexpectedly succeeded';
exception
  when sqlstate 'P0001' then
    if sqlerrm <> 'territorial legend snapshot was calculated from an older fact revision' then
      raise;
    end if;
    raise notice 'TERRITORIAL_STALE_REJECTED=%', sqlerrm;
end;
$$;
commit;
`;
}

function output(result) {
  return `${result.value?.stdout ?? ""}\n${result.value?.stderr ?? ""}`;
}

let ephemeralDestinationVerified = false;

async function main() {
  await assertEphemeralDestination();
  ephemeralDestinationVerified = true;
  await runQuery(cleanupSql, "initial-cleanup");
  await runQuery(setupSql, "setup");
  const oldRevisionResult = await runQuery(readOldRevisionSql, "read-old-revision");
  const oldOutput = output({ value: oldRevisionResult });
  const oldRevision = parseTerritorialRevisionNotice(oldOutput);
  const freshResult = await runQuery(freshSessionSql, "fresh-publication");
  const freshOutput = output({ value: freshResult });
  const freshResultMatch = freshOutput.match(/TERRITORIAL_FRESH_RESULT=(\{.*\})/);
  assert.ok(freshResultMatch, "fresh publication must expose the RPC JSON response");
  const freshRpcResult = JSON.parse(freshResultMatch[1]);
  assert.equal(freshRpcResult.status, "applied");
  assert.equal(typeof freshRpcResult.campaignYear, "number");
  assert.ok(freshRpcResult.affectedUserIds.includes("legend-revision-fresh"));
  assert.equal(typeof freshRpcResult.insertedProofs, "number");
  assert.equal(typeof freshRpcResult.extendedPeriods, "number");
  assert.equal(typeof freshRpcResult.closedPeriods, "number");

  const staleResult = await runQuery(staleSessionSql(oldRevision), "stale-publication");
  const staleOutput = output({ value: staleResult });
  assert.match(staleOutput, /TERRITORIAL_STALE_REJECTED=territorial legend snapshot was calculated from an older fact revision/);
  const sessionPids = [oldOutput, freshOutput, staleOutput].map((value) => value.match(/TERRITORIAL_SESSION=[^ ]+ pid=(\d+)/)?.[1]);
  assert.equal(sessionPids.every(Boolean), true, "all proof phases must report their PostgreSQL backend");
  assert.equal(new Set(sessionPids).size, 3, "revision read, fresh publication and stale publication must use distinct PostgreSQL sessions");

  const finalState = await runQuery(`
select json_build_object(
  'fresh', (select count(*) from public.territorial_legend_hold_periods where user_id = 'legend-revision-fresh' and validity_status = 'active'),
  'stale', (select count(*) from public.territorial_legend_hold_periods where user_id = 'legend-revision-stale'),
  'freshFingerprints', (select array_agg(distinct source_fingerprint order by source_fingerprint) from public.territorial_legend_hold_periods where user_id = 'legend-revision-fresh')
) as result;
`, "final-state");
  assert.match(finalState.stdout, /"fresh"\s*:\s*1/);
  assert.match(finalState.stdout, /"stale"\s*:\s*0/);
  assert.match(finalState.stdout, /fresh-after-delete/);
  await runQuery(cleanupSql, "final-cleanup");
  console.log("EXECUTED_DB_CONTRACT: Territorial legend monotone fact revision and stale same-day reconciliation concurrency passed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(async (error) => {
    if (ephemeralDestinationVerified) {
      try {
        await runQuery(cleanupSql, "failure-cleanup");
      } catch (cleanupError) {
        console.error(cleanupError);
      }
    }
    console.error(error);
    process.exitCode = 1;
  });
}
