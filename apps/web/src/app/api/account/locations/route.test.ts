import { beforeEach, describe, expect, it, vi } from "vitest";

const accessMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: accessMock }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/auth/sync", () => ({ syncClerkUserToSupabase: syncMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: rateLimitMock }));

const paris = {
  country: "France" as const,
  level: "commune" as const,
  label: "Paris",
  subtitle: null,
  arrondissement: null,
  arrondissementCity: "Paris" as const,
};

describe("PATCH /api/account/locations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    accessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    rateLimitMock.mockResolvedValue(null);
    syncMock.mockResolvedValue({ id: "user-1" });
    clerkClientMock.mockResolvedValue({
      users: {
        getUser: vi.fn().mockResolvedValue({
          id: "user-1",
          unsafeMetadata: {
            unrelatedPreference: "keep",
            territoryPreferences: { residence: null, work: paris },
          },
        }),
        updateUserMetadata: vi.fn().mockImplementation(async (_id, patch) => ({
          id: "user-1",
          unsafeMetadata: {
            unrelatedPreference: "keep",
            ...patch.unsafeMetadata,
          },
        })),
      },
    });
  });

  it("updates one location while preserving unrelated metadata and the other location", async () => {
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/locations", {
      method: "PATCH",
      body: JSON.stringify({ residence: paris }),
    }));

    expect(response.status).toBe(200);
    expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith("user-1", {
      unsafeMetadata: expect.objectContaining({
        territoryPreferences: { residence: paris, work: paris },
      }),
    });
  });

  it("allows removing only one location", async () => {
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/locations", {
      method: "PATCH",
      body: JSON.stringify({ work: null }),
    }));

    expect(response.status).toBe(200);
    expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith("user-1", {
      unsafeMetadata: { territoryPreferences: { residence: null, work: null } },
    });
  });

  it("rejects an unauthenticated request before reading Clerk", async () => {
    accessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/locations", { method: "PATCH", body: "{}" }));

    expect(response.status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });
});
