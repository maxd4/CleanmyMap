import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const PAGE_SIZE = 1000;

function parseArgs(argv) {
  return {
    apply: argv.includes("--apply"),
  };
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

async function fetchAllRows(supabase, table, selectClause, orderColumn) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from(table)
      .select(selectClause)
      .order(orderColumn, { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`${table} fetch failed: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return rows;
}

function addReason(reasons, condition, reason) {
  if (condition) {
    reasons.push(reason);
  }
}

function toNumber(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDateMs(value) {
  if (!value) {
    return Number.NaN;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : Number.NaN;
}

function evaluateActionRow(row) {
  const reasons = [];

  const wasteKg = toNumber(row.waste_kg);
  const butts = toNumber(row.cigarette_butts);
  const volunteers = toNumber(row.volunteers_count);
  const durationMinutes = toNumber(row.duration_minutes);
  const lat = row.latitude === null ? null : toNumber(row.latitude);
  const lon = row.longitude === null ? null : toNumber(row.longitude);
  const actionDateMs = toDateMs(row.action_date);
  const now = Date.now();
  const tomorrow = now + 24 * 60 * 60 * 1000;

  // Hard anomalies (quasi impossibles pour des données réelles)
  addReason(
    reasons,
    Number.isFinite(actionDateMs) && actionDateMs > tomorrow,
    "future_action_date",
  );
  addReason(
    reasons,
    lat !== null && (lat < -90 || lat > 90),
    "invalid_latitude_range",
  );
  addReason(
    reasons,
    lon !== null && (lon < -180 || lon > 180),
    "invalid_longitude_range",
  );
  addReason(reasons, wasteKg > 1000, "extreme_waste_kg_gt_1000");
  addReason(reasons, butts > 1_500_000, "extreme_butts_gt_1500000");
  addReason(reasons, volunteers > 1000, "extreme_volunteers_gt_1000");
  addReason(reasons, durationMinutes > 1440, "extreme_duration_gt_24h");

  // Soft anomalies (on ne supprime pas seules)
  const softReasons = [];
  addReason(softReasons, wasteKg > 200, "high_waste_kg_gt_200");
  addReason(softReasons, butts > 150_000, "high_butts_gt_150000");
  addReason(softReasons, volunteers > 250, "high_volunteers_gt_250");
  addReason(softReasons, durationMinutes > 720, "high_duration_gt_12h");
  addReason(
    softReasons,
    lat !== null && lon !== null && lat === 0 && lon === 0,
    "zero_coordinates",
  );
  addReason(
    softReasons,
    typeof row.location_label === "string" && row.location_label.trim().length < 4,
    "very_short_location_label",
  );

  const hasHardReason = reasons.length > 0;
  const strongSoftCluster = softReasons.length >= 3;
  const shouldDelete = hasHardReason || strongSoftCluster;

  return {
    id: row.id,
    shouldDelete,
    reasons: [...reasons, ...softReasons],
    hardReasonsCount: reasons.length,
    softReasonsCount: softReasons.length,
    snapshot: {
      id: row.id,
      created_at: row.created_at,
      action_date: row.action_date,
      status: row.status,
      location_label: row.location_label,
      latitude: row.latitude,
      longitude: row.longitude,
      waste_kg: row.waste_kg,
      cigarette_butts: row.cigarette_butts,
      volunteers_count: row.volunteers_count,
      duration_minutes: row.duration_minutes,
      created_by_clerk_id: row.created_by_clerk_id,
    },
  };
}

function evaluateSpotRow(row) {
  const reasons = [];
  const lat = row.latitude === null ? null : toNumber(row.latitude);
  const lon = row.longitude === null ? null : toNumber(row.longitude);
  const labelLength =
    typeof row.label === "string" ? row.label.trim().length : 0;

  addReason(
    reasons,
    lat !== null && (lat < -90 || lat > 90),
    "invalid_latitude_range",
  );
  addReason(
    reasons,
    lon !== null && (lon < -180 || lon > 180),
    "invalid_longitude_range",
  );
  addReason(
    reasons,
    lat !== null &&
      lon !== null &&
      lat === 0 &&
      lon === 0 &&
      labelLength <= 3 &&
      (row.status === "validated" || row.status === "cleaned"),
    "zero_coordinates_short_label_validated",
  );

  return {
    id: row.id,
    shouldDelete: reasons.length > 0,
    reasons,
    snapshot: {
      id: row.id,
      created_at: row.created_at,
      status: row.status,
      label: row.label,
      latitude: row.latitude,
      longitude: row.longitude,
      created_by_clerk_id: row.created_by_clerk_id,
    },
  };
}

async function deleteByIds(supabase, table, ids) {
  if (ids.length === 0) {
    return 0;
  }

  let deleted = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { error } = await supabase.from(table).delete().in("id", chunk);
    if (error) {
      throw new Error(`${table} delete failed: ${error.message}`);
    }
    deleted += chunk.length;
  }
  return deleted;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envFileMap = await loadEnvFile(ENV_LOCAL_PATH);
  const supabaseUrl = resolveEnvValue("NEXT_PUBLIC_SUPABASE_URL", envFileMap);
  const serviceRoleKey = resolveEnvValue("SUPABASE_SERVICE_ROLE_KEY", envFileMap);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const [actions, spots] = await Promise.all([
    fetchAllRows(
      supabase,
      "actions",
      "id, created_at, action_date, status, location_label, latitude, longitude, waste_kg, cigarette_butts, volunteers_count, duration_minutes, created_by_clerk_id",
      "created_at",
    ),
    fetchAllRows(
      supabase,
      "spots",
      "id, created_at, status, label, latitude, longitude, created_by_clerk_id",
      "created_at",
    ),
  ]);

  const actionEvaluations = actions.map(evaluateActionRow);
  const spotEvaluations = spots.map(evaluateSpotRow);

  const actionCandidates = actionEvaluations.filter((item) => item.shouldDelete);
  const spotCandidates = spotEvaluations.filter((item) => item.shouldDelete);

  const backupDir = join(APP_DIR, "backups");
  await mkdir(backupDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:]/g, "-");
  const reportPath = join(
    backupDir,
    `cleanup-suspect-runtime-records-${timestamp}.json`,
  );

  await writeFile(
    reportPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        mode: args.apply ? "apply" : "dry-run",
        scanned: {
          actions: actions.length,
          spots: spots.length,
        },
        candidates: {
          actions: actionCandidates.length,
          spots: spotCandidates.length,
        },
        actionCandidates,
        spotCandidates,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  let deletedActions = 0;
  let deletedSpots = 0;

  if (args.apply) {
    deletedActions = await deleteByIds(
      supabase,
      "actions",
      actionCandidates.map((item) => item.id),
    );
    deletedSpots = await deleteByIds(
      supabase,
      "spots",
      spotCandidates.map((item) => item.id),
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: args.apply ? "apply" : "dry-run",
        scanned: { actions: actions.length, spots: spots.length },
        candidates: {
          actions: actionCandidates.length,
          spots: spotCandidates.length,
        },
        deleted: { actions: deletedActions, spots: deletedSpots },
        reportPath,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "db-cleanup-suspect-runtime-records failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
