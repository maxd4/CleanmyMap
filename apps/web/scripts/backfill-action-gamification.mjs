import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { refreshProgressionProfile } from "../src/lib/gamification/progression-tracking.ts";
import { syncUserActionProgression } from "../src/lib/gamification/progression-data.ts";

const APP_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENV_LOCAL_PATH = join(APP_DIR, ".env.local");
const LEGACY_SOURCE_EVENTS = new Set(["action_created", "action_validated"]);
const CORRECTION_POINTS_SOURCE_EVENT = "gamification_backfill_action_correction";
const CORRECTION_AUDIT_SOURCE_TABLE = "gamification_backfill_actions";
const PAGE_SIZE = 1000;

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    apply: args.has("--apply"),
    help: args.has("--help"),
  };
}

function showHelp() {
  console.log("Usage: node scripts/backfill-action-gamification.mjs [options]");
  console.log("");
  console.log("Options:");
  console.log("  --apply   Apply changes in Supabase (default: dry-run)");
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

async function fetchAllRows(supabase, table, selectClause, filters = []) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(table).select(selectClause).range(from, to);
    for (const filter of filters) {
      query = filter(query);
    }
    const result = await query;
    if (result.error) {
      throw new Error(`${table} fetch failed: ${result.error.message}`);
    }

    const batch = result.data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return rows;
}

function uniqueIds(values) {
  return Array.from(new Set(values.filter((value) => typeof value === "string" && value.trim().length > 0)));
}

async function buildLegacyLedgerCorrections(supabase) {
  const rows = await fetchAllRows(supabase, "points_ledger", "id, user_id, amount, transaction_type, source_event, source_id, created_at", [
    (query) => query.in("source_event", Array.from(LEGACY_SOURCE_EVENTS)),
    (query) => query.eq("transaction_type", "earned"),
  ]);

  const corrections = [];
  for (const row of rows) {
    const correctionKey = `legacy:${row.id}`;
    const existingRefund = await supabase
      .from("points_ledger")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("source_event", CORRECTION_POINTS_SOURCE_EVENT)
      .eq("source_id", correctionKey)
      .maybeSingle();

    if (existingRefund.error) {
      throw new Error(`points_ledger correction lookup failed: ${existingRefund.error.message}`);
    }

    if (existingRefund.data) {
      continue;
    }

    corrections.push({
      user_id: row.user_id,
      transaction_type: "refund",
      amount: Number(row.amount ?? 0),
      reason: `Correction historique: annulation du bonus legacy ${row.source_event}`,
      source_event: CORRECTION_POINTS_SOURCE_EVENT,
      source_id: correctionKey,
    });
  }

  return corrections;
}

async function buildLegacyAuditCorrections(supabase) {
  const rows = await fetchAllRows(supabase, "points_ledger", "id, user_id, amount, transaction_type, source_event, source_id, created_at", [
    (query) => query.in("source_event", Array.from(LEGACY_SOURCE_EVENTS)),
    (query) => query.eq("transaction_type", "earned"),
  ]);

  const corrections = [];
  for (const row of rows) {
    const correctionKey = `legacy:${row.id}`;
    const existingAudit = await supabase
      .from("xp_audit")
      .select("id")
      .eq("user_id", String(row.user_id))
      .eq("source_table", CORRECTION_AUDIT_SOURCE_TABLE)
      .eq("source_id", correctionKey)
      .maybeSingle();

    if (existingAudit.error) {
      throw new Error(`xp_audit correction lookup failed: ${existingAudit.error.message}`);
    }

    if (existingAudit.data) {
      continue;
    }

    corrections.push({
      user_id: String(row.user_id),
      actor_id: null,
      reason: `Correction historique: annulation du bonus legacy ${row.source_event}`,
      xp_change: -Math.abs(Number(row.amount ?? 0)),
      source_table: CORRECTION_AUDIT_SOURCE_TABLE,
      source_id: correctionKey,
      metadata: {
        legacy_source_event: row.source_event,
        legacy_source_id: row.source_id,
        legacy_points_ledger_id: row.id,
      },
    });
  }

  return corrections;
}

async function fetchActionUserIds(supabase) {
  const rows = await fetchAllRows(supabase, "actions", "created_by_clerk_id");
  return uniqueIds(rows.map((row) => row.created_by_clerk_id));
}

async function applyRows(supabase, table, rows) {
  for (const row of rows) {
    const { error } = await supabase.from(table).insert(row);
    if (error) {
      throw new Error(`${table} insert failed: ${error.message}`);
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

  const actionUserIds = await fetchActionUserIds(supabase);
  const legacyPointCorrections = await buildLegacyLedgerCorrections(supabase);
  const legacyAuditCorrections = await buildLegacyAuditCorrections(supabase);

  const summary = {
    dryRun: !args.apply,
    usersToResync: actionUserIds.length,
    legacyPointCorrections: legacyPointCorrections.length,
    legacyAuditCorrections: legacyAuditCorrections.length,
    sampleUsers: actionUserIds.slice(0, 10),
    samplePointCorrections: legacyPointCorrections.slice(0, 5),
    sampleAuditCorrections: legacyAuditCorrections.slice(0, 5),
  };

  if (!args.apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  await applyRows(supabase, "points_ledger", legacyPointCorrections);
  await applyRows(supabase, "xp_audit", legacyAuditCorrections);

  let resyncedUsers = 0;
  for (const userId of actionUserIds) {
    await syncUserActionProgression(supabase, userId);
    await refreshProgressionProfile(supabase, userId);
    resyncedUsers += 1;
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        dryRun: false,
        resyncedUsers,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    "backfill-action-gamification failed:",
    error instanceof Error ? error.message : error,
  );
  process.exitCode = 1;
});
