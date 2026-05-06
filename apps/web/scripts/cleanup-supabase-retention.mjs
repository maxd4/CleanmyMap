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
  { table: "app_messages", createdColumn: "created_at" },
  { table: "community_events", createdColumn: "created_at", deleteUsing: "event_date" },
  { table: "training_examples", createdColumn: "created_at" },
  { table: "community_bug_reports", createdColumn: "created_at" },
  { table: "promotion_requests", createdColumn: "created_at" },
  { table: "partner_onboarding_requests", createdColumn: "created_at" },
];

const LOCAL_STORE_FILES = [
  "community_bug_reports.json",
  "promotion_requests.json",
  "partner_onboarding_requests.json",
];

const STORAGE_BUCKETS = ["action-photos", "chat-attachments"];

function parseArgs() {
  const options = {
    days: 120,
    dryRun: false,
    outDir: null,
  };

  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith("--days=")) {
      const parsed = Number(arg.slice("--days=".length));
      if (Number.isFinite(parsed) && parsed > 0) {
        options.days = Math.trunc(parsed);
      }
      continue;
    }
    if (arg.startsWith("--out=")) {
      options.outDir = arg.slice("--out=".length);
    }
  }

  return options;
}

function buildCutoff(days) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff;
}

function isOlderThan(value, cutoff) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp < cutoff.getTime();
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function exportJson(outDir, relativePath, payload) {
  const targetPath = join(outDir, relativePath);
  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function fetchAllRows(table, createdColumn, cutoff) {
  const rows = [];
  let from = 0;
  while (true) {
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from(table).select("*").range(from, to);
    if (createdColumn) {
      query = query.order(createdColumn, { ascending: true });
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    const batch = (data ?? []).filter((row) => isOlderThan(row[createdColumn], cutoff));
    rows.push(...batch);
    if ((data ?? []).length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }
  return rows;
}

async function deleteTableRows(table, column, cutoff, dryRun) {
  const rows = await fetchAllRows(table, column, cutoff);
  const ids = rows.map((row) => row.id).filter((id) => typeof id === "string" || typeof id === "number");
  if (ids.length === 0) {
    return { count: 0, rows };
  }

  if (dryRun) {
    return { count: ids.length, rows };
  }

  if (column === "event_date") {
    const { error } = await supabase
      .from(table)
      .delete()
      .lt(column, cutoff.toISOString().slice(0, 10));
    if (error) {
      throw new Error(error.message);
    }
    return { count: ids.length, rows };
  }

  for (const chunk of chunkArray(ids, 500)) {
    const { error } = await supabase.from(table).delete().in("id", chunk);
    if (error) {
      throw new Error(error.message);
    }
  }
  return { count: ids.length, rows };
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

function isLikelyFolderEntry(entry) {
  return entry && typeof entry.name === "string" && !entry.name.includes(".");
}

async function collectExpiredBucketPaths(bucket, cutoff, prefix = "") {
  const entries = await listBucketEntries(bucket, prefix);
  const paths = [];

  for (const entry of entries) {
    const currentPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (isLikelyFolderEntry(entry)) {
      const nested = await collectExpiredBucketPaths(bucket, cutoff, currentPath);
      paths.push(...nested);
      continue;
    }

    const createdAt = typeof entry.created_at === "string" ? entry.created_at : typeof entry.updated_at === "string" ? entry.updated_at : null;
    if (isOlderThan(createdAt, cutoff)) {
      paths.push(currentPath);
    }
  }

  return paths;
}

async function deleteBucketObjects(bucket, cutoff) {
  const paths = await collectExpiredBucketPaths(bucket, cutoff);
  if (paths.length === 0) {
    return 0;
  }

  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    throw new Error(error.message);
  }

  return paths.length;
}

async function pruneLocalStore(fileName, cutoff, outDir) {
  const sourcePath = join(process.cwd(), "data", "local-db", fileName);
  try {
    const raw = await readFile(sourcePath, "utf8");
    const parsed = JSON.parse(raw);
    const records = Array.isArray(parsed?.records) ? parsed.records : [];
    const expired = records.filter((record) => isOlderThan(record?.createdAt, cutoff));
    const kept = records.filter((record) => !isOlderThan(record?.createdAt, cutoff));

    await exportJson(outDir, join("archives", "local-db", fileName), {
      exportedAt: new Date().toISOString(),
      source: fileName,
      count: expired.length,
      items: expired,
    });
    return { expired: expired.length, kept: kept.length };
  } catch {
    return { expired: 0, kept: 0 };
  }
}

async function main() {
  const { days, dryRun, outDir } = parseArgs();
  const cutoff = buildCutoff(days);
  const timestamp = new Date().toISOString().replace(/[:]/g, "-");
  const baseDir = resolve(
    process.cwd(),
    outDir || join("backups", "supabase-retention", timestamp),
  );

  await mkdir(baseDir, { recursive: true });

  const summary = {
    cutoff: cutoff.toISOString(),
    dryRun,
    tables: [],
    buckets: [],
    localStores: [],
  };

  for (const { table, createdColumn, deleteUsing } of TABLES) {
    try {
      const { count, rows } = await deleteTableRows(
        table,
        deleteUsing ?? createdColumn,
        cutoff,
        dryRun,
      );
      await exportJson(baseDir, join("archives", "tables", `${table}.json`), {
        exportedAt: new Date().toISOString(),
        table,
        count,
        items: rows,
      });
      summary.tables.push({ table, deleted: dryRun ? 0 : count, archived: count });
    } catch (error) {
      summary.tables.push({
        table,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const bucket of STORAGE_BUCKETS) {
    try {
      const paths = await collectExpiredBucketPaths(bucket, cutoff);
      await exportJson(baseDir, join("archives", "storage", `${bucket}.json`), {
        exportedAt: new Date().toISOString(),
        bucket,
        count: paths.length,
        items: paths,
      });
      summary.buckets.push({ bucket, deleted: dryRun ? 0 : paths.length, archived: paths.length });
      if (!dryRun && paths.length > 0) {
        for (const chunk of chunkArray(paths, 500)) {
          const { error } = await supabase.storage.from(bucket).remove(chunk);
          if (error) {
            throw new Error(error.message);
          }
        }
      }
    } catch (error) {
      summary.buckets.push({
        bucket,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const fileName of LOCAL_STORE_FILES) {
    try {
      const result = dryRun
        ? await pruneLocalStore(fileName, cutoff, baseDir)
        : await pruneLocalStore(fileName, cutoff, baseDir);
      summary.localStores.push({
        fileName,
        expired: result.expired,
        kept: result.kept,
      });
      if (!dryRun) {
        const sourcePath = join(process.cwd(), "data", "local-db", fileName);
        const raw = await readFile(sourcePath, "utf8");
        const parsed = JSON.parse(raw);
        const records = Array.isArray(parsed?.records) ? parsed.records : [];
        const kept = records.filter((record) => !isOlderThan(record?.createdAt, cutoff));
        await writeFile(
          sourcePath,
          `${JSON.stringify(
            {
              ...parsed,
              updatedAt: new Date().toISOString(),
              records: kept,
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
      }
    } catch (error) {
      summary.localStores.push({
        fileName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await exportJson(baseDir, "summary.json", summary);
  console.log(`Retention cleanup completed: ${baseDir}`);
}

main().catch((error) => {
  console.error("Supabase retention cleanup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
