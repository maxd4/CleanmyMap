import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatedRouteMocks, createAnalyticsConsentModule, createAuthenticatedRouteAuthzModule, createRateLimitModule, createSignalementModule, createSupabaseServerModule, mockAllowedRateLimit, mockRejectedRateLimit, rateLimitMocks } from "@/app/api/test-helpers";

const requireActionRequestAccessMock = vi.hoisted(() => vi.fn());
const { getCurrentUserIdentity: getCurrentUserIdentityMock, pickTraceableActorName: pickTraceableActorNameMock, getSupabaseServerClient: getSupabaseServerClientMock, createSignalement: createSignalementMock, hasAnalyticsConsentCookie: hasAnalyticsConsentCookieMock } = authenticatedRouteMocks;
const verifyRateLimitMock = rateLimitMocks.verifyRateLimit;

vi.mock("@/lib/authz", () => createAuthenticatedRouteAuthzModule());
vi.mock("@/lib/auth/action-request-access", () => ({ requireActionRequestAccess: requireActionRequestAccessMock }));
vi.mock("@/lib/supabase/server", () => createSupabaseServerModule(getSupabaseServerClientMock));
vi.mock("@/lib/actions/signalement/create-signalement", () => createSignalementModule());
vi.mock("@/lib/analytics-consent", () => createAnalyticsConsentModule());
vi.mock("@/lib/rate-limit/server", () => createRateLimitModule());

function mockPublicSpotsQuery(data: unknown[] = []) {
  const queryResult = { data, error: null };
  const query = {
    select: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    then: (resolve: (value: typeof queryResult) => unknown) => Promise.resolve(queryResult).then(resolve),
  };
  query.select.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  const client = { from: vi.fn().mockReturnValue(query) };
  getSupabaseServerClientMock.mockReturnValue(client);
  return query;
}

describe("GET /api/spots", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireActionRequestAccessMock.mockResolvedValue({ ok: true, userId: "reader-1" });
    getSupabaseServerClientMock.mockReturnValue({});
  });

  it("filters the unqualified public read to validated and cleaned and returns only its DTO", async () => {
    const query = mockPublicSpotsQuery([
      {
        id: "internal-spot-id",
        created_at: "2026-10-20T12:00:00Z",
        created_by_clerk_id: "other-user",
        label: "Parc public",
        spot_type: "spot",
        latitude: 48.8566,
        longitude: 2.3522,
        status: "validated",
        notes: "private moderation note",
      },
      {
        id: "unpublished-spot-id",
        created_at: "2026-10-21T12:00:00Z",
        created_by_clerk_id: "other-user",
        label: "Observation non validée",
        spot_type: "spot",
        latitude: 48.8567,
        longitude: 2.3523,
        status: "new",
        notes: "private pending note",
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET(new Request("https://cleanmymap.test/api/spots"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ok",
      count: 1,
      items: [{
        created_at: "2026-10-20T12:00:00Z",
        label: "Parc public",
        spot_type: "spot",
        latitude: 48.8566,
        longitude: 2.3522,
        status: "validated",
      }],
    });
    expect(query.select).toHaveBeenCalledWith("created_at, label, spot_type, latitude, longitude, status");
    expect(query.in).toHaveBeenCalledWith("status", ["validated", "cleaned"]);
    expect(query.eq).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each(["validated", "cleaned"])("accepts the explicitly public status %s", async (status) => {
    const query = mockPublicSpotsQuery([]);
    const { GET } = await import("./route");

    const response = await GET(new Request(`https://cleanmymap.test/api/spots?status=${status}`));

    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("status", status);
    expect(query.in).not.toHaveBeenCalled();
  });

  it.each(["new", "pending", "validated&status=cleaned"])("rejects manipulated status %s before any privileged read", async (status) => {
    const { GET } = await import("./route");

    const response = await GET(new Request(`https://cleanmymap.test/api/spots?status=${status}`));

    expect(response.status).toBe(422);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated read before any privileged query", async () => {
    requireActionRequestAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });
    const { GET } = await import("./route");

    const response = await GET(new Request("https://cleanmymap.test/api/spots"));

    expect(response.status).toBe(401);
    expect(getSupabaseServerClientMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/spots", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireActionRequestAccessMock.mockResolvedValue({
      ok: true,
      userId: "user-test-1",
    });
    getSupabaseServerClientMock.mockReturnValue({});
    getCurrentUserIdentityMock.mockResolvedValue({ displayName: "Test User" });
    pickTraceableActorNameMock.mockReturnValue("Test User");
    hasAnalyticsConsentCookieMock.mockReturnValue(true);
    mockAllowedRateLimit(10, 300_000);
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

  it("uses the shared verified Clerk boundary for a web session", async () => {
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
    expect(requireActionRequestAccessMock).toHaveBeenCalledWith(expect.any(Request));
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

  it("uses the same boundary for a valid mobile Clerk bearer", async () => {
    requireActionRequestAccessMock.mockResolvedValueOnce({ ok: true, userId: "mobile-user" });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/spots", {
        method: "POST",
        headers: { Authorization: "Bearer valid-mobile-session" },
        body: JSON.stringify({
          type: "spot",
          label: "Spot mobile",
          latitude: 48.8566,
          longitude: 2.3522,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(createSignalementMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: "mobile-user",
        type: "spot",
      }),
    );
  });

  it.each([
    ["absent", {}],
    ["expired", { Authorization: "Bearer expired-mobile-session" }],
    ["invalid", { Authorization: "Bearer invalid-mobile-session" }],
  ])("rejects %s credentials before creating a signalement", async (_label, headers) => {
    requireActionRequestAccessMock.mockResolvedValueOnce({ ok: false, status: 401, error: "Unauthorized" });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/spots", {
        headers,
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

  it("rejects an abusive authenticated burst before creating a signalement", async () => {
    mockRejectedRateLimit(10, 120, 300_000);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/spots", {
        method: "POST",
        body: JSON.stringify({
          type: "spot",
          label: "Spot répété",
          latitude: 48.8566,
          longitude: 2.3522,
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(requireActionRequestAccessMock).not.toHaveBeenCalled();
    expect(createSignalementMock).not.toHaveBeenCalled();
    expect(verifyRateLimitMock).toHaveBeenCalledWith(
      expect.any(Request),
      { limit: 10, window: 300 },
    );
  });
});
