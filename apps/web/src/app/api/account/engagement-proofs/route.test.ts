import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActionRequestAccessMock = vi.fn();
const enforceServerRateLimitForAuthenticatedUserMock = vi.fn();
const getSupabaseServerClientMock = vi.fn();
const loadPersonalEngagementProofProjectionMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/action-request-access", () => ({
  requireActionRequestAccess: (...args: unknown[]) => requireActionRequestAccessMock(...args),
}));

vi.mock("@/lib/rate-limit/server", () => ({
  enforceServerRateLimitForAuthenticatedUser: (...args: unknown[]) =>
    enforceServerRateLimitForAuthenticatedUserMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: (...args: unknown[]) => getSupabaseServerClientMock(...args),
}));

vi.mock("@/lib/actions/engagement-proof-projection", () => ({
  loadPersonalEngagementProofProjection: (...args: unknown[]) =>
    loadPersonalEngagementProofProjectionMock(...args),
}));

import { GET } from "./route";

describe("GET /api/account/engagement-proofs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enforceServerRateLimitForAuthenticatedUserMock.mockResolvedValue(null);
    getSupabaseServerClientMock.mockReturnValue({ from: vi.fn() });
  });

  it("rejects unauthenticated requests with 401", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: false });

    const response = await GET(new Request("http://localhost/api/account/engagement-proofs"));
    expect(response.status).toBe(401);
    expect(loadPersonalEngagementProofProjectionMock).not.toHaveBeenCalled();
  });

  it("rejects cross-account userId query override with 403 and private no-store headers", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });

    const response = await GET(
      new Request("http://localhost/api/account/engagement-proofs?userId=user-2"),
    );

    expect(response.status).toBe(403);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toMatchObject({
      status: "error",
    });
    expect(loadPersonalEngagementProofProjectionMock).not.toHaveBeenCalled();
  });

  it("returns the owner-scoped live engagement proof projection with private, no-store headers", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    const mockProjection = {
      status: "available",
      generatedAt: "2026-06-01T10:00:00.000Z",
      ownerUserId: "user-1",
      sourceStates: {
        actionParticipants: "available",
        actions: "available",
        actionRoleAttestations: "available",
        spogomiEquivalence: "available",
      },
      errorReason: null,
    };
    loadPersonalEngagementProofProjectionMock.mockResolvedValue(mockProjection);

    const response = await GET(new Request("http://localhost/api/account/engagement-proofs"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(loadPersonalEngagementProofProjectionMock).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
    );
    await expect(response.json()).resolves.toEqual(mockProjection);
  });

  it("returns HTTP 503 with explicit error projection state when an upstream Supabase read fails", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    const errorProjection = {
      status: "error",
      generatedAt: "2026-06-01T10:00:00.000Z",
      ownerUserId: "user-1",
      sourceStates: {
        actionParticipants: "error",
        actions: "unavailable",
        actionRoleAttestations: "unavailable",
        spogomiEquivalence: "unavailable",
      },
      errorReason: "supabase_timeout",
    };
    loadPersonalEngagementProofProjectionMock.mockResolvedValue(errorProjection);

    const response = await GET(new Request("http://localhost/api/account/engagement-proofs"));

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual(errorProjection);
  });

  it("propagates rate limit responses and handles unexpected exceptions via handleApiError", async () => {
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    enforceServerRateLimitForAuthenticatedUserMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
    );
    const rateLimited = await GET(new Request("http://localhost/api/account/engagement-proofs"));
    expect(rateLimited.status).toBe(429);

    loadPersonalEngagementProofProjectionMock.mockRejectedValueOnce(new Error("unexpected crash"));
    const crashed = await GET(new Request("http://localhost/api/account/engagement-proofs"));
    expect(crashed.status).toBe(500);
  });
});
