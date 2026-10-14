import { beforeEach, describe, expect, it, vi } from "vitest";

const accessMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: accessMock }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/auth/sync", () => ({ syncClerkUserToSupabase: syncMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: rateLimitMock }));

describe("PATCH /api/account/identity", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    accessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    rateLimitMock.mockResolvedValue(null);
    syncMock.mockResolvedValue({ id: "user-1" });
    clerkClientMock.mockResolvedValue({
      users: {
        updateUser: vi.fn().mockResolvedValue({ id: "user-1", firstName: "Ada", lastName: "Lovelace" }),
      },
    });
  });

  it("updates only the authenticated user's Clerk identity and confirms projection", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/identity", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace", role: "admin" }),
    }));

    expect(response.status).toBe(422);
    expect((await clerkClientMock()).users.updateUser).not.toHaveBeenCalled();
  });

  it("returns a recoverable state when Supabase projection is not confirmed", async () => {
    syncMock.mockResolvedValueOnce(null);
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/identity", {
      method: "PATCH",
      body: JSON.stringify({ firstName: "Ada", lastName: "Lovelace" }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.status).toBe("clerk_updated_supabase_sync_pending");
    expect(clerk.users.updateUser).toHaveBeenCalledWith("user-1", { firstName: "Ada", lastName: "Lovelace" });
  });

  it("fails before Clerk when the session is absent", async () => {
    accessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/identity", { method: "PATCH", body: "{}" }));

    expect(response.status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });
});
