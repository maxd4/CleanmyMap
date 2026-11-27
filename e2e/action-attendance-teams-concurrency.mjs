import assert from "node:assert/strict";
import { runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const actionId = "33333333-3333-4333-8333-333333333481";
const entryId = "33333333-3333-4333-8333-333333333482";
const createRequestId = "33333333-3333-4333-8333-333333333483";
const renameARequestId = "33333333-3333-4333-8333-333333333484";
const renameBRequestId = "33333333-3333-4333-8333-333333333485";
const writerAName = "attendance-teams-writer-a";
const writerBName = "attendance-teams-writer-b";
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
select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-teams-cleanup"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
delete from public.actions where id = '${actionId}'::uuid and created_by_clerk_id = 'attendance-teams-setup';
commit;
`;

try {
  await run(cleanup);
  await run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-teams-setup"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    insert into public.actions (id, created_by_clerk_id, action_date, location_label, status, action_phase)
    values ('${actionId}'::uuid, 'attendance-teams-setup', current_date + 1, 'Attendance teams concurrency', 'approved', 'pre_action');
    insert into public.action_attendance_entries(id, action_id, display_label, provenance, created_by, updated_by)
    values ('${entryId}'::uuid, '${actionId}'::uuid, 'Team member', 'organizer_entry', 'attendance-teams-setup', 'attendance-teams-setup');
    do $$
    declare v_first jsonb; v_retry jsonb; v_team_id uuid;
    begin
      v_first := public.mutate_action_attendance_team('${actionId}'::uuid, 'attendance-teams-owner', '${createRequestId}'::uuid, 'team_create', null, null, null, '[]'::jsonb, '{"name":"Initial team"}'::jsonb);
      v_retry := public.mutate_action_attendance_team('${actionId}'::uuid, 'attendance-teams-owner', '${createRequestId}'::uuid, 'team_create', null, null, null, '[]'::jsonb, '{"name":"Initial team"}'::jsonb);
      v_team_id := (v_first->'teams'->0->'team'->>'id')::uuid;
      if v_team_id is null or v_team_id <> (v_retry->'teams'->0->'team'->>'id')::uuid then
        raise exception 'idempotent team creation returned another identity';
      end if;
      perform public.mutate_action_attendance_team('${actionId}'::uuid, 'attendance-teams-owner', '33333333-3333-4333-8333-333333333486'::uuid, 'member_assign', null, '${entryId}'::uuid, v_team_id,
        jsonb_build_array(jsonb_build_object('teamId', v_team_id, 'revision', 1)), '{}'::jsonb);
      raise notice 'ATTENDANCE_TEAM_ID=%', v_team_id;
    end $$;
    commit;
  `);

  const teamResult = await run(`select id from public.action_attendance_teams where action_id = '${actionId}'::uuid and name = 'Initial team';`);
  const teamId = teamResult.stdout.trim();
  assert.match(teamId, /^[0-9a-f-]{36}$/i, "idempotent creation must leave one stable team");

  const writerA = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-teams-a"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${writerAName}', true);
    select public.mutate_action_attendance_team('${actionId}'::uuid, 'attendance-teams-a', '${renameARequestId}'::uuid, 'team_rename', '${teamId}'::uuid, null, null,
      jsonb_build_array(jsonb_build_object('teamId', '${teamId}'::uuid, 'revision', 2)), '{"name":"Concurrent winner"}'::jsonb);
    select pg_sleep(1.5);
    commit;
  `);
  await waitForActivity(`select case when exists (select 1 from pg_stat_activity where application_name = '${writerAName}' and state = 'active' and wait_event = 'PgSleep') then 'WRITER_A_LOCKED' else 'WRITER_A_NOT_LOCKED' end;`, "WRITER_A_LOCKED");
  const writerB = run(`
    begin;
    set local role service_role;
    select set_config('request.jwt.claims', '{"role":"service_role","sub":"attendance-teams-b"}', true);
    select set_config('request.jwt.claim.role', 'service_role', true);
    select set_config('application_name', '${writerBName}', true);
    select public.mutate_action_attendance_team('${actionId}'::uuid, 'attendance-teams-b', '${renameBRequestId}'::uuid, 'team_rename', '${teamId}'::uuid, null, null,
      jsonb_build_array(jsonb_build_object('teamId', '${teamId}'::uuid, 'revision', 2)), '{"name":"Concurrent loser"}'::jsonb);
    commit;
  `);
  await waitForActivity(`select case when exists (select 1 from pg_stat_activity where application_name = '${writerBName}' and wait_event_type = 'Lock') then 'WRITER_B_WAITING' else 'WRITER_B_NOT_WAITING' end;`, "WRITER_B_WAITING");
  await writerA;
  let staleFailure;
  try { await writerB; } catch (error) { staleFailure = error; }
  assert.ok(staleFailure, "the second team mutation must fail after the first commits");
  assert.match(`${staleFailure.message ?? ""}\n${staleFailure.stderr ?? ""}\n${staleFailure.stdout ?? ""}`, /40001|revision_conflict/i);

  const final = await run(`select name || ':' || revision::text || ':' || (select count(*)::text from public.action_attendance_team_audit where action_id = t.action_id and team_id = t.id and operation = 'team_rename') || ':' || (select count(*)::text from public.action_attendance_team_audit where action_id = t.action_id and request_id = '${createRequestId}'::uuid) from public.action_attendance_teams t where t.id = '${teamId}'::uuid;`);
  assert.equal(final.stdout.trim(), "Concurrent winner:3:1:1", "only the winning rename and one idempotent create audit must persist");
  console.log("EXECUTED_DB_CONTRACT: Action attendance team idempotency and two-session revision conflict passed.");
} finally {
  await run(cleanup);
}
