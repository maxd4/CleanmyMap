import { beforeEach, describe, expect, it, vi } from "vitest";

const authzMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const loadActionNeedByIdMock = vi.hoisted(() => vi.fn());
const canManageActionNeedMock = vi.hoisted(() => vi.fn());
const listActionNeedOffersMock = vi.hoisted(() => vi.fn());
const createActionNeedOfferMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({ requireAuthenticatedAccess: authzMock }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: getSupabaseServerClientMock }));
vi.mock("@/lib/community/action-needs-service", () => ({
  loadActionNeedById: loadActionNeedByIdMock,
  canManageActionNeed: canManageActionNeedMock,
}));
vi.mock("@/lib/community/action-need-offers", async () => {
  const actual = await vi.importActual<typeof import("@/lib/community/action-need-offers")>("@/lib/community/action-need-offers");
  return {
    ...actual,
    listActionNeedOffers: listActionNeedOffersMock,
    createActionNeedOffer: createActionNeedOfferMock,
  };
});

import { GET, POST } from "./route";

const needId = "22222222-2222-4222-8222-222222222222";
const action = { id: "33333333-3333-4333-8333-333333333333", created_by_clerk_id: "manager-1" };
const contextRow = { need: { id: needId, action_id: action.id }, action };
const offer = {
  id: "11111111-1111-4111-8111-111111111111",
  need_id: needId,
  offered_by_clerk_id: "helper-1",
  message: "Je peux aider.",
  status: "pending" as const,
  created_at: "2026-10-30T10:00:00.000Z",
  updated_at: "2026-10-30T10:00:00.000Z",
};

function request(body: unknown) {
  return new Request(`http://localhost/api/community/needs/${needId}/offers`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("community need offers collection API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authzMock.mockResolvedValue({ ok: true, userId: "helper-1" });
    getSupabaseServerClientMock.mockReturnValue({});
    loadActionNeedByIdMock.mockResolvedValue(contextRow);
    canManageActionNeedMock.mockResolvedValue(false);
    listActionNeedOffersMock.mockResolvedValue([offer]);
    createActionNeedOfferMock.mockResolvedValue({ status: "pending", offer, notificationId: null });
  });

  it("requires authentication for both list and proposal", async () => {
    authzMock.mockResolvedValue({ ok: false });
    expect((await GET(new Request("http://localhost"), { params: Promise.resolve({ needId }) })).status).toBe(401);
    expect((await POST(request({ message: "Je peux aider." }), { params: Promise.resolve({ needId }) })).status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("lets an offer author read only their own offer without exposing a public identity projection", async () => {
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(200);
    expect((await response.json()).items[0]).not.toHaveProperty("offeredByClerkId");
    expect(listActionNeedOffersMock).toHaveBeenCalledWith(expect.anything(), needId, "helper-1", false);
  });

  it("lets the canonical manager read all offers including private offer identity", async () => {
    authzMock.mockResolvedValue({ ok: true, userId: "manager-1" });
    canManageActionNeedMock.mockResolvedValue(true);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(200);
    expect((await response.json()).items[0].offeredByClerkId).toBe("helper-1");
    expect(listActionNeedOffersMock).toHaveBeenCalledWith(expect.anything(), needId, "manager-1", true);
  });

  it("refuses an unrelated member without leaking offers", async () => {
    authzMock.mockResolvedValue({ ok: true, userId: "outsider-1" });
    listActionNeedOffersMock.mockResolvedValue([]);
    const response = await GET(new Request("http://localhost"), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(403);
  });

  it("creates through the atomic server RPC using the session identity only", async () => {
    const response = await POST(request({ message: "  Je peux aider.  " }), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(201);
    expect(createActionNeedOfferMock).toHaveBeenCalledWith(expect.anything(), needId, "helper-1", "Je peux aider.");
  });

  it("rejects an overlong message before persistence", async () => {
    const response = await POST(request({ message: "x".repeat(301) }), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(422);
    expect(createActionNeedOfferMock).not.toHaveBeenCalled();
  });

  it("maps the active-offer uniqueness race to a conflict", async () => {
    createActionNeedOfferMock.mockRejectedValue({ code: "23505", message: "active offer exists" });
    const response = await POST(request({ message: null }), { params: Promise.resolve({ needId }) });
    expect(response.status).toBe(409);
  });
});
