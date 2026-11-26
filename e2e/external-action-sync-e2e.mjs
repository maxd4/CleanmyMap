import assert from "node:assert/strict";
import { resolveLocalEphemeralDbUrl, runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const orgId = "association-brigade-verte-paris";
const otherOrgId = "association-autre-test";
const ownerUserId = "e2e-sync-owner-1";
const actionId = "00000000-0000-4000-8000-00000000e2e1";
const identityHash = "e".repeat(64);
const contentHashV1 = "1".repeat(64);
const contentHashV2 = "2".repeat(64);
const claimToken = "11111111-1111-4111-8111-11111111e2e1";

const run = (sql, step = "query", timeoutMs = 20_000) =>
  runLocalPsqlQuery(sql, {
    timeoutMs,
    errorLabel: `External action sync E2E failed at step=${step}`,
  });

async function main() {
  resolveLocalEphemeralDbUrl();

  await run(
    `
begin;
set local role postgres;
delete from private.external_action_sync_proposals where external_event_id like 'e2e-%';
delete from private.external_action_sync_suppression_audit where operation_id like 'e2e-sync-%';
delete from private.external_action_sync_references where external_event_id like 'e2e-%';
delete from private.external_action_sync_identities where identity_hash = '${identityHash}';
delete from private.external_action_sync_subscriptions where owner_user_id = '${ownerUserId}';
delete from public.actions where id = '${actionId}';
insert into public.actions (
  id, created_by_clerk_id, organizer_id, organizer_type, action_date,
  action_phase, status, published_at, location_label, moderation_visibility, group_join_enabled
) values (
  '${actionId}', '${ownerUserId}', '${orgId}', 'association', '2027-09-12',
  'pre_action', 'pending', null, 'Mairie du 20e — Paris', 'visible', false
);
commit;
`,
    "setup",
  );

  // 1. Mandate with consent + two sources linked to same canonical action, applied vs observed separation
  const res = await run(
    `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"e2e-sync"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

select public.upsert_external_action_sync_subscription(
  '${orgId}', 'jagis_pour_la_nature', '${ownerUserId}', '{}'::text[],
  'brigade-verte', 'https://example.test/jagis', 'synthetic_fixture', true, 'mandat-e2e', '2026-11-01', null, clock_timestamp()
);
select public.upsert_external_action_sync_subscription(
  '${orgId}', 'fondation_de_la_mer', '${ownerUserId}', '{}'::text[],
  'birgade-verte', 'https://example.test/mer', 'synthetic_fixture', true, 'mandat-e2e', '2026-11-01', null, clock_timestamp()
);

select 'RES_JAGIS:' || reservation_status from public.reserve_external_action_sync_reference(
  '${identityHash}', '${orgId}', '${ownerUserId}', '${claimToken}'::uuid,
  'jagis_pour_la_nature', 'e2e-jagis-1', 'https://example.test/j/1', 'r1', '{"v":1}'::jsonb, '${contentHashV1}'
);
select 'COMPLETE:' || public.complete_external_action_sync_identity('${identityHash}', '${claimToken}'::uuid, '${actionId}'::uuid);
select 'APPLY_V1:' || public.mark_external_action_sync_reference_applied(
  'jagis_pour_la_nature', 'e2e-jagis-1', '{"v":1}'::jsonb, '${contentHashV1}', 'r1'
);
select 'RES_MER:' || reservation_status from public.reserve_external_action_sync_reference(
  '${identityHash}', '${orgId}', '${ownerUserId}', '${claimToken}'::uuid,
  'fondation_de_la_mer', 'e2e-mer-1', 'https://example.test/m/1', 'r1', '{"v":1}'::jsonb, '${contentHashV1}'
);

-- Reserve v2 without applying (conflict scenario): observed changes to v2 while applied stays v1.
select 'RES_JAGIS_V2:' || reservation_status from public.reserve_external_action_sync_reference(
  '${identityHash}', '${orgId}', '${ownerUserId}', '${claimToken}'::uuid,
  'jagis_pour_la_nature', 'e2e-jagis-1', 'https://example.test/j/1', 'r2', '{"v":2}'::jsonb, '${contentHashV2}'
);
select 'STATE:' || content_hash || '|' || coalesce(applied_content_hash, 'null')
from public.get_external_action_sync_reference_state('jagis_pour_la_nature', 'e2e-jagis-1');
commit;
`,
    "two_sources_and_applied_state",
  );

  assert.match(res.stdout, /RES_JAGIS:reserved/);
  assert.match(res.stdout, /COMPLETE:linked/);
  assert.match(res.stdout, /APPLY_V1:applied/);
  assert.match(res.stdout, /RES_MER:linked/);
  assert.match(res.stdout, /RES_JAGIS_V2:linked/);
  assert.match(res.stdout, new RegExp(`STATE:${contentHashV2}\\|${contentHashV1}`));

  // 2. Revocation blocks mark_applied; proposal organizer isolation; suppression hides action
  const revAndSup = await run(
    `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"e2e-sync"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);

select public.upsert_external_action_sync_subscription(
  '${orgId}', 'jagis_pour_la_nature', '${ownerUserId}', '{}'::text[],
  'brigade-verte', 'https://example.test/jagis', 'synthetic_fixture', true, 'mandat-e2e', '2026-11-01', clock_timestamp(), clock_timestamp()
);
select 'REVOKED_APPLY:' || public.mark_external_action_sync_reference_applied(
  'jagis_pour_la_nature', 'e2e-jagis-1', '{"v":2}'::jsonb, '${contentHashV2}', 'r2'
);

select public.upsert_external_action_sync_proposal(
  '${orgId}', 'jagis_pour_la_nature', 'e2e-prop-1', '${identityHash}', '${actionId}'::uuid,
  'field_conflict', '{"v":2}'::jsonb, array['${actionId}'::uuid], '[]'::jsonb, '${contentHashV2}'
);
select 'ISO_OTHER:' || count(*) from public.list_external_action_sync_proposals('pending', '${otherOrgId}');

select 'SUPPRESS:' || public.suppress_external_action_sync_action(
  '${actionId}'::uuid, 'admin-e2e', 'e2e-sync-sup-1', 'Suppression E2E canonique'
);
commit;
`,
    "revocation_isolation_suppression",
  );

  assert.match(revAndSup.stdout, /REVOKED_APPLY:mandate_revoked/);
  assert.match(revAndSup.stdout, /ISO_OTHER:0/);
  assert.match(revAndSup.stdout, /SUPPRESS:suppressed/);

  const actionCheck = await run(
    `
begin;
set local role postgres;
select 'VISIBILITY:' || moderation_visibility || '|PUB:' || coalesce(published_at::text, 'null') || '|STATUS:' || status
from public.actions where id = '${actionId}';
delete from private.external_action_sync_proposals where external_event_id like 'e2e-%';
delete from private.external_action_sync_suppression_audit where operation_id like 'e2e-sync-%';
delete from private.external_action_sync_references where external_event_id like 'e2e-%';
delete from private.external_action_sync_identities where identity_hash = '${identityHash}';
delete from private.external_action_sync_subscriptions where owner_user_id = '${ownerUserId}';
delete from public.actions where id = '${actionId}';
commit;
`,
    "verify_and_cleanup",
  );

  assert.match(actionCheck.stdout, /VISIBILITY:hidden\|PUB:null\|STATUS:cancelled/);
  console.log("EXECUTED_DB_CONTRACT: External action sync E2E PostgreSQL lifecycle passed.");
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
