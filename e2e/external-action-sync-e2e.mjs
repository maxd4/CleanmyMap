import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createJiti } from "jiti";
import { resolveLocalEphemeralDbUrl, runLocalPsqlQuery } from "./supabase-local-psql.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const orgId = "association-brigade-verte-paris";
const ownerUserId = "e2e-sync-owner-1";
const run = (sql, step = "query", timeoutMs = 20_000) =>
  runLocalPsqlQuery(sql, {
    timeoutMs,
    errorLabel: `External action sync E2E failed at step=${step}`,
  });

function assertLocalHostname(urlValue, label) {
  const parsed = new URL(urlValue);
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error(`Refus ${label}: destination non-locale interdite (${parsed.hostname}).`);
  }
  return parsed;
}

function resolveEphemeralRestTarget(expectedDbUrl) {
  const raw = execFileSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["supabase", "status", "--workdir", "apps/web", "--output", "json"],
    {
      cwd: root,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  const start = raw.indexOf("{");
  if (start < 0) {
    throw new Error("DB_SEMANTICS_NOT_EXECUTED: ephemeral Supabase status did not return JSON.");
  }
  const status = JSON.parse(raw.slice(start));
  if (!status?.API_URL || !status?.SERVICE_ROLE_KEY || !status?.DB_URL) {
    throw new Error("DB_SEMANTICS_NOT_EXECUTED: ephemeral Supabase API_URL/SERVICE_ROLE_KEY/DB_URL unavailable.");
  }
  const apiUrl = assertLocalHostname(status.API_URL, "API_URL");
  const statusDbUrl = assertLocalHostname(status.DB_URL, "status.DB_URL");
  const psqlDbUrl = assertLocalHostname(expectedDbUrl, "expectedDbUrl");
  assert.equal(
    statusDbUrl.host,
    psqlDbUrl.host,
    "SQL and REST targets must point to the exact same ephemeral local Supabase instance.",
  );

  const envUrl = process.env.SUPABASE_URL?.trim();
  if (envUrl) {
    const parsedEnv = assertLocalHostname(envUrl, "SUPABASE_URL");
    assert.equal(
      parsedEnv.origin,
      apiUrl.origin,
      "SUPABASE_URL env override does not match ephemeral local Supabase API_URL.",
    );
  }
  return { url: apiUrl.origin, key: status.SERVICE_ROLE_KEY };
}

async function main() {
  const dbUrl = await resolveLocalEphemeralDbUrl();
  const { url, key } = resolveEphemeralRestTarget(dbUrl);
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // Stub Next.js server-only / next/cache for Node execution of real TypeScript store + engine.
  const stubDir = mkdtempSync(path.join(tmpdir(), "cmm-sync-e2e-"));
  const serverOnlyStub = path.join(stubDir, "server-only.mjs");
  const nextCacheStub = path.join(stubDir, "next-cache.mjs");
  writeFileSync(serverOnlyStub, "export {};\n");
  writeFileSync(nextCacheStub, "export function revalidateTag() {}\nexport function unstable_cache(fn) { return fn; }\n");

  const jiti = createJiti(import.meta.url, {
    alias: {
      "@": path.join(root, "apps/web/src"),
      "server-only": serverOnlyStub,
      "next/cache": nextCacheStub,
    },
  });

  try {
    const { createSupabaseExternalActionSyncStore } = await jiti.import(
      path.join(root, "apps/web/src/lib/actions/external-sync/store.ts"),
    );
    const { runExternalActionSync } = await jiti.import(
      path.join(root, "apps/web/src/lib/actions/external-sync/engine.ts"),
    );
    const { readSyntheticJagisEvents } = await jiti.import(
      path.join(root, "apps/web/src/lib/actions/external-sync/jagis-adapter.ts"),
    );
    const { readSyntheticFondationMerEvents } = await jiti.import(
      path.join(root, "apps/web/src/lib/actions/external-sync/fondation-mer-adapter.ts"),
    );

    await run(
      `
begin;
set local role postgres;
insert into public.profiles (id, display_name, handle)
values ('${ownerUserId}', 'Brigade Verte E2E', 'brigade-verte-e2e')
on conflict (id) do nothing;

delete from private.external_action_sync_proposals where external_event_id like 'e2e-real-%';
delete from private.external_action_sync_suppression_audit where operation_id like 'e2e-real-%';
delete from private.external_action_sync_references where external_event_id like 'e2e-real-%';
delete from private.external_action_sync_subscriptions where owner_user_id = '${ownerUserId}';
commit;
`,
      "setup_profile_and_cleanup",
    );

    await run(
      `
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role","sub":"e2e-real"}', true);
select set_config('request.jwt.claim.role', 'service_role', true);
select public.upsert_external_action_sync_subscription(
  '${orgId}', 'jagis_pour_la_nature', '${ownerUserId}', '{}'::text[],
  'brigade-verte', 'https://example.test/jagis', 'synthetic_fixture', true, 'mandat-e2e', '2026-11-01', null, clock_timestamp()
);
select public.upsert_external_action_sync_subscription(
  '${orgId}', 'fondation_de_la_mer', '${ownerUserId}', '{}'::text[],
  'birgade-verte', 'https://example.test/mer', 'synthetic_fixture', true, 'mandat-e2e', '2026-11-01', null, clock_timestamp()
);
commit;
`,
      "setup_subscriptions",
    );

    const store = createSupabaseExternalActionSyncStore(supabase);
    const now = new Date("2026-11-26T10:00:00.000Z");

    const jagisRecords = [
      {
        id: "e2e-real-jagis-1",
        url: "https://example.test/jagis/e2e-1",
        title: "Collecte E2E Brigade Verte",
        start_date: "2027-10-10",
        start_time: "10:00",
        meeting_point: "Mairie du 20e",
        city: "Paris",
        route_reference: "mairie-pyrenees-e2e",
        updated_at: "r1",
        status: "published",
      },
    ];
    const merRecords = [
      {
        reference: "e2e-real-mer-1",
        canonical_url: "https://example.test/mer/e2e-1",
        name: "Collecte E2E Brigade Verte",
        date: "2027-10-10",
        time_start: "10:00",
        meeting_place: "Mairie du 20e",
        municipality: "Paris",
        route_name: "mairie-pyrenees-e2e",
        revision: "r1",
        state: "published",
      },
    ];

    // 1. cron_prepare creates unpublished pre-action via real store + createActionSubmission(deferGamification: true)
    const cronSummary = await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(jagisRecords, now.toISOString()),
          fondation_de_la_mer: async () => readSyntheticFondationMerEvents(merRecords, now.toISOString()),
        },
      },
      { mode: "cron_prepare", organizerDirectoryId: orgId, now },
    );
    assert.equal(cronSummary.created, 1);
    assert.equal(cronSummary.createdAndPublished, 0);
    const createdOutcome = cronSummary.outcomes.find((o) => o.status === "created");
    assert.ok(createdOutcome?.actionId, "Created actionId expected");
    const actionId = createdOutcome.actionId;

    // Verify zero premature XP / progression side effects in canonical public.progression_events
    const xpCheck = await run(
      `
begin;
set local role postgres;
select 'XP:' || coalesce(sum(xp_awarded), 0) from public.progression_events where user_id = '${ownerUserId}';
select 'PUB:' || coalesce(published_at::text, 'null') from public.actions where id = '${actionId}';
commit;
`,
      "verify_unpublished_and_no_xp",
    );
    assert.match(xpCheck.stdout, /XP:0/);
    assert.match(xpCheck.stdout, /PUB:null/);

    // 2. admin_sync_now submits associative pre-action to canonical moderation via submit_external_action_sync_review
    const adminSummary = await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents(jagisRecords, now.toISOString()),
          fondation_de_la_mer: async () => readSyntheticFondationMerEvents(merRecords, now.toISOString()),
        },
      },
      { mode: "admin_sync_now", organizerDirectoryId: orgId, actorUserId: ownerUserId, now },
    );
    assert.equal(adminSummary.pendingReview, 1);
    assert.equal(adminSummary.published, 0);

    const reviewCheck = await run(
      `
begin;
set local role postgres;
select 'REV:' || coalesce(review_state, 'null') || '|PUB:' || coalesce(published_at::text, 'null') from public.actions where id = '${actionId}';
commit;
`,
      "verify_pending_review",
    );
    assert.match(reviewCheck.stdout, /REV:pending_review\|PUB:null/);

    // 3. Administrative suppression hides & unpublishes action, sets groupJoinEnabled=false in notes, and blocks recreation
    const supStatus = await store.suppressAction({
      actionId,
      actorUserId: "admin-e2e",
      operationId: "e2e-real-sup-1",
      reason: "Suppression E2E canonique",
    });
    assert.equal(supStatus, "suppressed");

    const supDbCheck = await run(
      `
begin;
set local role postgres;
select 'VIS:' || moderation_visibility || '|PUB:' || coalesce(published_at::text, 'null') || '|NOTES_META:' || case when notes like '%"groupJoinEnabled": false%' or notes like '%"groupJoinEnabled":false%' then 'ok' else 'missing' end
from public.actions where id = '${actionId}';
commit;
`,
      "verify_suppressed_notes_and_visibility",
    );
    assert.match(supDbCheck.stdout, /VIS:hidden\|PUB:null\|NOTES_META:ok/);

    const afterSup = await runExternalActionSync(
      {
        store,
        readers: {
          jagis_pour_la_nature: async () => readSyntheticJagisEvents([{ ...jagisRecords[0], updated_at: "r2" }], now.toISOString()),
          fondation_de_la_mer: async () => ({ status: "disabled", source: "fondation_de_la_mer", reason: "operator_authorization_required" }),
        },
      },
      { mode: "admin_sync_now", organizerDirectoryId: orgId, actorUserId: ownerUserId, now },
    );
    assert.equal(afterSup.suppressed, 1);

    await run(
      `
begin;
set local role postgres;
delete from private.external_action_sync_proposals where external_event_id like 'e2e-real-%';
delete from private.external_action_sync_suppression_audit where operation_id like 'e2e-real-%';
delete from private.external_action_sync_references where external_event_id like 'e2e-real-%';
delete from private.external_action_sync_identities where creator_user_id = '${ownerUserId}';
delete from private.external_action_sync_subscriptions where owner_user_id = '${ownerUserId}';
delete from public.actions where id = '${actionId}';
delete from public.profiles where id = '${ownerUserId}';
commit;
`,
      "cleanup",
    );

    console.log("EXECUTED_DB_CONTRACT: External action sync E2E PostgreSQL lifecycle passed.");
  } finally {
    rmSync(stubDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
