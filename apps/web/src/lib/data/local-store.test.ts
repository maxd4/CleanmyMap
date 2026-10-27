import { beforeEach, describe, expect, it, vi } from "vitest";

const readFileMock = vi.hoisted(() => vi.fn());
const writeFileMock = vi.hoisted(() => vi.fn(async () => undefined));
const mkdirMock = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("node:fs/promises", () => ({ readFile: readFileMock, writeFile: writeFileMock, mkdir: mkdirMock }));

import { readAllLocalStores, upsertLocalRecords } from "./local-store";
import type { LocalDataRecord } from "./local-records";

const record = (id: string, externalId: string | null, date: string): LocalDataRecord => ({
  id,
  recordType: "action",
  status: "validated",
  source: "admin_validation",
  title: id,
  location: { label: "Paris" },
  map: { displayable: false, lat: null, lon: null },
  trace: { externalId, validatedAt: date },
});

describe("local data store merge semantics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readFileMock.mockRejectedValue(new Error("missing"));
  });

  it("creates an empty store when the file is missing or malformed", async () => {
    await expect(upsertLocalRecords("C:/tmp/records.json", [record("new", null, "2026-10-27")])).resolves.toMatchObject({ version: 1, records: [expect.objectContaining({ id: "new" })] });
    readFileMock.mockResolvedValue(JSON.stringify({ records: "invalid" }));
    await expect(readAllLocalStores()).resolves.toMatchObject({ real: { version: 1, records: [] }, validated: { version: 1, records: [] } });
  });

  it("replaces matching external records only with newer data and otherwise appends", async () => {
    const current = record("current", "external-1", "2026-10-20");
    readFileMock.mockResolvedValue(JSON.stringify({ version: 9, updatedAt: "old", records: [current] }));
    const older = record("older", "external-1", "2026-10-19");
    const newer = record("newer", "external-1", "2026-10-21");
    const sameId = record("current", null, "2026-10-22");
    const added = record("added", null, "2026-10-22");
    const result = await upsertLocalRecords("C:/tmp/records.json", [older, newer, sameId, added]);
    expect(result.records).toHaveLength(3);
    expect(result.records.find((item) => item.trace?.externalId === "external-1")?.id).toBe("newer");
    expect(result.records.find((item) => item.id === "current")?.trace?.validatedAt).toBe("2026-10-22");
    expect(result.records.find((item) => item.id === "added")).toBeDefined();
    expect(writeFileMock).toHaveBeenCalled();
  });
});
