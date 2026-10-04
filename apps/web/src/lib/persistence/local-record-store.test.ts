import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readLocalRecordStore, writeLocalRecordStore } from "./local-record-store";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

async function createTemporaryPath(fileName = "nested/store.json"): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "cleanmymap-local-record-store-"));
  temporaryDirectories.push(directory);
  return join(directory, fileName);
}

function normalizeRecord(record: Record<string, unknown>): string | null {
  return typeof record.value === "string" ? record.value : null;
}

describe("local record store", () => {
  it("returns an empty fallback when the file is absent", async () => {
    const filePath = await createTemporaryPath();

    const result = await readLocalRecordStore(filePath, normalizeRecord);

    expect(result.records).toEqual([]);
    expect(Number.isNaN(Date.parse(result.updatedAt))).toBe(false);
  });

  it("returns an empty fallback for invalid JSON or an invalid records field", async () => {
    const invalidJsonPath = await createTemporaryPath("invalid.json");
    await writeFile(invalidJsonPath, "{not-json", "utf8");
    await expect(readLocalRecordStore(invalidJsonPath, normalizeRecord)).resolves.toMatchObject({
      records: [],
    });

    const invalidRecordsPath = await createTemporaryPath("invalid-records.json");
    await writeFile(
      invalidRecordsPath,
      JSON.stringify({ updatedAt: "2026-09-01T00:00:00.000Z", records: {} }),
      "utf8",
    );
    await expect(readLocalRecordStore(invalidRecordsPath, normalizeRecord)).resolves.toMatchObject({
      records: [],
    });
  });

  it("normalizes records, keeps a valid updatedAt, and falls back for an invalid one", async () => {
    const validPath = await createTemporaryPath("valid.json");
    await writeFile(
      validPath,
      JSON.stringify({
        updatedAt: "2026-09-01T00:00:00.000Z",
        records: [{ value: "kept" }, { value: 42 }],
      }),
      "utf8",
    );

    await expect(readLocalRecordStore(validPath, normalizeRecord)).resolves.toEqual({
      updatedAt: "2026-09-01T00:00:00.000Z",
      records: ["kept"],
    });

    const fallbackPath = await createTemporaryPath("fallback.json");
    await writeFile(
      fallbackPath,
      JSON.stringify({ updatedAt: 42, records: [{ value: "kept" }] }),
      "utf8",
    );
    const fallback = await readLocalRecordStore(fallbackPath, normalizeRecord);
    expect(fallback.records).toEqual(["kept"]);
    expect(Number.isNaN(Date.parse(fallback.updatedAt))).toBe(false);
    expect(fallback.updatedAt).not.toBe("42");
  });

  it("skips invalid record values and preserves valid records with a valid updatedAt", async () => {
    const filePath = await createTemporaryPath("heterogeneous.json");
    await writeFile(
      filePath,
      JSON.stringify({
        updatedAt: "2026-09-02T00:00:00.000Z",
        records: [
          { value: "before" },
          null,
          42,
          [{ value: "array" }],
          { value: 7 },
          { value: "after" },
        ],
      }),
      "utf8",
    );

    await expect(readLocalRecordStore(filePath, normalizeRecord)).resolves.toEqual({
      updatedAt: "2026-09-02T00:00:00.000Z",
      records: ["before", "after"],
    });
  });

  it("skips a record whose normalizer throws without losing neighboring records", async () => {
    const filePath = await createTemporaryPath("throwing-normalizer.json");
    await writeFile(
      filePath,
      JSON.stringify({
        updatedAt: "2026-09-03T00:00:00.000Z",
        records: [{ value: "before" }, { value: "throw" }, { value: "after" }],
      }),
      "utf8",
    );

    const normalizeWithThrow = (record: Record<string, unknown>): string | null => {
      if (record.value === "throw") {
        throw new Error("invalid record");
      }
      return normalizeRecord(record);
    };

    await expect(readLocalRecordStore(filePath, normalizeWithThrow)).resolves.toEqual({
      updatedAt: "2026-09-03T00:00:00.000Z",
      records: ["before", "after"],
    });
  });

  it("creates parent directories and writes the canonical envelope", async () => {
    const filePath = await createTemporaryPath("deep/nested/store.json");

    await writeLocalRecordStore(filePath, [{ value: "one" }, { value: "two" }]);

    const written = JSON.parse(await readFile(filePath, "utf8")) as {
      updatedAt: unknown;
      records: unknown;
    };
    expect(Object.keys(written).sort()).toEqual(["records", "updatedAt"]);
    expect(written.records).toEqual([{ value: "one" }, { value: "two" }]);
    expect(typeof written.updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(written.updatedAt as string))).toBe(false);
  });
});
