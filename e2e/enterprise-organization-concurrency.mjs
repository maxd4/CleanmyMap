import assert from "node:assert/strict";
import { runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const entryId = "00000000-0000-4000-8000-000000000201";
const orgRequestId = "00000000-0000-4000-8000-000000000202";
const bootstrapRequestId = "00000000-0000-4000-8000-000000000203";
const inviteRequestId = "00000000-0000-4000-8000-000000000204";
const acceptRequestId = "00000000-0000-4000-8000-000000000205";
const transferRequestId = "00000000-0000-4000-8000-000000000206";
const cleanupRequestId = "00000000-0000-4000-8000-000000000207";
const ownerId = "enterprise-concurrency-owner";
const successorId = "enterprise-concurrency-successor";
const writerAName = "enterprise-transfer-writer";
const writerBName = "enterprise-leave-writer";
const run = (sql, timeoutMs = 20_000) => runLocalPsqlQuery(sql, { timeoutMs, rawError: true, tuplesOnly: true });
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

const serviceClaims = (actor) => `
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"${actor}"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
`;

const cleanup = `
begin;
set local role postgres;
select set_config('request.jwt.claims', '{"role":"postgres","sub":"enterprise-concurrency-cleanup"}', true);
select set_config('request.jwt.claim.role', 'postgres', true);
delete from public.organizations where partner_entry_id = 'test-enterprise-concurrency';
delete from public.partner_annuaire_entries where id = 'test-enterprise-concurrency';
delete from public.partner_onboarding_requests where id = '${entryId}';
commit;
`;

try {
  await run(cleanup);
  await run(`
    begin;
    set local role postgres;
    select set_config('request.jwt.claims', '{"role":"postgres","sub":"enterprise-concurrency-fixture"}', true);
    select set_config('request.jwt.claim.role', 'postgres', true);
    insert into public.partner_onboarding_requests(id,submitted_by_user_id,organization_name,organization_type,legal_identity,contact_name,contact_channel,contact_details,motivation,status,creator_state)
    values ('${entryId}','${ownerId}','Concurrency Enterprise','entreprise','enterprise-concurrency-ref','Owner','email','owner@example.test','Ephemeral concurrency fixture','accepted','accepted');
    insert into public.partner_annuaire_entries(id,source_request_id,publication_status,reviewed_at,reviewed_by_user_id,public_data)
    values ('test-enterprise-concurrency','${entryId}','accepted',now(),'enterprise-concurrency-admin','{"name":"Concurrency Enterprise"}');
    commit;
  `);
  await run(`
    begin;
    ${serviceClaims("enterprise-concurrency-bootstrap")}
    select public.bootstrap_organization('test-enterprise-concurrency','enterprise-concurrency-ref','enterprise-concurrency-admin','${bootstrapRequestId}');
    commit;
  `);

  const organization = await run("select id from public.organizations where partner_entry_id='test-enterprise-concurrency';");
  const organizationId = organization.stdout.trim();
  assert.match(organizationId, /^[0-9a-f-]{36}$/i, "fixture must create a real organization");
  await run(`
    begin;
    ${serviceClaims(ownerId)}
    select public.mutate_organization_membership(
      '${organizationId}'::uuid,'${ownerId}','invite',null,'${successorId}','manager',null,'${inviteRequestId}'
    );
    commit;
  `);

  // service_role may execute the audited RPCs, but must not read membership
  // rows directly. Resolve fixture IDs from the administrative session before
  // entering the restricted mutation session.
  const invitedMembership = await run(`select id from public.organization_memberships where organization_id=(select id from public.organizations where partner_entry_id='test-enterprise-concurrency') and clerk_user_id='${successorId}';`);
  const successorMembershipId = invitedMembership.stdout.trim();
  assert.match(successorMembershipId, /^[0-9a-f-]{36}$/i, "invitation fixture must persist a membership");
  await run(`
    begin;
    ${serviceClaims(successorId)}
    select public.mutate_organization_membership(
      '${organizationId}'::uuid,
      '${successorId}','accept','${successorMembershipId}'::uuid,null,null,null,'${acceptRequestId}'
    );
    commit;
  `);

  const transferTarget = await run(`select id from public.organization_memberships where organization_id='${organizationId}'::uuid and clerk_user_id='${successorId}';`);
  const transferMembershipId = transferTarget.stdout.trim();
  assert.match(transferMembershipId, /^[0-9a-f-]{36}$/i, "successor must have a persisted membership before ownership transfer");

  const transfer = run(`
    begin;
    ${serviceClaims(ownerId)}
    select set_config('application_name','${writerAName}',true);
    select public.mutate_organization_membership('${organizationId}'::uuid,'${ownerId}','transfer_owner','${transferMembershipId}'::uuid,null,null,null,'${transferRequestId}');
    select pg_sleep(1.5);
    commit;
  `);
  await waitForActivity(`select case when exists(select 1 from pg_stat_activity where application_name='${writerAName}' and wait_event='PgSleep') then 'TRANSFER_HOLDS_ORG_LOCK' else 'TRANSFER_NOT_READY' end;`, "TRANSFER_HOLDS_ORG_LOCK");

  const leave = run(`
    begin;
    ${serviceClaims(ownerId)}
    select set_config('application_name','${writerBName}',true);
    select public.leave_organization('${organizationId}'::uuid,'${ownerId}','${cleanupRequestId}');
    commit;
  `);
  await waitForActivity(`select case when exists(select 1 from pg_stat_activity where application_name='${writerBName}' and wait_event_type='Lock') then 'LEAVE_WAITS_FOR_TRANSFER' else 'LEAVE_NOT_WAITING' end;`, "LEAVE_WAITS_FOR_TRANSFER");
  await Promise.all([transfer, leave]);

  const final = await run(`select count(*) filter(where member_role='owner' and state='active')::text || ':' || count(*) filter(where clerk_user_id='${ownerId}' and state='revoked')::text || ':' || count(*) filter(where clerk_user_id='${successorId}' and member_role='owner' and state='active')::text from public.organization_memberships where organization_id='${organizationId}'::uuid;`);
  assert.equal(final.stdout.trim(), "1:1:1", "transfer followed by a waiting departure must preserve one active owner and revoke only the departing owner");
  console.log("EXECUTED_DB_CONTRACT: Enterprise organization transfer and departure serialize across two PostgreSQL sessions without orphaning ownership.");
} finally {
  await run(cleanup);
}
