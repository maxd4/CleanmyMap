import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = process.cwd();
const supabaseCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const actionId = "22222222-2222-4222-8222-222222222222";
const targetUserId = "role-attestation-concurrency-user";
const reviewerId = "role-attestation-concurrency-reviewer";
const correctionReviewerId = "role-attestation-concurrency-correction-reviewer";
const lockHolderApplicationName = "cleanmymap-role-attestation-lock-holder";
const correctionApplicationName = "cleanmymap-role-attestation-correction";
const CONCURRENCY_QUERY_TIMEOUT_MS = 15_000;
const CONCURRENCY_SYNC_TIMEOUT_MS = 10_000;
const CONCURRENCY_POLL_INTERVAL_MS = 100;

async function runQuery(sql, { signal: callerSignal, timeoutMs = CONCURRENCY_QUERY_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort(callerSignal.reason);
  if (callerSignal?.aborted) {
    controller.abort(callerSignal.reason);
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await execFileAsync(
      supabaseCommand,
      ["supabase", "db", "query", "--workdir", "apps/web", "--local", sql],
      { cwd: root, shell: process.platform === "win32", maxBuffer: 8 * 1024 * 1024, signal: controller.signal },
    );
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    throw new Error(detail);
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

function startQuery(sql, query = runQuery) {
  const controller = new AbortController();
  let failure;
  const promise = Promise.resolve().then(() => query(sql, { signal: controller.signal }));
  // Attach the rejection handler synchronously: callers intentionally await the
  // command after one or more observation queries.
  promise.catch((error) => {
    failure = error;
  });
  return {
    promise,
    settled: promise.then(
      () => ({ status: "fulfilled" }),
      (error) => ({ status: "rejected", reason: error }),
    ),
    get failure() {
      return failure;
    },
    cancel: () => controller.abort(),
  };
}

async function waitForDatabaseObservation(
  sql,
  marker,
  description,
  { query = runQuery, command, timeoutMs = CONCURRENCY_SYNC_TIMEOUT_MS, pollIntervalMs = CONCURRENCY_POLL_INTERVAL_MS } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastObservation = "none";
  while (Date.now() < deadline) {
    if (command?.failure) throw command.failure;
    const observation = Promise.resolve()
      .then(() => query(sql, { timeoutMs: Math.max(1, deadline - Date.now()) }))
      .then(
        (result) => ({ type: "observation", result }),
        (error) => ({ type: "observation-error", error }),
      );
    const commandState = command?.settled.then((result) =>
      result.status === "rejected"
        ? { type: "command-error", error: result.reason }
        : { type: "command-completed" },
    );
    const outcome = await Promise.race([observation, commandState].filter(Boolean));
    if (outcome.type === "command-error") throw outcome.error;
    if (outcome.type === "command-completed") {
      throw new Error(`${description} command completed before the expected observation`);
    }
    if (outcome.type === "observation-error") {
      lastObservation = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
    } else {
      const result = outcome.result;
      lastObservation = String(result.stdout ?? "").trim();
      if (lastObservation.includes(marker)) {
        return;
      }
    }
    const pause = new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    if (command) {
      const commandDuringPause = command.settled.then((result) =>
        result.status === "rejected" ? { type: "command-error", error: result.reason } : { type: "command-completed" },
      );
      const pauseOutcome = await Promise.race([pause.then(() => ({ type: "pause" })), commandDuringPause]);
      if (pauseOutcome.type === "command-error") throw pauseOutcome.error;
      if (pauseOutcome.type === "command-completed") {
        throw new Error(`${description} command completed before the expected observation`);
      }
    } else {
      await pause;
    }
  }
  throw new Error(`${description} timed out after ${timeoutMs}ms; last observation: ${lastObservation.slice(0, 500)}`);
}

const setupSql = `
begin;
set local role postgres;
delete from public.action_role_attestation_audit where action_id = '${actionId}'::uuid;
delete from public.action_role_attestations where action_id = '${actionId}'::uuid;
delete from public.action_field_role_assignments where action_id = '${actionId}'::uuid;
delete from public.action_organizers where action_id = '${actionId}'::uuid;
delete from public.action_participants where action_id = '${actionId}'::uuid;
delete from public.actions where id = '${actionId}'::uuid;
delete from public.app_notifications where user_id = '${targetUserId}' and payload ->> 'actionId' = '${actionId}';
insert into public.actions (id, created_by_clerk_id, actor_name, action_date, location_label, waste_kg, cigarette_butts, volunteers_count, duration_minutes, status, published_at, type, action_phase, preparation_data, moderation_visibility)
values ('${actionId}'::uuid, '${reviewerId}', 'Concurrency contract', '2030-01-16', 'Ephemeral concurrency contract', 0, 0, 1, 30, 'approved', '2030-01-16T12:00:00Z'::timestamptz, 'action', 'post_action_complete', '{}'::jsonb, 'visible');
insert into public.action_organizers (action_id, organizer_clerk_id, organizer_label, is_primary)
values
  ('${actionId}'::uuid, '${reviewerId}', 'Concurrency reviewer', true),
  ('${actionId}'::uuid, '${correctionReviewerId}', 'Concurrency correction reviewer', false);
insert into public.action_participants (action_id, user_id, participation_status, participation_source)
values ('${actionId}'::uuid, '${targetUserId}', 'confirmed', 'group_form');
insert into public.action_field_role_assignments (action_id, user_id, role_code, assignment_status, assigned_by_clerk_id)
values ('${actionId}'::uuid, '${targetUserId}', 'group_lead', 'active', '${reviewerId}');
commit;
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.review_action_role_attestation('${actionId}'::uuid, '${targetUserId}', 'group_lead', 'confirm', '${reviewerId}', null, false);
commit;
`;

const holdActionLockSql = `
select set_config('application_name', '${lockHolderApplicationName}', false);
begin;
set local role postgres;
select id from public.actions where id = '${actionId}'::uuid for update;
do $$
declare v_attempt integer;
begin
  for v_attempt in 1..100 loop
    if exists (
      select 1
        from pg_stat_activity
       where application_name = '${correctionApplicationName}'
         and state = 'active'
         and wait_event_type = 'Lock'
    ) then
      perform pg_sleep(1);
      return;
    end if;
    perform pg_sleep(0.05);
  end loop;
  raise exception 'role_attestation_concurrency_sync_timeout';
end $$;
rollback;
`;

const concurrentCorrectionWithoutReasonSql = `
select set_config('application_name', '${correctionApplicationName}', false);
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.review_action_role_attestation('${actionId}'::uuid, '${targetUserId}', 'group_lead', 'confirm', '${correctionReviewerId}', null, false);
commit;
`;

const correctedDecisionSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.review_action_role_attestation('${actionId}'::uuid, '${targetUserId}', 'group_lead', 'reject', '${correctionReviewerId}', 'concurrent correction reason', false);
commit;
`;

const lockHolderProbeSql = `
select case when exists (
  select 1
    from pg_stat_activity
   where application_name = '${lockHolderApplicationName}'
     and state = 'active'
     and query like '%pg_sleep(0.05)%'
) then 'ROLE_ATTESTATION_LOCK_HELD' else 'ROLE_ATTESTATION_LOCK_NOT_HELD' end;
`;

const correctionWaitProbeSql = `
select case when exists (
  select 1
    from pg_stat_activity
   where application_name = '${correctionApplicationName}'
     and state = 'active'
     and wait_event_type = 'Lock'
) then 'ROLE_ATTESTATION_CORRECTION_WAITING' else 'ROLE_ATTESTATION_CORRECTION_NOT_WAITING' end;
`;

const verifyUnchangedSql = `
do $$
declare v_status text; v_audit_count bigint; v_notice_count bigint;
begin
  select verification_status into v_status from public.action_role_attestations where action_id = '${actionId}'::uuid and user_id = '${targetUserId}';
  select count(*) into v_audit_count from public.action_role_attestation_audit where action_id = '${actionId}'::uuid;
  select count(*) into v_notice_count from public.app_notifications where user_id = '${targetUserId}' and payload ->> 'actionId' = '${actionId}';
  if v_status <> 'confirmed' or v_audit_count <> 1 or v_notice_count <> 1 then raise exception 'concurrent correction without reason changed the attestation'; end if;
end $$;
`;

const verifySql = `
do $$
declare v_status text; v_audit_count bigint; v_notice_count bigint;
begin
  select verification_status into v_status from public.action_role_attestations where action_id = '${actionId}'::uuid and user_id = '${targetUserId}';
  select count(*) into v_audit_count from public.action_role_attestation_audit where action_id = '${actionId}'::uuid;
  select count(*) into v_notice_count from public.app_notifications where user_id = '${targetUserId}' and payload ->> 'actionId' = '${actionId}';
  if v_status <> 'rejected' or v_audit_count <> 2 or v_notice_count <> 2 then raise exception 'concurrent correction did not produce one audited revision and notice'; end if;
end $$;
`;

const cleanupSql = `
begin;
set local role postgres;
delete from public.action_role_attestation_audit where action_id = '${actionId}'::uuid;
delete from public.action_role_attestations where action_id = '${actionId}'::uuid;
delete from public.action_field_role_assignments where action_id = '${actionId}'::uuid;
delete from public.action_organizers where action_id = '${actionId}'::uuid;
delete from public.action_participants where action_id = '${actionId}'::uuid;
delete from public.actions where id = '${actionId}'::uuid;
delete from public.app_notifications where user_id = '${targetUserId}' and payload ->> 'actionId' = '${actionId}';
commit;
`;

function formatError(error) {
  if (error instanceof AggregateError) {
    return [error.message, ...error.errors.map((nestedError, index) => `cause ${index + 1}: ${formatError(nestedError)}`)].join("\n");
  }
  return error instanceof Error ? error.message : String(error);
}

export async function runActionRoleAttestationConcurrency({
  query = runQuery,
  syncTimeoutMs = CONCURRENCY_SYNC_TIMEOUT_MS,
  pollIntervalMs = CONCURRENCY_POLL_INTERVAL_MS,
} = {}) {
  await query(setupSql);
  let holder;
  let correction;
  let primaryError;
  let cleanupError;
  try {
    holder = startQuery(holdActionLockSql, query);
    await waitForDatabaseObservation(lockHolderProbeSql, "ROLE_ATTESTATION_LOCK_HELD", "action lock holder", {
      query,
      command: holder,
      timeoutMs: syncTimeoutMs,
      pollIntervalMs,
    });
    correction = startQuery(concurrentCorrectionWithoutReasonSql, query);
    await waitForDatabaseObservation(
      correctionWaitProbeSql,
      "ROLE_ATTESTATION_CORRECTION_WAITING",
      "concurrent correction lock wait",
      { query, command: correction, timeoutMs: syncTimeoutMs, pollIntervalMs },
    );
    await assert.rejects(
      correction.promise,
      (error) => String(error).includes("action_role_attestation_correction_reason_required"),
    );
    await holder.promise;
    await query(verifyUnchangedSql);
    await query(correctedDecisionSql);
    await query(verifySql);
  } catch (error) {
    primaryError = error;
  } finally {
    correction?.cancel();
    holder?.cancel();
    await Promise.allSettled([holder?.promise, correction?.promise].filter(Boolean));
    try {
      await query(cleanupSql);
    } catch (error) {
      cleanupError = error;
    }
  }

  if (primaryError && cleanupError) {
    throw new AggregateError([primaryError, cleanupError], "Concurrent role attestation proof and cleanup both failed");
  }
  if (primaryError) throw primaryError;
  if (cleanupError) throw cleanupError;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runActionRoleAttestationConcurrency()
    .then(() => console.log("Role attestation concurrent correction contract passed."))
    .catch((error) => {
      console.error(`DB_SEMANTICS_NOT_EXECUTED: ${formatError(error)}`);
      process.exitCode = 1;
    });
}
