const ACTION_BACKUP_FORMAT = "cleanmymap.action-backup";
export const ACTION_BACKUP_VERSION = 2;
export const ACTION_BACKUP_CONFIRMATION = "RESTORE ACTION BACKUP";

export const ACTION_BACKUP_TABLES = [
  "actions",
  "action_organizers",
  "action_registrations",
  "action_participants",
  "training_examples",
  "forms",
  "action_conversations",
  "action_conversation_members",
  "action_conversation_exclusions",
  "action_share_contact_requests",
];

const ACTION_ID_TABLES = [
  "action_organizers",
  "action_registrations",
  "action_participants",
  "forms",
  "action_share_contact_requests",
];

const ACTION_KEYED_TABLES = ["training_examples"];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new Error(`Invalid action backup: ${message}`);
}

function assertUuid(value, label) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    fail(`${label} must be a UUID`);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    fail(`${label} must be an array`);
  }
}

function assertOptionalNumber(value, label, minimum, maximum) {
  if (value === null || value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    fail(`${label} must be a finite number between ${minimum} and ${maximum}`);
  }
}

function assertCounts(counts, tables) {
  if (!isRecord(counts)) {
    fail("counts is required");
  }

  for (const table of ACTION_BACKUP_TABLES) {
    if (!Number.isInteger(counts[table]) || counts[table] !== tables[table].length) {
      fail(`counts.${table} does not match tables.${table}.length`);
    }
  }
}

function assertUnique(rows, field, label) {
  const seen = new Set();
  for (const [index, row] of rows.entries()) {
    if (!isRecord(row)) fail(`${label}[${index}] must be an object`);
    const value = row[field];
    if (typeof value !== "string") fail(`${label}[${index}].${field} is required`);
    if (seen.has(value)) fail(`${label} contains duplicate ${field} ${value}`);
    seen.add(value);
  }
}

function assertUniqueComposite(rows, fields, label) {
  const seen = new Set();
  for (const [index, row] of rows.entries()) {
    if (!isRecord(row)) fail(`${label}[${index}] must be an object`);
    const values = fields.map((field) => row[field]);
    if (values.some((value) => typeof value !== "string" || value.trim() === "")) {
      fail(`${label}[${index}] is missing a required key`);
    }
    const key = JSON.stringify(values);
    if (seen.has(key)) fail(`${label} contains duplicate key ${key}`);
    seen.add(key);
  }
}

function assertActionReference(row, actionIds, label, index) {
  if (!actionIds.has(row.action_id)) {
    fail(`${label}[${index}] references an action outside the backup`);
  }
}

export function buildActionBackup({ exportedAt, tables }) {
  if (!isRecord(tables)) {
    throw new Error("Cannot build an action backup without tables");
  }

  const normalizedTables = Object.fromEntries(
    ACTION_BACKUP_TABLES.map((table) => [table, tables[table] ?? []]),
  );

  return {
    format: ACTION_BACKUP_FORMAT,
    version: ACTION_BACKUP_VERSION,
    exportedAt: exportedAt ?? new Date().toISOString(),
    scope: {
      kind: "action-owned-state",
      excluded: [
        "app_messages and app_notifications (cross-domain chat projections)",
        "derived pollution prediction ledger (recomputable, no action FK)",
        "storage objects (exported by the general Supabase archive)",
      ],
    },
    counts: Object.fromEntries(
      ACTION_BACKUP_TABLES.map((table) => [table, normalizedTables[table].length]),
    ),
    tables: normalizedTables,
  };
}

export function validateActionBackup(payload) {
  if (!isRecord(payload)) fail("root must be an object");
  if (payload.format !== ACTION_BACKUP_FORMAT) {
    fail(`unsupported format ${String(payload.format)}`);
  }
  if (payload.version !== ACTION_BACKUP_VERSION) {
    fail(`unsupported version ${String(payload.version)}`);
  }
  if (typeof payload.exportedAt !== "string" || Number.isNaN(Date.parse(payload.exportedAt))) {
    fail("exportedAt must be an ISO date");
  }
  if (!isRecord(payload.scope) || payload.scope.kind !== "action-owned-state" || !Array.isArray(payload.scope.excluded)) {
    fail("scope must describe action-owned-state and its exclusions");
  }
  if (!isRecord(payload.tables)) fail("tables is required");

  for (const table of ACTION_BACKUP_TABLES) {
    if (!(table in payload.tables)) fail(`tables.${table} is required`);
    assertArray(payload.tables[table], `tables.${table}`);
  }
  assertCounts(payload.counts, payload.tables);

  const actions = payload.tables.actions;
  assertUnique(actions, "id", "tables.actions");
  const actionIds = new Set();
  for (const [index, action] of actions.entries()) {
    assertUuid(action.id, `tables.actions[${index}].id`);
    actionIds.add(action.id);
    for (const field of ["created_by_clerk_id", "action_date", "location_label", "status", "action_phase"]) {
      if (typeof action[field] !== "string" || action[field].trim() === "") {
        fail(`tables.actions[${index}].${field} is required`);
      }
    }
    assertOptionalNumber(action.latitude, `tables.actions[${index}].latitude`, -90, 90);
    assertOptionalNumber(action.longitude, `tables.actions[${index}].longitude`, -180, 180);
    assertOptionalNumber(action.geometry_confidence, `tables.actions[${index}].geometry_confidence`, 0, 1);
    if (!isRecord(action.preparation_data)) {
      fail(`tables.actions[${index}].preparation_data must be an object`);
    }
  }

  for (const table of ACTION_ID_TABLES) {
    const rows = payload.tables[table];
    assertUnique(rows, "id", `tables.${table}`);
    for (const [index, row] of rows.entries()) {
      assertUuid(row.id, `tables.${table}[${index}].id`);
      assertActionReference(row, actionIds, `tables.${table}`, index);
    }
  }

  for (const table of ACTION_KEYED_TABLES) {
    const rows = payload.tables[table];
    assertUnique(rows, "action_id", `tables.${table}`);
    for (const [index, row] of rows.entries()) {
      assertActionReference(row, actionIds, `tables.${table}`, index);
    }
  }

  const conversations = payload.tables.action_conversations;
  assertUnique(conversations, "id", "tables.action_conversations");
  const conversationIds = new Set();
  for (const [index, conversation] of conversations.entries()) {
    assertUuid(conversation.id, `tables.action_conversations[${index}].id`);
    assertActionReference(conversation, actionIds, "tables.action_conversations", index);
    if (conversationIds.has(conversation.id)) {
      fail(`tables.action_conversations contains duplicate id ${conversation.id}`);
    }
    conversationIds.add(conversation.id);
  }

  for (const table of ["action_conversation_members", "action_conversation_exclusions"]) {
    const rows = payload.tables[table];
    assertUniqueComposite(rows, ["conversation_id", "user_id"], `tables.${table}`);
    for (const [index, row] of rows.entries()) {
      assertUuid(row.conversation_id, `tables.${table}[${index}].conversation_id`);
      if (!conversationIds.has(row.conversation_id)) {
        fail(`tables.${table}[${index}] references a conversation outside the backup`);
      }
    }
  }

  for (const action of actions) {
    if (action.published_at !== null && action.published_at !== undefined) {
      const conversation = conversations.find((candidate) => candidate.action_id === action.id);
      if (!conversation) {
        fail(`published action ${action.id} has no action_conversations row`);
      }
      const owner = payload.tables.action_conversation_members.find(
        (member) =>
          member.conversation_id === conversation.id &&
          member.user_id === action.created_by_clerk_id &&
          member.access_source === "owner",
      );
      if (!owner) {
        fail(`published action ${action.id} has no owner conversation member`);
      }
    }
  }

  return {
    actionIds,
    conversationIds,
    counts: payload.counts,
  };
}

export function formatRestorePlan(payload) {
  const { counts } = validateActionBackup(payload);
  return {
    format: payload.format,
    version: payload.version,
    actionCount: counts.actions,
    relationCounts: Object.fromEntries(
      ACTION_BACKUP_TABLES.filter((table) => table !== "actions").map((table) => [table, counts[table]]),
    ),
    mutation: "none until --apply and explicit confirmation",
  };
}
