import { beforeEach, describe, expect, it, vi } from "vitest";

const accessMock = vi.hoisted(() => vi.fn());
const clerkClientMock = vi.hoisted(() => vi.fn());
const syncMock = vi.hoisted(() => vi.fn());
const rateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: accessMock }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: clerkClientMock }));
vi.mock("@/lib/auth/sync", () => ({ syncClerkUserToSupabase: syncMock, trySyncClerkUserToSupabase: syncMock }));
vi.mock("@/lib/rate-limit/server", () => ({ enforceServerRateLimitForAuthenticatedUser: rateLimitMock }));

const paris = {
  country: "FR" as const,
  level: "commune" as const,
  label: "Paris",
  subtitle: null,
  arrondissement: null,
  arrondissementCity: "Paris" as const,
};
const quebec = {
  country: "CA" as const,
  level: "province" as const,
  label: "Québec",
  subtitle: "Canada",
  arrondissement: null,
  arrondissementCity: null,
  administrativeCode: "QC",
};
const dakar = {
  country: "SN" as const,
  level: "commune" as const,
  label: "Dakar",
  subtitle: "Sénégal",
  arrondissement: null,
  arrondissementCity: null,
  administrativeCode: "SN-DAK",
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
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
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

  it("keeps a canonical public residence when a partial work update is written to unsafe metadata", async () => {
    const clerk = await clerkClientMock();
    clerk.users.getUser.mockResolvedValue({
      id: "user-1",
      unsafeMetadata: { territoryLabel: "Paris", territoryCountry: "FR", territoryLocationType: "residence" },
      publicMetadata: { territoryPreferences: { residence: quebec, work: null } },
      privateMetadata: {},
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/locations", {
      method: "PATCH",
      body: JSON.stringify({ work: dakar }),
    }));

    expect(response.status).toBe(200);
    expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith("user-1", {
      unsafeMetadata: expect.objectContaining({
        territoryPreferences: { residence: quebec, work: dakar },
      }),
    });
    expect(JSON.stringify(await response.json())).not.toContain("privateMetadata");
  });

  it("keeps an explicit canonical empty location instead of resurrecting unsafe legacy data", async () => {
    const clerk = await clerkClientMock();
    clerk.users.getUser.mockResolvedValue({
      id: "user-1",
      unsafeMetadata: { territoryLabel: "Paris", territoryCountry: "FR", territoryLocationType: "residence" },
      publicMetadata: { territoryPreferences: { residence: null, work: null } },
      privateMetadata: {},
    });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/locations", {
      method: "PATCH",
      body: JSON.stringify({ work: dakar }),
    }));

    expect(response.status).toBe(200);
    expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith("user-1", {
      unsafeMetadata: expect.objectContaining({
        territoryPreferences: { residence: null, work: dakar },
      }),
    });
  });

  it("persists a foreign country and its local administrative level", async () => {
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const foreign = {
      country: "CA",
      level: "province",
      label: "Québec",
      subtitle: "Canada",
      arrondissement: null,
      arrondissementCity: null,
      administrativeCode: "QC",
    };
    const response = await PATCH(new Request("http://localhost/api/account/locations", {
      method: "PATCH",
      body: JSON.stringify({ residence: foreign }),
    }));

    expect(response.status).toBe(200);
    expect(clerk.users.updateUserMetadata).toHaveBeenCalledWith("user-1", {
      unsafeMetadata: expect.objectContaining({
        territoryPreferences: { residence: foreign, work: paris },
      }),
    });
  });

  it("rejects French arrondissement fields on a foreign selection", async () => {
    const clerk = await clerkClientMock();
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/locations", {
      method: "PATCH",
      body: JSON.stringify({
        residence: {
          country: "CA",
          level: "province",
          label: "Paris, Ontario",
          subtitle: "Ontario",
          arrondissement: 5,
          arrondissementCity: "Paris",
        },
      }),
    }));

    expect(response.status).toBe(422);
    expect(clerk.users.updateUserMetadata).not.toHaveBeenCalled();
    expect(syncMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request before reading Clerk", async () => {
    accessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const { PATCH } = await import("./route");
    const response = await PATCH(new Request("http://localhost/api/account/locations", { method: "PATCH", body: "{}" }));

    expect(response.status).toBe(401);
    expect(clerkClientMock).not.toHaveBeenCalled();
  });
});
