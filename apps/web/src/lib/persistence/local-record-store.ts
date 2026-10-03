import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type LocalRecordStorePayload<T> = {
  updatedAt: string;
  records: T[];
};

export async function readLocalRecordStore<T>(
  filePath: string,
  normalizeRecord: (record: Record<string, unknown>) => T | null,
): Promise<LocalRecordStorePayload<T>> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as {
      updatedAt?: unknown;
      records?: unknown;
    };
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.records)) {
      return { updatedAt: new Date().toISOString(), records: [] };
    }
    return {
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
      records: parsed.records
        .map((record) => normalizeRecord(record as Record<string, unknown>))
        .filter((record): record is T => record !== null),
    };
  } catch {
    return { updatedAt: new Date().toISOString(), records: [] };
  }
}

export async function writeLocalRecordStore<T>(
  filePath: string,
  records: T[],
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(
      { updatedAt: new Date().toISOString(), records },
      null,
      2,
    )}\n`,
    "utf8",
  );
}
