import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const actionId = "00000000-0000-4000-8000-000000006c01";
const sameRequestActionId = "00000000-0000-4000-8000-000000006c11";
const requestIds = {
  A: "00000000-0000-4000-8000-000000006c02",
  B: "00000000-0000-4000-8000-000000006c03",
};
const proposalIds = {
  A: "00000000-0000-4000-8000-000000006c04",
  B: "00000000-0000-4000-8000-000000006c05",
};
const sameRequestIds = {
  request: "00000000-0000-4000-8000-000000006c12",
  proposalC: "00000000-0000-4000-8000-000000006c13",
  proposalD: "00000000-0000-4000-8000-000000006c14",
};
const mentorId = "action-buddy-concurrency-mentor";
const sameRequestMentors = { C: "action-buddy-concurrency-mentor-c", D: "action-buddy-concurrency-mentor-d" };
const barrierKeys = { A: 918273648101n, B: 918273648102n };
const sameRequestBarrierKeys = { C: 918273648103n, D: 918273648104n };

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
    throw new Error(`DB_SEMANTICS_NOT_EXECUTED: action buddy concurrency query failed.\n${detail}`);
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
    "Refusing an action buddy concurrency proof against a non-local destination",
  );
}

const cleanupSql = `
begin;
set local role postgres;
delete from public.actions where id = '${actionId}'::uuid;
delete from public.actions where id = '${sameRequestActionId}'::uuid;
commit;
`;

const setupSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"action-buddy-concurrency-setup"}', true);
insert into public.actions (
  id, created_by_clerk_id, action_date, event_start_time, location_label,
  status, action_phase, access_mode, moderation_visibility, review_state, published_at
) values (
  '${actionId}'::uuid, 'action-buddy-concurrency-organizer', current_date + 30, time '10:00', 'Action buddy concurrency fixture',
  'approved', 'pre_action', 'public', 'visible', 'approved', now()
);
insert into public.action_registrations (action_id, user_id, registration_status, registration_source)
values
  ('${actionId}'::uuid, 'action-buddy-concurrency-requester-a', 'confirmed', 'group_form'),
  ('${actionId}'::uuid, 'action-buddy-concurrency-requester-b', 'confirmed', 'group_form'),
  ('${actionId}'::uuid, '${mentorId}', 'confirmed', 'group_form');
insert into public.action_buddy_availability (action_id, mentor_user_id)
values ('${actionId}'::uuid, '${mentorId}');
insert into public.action_buddy_requests (id, action_id, requester_user_id)
values
  ('${requestIds.A}'::uuid, '${actionId}'::uuid, 'action-buddy-concurrency-requester-a'),
  ('${requestIds.B}'::uuid, '${actionId}'::uuid, 'action-buddy-concurrency-requester-b');
insert into public.action_buddy_proposals (id, request_id, mentor_user_id)
values
  ('${proposalIds.A}'::uuid, '${requestIds.A}'::uuid, '${mentorId}'),
  ('${proposalIds.B}'::uuid, '${requestIds.B}'::uuid, '${mentorId}');
insert into public.actions (
  id, created_by_clerk_id, action_date, event_start_time, location_label,
  status, action_phase, access_mode, moderation_visibility, review_state, published_at
) values (
  '${sameRequestActionId}'::uuid, 'action-buddy-concurrency-organizer-2', current_date + 30, time '10:00', 'Action buddy same-request fixture',
  'approved', 'pre_action', 'public', 'visible', 'approved', now()
);
insert into public.action_registrations (action_id, user_id, registration_status, registration_source)
values
  ('${sameRequestActionId}'::uuid, 'action-buddy-concurrency-requester-c', 'confirmed', 'group_form'),
  ('${sameRequestActionId}'::uuid, '${sameRequestMentors.C}', 'confirmed', 'group_form'),
  ('${sameRequestActionId}'::uuid, '${sameRequestMentors.D}', 'confirmed', 'group_form');
insert into public.action_buddy_availability (action_id, mentor_user_id)
values
  ('${sameRequestActionId}'::uuid, '${sameRequestMentors.C}'),
  ('${sameRequestActionId}'::uuid, '${sameRequestMentors.D}');
insert into public.action_buddy_requests (id, action_id, requester_user_id)
values ('${sameRequestIds.request}'::uuid, '${sameRequestActionId}'::uuid, 'action-buddy-concurrency-requester-c');
insert into public.action_buddy_proposals (id, request_id, mentor_user_id)
values
  ('${sameRequestIds.proposalC}'::uuid, '${sameRequestIds.request}'::uuid, '${sameRequestMentors.C}'),
  ('${sameRequestIds.proposalD}'::uuid, '${sameRequestIds.request}'::uuid, '${sameRequestMentors.D}');
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
  for v_attempt in 1..200 loop
    if pg_try_advisory_lock(${otherKey}) then
      perform pg_advisory_unlock(${otherKey});
      perform pg_sleep(0.05);
    else
      v_ready := true;
      exit;
    end if;
  end loop;
  if not v_ready then
    raise exception 'Action buddy concurrency barrier timed out for ${participant}';
  end if;
  raise notice 'ACTION_BUDDY_CONCURRENCY_READY=${participant} pid=%', pg_backend_pid();
end;
$$;
`;
}

function sessionSql(participant, proposalId, ownKey, otherKey) {
  return `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"action-buddy-concurrency-${participant.toLowerCase()}"}', true);
${barrierSql(participant, ownKey, otherKey)}
do $$
declare
  v_status text;
begin
  begin
    select result.status into v_status
    from public.accept_action_buddy_proposal('${proposalId}'::uuid) as result;
    raise notice 'ACTION_BUDDY_CONCURRENCY_RESULT=${participant} status=%', v_status;
  exception when others then
    raise notice 'ACTION_BUDDY_CONCURRENCY_RESULT=${participant} error=% sqlstate=%', sqlerrm, sqlstate;
  end;
end;
$$;
select pg_sleep(0.2);
select pg_advisory_unlock(${ownKey});
commit;
`;
}

function output(result) {
  return `${result.value?.stdout ?? ""}\n${result.value?.stderr ?? ""}`;
}

async function main() {
  await assertEphemeralDestination();
  try {
    await runQuery(cleanupSql);
    await runQuery(setupSql);
    const results = await Promise.allSettled([
      runQuery(sessionSql("A", proposalIds.A, barrierKeys.A, barrierKeys.B)),
      runQuery(sessionSql("B", proposalIds.B, barrierKeys.B, barrierKeys.A)),
      runQuery(sessionSql("C", sameRequestIds.proposalC, sameRequestBarrierKeys.C, sameRequestBarrierKeys.D)),
      runQuery(sessionSql("D", sameRequestIds.proposalD, sameRequestBarrierKeys.D, sameRequestBarrierKeys.C)),
    ]);
    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      throw new Error(rejected.map((result) => result.reason?.message ?? String(result.reason)).join("\n"));
    }

    const outputs = results.map(output);
    const ready = outputs.flatMap((value) => [...value.matchAll(/ACTION_BUDDY_CONCURRENCY_READY=[^ ]+ pid=(\d+)/g)]);
    assert.equal(ready.length, 4, "all PostgreSQL sessions must reach the concurrency barriers");
    assert.equal(new Set(ready.map((match) => match[1])).size, 4, "the proof must use four PostgreSQL backends");
    const resultText = outputs.join("\n");
    assert.equal((resultText.match(/ACTION_BUDDY_CONCURRENCY_RESULT=[^ ]+ status=matched/g) ?? []).length, 2, "one acceptance must match in each concurrency scenario");
    assert.equal((resultText.match(/action_buddy_conflict_mentor_already_matched/g) ?? []).length, 1, "the losing acceptance must report a mentor conflict");
    assert.equal((resultText.match(/action_buddy_conflict_request_not_open/g) ?? []).length, 1, "the same-request loser must report a request conflict");

    const finalState = await runQuery(`
select
  (select count(*) from public.action_buddy_requests where action_id = '${actionId}'::uuid and status = 'matched') as matched_count,
  (select count(*) from public.action_buddy_requests where action_id = '${actionId}'::uuid and status = 'open') as open_count,
  (select count(*) from public.action_buddy_requests where action_id = '${actionId}'::uuid and matched_mentor_user_id = '${mentorId}') as mentor_match_count,
  (select count(*) from public.action_buddy_proposals where request_id in ('${requestIds.A}'::uuid, '${requestIds.B}'::uuid) and status = 'accepted') as accepted_count,
  (select count(*) from public.action_buddy_requests where action_id = '${sameRequestActionId}'::uuid and status = 'matched') as same_request_matched_count,
  (select count(*) from public.action_buddy_proposals where request_id = '${sameRequestIds.request}'::uuid and status = 'accepted') as same_request_accepted_count;
`);
    const finalOutput = `${finalState.stdout}\n${finalState.stderr}`.replace(/\s+/g, " ");
    assert.match(finalOutput, /matched_count\s*\|\s*1/);
    assert.match(finalOutput, /open_count\s*\|\s*1/);
    assert.match(finalOutput, /mentor_match_count\s*\|\s*1/);
    assert.match(finalOutput, /accepted_count\s*\|\s*1/);
    assert.match(finalOutput, /same_request_matched_count\s*\|\s*1/);
    assert.match(finalOutput, /same_request_accepted_count\s*\|\s*1/);
    console.log("EXECUTED_DB_CONTRACT: Action buddy two-session matching invariant passed.");
  } finally {
    try {
      await runQuery(cleanupSql);
    } catch (error) {
      console.error(error);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
