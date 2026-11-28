import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { validatePrivateBackupDestination } from "./private-backup-destination.mjs";
import { exportStorage } from "../../../scripts/ci/export-supabase-storage.mjs";

const PAGE_SIZE = 1000;
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const ARCHIVE_TABLES = [
  { table: "actions", orderColumn: "created_at", role: "runtime" },
  { table: "trash_spotter_spots", orderColumn: "created_at", role: "canonical" },
  { table: "legacy_spot_migrations", orderColumn: "migrated_at", role: "provenance" },
  { table: "spots", orderColumn: "created_at", role: "legacy_archive" },
  { table: "community_events", orderColumn: "created_at", role: "runtime" },
  { table: "event_rsvps", orderColumn: "updated_at", role: "runtime" },
  { table: "app_messages", orderColumn: "created_at", role: "runtime" },
  { table: "app_notifications", orderColumn: "created_at", role: "runtime" },
  { table: "training_examples", orderColumn: "created_at", role: "runtime" },
  { table: "community_bug_reports", orderColumn: "created_at", role: "runtime" },
  { table: "promotion_requests", orderColumn: "created_at", role: "runtime" },
  { table: "partner_onboarding_requests", orderColumn: "created_at", role: "runtime" },
  { table: "progression_events", orderColumn: "created_at", role: "runtime" },
  { table: "progression_profiles", orderColumn: "updated_at", role: "runtime" },
  { table: "funnel_events", orderColumn: "at", role: "runtime" },
  { table: "admin_operations_audit", orderColumn: "at", role: "runtime" },
  { table: "quiz_srs", orderColumn: "updated_at", role: "runtime" },
  { table: "checklist_progress", orderColumn: "updated_at", role: "runtime" },
  { table: "runbook_checks", orderColumn: "last_run_at", role: "runtime" },
];

export function getArchiveTableNames() {
  return ARCHIVE_TABLES.map(({ table }) => table);
}

const LOCAL_STORE_FILES = [
  "community_bug_reports.json",
  "promotion_requests.json",
  "partner_onboarding_requests.json",
  "published_partner_annuaire_entries.json",
];


function parseArgs() {
  const options = {
    outDir: null,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--out=")) {
      options.outDir = arg.slice("--out=".length);
    }
  }

  return options;
}

async function fetchAllRows(supabase, table, orderColumn) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(table).select("*").range(from, to);
    if (orderColumn) {
      query = query.order(orderColumn, { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
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

async function exportLocalStore(fileName, outDir) {
  const sourcePath = join(process.cwd(), "data", "local-db", fileName);
  try {
    const raw = await readFile(sourcePath, "utf8");
    const targetPath = join(outDir, "local-db", fileName);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, raw, { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch {
    // Missing local store is fine: not every environment has the fallback files.
  }
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const { outDir } = parseArgs();
  if (!outDir) {
    throw new Error("An explicit absolute --out directory on verified private storage is required");
  }
  const baseDir = await validatePrivateBackupDestination(outDir, REPO_ROOT);
  for (const path of [join(baseDir, "manifest.json"), join(baseDir, "tables")]) {
    await access(path).then(() => { throw new Error("Supabase archive destination already contains archive data"); }).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  await mkdir(baseDir, { recursive: true });

  const manifest = {
    exportedAt: new Date().toISOString(),
    tables: [],
    storageBuckets: [],
    localStores: [],
  };

  for (const { table, orderColumn, role } of ARCHIVE_TABLES) {
    try {
      const rows = await fetchAllRows(supabase, table, orderColumn);
      const targetPath = join(baseDir, "tables", `${table}.json`);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(
        targetPath,
        `${JSON.stringify(
          { exportedAt: new Date().toISOString(), table, count: rows.length, items: rows },
          null,
          2,
        )}\n`,
        { encoding: "utf8", mode: 0o600, flag: "wx" },
      );
      manifest.tables.push({ table, role, count: rows.length, path: targetPath });
    } catch (error) {
      manifest.tables.push({
        table,
        role,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const fileName of LOCAL_STORE_FILES) {
    await exportLocalStore(fileName, baseDir);
    manifest.localStores.push(fileName);
  }

  try {
    if (!process.env.SUPABASE_STORAGE_READ_KEY) throw new Error("SUPABASE_STORAGE_READ_KEY is required for exhaustive Storage export");
    const storageResult = await exportStorage({
      supabaseUrl,
      storageReadKey: process.env.SUPABASE_STORAGE_READ_KEY,
      outDir: join(baseDir, "storage"),
    });
    manifest.storage = { status: "PASS", ...storageResult };
  } catch (error) {
    manifest.storage = { status: "FAIL", error: error instanceof Error ? error.message : String(error) };
  }

  await writeFile(
    join(baseDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );

  console.log(`Archive written: ${baseDir}`);
}

const currentModuleUrl = pathToFileURL(process.argv[1] ?? "").href;
if (currentModuleUrl === import.meta.url) {
  main().catch((error) => {
    console.error("Supabase archive export failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
