import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const readLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const writeLocalRecordStoreMock = vi.hoisted(() => vi.fn());
const runtimeState = vi.hoisted(() => ({ allowFallback: false, useSupabase: true, persistenceError: null as Error | null }));

vi.mock("@/lib/persistence/runtime-store", () => ({
  allowLocalFileStoreFallback: () => runtimeState.allowFallback,
  assertPersistenceAvailable: () => {
    if (runtimeState.persistenceError) throw runtimeState.persistenceError;
  },
  canUseSupabaseServerPersistence: () => runtimeState.useSupabase,
  getRecentTimeWindow: (periodDays: number) => {
    const nowMs = Date.now();
    const floor = nowMs - periodDays * 24 * 60 * 60 * 1000;
    return { nowMs, floor, floorIso: new Date(floor).toISOString() };
  },
  prependBoundedRecord: (record: unknown, records: unknown[], limit: number) => [record, ...records].slice(0, limit),
}));

vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: readLocalRecordStoreMock,
  writeLocalRecordStore: writeLocalRecordStoreMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

function createSupabaseMock(params: {
  insertResult?: { error: unknown };
  rows?: unknown[] | null;
  listError?: unknown;
} = {}) {
  const listQuery = {
    select: vi.fn(() => listQuery),
    gte: vi.fn(() => listQuery),
    order: vi.fn(() => listQuery),
    limit: vi.fn(async () => ({ data: params.rows ?? [], error: params.listError ?? null })),
  };
  return {
    from: vi.fn(() => ({
      insert: vi.fn(async () => params.insertResult ?? { error: null }),
      select: vi.fn(() => listQuery),
    })),
  };
}

describe("funnel store persistence and safety boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    runtimeState.allowFallback = false;
    runtimeState.useSupabase = true;
    runtimeState.persistenceError = null;
    readLocalRecordStoreMock.mockResolvedValue({ updatedAt: "2026-10-31T10:00:00.000Z", records: [] });
    writeLocalRecordStoreMock.mockResolvedValue(undefined);
    vi.stubEnv("NODE_ENV", "test");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T12:00:00.000Z"));
  });

  it("rejects unsafe session ids before any persistence client or local write", async () => {
    const { appendFunnelEvent } = await import("./funnel-store");

    await expect(appendFunnelEvent({
      at: "2026-10-31T12:00:00.000Z",
      sessionId: "personne@example.com",
      userId: null,
      step: "page_view",
      mode: "complete",
    })).rejects.toThrow("Invalid analytics session id");
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(writeLocalRecordStoreMock).not.toHaveBeenCalled();
  });

  it("writes valid events to Supabase without creating a duplicate local effect", async () => {
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock());
    const { appendFunnelEvent } = await import("./funnel-store");
    const event = {
      at: "2026-10-31T11:59:00.000Z",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      userId: "user-1",
      step: "submit_success" as const,
      mode: "quick" as const,
      meta: { routeKind: "actions" },
    };

    await expect(appendFunnelEvent(event)).resolves.toBeUndefined();
    const client = getSupabaseServerClientMock.mock.results[0]?.value;
    expect(client.from).toHaveBeenCalledWith("funnel_events");
    expect(client.from.mock.results[0]?.value.insert).toHaveBeenCalledWith({
      at: event.at,
      session_id: event.sessionId,
      user_id: event.userId,
      step: event.step,
      mode: event.mode,
      meta: event.meta,
    });
    expect(writeLocalRecordStoreMock).not.toHaveBeenCalled();
  });

  it("falls back only for an allowed missing table and keeps the local store bounded", async () => {
    runtimeState.allowFallback = true;
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock({
      insertResult: { error: { code: "42P01", message: "relation funnel_events does not exist" } },
    }));
    readLocalRecordStoreMock.mockResolvedValue({
      updatedAt: "2026-10-31T10:00:00.000Z",
      records: Array.from({ length: 12_000 }, (_, index) => ({
        at: "2026-10-30T10:00:00.000Z",
        sessionId: `550e8400-e29b-41d4-a716-44665544${String(index).padStart(4, "0")}`.slice(0, 36),
        userId: null,
        step: "page_view",
        mode: "complete",
      })),
    });
    const { appendFunnelEvent } = await import("./funnel-store");
    await appendFunnelEvent({
      at: "2026-10-31T11:59:00.000Z",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      userId: null,
      step: "page_view",
      mode: "complete",
    });

    expect(writeLocalRecordStoreMock).toHaveBeenCalledTimes(1);
    const records = writeLocalRecordStoreMock.mock.calls[0]?.[1] as unknown[];
    expect(records).toHaveLength(12_000);
    expect(records[0]).toMatchObject({ sessionId: "550e8400-e29b-41d4-a716-446655440001" });
  });

  it("does not turn a non-fallback Supabase failure into a local write", async () => {
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock({
      insertResult: { error: { code: "42501", message: "permission denied" } },
    }));
    const { appendFunnelEvent } = await import("./funnel-store");

    await expect(appendFunnelEvent({
      at: "2026-10-31T11:59:00.000Z",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      userId: null,
      step: "page_view",
      mode: "complete",
    })).rejects.toThrow("permission denied");
    expect(writeLocalRecordStoreMock).not.toHaveBeenCalled();
  });

  it("filters Supabase rows by the requested time window and rejects invalid persistence shapes", async () => {
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock({
      rows: [
        { at: "2026-10-30T12:00:00.000Z", session_id: "550e8400-e29b-41d4-a716-446655440001", user_id: null, step: "page_view", mode: "complete", meta: { routeKind: "actions" } },
        { at: "2026-10-20T12:00:00.000Z", session_id: "550e8400-e29b-41d4-a716-446655440002", user_id: null, step: "page_view", mode: "complete", meta: null },
        { at: "2026-11-01T12:00:00.000Z", session_id: "550e8400-e29b-41d4-a716-446655440003", user_id: null, step: "page_view", mode: "complete", meta: null },
        { at: "2026-10-30T12:00:00.000Z", session_id: "personne@example.com", user_id: null, step: "page_view", mode: "complete", meta: null },
        { at: "2026-10-30T12:00:00.000Z", session_id: "550e8400-e29b-41d4-a716-446655440004", user_id: null, step: "invalid", mode: "complete", meta: null },
      ],
    }));
    const { listFunnelEvents } = await import("./funnel-store");

    await expect(listFunnelEvents(7)).resolves.toEqual([{
      at: "2026-10-30T12:00:00.000Z",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      userId: null,
      step: "page_view",
      mode: "complete",
      meta: { routeKind: "actions" },
    }]);
    const client = getSupabaseServerClientMock.mock.results[0]?.value;
    const table = client.from.mock.results[0]?.value;
    const query = table.select.mock.results[0]?.value;
    expect(table.select).toHaveBeenCalledWith("at, session_id, user_id, step, mode, meta");
    expect(query.limit).toHaveBeenCalledWith(12_000);
    expect(readLocalRecordStoreMock).not.toHaveBeenCalled();
  });

  it("uses a permitted local read fallback with the same time bounds", async () => {
    runtimeState.allowFallback = true;
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock({
      listError: { code: "PGRST205", message: "Could not find the table funnel_events in the schema cache" },
    }));
    readLocalRecordStoreMock.mockResolvedValue({
      updatedAt: "2026-10-31T10:00:00.000Z",
      records: [
        { at: "2026-10-31T11:00:00.000Z", sessionId: "550e8400-e29b-41d4-a716-446655440001", userId: null, step: "page_view", mode: "complete" },
        { at: "2026-10-20T11:00:00.000Z", sessionId: "550e8400-e29b-41d4-a716-446655440002", userId: null, step: "page_view", mode: "complete" },
      ],
    });
    const { listFunnelEvents } = await import("./funnel-store");

    await expect(listFunnelEvents(7)).resolves.toEqual([
      { at: "2026-10-31T11:00:00.000Z", sessionId: "550e8400-e29b-41d4-a716-446655440001", userId: null, step: "page_view", mode: "complete" },
    ]);
  });

  it("keeps persistence unavailable as an explicit error", async () => {
    runtimeState.persistenceError = new Error("persistence unavailable");
    const { appendFunnelEvent } = await import("./funnel-store");

    await expect(appendFunnelEvent({
      at: "2026-10-31T11:59:00.000Z",
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      userId: null,
      step: "page_view",
      mode: "complete",
    })).rejects.toThrow("persistence unavailable");
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});
