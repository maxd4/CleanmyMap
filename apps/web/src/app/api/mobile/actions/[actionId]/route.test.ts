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
vi.mock("@/lib/gamification/progression-tracking", () => ({ refreshProgressionProfile: mocks.refreshProgression }));

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
});
