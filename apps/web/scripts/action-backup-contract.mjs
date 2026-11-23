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
  "action_form_editors",
  "action_form_editor_audit",
];

const OPTIONAL_TABLES = new Set([
  "action_form_editors",
  "action_form_editor_audit",
]);

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

function assertIsoDateTime(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    fail(`${label} must be an ISO date`);
  }
}

function assertCounts(counts, tables) {
  if (!isRecord(counts)) {
    fail("counts is required");
  }

  for (const table of ACTION_BACKUP_TABLES) {
    if (OPTIONAL_TABLES.has(table) && !(table in tables)) continue;
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

  const fieldRoleTables = {
    action_field_role_assignments: tables.action_field_role_assignments ?? [],
    action_field_role_transfer_proposals: tables.action_field_role_transfer_proposals ?? [],
    action_field_role_transfer_audit: tables.action_field_role_transfer_audit ?? [],
  };

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
    fieldRoleTables,
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
    if (OPTIONAL_TABLES.has(table) && !(table in payload.tables)) continue;
    if (!(table in payload.tables)) fail(`tables.${table} is required`);
    assertArray(payload.tables[table], `tables.${table}`);
  }

  const hasFormEditors = "action_form_editors" in payload.tables;
  const hasFormEditorAudit = "action_form_editor_audit" in payload.tables;
  if (hasFormEditors !== hasFormEditorAudit) {
    fail("tables.action_form_editors and tables.action_form_editor_audit must be present together");
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
    assertOptionalNumber(action.collectors_count, `tables.actions[${index}].collectors_count`, 0, 500);
    if (action.collectors_count != null && !Number.isInteger(action.collectors_count)) {
      fail(`tables.actions[${index}].collectors_count must be an integer`);
    }
    if (action.collectors_count != null && action.volunteers_count != null && action.collectors_count > action.volunteers_count) {
      fail(`tables.actions[${index}].collectors_count cannot exceed volunteers_count`);
    }
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

  if (hasFormEditors) {
    const editors = payload.tables.action_form_editors;
    assertUniqueComposite(editors, ["action_id", "clerk_user_id"], "tables.action_form_editors");
    for (const [index, editor] of editors.entries()) {
      assertActionReference(editor, actionIds, "tables.action_form_editors", index);
      for (const field of ["clerk_user_id", "granted_by_clerk_id"]) {
        if (typeof editor[field] !== "string" || editor[field].trim() === "") {
          fail(`tables.action_form_editors[${index}].${field} is required`);
        }
      }
      assertIsoDateTime(editor.granted_at, `tables.action_form_editors[${index}].granted_at`);
    }

    const audits = payload.tables.action_form_editor_audit;
    assertUniqueComposite(audits, ["action_id", "request_id"], "tables.action_form_editor_audit");
    for (const [index, audit] of audits.entries()) {
      assertActionReference(audit, actionIds, "tables.action_form_editor_audit", index);
      assertUuid(audit.request_id, `tables.action_form_editor_audit[${index}].request_id`);
      if (!Number.isSafeInteger(audit.id) || audit.id < 1) {
        fail(`tables.action_form_editor_audit[${index}].id must be a positive safe integer`);
      }
      for (const field of ["actor_clerk_id", "target_clerk_id"]) {
        if (typeof audit[field] !== "string" || audit[field].trim() === "") {
          fail(`tables.action_form_editor_audit[${index}].${field} is required`);
        }
      }
      if (!["grant", "revoke"].includes(audit.operation) ||
          typeof audit.before_granted !== "boolean" || typeof audit.after_granted !== "boolean") {
        fail(`tables.action_form_editor_audit[${index}] has invalid operation state`);
      }
      assertIsoDateTime(audit.created_at, `tables.action_form_editor_audit[${index}].created_at`);
    }
  }

  for (const [index, participant] of payload.tables.action_participants.entries()) {
    if (participant.collection_status !== undefined && participant.collection_status !== null &&
      !["collected", "not_collected"].includes(participant.collection_status)) {
      fail(`tables.action_participants[${index}].collection_status is invalid`);
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

  if (payload.fieldRoleTables !== undefined) {
    if (!isRecord(payload.fieldRoleTables)) fail("fieldRoleTables must be an object");
    for (const table of [
      "action_field_role_assignments",
      "action_field_role_transfer_proposals",
      "action_field_role_transfer_audit",
    ]) {
      assertArray(payload.fieldRoleTables[table], `fieldRoleTables.${table}`);
      assertUnique(payload.fieldRoleTables[table], "id", `fieldRoleTables.${table}`);
      for (const [index, row] of payload.fieldRoleTables[table].entries()) {
        assertUuid(row.id, `fieldRoleTables.${table}[${index}].id`);
        assertActionReference(row, actionIds, `fieldRoleTables.${table}`, index);
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
      ACTION_BACKUP_TABLES.filter((table) => table !== "actions").map((table) => [table, counts[table] ?? 0]),
    ),
    mutation: "none until --apply and explicit confirmation",
  };
}
