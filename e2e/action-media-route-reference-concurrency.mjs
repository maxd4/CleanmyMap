import assert from "node:assert/strict";
import { resolveLocalEphemeralDbUrl, runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const actionId = "10000000-0000-4000-8000-000000000071";
const baselineId = "10000000-0000-4000-8000-000000000072";
const candidateIds = ["10000000-0000-4000-8000-000000000073", "10000000-0000-4000-8000-000000000074"];
const tombstoneRaceId = "10000000-0000-4000-8000-000000000075";
const barrierKeys = [918273645101n, 918273645102n];
const owner = "route-reference-concurrency-owner";
let proofPhase = "setup";

const run = async (sql, timeoutMs = 20_000) => {
  try {
    return await runLocalPsqlQuery(sql, {
      timeoutMs,
      errorLabel: "Route-reference PostgreSQL concurrency query failed",
      rawError: true,
    });
  } catch (error) {
    throw new Error(`PROOF_PHASE=action_media.${proofPhase}\n${error instanceof Error ? error.message : String(error)}`);
  }
};

const cleanupSql = `
begin;
set local role service_role;
delete from public.action_media where action_id = '${actionId}'::uuid;
delete from public.actions where id = '${actionId}'::uuid and created_by_clerk_id = 'route-reference-concurrency-setup';
commit;
`;

async function assertEphemeralDestination() {
  await resolveLocalEphemeralDbUrl();
}

async function setup() {
  await run(cleanupSql);
  await run(`
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"route-reference-concurrency-setup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
insert into public.actions (
  id, created_by_clerk_id, action_date, location_label, status, action_phase,
  published_at, event_start_at, event_start_time, access_mode, moderation_visibility
) values (
  '${actionId}'::uuid, 'route-reference-concurrency-setup', current_date - 1,
  'Route reference quota concurrency', 'approved', 'post_action_complete',
  now() - interval '1 day', now() - interval '1 day', '09:00', 'public', 'visible'
);
insert into public.action_media (
  id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
  original_name, mime_type, size_bytes, sort_order, upload_state
) values (
  '${baselineId}'::uuid, '${actionId}'::uuid, '${owner}', 'baseline', 'route_reference',
  '${actionId}/${baselineId}.jpg', 'baseline.jpg', 'image/jpeg', 1024, 0, 'pending'
);
commit;
`);
}

async function proveTombstoneWinsLateFinalization() {
  proofPhase = "tombstone_fixture";
  await run(`
delete from public.action_media where action_id = '${actionId}'::uuid and client_upload_id like 'concurrent-%';
insert into public.action_media (
  id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
  original_name, mime_type, size_bytes, sort_order, upload_state
) values (
  '${tombstoneRaceId}'::uuid, '${actionId}'::uuid, '${owner}', 'tombstone-race', 'route_reference',
  '${actionId}/${tombstoneRaceId}.jpg', 'tombstone-race.jpg', 'image/jpeg', 1024, 0, 'pending'
);
`);
  proofPhase = "tombstone_race";
  const tombstone = run(`
begin;
update public.action_media
   set upload_state = 'failed', failure_reason = 'user_removed_pending_cleanup'
 where id = '${tombstoneRaceId}'::uuid and upload_state = 'pending' and failure_reason is null;
select pg_sleep(0.5);
commit;
`);
  await new Promise((resolve) => setTimeout(resolve, 75));
  const finalization = run(`
update public.action_media
   set upload_state = 'ready', failure_reason = null
 where id = '${tombstoneRaceId}'::uuid and upload_state = 'pending' and failure_reason is null;
`);
  const [tombstoneResult, finalizationResult] = await Promise.all([tombstone, finalization]);
  proofPhase = "tombstone_assertions";
  assert.match(tombstoneResult.stdout, /UPDATE 1/);
  assert.match(finalizationResult.stdout, /UPDATE 0/);
  const row = await run(`select upload_state || ':' || failure_reason from public.action_media where id = '${tombstoneRaceId}'::uuid;`);
  assert.match(row.stdout, /failed:user_removed_pending_cleanup/);
}

function sessionSql(index) {
  const otherIndex = 1 - index;
  const id = candidateIds[index];
  const ownKey = barrierKeys[index];
  const otherKey = barrierKeys[otherIndex];
  return `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"route-reference-concurrency-${index}"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
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
  if not v_ready then raise exception 'Route-reference concurrency barrier timed out'; end if;
end;
$$;
do $$
begin
  insert into public.action_media (
    id, action_id, created_by_clerk_id, client_upload_id, purpose, storage_path,
    original_name, mime_type, size_bytes, sort_order, upload_state
  ) values (
    '${id}'::uuid, '${actionId}'::uuid, '${owner}', 'concurrent-${index}', 'route_reference',
    '${actionId}/${id}.jpg', 'concurrent.jpg', 'image/jpeg', 1024, ${index + 1}, 'pending'
  );
  raise notice 'ROUTE_REFERENCE_QUOTA_RESULT=accepted participant=${index}';
exception when sqlstate 'P0001' then
  if sqlerrm <> 'An action cannot have more active media for this purpose' then raise; end if;
  raise notice 'ROUTE_REFERENCE_QUOTA_RESULT=denied participant=${index}';
end;
end;
$$;
select pg_sleep(0.35);
select pg_advisory_unlock(${ownKey});
commit;
`;
}

async function main() {
  proofPhase = "destination_check";
  await assertEphemeralDestination();
  try {
    proofPhase = "fixture_setup";
    await setup();
    proofPhase = "quota_concurrency";
    const sessions = await Promise.all(candidateIds.map((_, index) => run(sessionSql(index))));
    const outputs = sessions.map(({ stdout, stderr }) => `${stdout}\n${stderr}`);
    assert.equal(outputs.filter((output) => output.includes("ROUTE_REFERENCE_QUOTA_RESULT=accepted")).length, 1);
    assert.equal(outputs.filter((output) => output.includes("ROUTE_REFERENCE_QUOTA_RESULT=denied")).length, 1);
    proofPhase = "quota_count";
    const rows = await run(`select count(*)::text from public.action_media where action_id = '${actionId}'::uuid and purpose = 'route_reference' and upload_state in ('pending', 'ready');`);
    assert.match(rows.stdout, /\b2\b/);
    await proveTombstoneWinsLateFinalization();
    console.log("EXECUTED_DB_CONTRACT: Route-reference quota serialization and tombstone compare-and-set prevent late finalization from reactivating a removed intent.");
  } finally {
    proofPhase = "cleanup";
    await run(cleanupSql);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
