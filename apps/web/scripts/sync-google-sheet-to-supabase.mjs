import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ACTIONS_IMPORT_PATH = join(
  APP_DIR,
  "data",
  "raw",
  "google-sheet-admin-import.json",
);
const CLEAN_PLACES_IMPORT_PATH = join(
  APP_DIR,
  "data",
  "raw",
  "google-sheet-clean-places-import.json",
);
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");

const SYNC_MARKER = "[google-sheet-sync]";
const META_PREFIX = "[cmm-meta]";
const DRAWING_NOTE_PREFIX = "[DRAWING_GEOJSON]";
const SYSTEM_USER_ID_DEFAULT = "system:google_sheet_sync";
const ALLOWED_ACTION_STATUSES = new Set(["pending", "approved", "rejected"]);
const ALLOWED_SPOT_STATUSES = new Set(["new", "validated", "cleaned"]);
const BATCH_SIZE = 500;

function parseArgs(argv) {
  const args = argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  const passthrough = args.filter(
    (arg) =>
      arg !== "--skip-build" &&
      arg !== "--help" &&
      !arg.startsWith("--system-user-id="),
  );
  const userArg = args.find((arg) => arg.startsWith("--system-user-id="));
  return {
    help: flags.has("--help"),
    skipBuild: flags.has("--skip-build"),
    systemUserId: userArg
      ? userArg.slice("--system-user-id=".length).trim()
      : SYSTEM_USER_ID_DEFAULT,
    buildArgs: passthrough,
  };
}

function showHelp() {
  console.log("Usage: node scripts/sync-google-sheet-to-supabase.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log(
    "  --skip-build             Use existing JSON payloads without rebuilding from Google Sheet",
  );
  console.log(
    "  --system-user-id=<id>    created_by_clerk_id used for imported rows",
  );
  console.log(
    "  --geocode                Forwarded to build-admin-import-from-sheet script",
  );
  console.log("  --help                   Show this help");
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

async function loadEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }
  const text = await readFile(path, "utf8");
  return parseDotEnv(text);
}

function resolveEnvValue(key, envFileMap) {
  const runtime = process.env[key];
  if (runtime && runtime.trim().length > 0) {
    return runtime.trim();
  }
  const fileValue = envFileMap[key];
  if (fileValue && fileValue.trim().length > 0) {
    return fileValue.trim();
  }
  return null;
}

function runBuildScript(buildArgs) {
  const commandArgs = ["scripts/build-admin-import-from-sheet.mjs", ...buildArgs];
  const result = spawnSync("node", commandArgs, {
    cwd: APP_DIR,
    stdio: "inherit",
    encoding: "utf8",
  });
  return result.status === 0;
}

async function readJson(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

function dedupeActions(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = [
      item.actionDate ?? "",
      (item.locationLabel ?? "").trim().toLowerCase(),
      (item.actorName ?? "").trim().toLowerCase(),
      Number(item.wasteKg ?? 0),
      Number(item.cigaretteButts ?? 0),
    ].join("::");
    if (!byKey.has(key)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function dedupeCleanPlaces(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = (item.label ?? "").trim().toLowerCase();
    if (key && !byKey.has(key)) {
      byKey.set(key, item);
    }
  }
  return [...byKey.values()];
}

function stringifyMetaAssociation(associationName) {
  const trimmed = typeof associationName === "string" ? associationName.trim() : "";
  return trimmed ? trimmed : null;
}

function serializeTechnicalMeta(item) {
  const meta = {};
  const associationName = stringifyMetaAssociation(item.associationName);
  if (associationName) {
    meta.associationName = associationName;
  }
  if (typeof item.placeType === "string" && item.placeType.trim()) {
    meta.placeType = item.placeType.trim();
  }
  if (
    typeof item.departureLocationLabel === "string" &&
    item.departureLocationLabel.trim()
  ) {
    meta.departureLocationLabel = item.departureLocationLabel.trim();
  }
  if (
    typeof item.arrivalLocationLabel === "string" &&
    item.arrivalLocationLabel.trim()
  ) {
    meta.arrivalLocationLabel = item.arrivalLocationLabel.trim();
  }
  if (item.routeStyle === "direct" || item.routeStyle === "souple") {
    meta.routeStyle = item.routeStyle;
  }
  if (
    typeof item.routeAdjustmentMessage === "string" &&
    item.routeAdjustmentMessage.trim()
  ) {
    meta.routeAdjustmentMessage = item.routeAdjustmentMessage.trim();
  }
  return Object.keys(meta).length > 0 ? `${META_PREFIX}${JSON.stringify(meta)}` : null;
}

function serializeDrawing(item) {
  const drawing = item.manualDrawing;
  if (
    !drawing ||
    !Array.isArray(drawing.coordinates) ||
    (drawing.kind !== "polyline" && drawing.kind !== "polygon")
  ) {
    return null;
  }
  return `${DRAWING_NOTE_PREFIX}${JSON.stringify({
    kind: drawing.kind,
    coordinates: drawing.coordinates,
  })}`;
}

function composeActionNotes(item) {
  const parts = [];
  const base = typeof item.notes === "string" ? item.notes.trim() : "";
  if (base) {
    parts.push(base);
  }
  const meta = serializeTechnicalMeta(item);
  if (meta) {
    parts.push(meta);
  }
  const drawing = serializeDrawing(item);
  if (drawing) {
    parts.push(drawing);
  }
  parts.push(SYNC_MARKER);
  return parts.join("\n");
}

function normalizeActionStatus(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (ALLOWED_ACTION_STATUSES.has(normalized)) {
    return normalized;
  }
  return "approved";
}

function normalizeSpotStatus(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (ALLOWED_SPOT_STATUSES.has(normalized)) {
    return normalized;
  }
  return "validated";
}

function buildActionRows(items, systemUserId) {
  return items.map((item) => ({
    created_by_clerk_id: systemUserId,
    actor_name:
      typeof item.actorName === "string" && item.actorName.trim().length > 0
        ? item.actorName.trim().slice(0, 200)
        : "Google Sheet",
    action_date: item.actionDate,
    location_label: String(item.locationLabel ?? "").trim().slice(0, 255),
    latitude:
      typeof item.latitude === "number" && Number.isFinite(item.latitude)
        ? item.latitude
        : null,
    longitude:
      typeof item.longitude === "number" && Number.isFinite(item.longitude)
        ? item.longitude
        : null,
    waste_kg: Number.isFinite(Number(item.wasteKg)) ? Number(item.wasteKg) : 0,
    cigarette_butts: Math.max(
      0,
      Math.trunc(
        Number.isFinite(Number(item.cigaretteButts))
          ? Number(item.cigaretteButts)
          : 0,
      ),
    ),
    volunteers_count: Math.max(
      1,
      Math.trunc(
        Number.isFinite(Number(item.volunteersCount))
          ? Number(item.volunteersCount)
          : 1,
      ),
    ),
    duration_minutes: Math.max(
      1,
      Math.trunc(
        Number.isFinite(Number(item.durationMinutes))
          ? Number(item.durationMinutes)
          : 60,
      ),
    ),
    notes: composeActionNotes(item),
    status: normalizeActionStatus(item.status),
  }));
}

function buildSpotRows(items, systemUserId) {
  return items.map((item) => ({
    created_by_clerk_id: systemUserId,
    label: String(item.label ?? "").trim().slice(0, 255),
    waste_type:
      typeof item.type === "string" && item.type.trim() === "spot"
        ? "spot"
        : "clean_place",
    latitude:
      typeof item.latitude === "number" && Number.isFinite(item.latitude)
        ? item.latitude
        : null,
    longitude:
      typeof item.longitude === "number" && Number.isFinite(item.longitude)
        ? item.longitude
        : null,
    status: normalizeSpotStatus(item.status),
    notes: `${typeof item.notes === "string" ? item.notes.trim() : ""}\n${SYNC_MARKER}`.trim(),
  }));
}

async function deletePreviousSyncRows(supabase, systemUserId) {
  const actionsDelete = await supabase
    .from("actions")
    .delete()
    .eq("created_by_clerk_id", systemUserId)
    .ilike("notes", `%${SYNC_MARKER}%`);
  if (actionsDelete.error) {
    throw new Error(`Failed deleting previous actions: ${actionsDelete.error.message}`);
  }

  const spotsDelete = await supabase
    .from("spots")
    .delete()
    .eq("created_by_clerk_id", systemUserId)
    .ilike("notes", `%${SYNC_MARKER}%`);
  if (spotsDelete.error) {
    throw new Error(`Failed deleting previous spots: ${spotsDelete.error.message}`);
  }
}

async function insertBatches({ supabase, table, rows }) {
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const chunk = rows.slice(index, index + BATCH_SIZE);
    if (chunk.length === 0) {
      continue;
    }
    const result = await supabase.from(table).insert(chunk);
    if (result.error) {
      throw new Error(
        `Insert into ${table} failed at batch ${Math.floor(index / BATCH_SIZE) + 1}: ${result.error.message}`,
      );
    }
  }
}

function assertPayloadShape(payload, key) {
  if (!payload || typeof payload !== "object" || !Array.isArray(payload[key])) {
    throw new Error(`Invalid payload format for ${key}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    return;
  }
  if (!args.systemUserId) {
    throw new Error("system user id cannot be empty");
  }

  if (!args.skipBuild) {
    const buildOk = runBuildScript(args.buildArgs);
    if (!buildOk) {
      const canFallback =
        existsSync(ACTIONS_IMPORT_PATH) && existsSync(CLEAN_PLACES_IMPORT_PATH);
      if (!canFallback) {
        throw new Error(
          "build-admin-import-from-sheet failed and no local payload fallback was found",
        );
      }
      console.warn(
        "Build from Google Sheet failed. Falling back to existing local payloads.",
      );
    }
  }

  const envFileMap = await loadEnvFile(ENV_LOCAL_PATH);
  const supabaseUrl = resolveEnvValue("NEXT_PUBLIC_SUPABASE_URL", envFileMap);
  const serviceRoleKey = resolveEnvValue("SUPABASE_SERVICE_ROLE_KEY", envFileMap);
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  const [actionsPayload, cleanPlacesPayload] = await Promise.all([
    readJson(ACTIONS_IMPORT_PATH),
    readJson(CLEAN_PLACES_IMPORT_PATH),
  ]);
  assertPayloadShape(actionsPayload, "items");
  assertPayloadShape(cleanPlacesPayload, "items");

  const actionItems = dedupeActions(actionsPayload.items);
  const cleanPlaceItems = dedupeCleanPlaces(cleanPlacesPayload.items);
  const actionRows = buildActionRows(actionItems, args.systemUserId);
  const spotRows = buildSpotRows(cleanPlaceItems, args.systemUserId);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await deletePreviousSyncRows(supabase, args.systemUserId);
  await insertBatches({ supabase, table: "actions", rows: actionRows });
  await insertBatches({ supabase, table: "spots", rows: spotRows });

  const mapEligibleActions = actionRows.filter(
    (row) => row.latitude !== null && row.longitude !== null,
  ).length;
  const mapEligibleSpots = spotRows.filter(
    (row) => row.latitude !== null && row.longitude !== null,
  ).length;

  console.log("Google Sheet sync to Supabase completed.");
  console.log(`Actions imported: ${actionRows.length}`);
  console.log(`Spots imported: ${spotRows.length}`);
  console.log(
    `Map-displayable points: ${mapEligibleActions + mapEligibleSpots}/${actionRows.length + spotRows.length}`,
  );
}

main().catch((error) => {
  console.error(
    "sync-google-sheet-to-supabase failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
