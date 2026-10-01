import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ACTION_BACKUP_TABLES,
  ACTION_BACKUP_VERSION,
  buildActionBackup,
  validateActionBackup,
} from "./action-backup-contract.mjs";
import { restoreActionBackup } from "./restore-actions-backup.mjs";

const actionId = "11111111-1111-4111-8111-111111111111";
const conversationId = "22222222-2222-4222-8222-222222222222";
const organizerRowId = "33333333-3333-4333-8333-333333333333";
const registrationRowId = "44444444-4444-4444-8444-444444444444";
const participantRowId = "55555555-5555-4555-8555-555555555555";
const shareRequestId = "66666666-6666-4666-8666-666666666666";
const ownerId = "user_restore_owner";

function validBackup() {
  return buildActionBackup({
    exportedAt: "2026-10-01T10:00:00.000Z",
    tables: {
      actions: [
        {
          id: actionId,
          created_by_clerk_id: ownerId,
          action_date: "2026-09-20",
          location_label: "Paris",
          status: "approved",
          action_phase: "post_action_complete",
          preparation_data: {},
          latitude: 48.8566,
          longitude: null,
          published_at: "2026-09-19T08:00:00.000Z",
        },
      ],
      action_organizers: [
        {
          id: organizerRowId,
          action_id: actionId,
          organizer_clerk_id: ownerId,
          organizer_label: "Restauration",
          is_primary: true,
        },
      ],
      action_registrations: [
        {
          id: registrationRowId,
          action_id: actionId,
          user_id: ownerId,
          registration_status: "confirmed",
          registration_source: "import",
        },
      ],
      action_participants: [
        {
          id: participantRowId,
          action_id: actionId,
          user_id: ownerId,
          participation_status: "confirmed",
          participation_source: "action_creator",
        },
      ],
      training_examples: [
        {
          action_id: actionId,
          status: "labelled",
          photos: [],
          metadata: {},
        },
      ],
      forms: [],
      action_conversations: [{ id: conversationId, action_id: actionId }],
      action_conversation_members: [
        { conversation_id: conversationId, user_id: ownerId, access_source: "owner" },
      ],
      action_conversation_exclusions: [],
      action_share_contact_requests: [
        {
          id: shareRequestId,
          action_id: actionId,
          sender_id: ownerId,
          recipient_id: "user_recipient",
          content: "Historique",
          status: "pending",
        },
      ],
    },
  });
}

test("invalid format is rejected before any restore call", async () => {
  const backup = validBackup();
  backup.format = "legacy-array-import";
  let calls = 0;
  await assert.rejects(
    restoreActionBackup({
      backup,
      apply: true,
      confirmation: "RESTORE ACTION BACKUP",
      supabase: { rpc: async () => { calls += 1; } },
    }),
    /unsupported format/,
  );
  assert.equal(calls, 0);
});

test("incompatible version and incomplete tables are rejected before mutation", () => {
  const versioned = validBackup();
  versioned.version = ACTION_BACKUP_VERSION + 1;
  assert.throws(() => validateActionBackup(versioned), /unsupported version/);

  const incomplete = validBackup();
  delete incomplete.tables.action_registrations;
  delete incomplete.counts.action_registrations;
  assert.throws(() => validateActionBackup(incomplete), /tables\.action_registrations is required/);

  const missingPublishedRelation = validBackup();
  missingPublishedRelation.tables.action_conversations = [];
  missingPublishedRelation.tables.action_conversation_members = [];
  missingPublishedRelation.counts.action_conversations = 0;
  missingPublishedRelation.counts.action_conversation_members = 0;
  assert.throws(
    () => validateActionBackup(missingPublishedRelation),
    /published action .* has no action_conversations row/,
  );
});

test("restore keeps partial historical geolocation instead of inventing coordinates", () => {
  const backup = validBackup();
  assert.doesNotThrow(() => validateActionBackup(backup));
  assert.equal(backup.tables.actions[0].latitude, 48.8566);
  assert.equal(backup.tables.actions[0].longitude, null);
});

test("invalid geolocation is rejected before mutation", () => {
  const backup = validBackup();
  backup.tables.actions[0].latitude = 91;
  assert.throws(() => validateActionBackup(backup), /latitude must be a finite number/);
});

test("dry-run produces a complete plan without calling the database", async () => {
  const backup = validBackup();
  const result = await restoreActionBackup({ backup });
  assert.equal(result.mode, "dry-run");
  assert.equal(result.actionCount, 1);
  assert.equal(result.relationCounts.action_organizers, 1);
});

test("valid restore uses one atomic RPC and preserves action relations", async () => {
  const backup = validBackup();
  const calls = [];
  const result = await restoreActionBackup({
    backup,
    apply: true,
    confirmation: "RESTORE ACTION BACKUP",
    supabase: {
      rpc: async (...args) => {
        calls.push(args);
        return { data: { restored: 1 }, error: null };
      },
    },
  });

  assert.equal(result.status, "restored");
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "restore_action_backup");
  assert.equal(calls[0][1].p_backup.tables.actions[0].id, actionId);
  assert.equal(calls[0][1].p_backup.tables.action_organizers[0].action_id, actionId);
  assert.equal(calls[0][1].p_backup.tables.action_conversation_members[0].conversation_id, conversationId);
});

test("the operational name is restore-only and documentation names the same contract", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["restore:actions"], "node scripts/restore-actions-backup.mjs");
  assert.equal(packageJson.scripts["import:actions"], undefined);
  assert.deepEqual(ACTION_BACKUP_TABLES.includes("action_participants"), true);

  const governance = await readFile(
    new URL("../../../documentation/architecture/data-governance.md", import.meta.url),
    "utf8",
  );
  assert.match(governance, /DISASTER_RECOVERY_RESTORE/);
  assert.match(governance, /restore:actions/);
  assert.match(governance, /ne doit pas être exposée\s+sous un nom `import`/);
});
