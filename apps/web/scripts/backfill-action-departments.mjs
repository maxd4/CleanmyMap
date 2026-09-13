import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { resolveActionDepartment } from "../src/lib/geo/action-department-resolver.ts";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const DEFAULT_BATCH_SIZE = 50;
const MAX_BATCH_SIZE = 200;

export function parseArgs(argv) {
  const args = new Set(argv);
  const batchValue = argv
    .find((argument) => argument.startsWith("--batch-size="))
    ?.slice("--batch-size=".length);
  const batchSize = Number(batchValue ?? DEFAULT_BATCH_SIZE);
  return {
    apply: args.has("--apply"),
    dryRun: !args.has("--apply"),
    afterId: argv
      .find((argument) => argument.startsWith("--after-id="))
      ?.slice("--after-id=".length) ?? null,
    batchSize:
      Number.isInteger(batchSize) && batchSize > 0
        ? Math.min(batchSize, MAX_BATCH_SIZE)
        : DEFAULT_BATCH_SIZE,
    help: args.has("--help"),
  };
}

function showHelp() {
  console.log("Usage: node --experimental-strip-types scripts/backfill-action-departments.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --apply              Apply only department_code/name updates (local Supabase only)");
  console.log("  --batch-size=N       Bounded batch size, capped at 200 (default: 50)");
  console.log("  --after-id=UUID      Resume after the last processed action id");
  console.log("  --help               Show this help");
  console.log("");
  console.log("Without --apply the script is a dry-run and never writes.");
}

function parseDotEnv(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadLocalEnv() {
  if (!existsSync(ENV_LOCAL_PATH)) return {};
  return parseDotEnv(await readFile(ENV_LOCAL_PATH, "utf8"));
}

function resolveEnvValue(key, localEnv) {
  return process.env[key]?.trim() || localEnv[key]?.trim() || null;
}

function isLocalSupabaseUrl(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function isFiniteCoordinate(value, minimum, maximum) {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function hasValidCoordinates(row) {
  return (
    isFiniteCoordinate(row.latitude, -90, 90) &&
    isFiniteCoordinate(row.longitude, -180, 180)
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    showHelp();
    return;
  }

  const localEnv = await loadLocalEnv();
  const supabaseUrl = resolveEnvValue("NEXT_PUBLIC_SUPABASE_URL", localEnv);
  const serviceRoleKey = resolveEnvValue("SUPABASE_SERVICE_ROLE_KEY", localEnv);
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (options.apply && !isLocalSupabaseUrl(supabaseUrl)) {
    throw new Error("Refusing --apply outside a local Supabase URL; production backfill is forbidden.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from("actions")
    .select(
      "id, latitude, longitude, derived_geometry_kind, derived_geometry_geojson, department_code, department_name",
    )
    .is("department_code", null)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("id", { ascending: true })
    .limit(options.batchSize);

  if (options.afterId) {
    query = query.gt("id", options.afterId);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []).filter(hasValidCoordinates);
  let resolvedCount = 0;
  let failedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const department = await resolveActionDepartment({
      latitude: row.latitude,
      longitude: row.longitude,
      geometry: {
        kind: row.derived_geometry_kind,
        geojson: row.derived_geometry_geojson,
      },
    });

    if (!department) {
      failedCount += 1;
      continue;
    }

    resolvedCount += 1;
    if (options.dryRun) continue;

    const update = await supabase
      .from("actions")
      .update({
        department_code: department.departmentCode,
        department_name: department.departmentName,
      })
      .eq("id", row.id)
      .is("department_code", null)
      .select("id")
      .maybeSingle();
    if (update.error) throw update.error;
    if (update.data) updatedCount += 1;
  }

  const lastId = data?.at(-1)?.id ?? null;
  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? "dry-run" : "apply",
        fetchedCount: data?.length ?? 0,
        validCoordinateCount: rows.length,
        resolvedCount,
        failedCount,
        updatedCount,
        nextAfterId: lastId,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
