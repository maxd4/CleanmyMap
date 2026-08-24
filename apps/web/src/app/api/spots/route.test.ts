import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getCurrentUserIdentityMock = vi.hoisted(() => vi.fn());
const pickTraceableActorNameMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const createSignalementMock = vi.hoisted(() => vi.fn());
const hasAnalyticsConsentCookieMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({ auth: authMock }));
vi.mock("@/lib/authz", () => ({
  getCurrentUserIdentity: getCurrentUserIdentityMock,
  pickTraceableActorName: pickTraceableActorNameMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/actions/create-signalement", () => ({
  createSignalement: createSignalementMock,
}));
vi.mock("@/lib/analytics-consent", () => ({
  hasAnalyticsConsentCookie: hasAnalyticsConsentCookieMock,
}));

describe("POST /api/spots", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    authMock.mockResolvedValue({ userId: "user-test-1" });
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
});
