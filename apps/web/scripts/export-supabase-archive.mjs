import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const PAGE_SIZE = 1000;

const TABLES = [
  ["actions", "created_at"],
  ["spots", "created_at"],
  ["community_events", "created_at"],
  ["event_rsvps", "updated_at"],
  ["app_messages", "created_at"],
  ["app_notifications", "created_at"],
  ["training_examples", "created_at"],
  ["community_bug_reports", "created_at"],
  ["promotion_requests", "created_at"],
  ["partner_onboarding_requests", "created_at"],
  ["progression_events", "created_at"],
  ["progression_profiles", "updated_at"],
  ["funnel_events", "at"],
  ["admin_operations_audit", "at"],
  ["quiz_srs", "updated_at"],
  ["checklist_progress", "updated_at"],
  ["runbook_checks", "last_run_at"],
];

const LOCAL_STORE_FILES = [
  "community_bug_reports.json",
  "promotion_requests.json",
  "partner_onboarding_requests.json",
  "published_partner_annuaire_entries.json",
];

const STORAGE_BUCKETS = ["action-photos", "chat-attachments"];

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

async function fetchAllRows(table, orderColumn) {
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

function isLikelyFolderEntry(entry) {
  return entry && typeof entry.name === "string" && !entry.name.includes(".");
}

async function listBucketEntries(bucket, prefix = "") {
  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: PAGE_SIZE,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

async function exportBucket(bucket, bucketDir, prefix = "") {
  const entries = await listBucketEntries(bucket, prefix);
  for (const entry of entries) {
    const currentPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (isLikelyFolderEntry(entry)) {
      await exportBucket(bucket, bucketDir, currentPath);
      continue;
    }

    const { data, error } = await supabase.storage.from(bucket).download(currentPath);
    if (error) {
      throw new Error(error.message);
    }
    if (!data) {
      continue;
    }

    const targetPath = join(bucketDir, currentPath);
    await mkdir(dirname(targetPath), { recursive: true });
    const buffer = Buffer.from(await data.arrayBuffer());
    await writeFile(targetPath, buffer);
  }
}

async function exportLocalStore(fileName, outDir) {
  const sourcePath = join(process.cwd(), "data", "local-db", fileName);
  try {
    const raw = await readFile(sourcePath, "utf8");
    const targetPath = join(outDir, "local-db", fileName);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, raw, "utf8");
  } catch {
    // Missing local store is fine: not every environment has the fallback files.
  }
}

async function main() {
  const { outDir } = parseArgs();
  const timestamp = new Date().toISOString().replace(/[:]/g, "-");
  const baseDir = resolve(
    process.cwd(),
    outDir || join("backups", "supabase-archive", timestamp),
  );

  await mkdir(baseDir, { recursive: true });

  const manifest = {
    exportedAt: new Date().toISOString(),
    tables: [],
    storageBuckets: [],
    localStores: [],
  };

  for (const [table, orderColumn] of TABLES) {
    try {
      const rows = await fetchAllRows(table, orderColumn);
      const targetPath = join(baseDir, "tables", `${table}.json`);
      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(
        targetPath,
        `${JSON.stringify(
          { exportedAt: new Date().toISOString(), table, count: rows.length, items: rows },
          null,
          2,
        )}\n`,
        "utf8",
      );
      manifest.tables.push({ table, count: rows.length, path: targetPath });
    } catch (error) {
      manifest.tables.push({
        table,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const fileName of LOCAL_STORE_FILES) {
    await exportLocalStore(fileName, baseDir);
    manifest.localStores.push(fileName);
  }

  for (const bucket of STORAGE_BUCKETS) {
    const bucketDir = join(baseDir, "storage", bucket);
    try {
      await exportBucket(bucket, bucketDir);
      manifest.storageBuckets.push(bucket);
    } catch (error) {
      manifest.storageBuckets.push(`${bucket}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await writeFile(
    join(baseDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(`Archive written: ${baseDir}`);
}

main().catch((error) => {
  console.error("Supabase archive export failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
