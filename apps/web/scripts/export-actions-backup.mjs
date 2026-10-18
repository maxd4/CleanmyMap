import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  ACTION_BACKUP_TABLES,
  buildActionBackup,
  validateActionBackup,
} from "./action-backup-contract.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const PAGE_SIZE = 1000;
const CHUNK_SIZE = 500;
const MAX_PAGES_PER_CHUNK = 10_000;
const ACTION_COLUMNS = [
  "id",
  "created_at",
  "updated_at",
  "created_by_clerk_id",
  "actor_name",
  "organizer_type",
  "organizer_id",
  "organizer_name",
  "action_date",
  "location_label",
  "department_code",
  "department_name",
  "latitude",
  "longitude",
  "derived_geometry_kind",
  "derived_geometry_geojson",
  "geometry_confidence",
  "geometry_source",
  "waste_kg",
  "cigarette_butts",
  "volunteers_count",
  "duration_minutes",
  "event_start_time",
  "event_end_time",
  "notes",
  "status",
  "cancelled_at",
  "cancelled_by_clerk_id",
  "cancellation_reason",
  "cancelled_from_status",
  "published_at",
  "moderation_visibility",
  "hidden_at",
  "hidden_by_clerk_id",
  "hidden_reason",
  "type",
  "action_phase",
  "preparation_data",
].join(", ");

const STABLE_TIE_BREAKERS = Object.freeze({
  actions: ["id"],
  action_conversations: ["id"],
  action_organizers: ["id"],
  action_registrations: ["id"],
  action_participants: ["id"],
  training_examples: ["action_id"],
  forms: ["id"],
  action_conversation_members: ["conversation_id", "user_id"],
  action_conversation_exclusions: ["conversation_id", "user_id"],
  action_share_contact_requests: ["id"],
});

function getStableTieBreakers(table, orderColumn) {
  return (STABLE_TIE_BREAKERS[table] ?? []).filter((column) => column !== orderColumn);
}

async function fetchAllRows(supabase, table, columns, orderColumn = "created_at") {
  const rows = [];
  let from = 0;

  for (let page = 0; page < MAX_PAGES_PER_CHUNK; page += 1) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(table).select(columns);
    if (orderColumn) query = query.order(orderColumn, { ascending: false });
    for (const tieBreaker of getStableTieBreakers(table, orderColumn)) {
      query = query.order(tieBreaker, { ascending: false });
    }
    query = query.range(from, to);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!Array.isArray(data)) throw new Error(`${table}: invalid page response`);
    const batch = data;
    if (batch.length === 0) return rows;
    rows.push(...batch);
    from += batch.length;
  }

  throw new Error(`${table}: pagination exceeded its safety bound`);
}

async function fetchRowsForIds(supabase, table, column, ids, orderColumn = "created_at") {
  if (ids.length === 0) return [];
  const rows = [];
  for (let index = 0; index < ids.length; index += CHUNK_SIZE) {
    const chunk = ids.slice(index, index + CHUNK_SIZE);
    let from = 0;
    let completed = false;
    for (let page = 0; page < MAX_PAGES_PER_CHUNK; page += 1) {
      const to = from + PAGE_SIZE - 1;
      let query = supabase.from(table).select("*").in(column, chunk);
      if (orderColumn) query = query.order(orderColumn, { ascending: false });
      for (const tieBreaker of getStableTieBreakers(table, orderColumn)) {
        query = query.order(tieBreaker, { ascending: false });
      }
      query = query.range(from, to);
      const { data, error } = await query;
      if (error) throw new Error(`${table}: ${error.message}`);
      const batch = Array.isArray(data) ? data : [];
      if (batch.length === 0) {
        completed = true;
        break;
      }
      rows.push(...batch);
      from += batch.length;
    }
    if (!completed) throw new Error(`${table}: pagination exceeded its safety bound`);
  }
  return rows;
}

export async function exportActionBackup(supabase, exportedAt = new Date().toISOString()) {
  const actions = await fetchAllRows(supabase, "actions", ACTION_COLUMNS);
  const actionIds = actions.map((action) => action.id);
  const actionConversations = await fetchRowsForIds(
    supabase,
    "action_conversations",
    "action_id",
    actionIds,
  );
  const conversationIds = actionConversations.map((conversation) => conversation.id);

  const tables = {
    actions,
    action_organizers: await fetchRowsForIds(supabase, "action_organizers", "action_id", actionIds),
    action_registrations: await fetchRowsForIds(supabase, "action_registrations", "action_id", actionIds),
    action_participants: await fetchRowsForIds(supabase, "action_participants", "action_id", actionIds),
    training_examples: await fetchRowsForIds(supabase, "training_examples", "action_id", actionIds),
    forms: await fetchRowsForIds(supabase, "forms", "action_id", actionIds),
    action_conversations: actionConversations,
    action_conversation_members: await fetchRowsForIds(
      supabase,
      "action_conversation_members",
      "conversation_id",
      conversationIds,
      "granted_at",
    ),
    action_conversation_exclusions: await fetchRowsForIds(
      supabase,
      "action_conversation_exclusions",
      "conversation_id",
      conversationIds,
      "excluded_at",
    ),
    action_share_contact_requests: await fetchRowsForIds(
      supabase,
      "action_share_contact_requests",
      "action_id",
      actionIds,
    ),
  };

  for (const table of ACTION_BACKUP_TABLES) {
    if (!Array.isArray(tables[table])) {
      throw new Error(`Missing exported table ${table}`);
    }
  }

  const backup = buildActionBackup({ exportedAt, tables });
  validateActionBackup(backup);
  return backup;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const backup = await exportActionBackup(supabase);
  const timestamp = new Date().toISOString().replace(/[:]/g, "-");
  const backupDir = join(REPO_ROOT, "artifacts", "backups", "actions");
  await mkdir(backupDir, { recursive: true });

  const outPath = join(backupDir, `actions-backup-v${backup.version}-${timestamp}.json`);
  await writeFile(outPath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
  console.log(`Backup written: ${outPath}`);
  console.log(`Actions: ${backup.counts.actions}; format: ${backup.format} v${backup.version}`);
}

const currentModuleUrl = pathToFileURL(process.argv[1] ?? "").href;
if (currentModuleUrl === import.meta.url) {
  main().catch((error) => {
    console.error("Backup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
