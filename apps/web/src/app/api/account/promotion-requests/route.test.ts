import { beforeEach, describe, expect, it, vi } from "vitest";

const getSafeAuthSessionMock = vi.hoisted(() => vi.fn());
const listPromotionRequestsForUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/safe-session", () => ({
  getSafeAuthSession: getSafeAuthSessionMock,
}));
vi.mock("@/lib/admin/promotion-requests-store", () => ({
  listPromotionRequestsForUser: listPromotionRequestsForUserMock,
}));

const ownRequest = {
  id: "private-own-id",
  createdAt: "2026-09-04T10:00:00.000Z",
  submittedByUserId: "user-1",
  submittedByDisplayName: "Utilisateur",
  submittedByEmail: "private@example.org",
  submittedByRole: "benevole" as const,
  requestedRole: "elu" as const,
  motivation: "Motivation privée",
  status: "pending_owner_review" as const,
  reviewedAt: null,
  reviewedByUserId: null,
  reviewedByRole: null,
  creatorState: "pending" as const,
};

describe("GET /api/account/promotion-requests", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getSafeAuthSessionMock.mockResolvedValue({ userId: "user-1", state: "authenticated" });
    listPromotionRequestsForUserMock.mockResolvedValue([
      ownRequest,
      { ...ownRequest, id: "foreign-id", submittedByUserId: "user-2", status: "accepted" },
    ]);
  });

  it("returns 401 for an anonymous user", async () => {
    getSafeAuthSessionMock.mockResolvedValue({ userId: null, state: "anonymous" });
    const { GET } = await import("./route");

    const response = await GET();

    expect(response.status).toBe(401);
    expect(listPromotionRequestsForUserMock).not.toHaveBeenCalled();
  });

  it("binds the read to the current Clerk user and exposes only the safe projection", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(listPromotionRequestsForUserMock).toHaveBeenCalledWith("user-1", 50);
    expect(body).toEqual({
      status: "ok",
      items: [{
        createdAt: ownRequest.createdAt,
        requestedRole: "elu",
        status: "pending_owner_review",
        reviewedAt: null,
      }],
    });
    expect(JSON.stringify(body)).not.toContain("private@example.org");
    expect(JSON.stringify(body)).not.toContain("private-own-id");
    expect(JSON.stringify(body)).not.toContain("Motivation privée");
  });
});
