import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const pickTraceableActorNameMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createSignalementMock = vi.hoisted(() => vi.fn());
const hasAnalyticsConsentCookieMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  pickTraceableActorName: pickTraceableActorNameMock,
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/actions/signalement/create-signalement", () => ({
  createSignalement: createSignalementMock,
}));
vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsentCookie: hasAnalyticsConsentCookieMock,
}));

describe("POST /api/spots", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "user-test-1",
    });
    getSupabaseServerClientMock.mockReturnValue({});
    getCurrentUserIdentityMock.mockResolvedValue({ displayName: "Test User" });
    pickTraceableActorNameMock.mockReturnValue("Test User");
    hasAnalyticsConsentCookieMock.mockReturnValue(true);
    createSignalementMock.mockResolvedValue({
      id: "spot-test-1",
      created_at: "2026-04-22T00:00:00Z",
      created_by_clerk_id: "user-test-1",
      label: "Lieu propre test",
      spot_type: "clean_place",
      latitude: 48.8566,
      longitude: 2.3522,
      status: "new",
      notes: "[spot-by:Test User] signalement",
    });
  });

  it("uses the same canonical signalement capability as /api/actions", async () => {
    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/spots", {
        method: "POST",
        headers: { cookie: "cmm-consent=granted" },
        body: JSON.stringify({
          type: "clean_place",
          label: "Lieu propre test",
          latitude: 48.8566,
          longitude: 2.3522,
          notes: "signalement",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      status: "created",
      source: "trash_spotter_spots",
      item: { id: "spot-test-1", spot_type: "clean_place" },
    });
    expect(createSignalementMock).toHaveBeenCalledWith(
      {},
      {
        userId: "user-test-1",
        type: "clean_place",
        label: "Lieu propre test",
        latitude: 48.8566,
        longitude: 2.3522,
        notes: "signalement",
        actorName: "Test User",
        consentGranted: true,
      },
    );
  });

  it("accepts a localhost benevole bypass through the central auth helper", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "dev-benevole",
    });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      displayName: "Bénévole local",
    });
    pickTraceableActorNameMock.mockReturnValueOnce("Bénévole local");

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/spots", {
        method: "POST",
        body: JSON.stringify({
          type: "spot",
          label: "Spot bénévole local",
          latitude: 48.8566,
          longitude: 2.3522,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createSignalementMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "dev-benevole",
        type: "spot",
      }),
    );
  });

  it("accepts a localhost max bypass without changing the route permission boundary", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: true,
      userId: "dev-max",
    });
    getCurrentUserIdentityMock.mockResolvedValueOnce({
      displayName: "Max local",
    });
    pickTraceableActorNameMock.mockReturnValueOnce("Max local");

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/spots", {
        method: "POST",
        body: JSON.stringify({
          type: "spot",
          label: "Spot max local",
          latitude: 48.8566,
          longitude: 2.3522,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createSignalementMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "dev-max",
        type: "spot",
      }),
    );
  });

  it("keeps production-style anonymous requests rejected", async () => {
    requireAuthenticatedAccessMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/spots", {
        method: "POST",
        body: JSON.stringify({
          type: "spot",
          label: "Anonymous spot",
          latitude: 48.8566,
          longitude: 2.3522,
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(createSignalementMock).not.toHaveBeenCalled();
  });
});
