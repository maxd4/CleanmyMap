import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

describe("POST /api/account/profile-role", () => {
  beforeEach(() => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("rejects the retired UX role selector for authenticated users", async () => {
    const { POST } = await import("./route");
    const response = await POST();

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error:
        "Cette route ne modifie plus le rôle. Utilisez la mutation de profil actif.",
    });
  });

  it("keeps the authentication boundary for anonymous callers", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const { POST } = await import("./route");
    const response = await POST();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
