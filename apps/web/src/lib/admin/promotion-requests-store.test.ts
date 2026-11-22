import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertAvailable: vi.fn(),
  useSupabase: vi.fn(),
  getSupabase: vi.fn(),
  readLocal: vi.fn(),
  writeLocal: vi.fn(),
}));

vi.mock("@/lib/persistence/runtime-store", () => ({
  assertPersistenceAvailable: mocks.assertAvailable,
  canUseSupabaseServerPersistence: mocks.useSupabase,
  findRecordInList: (records: Array<{ id: string }>, predicate: (record: { id: string }) => boolean) => records.find(predicate) ?? null,
  prependBoundedRecord: <T,>(record: T, records: T[]) => [record, ...records].slice(0, 2000),
  readSupabaseRecord: async <T,>(query: PromiseLike<{ data: unknown; error: Error | null }>, parse: (row: Record<string, unknown>) => T | null) => {
    const result = await query;
    if (result.error) throw result.error;
    return result.data ? parse(result.data as Record<string, unknown>) : null;
  },
  requirePersistedRecord: <T,>(record: T | null, message: string) => {
    if (!record) throw new Error(message);
    return record;
  },
}));
vi.mock("@/lib/persistence/local-record-store", () => ({
  readLocalRecordStore: mocks.readLocal,
  writeLocalRecordStore: mocks.writeLocal,
}));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));

import {
  appendPromotionRequest,
  getPromotionRequestById,
  listPromotionRequests,
  listPromotionRequestsForUser,
  updatePromotionRequestCreatorState,
  updatePromotionRequestStatus,
  type PromotionRequestRecord,
} from "./promotion-requests-store";

const record = (overrides: Partial<PromotionRequestRecord> = {}): PromotionRequestRecord => ({
  id: "request-1",
  createdAt: "2026-11-20T10:00:00.000Z",
  submittedByUserId: "user-1",
  submittedByDisplayName: "Membre",
  submittedByEmail: null,
  submittedByRole: "benevole",
  requestedRole: "elu",
  motivation: "Je souhaite contribuer.",
  status: "pending_owner_review",
  reviewedAt: null,
  reviewedByUserId: null,
  reviewedByRole: null,
  creatorState: "pending",
  ...overrides,
});

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "request-1",
  created_at: "2026-11-20T10:00:00.000Z",
  submitted_by_user_id: "user-1",
  submitted_by_display_name: "Membre",
  submitted_by_email: null,
  submitted_by_role: "benevole",
  requested_role: "elu",
  motivation: "Je souhaite contribuer.",
  status: "pending_owner_review",
  reviewed_at: null,
  reviewed_by_user_id: null,
  reviewed_by_role: null,
  creator_state: "pending",
  ...overrides,
});

function configureSupabase(result: { data: unknown; error: Error | null }) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const query = {
    select: (...args: unknown[]) => { calls.push({ method: "select", args }); return query; },
    insert: (...args: unknown[]) => { calls.push({ method: "insert", args }); return query; },
    update: (...args: unknown[]) => { calls.push({ method: "update", args }); return query; },
    eq: (...args: unknown[]) => { calls.push({ method: "eq", args }); return query; },
    or: (...args: unknown[]) => { calls.push({ method: "or", args }); return query; },
    order: (...args: unknown[]) => { calls.push({ method: "order", args }); return query; },
    limit: (...args: unknown[]) => { calls.push({ method: "limit", args }); return query; },
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
  };
  const client = { from: vi.fn((table: string) => { calls.push({ method: "from", args: [table] }); return query; }) };
  mocks.getSupabase.mockReturnValue(client);
  return { calls, client };
}

describe("promotion request persistence owner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSupabase.mockReturnValue(false);
    mocks.readLocal.mockResolvedValue({ updatedAt: "2026-11-20T00:00:00.000Z", records: [] });
    mocks.writeLocal.mockResolvedValue(undefined);
  });

  it("appends a pending request locally with a separate creator state", async () => {
    const saved = await appendPromotionRequest({
      submittedByUserId: "user-1",
      input: { submittedByDisplayName: "Membre", submittedByRole: "benevole", requestedRole: "elu", motivation: "Je souhaite contribuer." },
    });

    expect(saved).toMatchObject({ submittedByUserId: "user-1", status: "pending_owner_review", creatorState: "pending" });
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/u);
    expect(saved.submittedByEmail).toBeNull();
    expect(mocks.writeLocal).toHaveBeenCalledWith(expect.any(String), [saved]);
    expect(mocks.getSupabase).not.toHaveBeenCalled();
  });

  it("maps a Supabase insert and never falls back to a local write after persistence failure", async () => {
    mocks.useSupabase.mockReturnValue(true);
    const configured = configureSupabase({ data: row({ submitted_by_display_name: "Persisté" }), error: null });
    await expect(appendPromotionRequest({
      submittedByUserId: "user-1",
      input: { submittedByDisplayName: "Membre", submittedByEmail: null, submittedByRole: "benevole", requestedRole: "elu", motivation: "Je souhaite contribuer." },
    })).resolves.toMatchObject({ submittedByDisplayName: "Persisté", creatorState: "pending" });
    expect(configured.client.from).toHaveBeenCalledWith("promotion_requests");
    expect(configured.calls.find((call) => call.method === "insert")?.args[0]).toMatchObject({
      submitted_by_user_id: "user-1", submitted_by_email: null, requested_role: "elu",
    });
    expect(mocks.writeLocal).not.toHaveBeenCalled();

    configureSupabase({ data: null, error: new Error("insert failed") });
    await expect(appendPromotionRequest({
      submittedByUserId: "user-2",
      input: { submittedByDisplayName: "Membre", submittedByRole: "benevole", requestedRole: "admin", motivation: "Je souhaite contribuer." },
    })).rejects.toThrow("insert failed");
    expect(mocks.writeLocal).not.toHaveBeenCalled();
  });

  it("lists local requests newest-first with exclusive cursor and bounded limit", async () => {
    mocks.readLocal.mockResolvedValue({ updatedAt: "now", records: [
      record({ id: "older", createdAt: "2026-11-18T10:00:00.000Z" }),
      record({ id: "newer", createdAt: "2026-11-20T10:00:00.000Z" }),
      record({ id: "same-time-lower", createdAt: "2026-11-19T10:00:00.000Z" }),
    ] });

    await expect(listPromotionRequests(2)).resolves.toEqual([
      expect.objectContaining({ id: "newer" }), expect.objectContaining({ id: "same-time-lower" }),
    ]);
    await expect(listPromotionRequests(50, { createdAt: "2026-11-19T10:00:00.000Z", id: "z" })).resolves.toEqual([
      expect.objectContaining({ id: "same-time-lower" }), expect.objectContaining({ id: "older" }),
    ]);
    await expect(listPromotionRequests(0)).resolves.toEqual([expect.objectContaining({ id: "newer" })]);
    await expect(listPromotionRequests(900)).resolves.toHaveLength(3);
  });

  it("keeps a current-user listing empty for blank identity and scoped for a real identity", async () => {
    mocks.readLocal.mockResolvedValue({ updatedAt: "now", records: [record(), record({ id: "request-2", submittedByUserId: "user-2" })] });
    await expect(listPromotionRequestsForUser("  ")).resolves.toEqual([]);
    expect(mocks.readLocal).not.toHaveBeenCalled();
    await expect(listPromotionRequestsForUser(" user-1 ")).resolves.toEqual([expect.objectContaining({ submittedByUserId: "user-1" })]);
  });

  it("applies Supabase pagination and drops rows that violate the stored role contract", async () => {
    mocks.useSupabase.mockReturnValue(true);
    const configured = configureSupabase({ data: [row(), row({ id: "bad-role", requested_role: "max" })], error: null });

    await expect(listPromotionRequests(900, { createdAt: "2026-11-20T10:00:00.000Z", id: "cursor" })).resolves.toEqual([
      expect.objectContaining({ id: "request-1" }),
    ]);
    expect(configured.calls).toContainEqual({ method: "or", args: ["created_at.lt.2026-11-20T10:00:00.000Z,and(created_at.eq.2026-11-20T10:00:00.000Z,id.lt.cursor)"] });
    expect(configured.calls).toContainEqual({ method: "limit", args: [500] });
    expect(mocks.readLocal).not.toHaveBeenCalled();
  });

  it("uses the caller's identity in the Supabase current-user query", async () => {
    mocks.useSupabase.mockReturnValue(true);
    const configured = configureSupabase({ data: [], error: null });
    await expect(listPromotionRequestsForUser(" user-1 ", -5)).resolves.toEqual([]);
    expect(configured.calls).toContainEqual({ method: "eq", args: ["submitted_by_user_id", "user-1"] });
    expect(configured.calls).toContainEqual({ method: "limit", args: [1] });
  });

  it("updates owner review locally and leaves a missing request untouched", async () => {
    mocks.readLocal.mockResolvedValue({ updatedAt: "now", records: [record()] });
    const updated = await updatePromotionRequestStatus({ requestId: "request-1", status: "accepted", reviewedByUserId: "owner", reviewedByRole: "max" });
    expect(updated).toMatchObject({ status: "accepted", creatorState: "accepted", reviewedByUserId: "owner", reviewedByRole: "max" });
    expect(mocks.writeLocal).toHaveBeenLastCalledWith(expect.any(String), [updated]);

    mocks.readLocal.mockClear();
    mocks.writeLocal.mockClear();
    await expect(updatePromotionRequestStatus({ requestId: "missing", status: "rejected", reviewedByUserId: "owner", reviewedByRole: "max" })).resolves.toBeNull();
    expect(mocks.writeLocal).not.toHaveBeenCalled();
  });

  it("propagates a failed Supabase review without writing a local record", async () => {
    mocks.useSupabase.mockReturnValue(true);
    configureSupabase({ data: null, error: new Error("review failed") });
    await expect(updatePromotionRequestStatus({ requestId: "request-1", status: "rejected", reviewedByUserId: "owner", reviewedByRole: "max" })).rejects.toThrow("review failed");
    expect(mocks.writeLocal).not.toHaveBeenCalled();
  });

  it("updates only creator workflow state and preserves the decision status", async () => {
    mocks.readLocal.mockResolvedValue({ updatedAt: "now", records: [record({ status: "accepted", creatorState: "pending" })] });
    await expect(updatePromotionRequestCreatorState({ requestId: "request-1", creatorState: "archived" })).resolves.toMatchObject({ status: "accepted", creatorState: "archived" });
    expect(mocks.writeLocal).toHaveBeenCalledWith(expect.any(String), [expect.objectContaining({ status: "accepted", creatorState: "archived" })]);
    await expect(updatePromotionRequestCreatorState({ requestId: "missing", creatorState: "responded" })).resolves.toBeNull();
  });

  it("maps creator-state persistence errors and malformed returned rows without fallback writes", async () => {
    mocks.useSupabase.mockReturnValue(true);
    configureSupabase({ data: row({ creator_state: "unknown" }), error: null });
    await expect(updatePromotionRequestCreatorState({ requestId: "request-1", creatorState: "treated" })).resolves.toMatchObject({ creatorState: "new" });
    configureSupabase({ data: null, error: new Error("creator state failed") });
    await expect(updatePromotionRequestCreatorState({ requestId: "request-1", creatorState: "treated" })).rejects.toThrow("creator state failed");
    expect(mocks.writeLocal).not.toHaveBeenCalled();
  });

  it("returns a missing record consistently in local and Supabase modes", async () => {
    await expect(getPromotionRequestById("missing")).resolves.toBeNull();
    mocks.useSupabase.mockReturnValue(true);
    configureSupabase({ data: null, error: null });
    await expect(getPromotionRequestById("missing")).resolves.toBeNull();
  });

  it("normalizes legacy review state and rejects malformed persisted identities", async () => {
    mocks.useSupabase.mockReturnValue(true);
    configureSupabase({ data: [
      row({ id: "accepted-legacy", status: "accepted", creator_state: null, submitted_by_email: "  ", reviewed_by_role: "invalid" }),
      row({ id: "rejected-legacy", status: "rejected", creator_state: "invalid" }),
      row({ id: "pending-legacy", status: "unknown", creator_state: "invalid" }),
      row({ id: "bad-id", submitted_by_user_id: null }),
    ], error: null });

    await expect(listPromotionRequests()).resolves.toEqual([
      expect.objectContaining({ id: "accepted-legacy", creatorState: "accepted", submittedByEmail: null, reviewedByRole: null }),
      expect.objectContaining({ id: "rejected-legacy", creatorState: "rejected" }),
      expect.objectContaining({ id: "pending-legacy", status: "pending_owner_review", creatorState: "new" }),
    ]);
  });
});
