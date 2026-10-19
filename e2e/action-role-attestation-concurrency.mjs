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

async function runQuery(sql) {
  try {
    return await execFileAsync(
      supabaseCommand,
      ["supabase", "db", "query", "--workdir", "apps/web", "--local", sql],
      { cwd: root, shell: process.platform === "win32", maxBuffer: 8 * 1024 * 1024 },
    );
  } catch (error) {
    const detail = [error?.stdout, error?.stderr, error?.message].filter(Boolean).join("\n");
    throw new Error(detail);
  }
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
values ('${actionId}'::uuid, '${reviewerId}', 'Concurrency reviewer', true);
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
begin;
set local role postgres;
select id from public.actions where id = '${actionId}'::uuid for update;
select pg_sleep(2);
rollback;
`;

const concurrentCorrectionWithoutReasonSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.review_action_role_attestation('${actionId}'::uuid, '${targetUserId}', 'group_lead', 'reject', '${reviewerId}', null, false);
commit;
`;

const correctedDecisionSql = `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.review_action_role_attestation('${actionId}'::uuid, '${targetUserId}', 'group_lead', 'reject', '${reviewerId}', 'concurrent correction reason', false);
commit;
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

async function main() {
  await runQuery(setupSql);
  try {
    const holder = runQuery(holdActionLockSql);
    await new Promise((resolve) => setTimeout(resolve, 150));
    await assert.rejects(
      () => runQuery(concurrentCorrectionWithoutReasonSql),
      (error) => String(error).includes("action_role_attestation_correction_reason_required"),
    );
    await holder;
    await runQuery(correctedDecisionSql);
    await runQuery(verifySql);
  } finally {
    await runQuery(cleanupSql);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main()
    .then(() => console.log("Role attestation concurrent correction contract passed."))
    .catch((error) => {
      console.error(`DB_SEMANTICS_NOT_EXECUTED: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
