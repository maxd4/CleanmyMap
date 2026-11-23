import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mobileAuth: vi.fn(),
  getSupabase: vi.fn(),
  cancel: vi.fn(),
  claim: vi.fn(),
  loadJoinable: vi.fn(),
  loadHistory: vi.fn(),
  fetchUnified: vi.fn(),
  toPublic: vi.fn((value: unknown) => value),
  audit: vi.fn(),
  refreshProgression: vi.fn(),
  verifyRateLimit: vi.fn(),
  createRateLimitResponse: vi.fn(),
}));

vi.mock("@/lib/auth/mobile-bearer", () => ({ requireMobileAuthenticatedAccess: mocks.mobileAuth }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.getSupabase }));
vi.mock("@/lib/actions/participation/group-participation", () => ({
  cancelActionParticipation: mocks.cancel,
  loadJoinableActions: mocks.loadJoinable,
  loadUserParticipationHistory: mocks.loadHistory,
}));
vi.mock("@/lib/actions/participation/post-action-claims", () => ({ claimFinishedActionParticipation: mocks.claim }));
vi.mock("@/lib/actions/unified-source", () => ({ fetchUnifiedActionContracts: mocks.fetchUnified }));
vi.mock("@/lib/actions/data-contract", () => ({ toPublicActionListItem: mocks.toPublic }));
vi.mock("@/lib/actions/moderation-audit", () => ({ appendActionModerationAudit: mocks.audit }));
vi.mock("@/lib/gamification/reconciliation/progression-tracking", () => ({ refreshProgressionProfile: mocks.refreshProgression }));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: mocks.verifyRateLimit,
  createServerRateLimitResponse: mocks.createRateLimitResponse,
}));

import { DELETE, GET, POST } from "./route";

const ctx = { params: Promise.resolve({ actionId: "action-1" }) };
const req = (method: string, body?: unknown) => new Request("https://cleanmymap.test/api/mobile/actions/action-1", {
  method,
  headers: { Authorization: "Bearer native-jwt", "Content-Type": "application/json" },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

describe("/api/mobile/actions/:actionId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mobileAuth.mockResolvedValue({ ok: true, userId: "user-mobile" });
    mocks.getSupabase.mockReturnValue({});
    mocks.cancel.mockResolvedValue({ participationStatus: "cancelled" });
    mocks.claim.mockResolvedValue({ participationStatus: "pending", joinedAt: "now" });
    mocks.loadJoinable.mockResolvedValue([]);
    mocks.loadHistory.mockResolvedValue([]);
    mocks.fetchUnified.mockResolvedValue({ items: [] });
    mocks.audit.mockResolvedValue(undefined);
    mocks.refreshProgression.mockResolvedValue(undefined);
    mocks.verifyRateLimit.mockResolvedValue({ allowed: true, retryAfter: 0 });
    mocks.createRateLimitResponse.mockReturnValue(null);
  });

  it("cancels only the authenticated user's registration", async () => {
    const response = await DELETE(req("DELETE"), ctx);
    expect(response.status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", userId: "user-mobile" });
  });

  it("routes a past-action request to action_participants claim semantics", async () => {
    const response = await POST(req("POST", { intent: "claim" }), ctx);
    expect(response.status).toBe(200);
    expect(mocks.claim).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", userId: "user-mobile" });
    expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "user-mobile",
      targetActionId: "action-1",
      operation: "post_action_claim",
      outcome: "success",
    }));
  });

  it("passes only the organizer-provided attendance id into the shared claim workflow", async () => {
    const rosterEntryId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const response = await POST(req("POST", { intent: "claim", rosterEntryId }), ctx);
    expect(response.status).toBe(200);
    expect(mocks.verifyRateLimit).toHaveBeenCalledWith(expect.anything(), { limit: 10, window: 60 });
    expect(mocks.claim).toHaveBeenCalledWith(expect.anything(), {
      actionId: "action-1", userId: "user-mobile", rosterEntryId,
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns the private projection for a joinable action", async () => {
    mocks.loadJoinable.mockResolvedValue([{ id: "action-1", joined: false, awaitingApproval: false }]);

    const response = await GET(req("GET"), ctx);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({
      status: "ok",
      action: expect.objectContaining({ id: "action-1" }),
      canJoin: true,
      canClaim: false,
    }));
    expect(mocks.loadJoinable).toHaveBeenCalledWith(expect.anything(), {
      limit: 1,
      userId: "user-mobile",
      actionId: "action-1",
    });
    expect(mocks.loadHistory).toHaveBeenCalledWith(expect.anything(), { userId: "user-mobile", limit: 200 });
    expect(mocks.fetchUnified).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      actionId: "action-1",
      status: "approved",
    }));
  });

  it("does not mutate when the native session is expired", async () => {
    mocks.mobileAuth.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });
    expect((await DELETE(req("DELETE"), ctx)).status).toBe(401);
    expect(mocks.cancel).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated reads and claims before touching persistence or audit", async () => {
    mocks.mobileAuth.mockResolvedValue({ ok: false, status: 401, error: "Unauthorized" });

    const read = await GET(req("GET"), ctx);
    const claim = await POST(req("POST", { intent: "claim" }), ctx);

    expect(read.status).toBe(401);
    expect(claim.status).toBe(401);
    expect(mocks.getSupabase).not.toHaveBeenCalled();
    expect(mocks.loadJoinable).not.toHaveBeenCalled();
    expect(mocks.loadHistory).not.toHaveBeenCalled();
    expect(mocks.fetchUnified).not.toHaveBeenCalled();
    expect(mocks.claim).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("returns a private not-found response when the action is outside the caller's scopes", async () => {
    const response = await GET(req("GET"), ctx);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(await response.json()).toEqual({ error: "Action introuvable." });
    expect(mocks.loadJoinable).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: "user-mobile", actionId: "action-1" }));
    expect(mocks.loadHistory).toHaveBeenCalledWith(expect.anything(), { userId: "user-mobile", limit: 200 });
  });

  it("prevents a third party from cancelling through the owner-scoped service and emits no response cache", async () => {
    mocks.cancel.mockRejectedValueOnce(Object.assign(new Error("not found"), { name: "NotFoundError" }));

    const response = await DELETE(req("DELETE"), ctx);

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBeNull();
    expect(await response.json()).toEqual({ error: "Inscription introuvable." });
    expect(mocks.cancel).toHaveBeenCalledWith(expect.anything(), { actionId: "action-1", userId: "user-mobile" });
    expect(mocks.refreshProgression).not.toHaveBeenCalled();
  });

  it("marks the caller-scoped projection private and no-store", async () => {
    mocks.loadJoinable.mockResolvedValue([{ id: "action-1", joined: true, awaitingApproval: false }]);
    mocks.loadHistory.mockResolvedValue([{ id: "action-1", joined: true }]);

    const response = await GET(req("GET"), ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(body.participation).toMatchObject({ id: "action-1" });
    expect(mocks.loadJoinable).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ userId: "user-mobile", actionId: "action-1" }));
    expect(mocks.loadHistory).toHaveBeenCalledWith(expect.anything(), { userId: "user-mobile", limit: 200 });
  });
});
