import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const getCurrentUserRoleLabelMock = vi.hoisted(() => vi.fn());
const appendPromotionRequestMock = vi.hoisted(() => vi.fn());
const listPromotionRequestsForUserMock = vi.hoisted(() => vi.fn());
const sendCreatorInboxEmailMock = vi.hoisted(() => vi.fn());
const verifyRateLimitMock = vi.hoisted(() => vi.fn());
const createServerRateLimitResponseMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  getCurrentUserRoleLabel: getCurrentUserRoleLabelMock,
}));
vi.mock("@/lib/admin/promotion-requests-store", () => ({
  appendPromotionRequest: appendPromotionRequestMock,
  listPromotionRequestsForUser: listPromotionRequestsForUserMock,
}));
vi.mock("@/lib/community/creator-inbox-email", () => ({
  sendCreatorInboxEmail: sendCreatorInboxEmailMock,
}));
vi.mock("@/lib/rate-limit/server", () => ({
  verifyRateLimit: verifyRateLimitMock,
  createServerRateLimitResponse: createServerRateLimitResponseMock,
}));

function makeRequest(requestedRole: "elu" | "admin" = "elu") {
  return new Request("http://localhost/api/community/promotion-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      requestedRole,
      motivation: "Je souhaite contribuer au pilotage local.",
    }),
  });
}

describe("POST /api/community/promotion-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-1" });
    getCurrentUserRoleLabelMock.mockResolvedValue("benevole");
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-1",
      displayName: "Utilisateur",
      email: null,
      role: "benevole",
    });
    verifyRateLimitMock.mockResolvedValue({ allowed: true, limit: 3, remaining: 2 });
    createServerRateLimitResponseMock.mockReturnValue(null);
    listPromotionRequestsForUserMock.mockResolvedValue([]);
    appendPromotionRequestMock.mockResolvedValue({
      id: "request-1",
      submittedByDisplayName: "Utilisateur",
      submittedByEmail: null,
      submittedByRole: "benevole",
      requestedRole: "elu",
      motivation: "Je souhaite contribuer au pilotage local.",
      status: "pending_owner_review",
    });
    sendCreatorInboxEmailMock.mockResolvedValue(undefined);
  });

  it("returns 401 for an anonymous user", async () => {
    authMock.mockResolvedValue({ userId: null });
    const { POST } = await import("./route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(401);
    expect(appendPromotionRequestMock).not.toHaveBeenCalled();
  });

  it("does not duplicate a pending request", async () => {
    listPromotionRequestsForUserMock.mockResolvedValue([{ status: "pending_owner_review" }]);
    const { POST } = await import("./route");

    const response = await POST(makeRequest());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "pending_owner_review" });
    expect(listPromotionRequestsForUserMock).toHaveBeenCalledWith("user-1", 50);
    expect(appendPromotionRequestMock).not.toHaveBeenCalled();
  });

  it("lets an elu request admin after previous requests are closed", async () => {
    getCurrentUserRoleLabelMock.mockResolvedValue("elu");
    getCurrentUserIdentityMock.mockResolvedValue({
      userId: "user-1",
      displayName: "Élu·e",
      email: null,
      role: "elu",
    });
    appendPromotionRequestMock.mockResolvedValue({
      id: "request-2",
      submittedByDisplayName: "Élu·e",
      submittedByEmail: null,
      submittedByRole: "elu",
      requestedRole: "admin",
      motivation: "Je souhaite contribuer au pilotage local.",
      status: "pending_owner_review",
    });
    const { POST } = await import("./route");

    const response = await POST(makeRequest("admin"));

    expect(response.status).toBe(201);
    expect(appendPromotionRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      submittedByUserId: "user-1",
      input: expect.objectContaining({ submittedByRole: "elu", requestedRole: "admin" }),
    }));
  });
});
