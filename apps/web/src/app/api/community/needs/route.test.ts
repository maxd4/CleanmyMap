import { beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const safeSessionMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadActionByIdMock = vi.hoisted(() => vi.fn());
const listActionNeedsMock = vi.hoisted(() => vi.fn());
const canManageActionNeedMock = vi.hoisted(() => vi.fn());
const toActionNeedItemForContextMock = vi.hoisted(() => vi.fn());
const loadActionNeedByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authzMock }));
vi.mock("@/lib/auth/safe-session", () => ({ getSafeAuthSession: safeSessionMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/actions/store", () => ({ loadActionById: loadActionByIdMock }));
vi.mock("@/lib/community/action-needs-service", () => ({
  ACTION_NEED_SELECT_FIELDS: "action-needs",
  listActionNeeds: listActionNeedsMock,
  canManageActionNeed: canManageActionNeedMock,
  toActionNeedItemForContext: toActionNeedItemForContextMock,
  loadActionNeedById: loadActionNeedByIdMock,
}));

import { GET, POST } from "./route";
import { PATCH } from "./[needId]/route";

const userId = "user-1";
const actionId = "11111111-1111-4111-8111-111111111111";
const needId = "22222222-2222-4222-8222-222222222222";
const updatedAt = "2026-10-30T10:00:00.000Z";
const action = { id: actionId, created_by_clerk_id: "creator-1" };
const need = {
  id: needId,
  action_id: actionId,
  created_by_clerk_id: "creator-1",
  category: "materiel",
  title: "Gants solides",
  description: "Prévoir des gants pour le groupe.",
  quantity_label: "10 paires",
  expires_at: null,
  status: "open",
  fulfilled_at: null,
  created_at: "2026-10-30T09:00:00.000Z",
  updated_at: updatedAt,
};
const item = {
  id: needId,
  actionId,
  category: "materiel",
  title: need.title,
  description: need.description,
  quantityLabel: need.quantity_label,
  expiresAt: null,
  status: "open",
  effectiveStatus: "open",
  fulfilledAt: null,
  createdAt: need.created_at,
  updatedAt,
  action: { id: actionId, title: "Action test", actionDate: "2099-10-30", eventStartTime: null, locationLabel: "Paris" },
  canManage: true,
};

function query(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    or: vi.fn(() => chain),
    select: vi.fn(() => chain),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
  };
  return chain;
}

function jsonRequest(body: unknown, method = "POST") {
  return new Request("http://localhost/api/community/needs", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("community needs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authzMock.mockResolvedValue({ ok: true, userId });
    safeSessionMock.mockResolvedValue({ userId: null });
    loadActionByIdMock.mockResolvedValue(action);
    canManageActionNeedMock.mockResolvedValue(true);
    toActionNeedItemForContextMock.mockReturnValue(item);
    listActionNeedsMock.mockResolvedValue({ items: [item], managerActions: [], limit: 20, offset: 0, hasMore: false });
  });

  it("keeps the public GET projection free of private creator identity and forwards bounded filters", async () => {
    const response = await GET(new Request("http://localhost/api/community/needs?category=materiel&effectiveStatus=expired&limit=50&offset=10"));

    expect(response.status).toBe(200);
    expect((await response.json()).items[0]).not.toHaveProperty("created_by_clerk_id");
    expect(listActionNeedsMock).toHaveBeenCalledWith(undefined, null, expect.objectContaining({ category: "materiel", effectiveStatus: "expired", limit: 50, offset: 10 }));
  });

  it("rejects unauthenticated creation and client-owned privileged fields", async () => {
    authzMock.mockResolvedValue({ ok: false });
    expect((await POST(jsonRequest({ actionId, category: "materiel", title: "Gants", description: "Besoin", status: "fulfilled" }))).status).toBe(401);

    authzMock.mockResolvedValue({ ok: true, userId });
    const response = await POST(jsonRequest({ actionId, category: "materiel", title: "Gants", description: "Besoin", createdByClerkId: "other" }));
    expect(response.status).toBe(422);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("resolves management server-side and writes the session identity", async () => {
    const insert = query({ data: { ...need, created_by_clerk_id: userId }, error: null });
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(insert) });

    const response = await POST(jsonRequest({ actionId, category: "materiel", title: "Gants solides", description: "Prévoir des gants pour le groupe." }));

    expect(response.status).toBe(201);
    expect(canManageActionNeedMock).toHaveBeenCalledWith(expect.anything(), userId, action);
    expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({ action_id: actionId, created_by_clerk_id: userId }));
    expect(insert.insert.mock.calls[0]?.[0]).not.toHaveProperty("status");
  });

  it("denies an outside user before any need write", async () => {
    canManageActionNeedMock.mockResolvedValue(false);
    const response = await POST(jsonRequest({ actionId, category: "materiel", title: "Gants solides", description: "Prévoir des gants pour le groupe." }));
    expect(response.status).toBe(403);
    expect(getSupabaseServerClientMock).toHaveBeenCalled();
  });

  it("validates the explicit PATCH endpoint rather than reopening or trusting a client status", async () => {
    loadActionNeedByIdMock.mockResolvedValue({ need, action });
    const update = query({ data: item, error: null });
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(update) });

    const response = await PATCH(jsonRequest({ operation: "fulfill", status: "open" }, "PATCH"), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(422);

    const validResponse = await PATCH(jsonRequest({ operation: "fulfill" }, "PATCH"), { params: Promise.resolve({ needId }) });
    expect(validResponse.status).toBe(200);
    expect(update.update).toHaveBeenCalledWith(expect.objectContaining({ status: "fulfilled" }));
    expect(update.eq).toHaveBeenCalledWith("status", "open");
    expect(update.eq).toHaveBeenCalledWith("updated_at", updatedAt);
  });

  it("turns an optimistic concurrency miss into a conflict", async () => {
    loadActionNeedByIdMock.mockResolvedValue({ need, action });
    const update = query({ data: null, error: null });
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn().mockReturnValue(update) });
    const response = await PATCH(jsonRequest({ operation: "cancel" }, "PATCH"), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(409);
  });

  it("does not reopen an expired or terminal need", async () => {
    loadActionNeedByIdMock.mockResolvedValue({ need: { ...need, expires_at: "2020-01-01T00:00:00.000Z" }, action });
    expect((await PATCH(jsonRequest({ operation: "update", title: "Nouveau titre" }, "PATCH"), { params: Promise.resolve({ needId }) })).status).toBe(409);

    loadActionNeedByIdMock.mockResolvedValue({ need: { ...need, status: "fulfilled", fulfilled_at: "2026-10-30T10:00:00.000Z" }, action });
    expect((await PATCH(jsonRequest({ operation: "cancel" }, "PATCH"), { params: Promise.resolve({ needId }) })).status).toBe(409);
  });
});
