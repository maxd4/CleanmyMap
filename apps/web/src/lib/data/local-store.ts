import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LocalDataRecord, LocalDataStore } from "@/lib/data/local-records";
import { LOCAL_DATA_STORE_VERSION } from "@/lib/data/local-records";

const LOCAL_DB_DIR = join(process.cwd(), "data", "local-db");

export const LOCAL_DB_FILES = {
  test: join(LOCAL_DB_DIR, "test_records.json"),
  real: join(LOCAL_DB_DIR, "real_records.json"),
  validated: join(LOCAL_DB_DIR, "validated_records.json"),
} as const;

function emptyStore(): LocalDataStore {
  return {
    version: LOCAL_DATA_STORE_VERSION,
    updatedAt: new Date().toISOString(),
    records: [],
  };
}

async function ensureParentDirectory(pathname: string): Promise<void> {
  await mkdir(dirname(pathname), { recursive: true });
}

export async function readLocalStore(
  pathname: string,
): Promise<LocalDataStore> {
  try {
    const raw = await readFile(pathname, "utf8");
    const parsed = JSON.parse(raw) as LocalDataStore;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.records)
    ) {
      return emptyStore();
    }
    return {
      version: Number(parsed.version) || LOCAL_DATA_STORE_VERSION,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      records: parsed.records,
    };
  } catch {
    return emptyStore();
  }
}

export async function writeLocalStore(
  pathname: string,
  store: LocalDataStore,
): Promise<void> {
  const payload: LocalDataStore = {
    version: store.version || LOCAL_DATA_STORE_VERSION,
    updatedAt: new Date().toISOString(),
    records: store.records,
  };
  await ensureParentDirectory(pathname);
  await writeFile(pathname, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function canonicalExternalId(record: LocalDataRecord): string {
  return `${record.recordType}:${record.trace?.externalId ?? ""}`.trim();
}

function shouldReplace(
  current: LocalDataRecord,
  incoming: LocalDataRecord,
): boolean {
  const currentDate =
    current.trace?.validatedAt ?? current.trace?.importedAt ?? "";
  const incomingDate =
    incoming.trace?.validatedAt ?? incoming.trace?.importedAt ?? "";
  return incomingDate >= currentDate;
}

export async function upsertLocalRecords(
  pathname: string,
  incomingRecords: LocalDataRecord[],
): Promise<LocalDataStore> {
  const store = await readLocalStore(pathname);
  const merged = [...store.records];

  for (const record of incomingRecords) {
    const extId = canonicalExternalId(record);
    const matchIndex = merged.findIndex((item) => {
      if (record.trace?.externalId && item.trace?.externalId) {
        return canonicalExternalId(item) === extId;
      }
      return item.id === record.id;
    });

    if (matchIndex >= 0) {
      if (shouldReplace(merged[matchIndex], record)) {
        merged[matchIndex] = record;
      }
      continue;
    }
    merged.push(record);
  }

  const output: LocalDataStore = {
    version: LOCAL_DATA_STORE_VERSION,
    updatedAt: new Date().toISOString(),
    records: merged,
  };
  await writeLocalStore(pathname, output);
  return output;
}

export async function readAllLocalStores(): Promise<{
  test: LocalDataStore;
  real: LocalDataStore;
  validated: LocalDataStore;
}> {
  const [test, real, validated] = await Promise.all([
    readLocalStore(LOCAL_DB_FILES.test),
    readLocalStore(LOCAL_DB_FILES.real),
    readLocalStore(LOCAL_DB_FILES.validated),
  ]);
  return { test, real, validated };
}
