import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const META_PREFIX = "[cmm-meta]";
const BATCH_SIZE = 200;

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    apply: args.has("--apply"),
    help: args.has("--help"),
  };
}

function showHelp() {
  console.log("Usage: node scripts/backfill-route-style.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --apply   Apply updates in Supabase (default: dry-run)");
  console.log("  --help    Show this help");
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
  return parseDotEnv(await readFile(path, "utf8"));
}

function resolveEnvValue(key, envFileMap) {
  const runtime = process.env[key];
  if (runtime && runtime.trim()) {
    return runtime.trim();
  }
  const fileValue = envFileMap[key];
  if (fileValue && fileValue.trim()) {
    return fileValue.trim();
  }
  return null;
}

function normalizeNotesRouteStyle(notes) {
  const raw = typeof notes === "string" ? notes : "";
  const lines = raw.split(/\r?\n/);
  const normalizedLines = [];
  let foundMetaLine = false;
  let parsedMetaLine = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(META_PREFIX)) {
      normalizedLines.push(line);
      continue;
    }

    foundMetaLine = true;
    try {
      const parsed = JSON.parse(trimmed.slice(META_PREFIX.length));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsed.routeStyle = "souple";
        normalizedLines.push(`${META_PREFIX}${JSON.stringify(parsed)}`);
        parsedMetaLine = true;
        continue;
      }
    } catch {
      // Keep malformed metadata untouched and append a clean normalized line later.
    }

    normalizedLines.push(line);
  }

  if (!foundMetaLine || !parsedMetaLine) {
    normalizedLines.push(`${META_PREFIX}${JSON.stringify({ routeStyle: "souple" })}`);
  }

  const normalized = normalizedLines.join("\n").trim();
  return normalized.length > 0
    ? normalized
    : `${META_PREFIX}${JSON.stringify({ routeStyle: "souple" })}`;
}

async function fetchAllRows(supabase, table, select) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + 999;
    const result = await supabase.from(table).select(select).range(from, to);
    if (result.error) {
      throw new Error(`${table} select failed: ${result.error.message}`);
    }
    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) {
      return rows;
    }
    from += 1000;
  }
}

async function applyUpdates(supabase, updates) {
  for (let index = 0; index < updates.length; index += BATCH_SIZE) {
    const chunk = updates.slice(index, index + BATCH_SIZE);
    for (const update of chunk) {
      const { id, ...payload } = update;
      const result = await supabase.from("actions").update(payload).eq("id", id);
      if (result.error) {
        throw new Error(`actions update failed for ${id}: ${result.error.message}`);
      }
    }
  }
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    showHelp();
    return;
  }

  const envFileMap = await loadEnvFile(ENV_LOCAL_PATH);
  const supabaseUrl = resolveEnvValue("NEXT_PUBLIC_SUPABASE_URL", envFileMap);
  const serviceRoleKey = resolveEnvValue("SUPABASE_SERVICE_ROLE_KEY", envFileMap);
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rows = await fetchAllRows(supabase, "actions", "id, notes");
  const updates = rows
    .map((row) => {
      const normalized = normalizeNotesRouteStyle(row.notes);
      return normalized === (row.notes ?? "")
        ? null
        : { id: row.id, notes: normalized };
    })
    .filter(Boolean);

  if (!args.apply) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          actionsToUpdate: updates.length,
          sampleUpdates: updates.slice(0, 5),
        },
        null,
        2,
      ),
    );
    return;
  }

  await applyUpdates(supabase, updates);

  console.log(
    JSON.stringify(
      {
        dryRun: false,
        actionsUpdated: updates.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "backfill-route-style failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
