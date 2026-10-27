import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  allowLocalActionStoreInCurrentRuntime,
  canUseSupabaseServerPersistence,
  prependBoundedRecord,
  deleteAndPersistRecord,
  deleteSupabaseRecordById,
  findRecordInList,
  mapSupabaseRecords,
  persistSupabaseRecord,
  readSupabaseRecord,
  readSupabaseRecords,
  replaceAndPersistRecord,
  requirePersistedRecord,
} from "./runtime-store";

const envMock = vi.hoisted(() => ({
  NEXT_PUBLIC_SUPABASE_URL: undefined as string | undefined,
  SUPABASE_SERVICE_ROLE_KEY: undefined as string | undefined,
  ALLOW_LOCAL_FILE_STORE_FALLBACK: false,
  ALLOW_LOCAL_ACTION_STORE_IN_PROD: false,
}));

vi.mock("@/lib/env", () => ({ env: envMock }));

describe("runtime persistence guard", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "test");
    envMock.NEXT_PUBLIC_SUPABASE_URL = undefined;
    envMock.SUPABASE_SERVICE_ROLE_KEY = undefined;
    envMock.ALLOW_LOCAL_FILE_STORE_FALLBACK = false;
    envMock.ALLOW_LOCAL_ACTION_STORE_IN_PROD = false;
    vi.restoreAllMocks();
  });

  it("fails closed on Vercel even when local fallback is enabled", async () => {
    vi.stubEnv("VERCEL", "1");
    envMock.ALLOW_LOCAL_FILE_STORE_FALLBACK = true;

    const { assertPersistenceAvailable } = await import("./runtime-store");

    expect(() => assertPersistenceAvailable("contact_requests")).toThrow(
      "Persistence unavailable for contact_requests on Vercel",
    );
    expect(() => assertPersistenceAvailable("contact_requests")).toThrow(
      "local file fallback is forbidden",
    );
  });

  it("allows the explicit local development fallback", async () => {
    vi.stubEnv("NODE_ENV", "development");
    envMock.ALLOW_LOCAL_FILE_STORE_FALLBACK = true;

    const { allowLocalFileStoreFallback, assertPersistenceAvailable } =
      await import("./runtime-store");

    expect(allowLocalFileStoreFallback()).toBe(true);
    expect(() => assertPersistenceAvailable("contact_requests")).not.toThrow();
  });

  it("accepts only an HTTPS Supabase server configuration", () => {
    expect(canUseSupabaseServerPersistence()).toBe(false);

    envMock.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.example";
    envMock.SUPABASE_SERVICE_ROLE_KEY = "12345678901234567890";
    expect(canUseSupabaseServerPersistence()).toBe(false);

    envMock.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    envMock.SUPABASE_SERVICE_ROLE_KEY = "too-short";
    expect(canUseSupabaseServerPersistence()).toBe(false);

    envMock.SUPABASE_SERVICE_ROLE_KEY = "12345678901234567890";
    expect(canUseSupabaseServerPersistence()).toBe(true);
  });

  it("fails closed outside development when local persistence is not explicitly enabled", async () => {
    const { allowLocalFileStoreFallback, assertPersistenceAvailable } = await import("./runtime-store");
    expect(allowLocalFileStoreFallback()).toBe(false);
    expect(() => assertPersistenceAvailable("audit_events")).toThrow(
      "missing SUPABASE_SERVICE_ROLE_KEY and local fallback disabled",
    );

    vi.stubEnv("NODE_ENV", "production");
    envMock.ALLOW_LOCAL_FILE_STORE_FALLBACK = true;
    expect(allowLocalFileStoreFallback()).toBe(false);
    expect(() => assertPersistenceAvailable("audit_events")).toThrow("Persistence unavailable");
  });

  it("maps absent rows, rejects dependency errors, and requires persisted records", async () => {
    const parse = (row: Record<string, unknown>) => typeof row?.id === "string" ? row.id : null;
    await expect(readSupabaseRecords(Promise.resolve({
      data: [{ id: "one" }, { invalid: true }, null],
      error: null,
    }), parse)).resolves.toEqual(["one"]);
    expect(mapSupabaseRecords(undefined, parse)).toEqual([]);
    await expect(readSupabaseRecord(Promise.resolve({ data: null, error: null }), parse)).resolves.toBeNull();
    await expect(readSupabaseRecords(Promise.resolve({ data: [], error: { message: "database unavailable" } }), parse)).rejects.toThrow("database unavailable");
    await expect(persistSupabaseRecord(Promise.resolve({ data: null, error: null }), parse, "record missing")).rejects.toThrow("record missing");
    expect(() => requirePersistedRecord(null, "required record")).toThrow("required record");
  });

  it("reports deletion effects and propagates deletion errors", async () => {
    const select = vi.fn()
      .mockResolvedValueOnce({ data: [{ id: "row-1" }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "delete failed" } });
    const client = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ select })),
        })),
      })),
    };

    await expect(deleteSupabaseRecordById(client, "records", "row-1")).resolves.toBe(true);
    await expect(deleteSupabaseRecordById(client, "records", "missing")).resolves.toBe(false);
    await expect(deleteSupabaseRecordById(client, "records", "broken")).rejects.toThrow("delete failed");
    expect(client.from).toHaveBeenCalledWith("records");
    expect(select).toHaveBeenCalledWith("id");
  });

  it("does not persist a missing replacement or deletion, but persists observable changes", async () => {
    const records = [{ id: "one", value: 1 }, { id: "two", value: 2 }];
    const persist = vi.fn().mockResolvedValue(undefined);

    await expect(replaceAndPersistRecord(records, (record) => record.id === "missing", (record) => record, persist)).resolves.toBeNull();
    await expect(deleteAndPersistRecord(records, (record) => record.id === "missing", persist)).resolves.toBe(false);
    expect(persist).not.toHaveBeenCalled();

    await expect(replaceAndPersistRecord(records, (record) => record.id === "one", (record) => ({ ...record, value: 3 }), persist)).resolves.toEqual({ id: "one", value: 3 });
    await expect(deleteAndPersistRecord(records, (record) => record.id === "two", persist)).resolves.toBe(true);
    expect(persist).toHaveBeenNthCalledWith(1, [{ id: "one", value: 3 }, records[1]]);
    expect(persist).toHaveBeenNthCalledWith(2, [records[0]]);
    expect(findRecordInList(records, (record) => record.id === "two")).toEqual(records[1]);
  });

  it("bounds prepends, preserves immutable inputs, and propagates persistence failures", async () => {
    const records = [{ id: "one" }, { id: "two" }];
    expect(prependBoundedRecord({ id: "new" }, records, 2)).toEqual([{ id: "new" }, { id: "one" }]);
    expect(records).toEqual([{ id: "one" }, { id: "two" }]);

    const persist = vi.fn().mockRejectedValue(new Error("write unavailable"));
    await expect(replaceAndPersistRecord(records, (record) => record.id === "one", () => ({ id: "changed" }), persist)).rejects.toThrow("write unavailable");
    await expect(deleteAndPersistRecord(records, (record) => record.id === "one", persist)).rejects.toThrow("write unavailable");
  });

  it("keeps local action persistence disabled on Vercel and allows the explicit production opt-in", async () => {
    vi.stubEnv("VERCEL", "1");
    expect(allowLocalActionStoreInCurrentRuntime()).toBe(false);

    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    envMock.ALLOW_LOCAL_ACTION_STORE_IN_PROD = true;
    expect(allowLocalActionStoreInCurrentRuntime()).toBe(true);
  });
});
