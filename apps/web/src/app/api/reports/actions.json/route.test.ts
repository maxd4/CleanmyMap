import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());

function createSupabaseMock(options?: { cacheHit?: boolean }) {
  const createSignedUrlMock = vi.fn();
  if (options?.cacheHit) {
    createSignedUrlMock.mockResolvedValue({
      data: {
        signedUrl:
          "https://supabase.test/storage/v1/object/sign/reports/actions-json/cache.json?token=abc123",
      },
      error: null,
    });
  } else {
    createSignedUrlMock
      .mockResolvedValueOnce({
        data: null,
        error: { message: "not found" },
      })
      .mockResolvedValueOnce({
        data: {
          signedUrl:
            "https://supabase.test/storage/v1/object/sign/reports/actions-json/cache.json?token=abc123",
        },
        error: null,
      });
  }

  const uploadMock = vi.fn(async () => ({
    data: { path: "actions-json/cache.json" },
    error: null,
  }));

  return {
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: createSignedUrlMock,
        upload: uploadMock,
      })),
    },
    createSignedUrlMock,
    uploadMock,
  };
}

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedActionContractsMock,
  parseEntityTypesParam: () => null,
}));

vi.mock("@/lib/reports/scope", () => ({
  filterActionContractsByScope: filterActionContractsByScopeMock,
}));

describe("GET /api/reports/actions.json", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T12:00:00Z"));
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock());
    fetchUnifiedActionContractsMock.mockResolvedValue({
      items: [
        {
          id: "action-1",
          dates: { createdAt: "2026-05-01", observedAt: "2026-05-02" },
          metadata: {
            actorName: "Alice",
            associationName: "Clean team",
            wasteKg: 12,
            cigaretteButts: 50,
            volunteersCount: 4,
            durationMinutes: 90,
            notes: "ok",
            notesPlain: "ok",
            manualDrawing: null,
          },
          location: { label: "Paris", latitude: 48.85, longitude: 2.35 },
          status: "approved",
          type: "action",
          source: "supabase",
          geometry: { kind: "point", geojson: null, confidence: "high" },
        },
      ],
      isTruncated: true,
      sourceHealth: { partial: true, warnings: ["sheet lag"] },
    });
    filterActionContractsByScopeMock.mockImplementation((items) => items);
  });

  it("redirects to a cached json asset without rebuilding it", async () => {
    const cachedSupabase = createSupabaseMock({ cacheHit: true });
    getSupabaseServerClientMock.mockReturnValue(cachedSupabase);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/reports/actions.json?limit=1&days=30"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://supabase.test/storage/v1/object/sign/reports/actions-json/cache.json?token=abc123",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=300, stale-while-revalidate=86400",
    );
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(cachedSupabase.storage.from).toHaveBeenCalledWith("reports");
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenCalledTimes(1);
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenCalledWith(
      expect.any(String),
      60 * 60 * 24,
      { download: "export_actions_cmm_13-05-2026.json" },
    );
    expect(cachedSupabase.uploadMock).not.toHaveBeenCalled();
  });

  it("uploads a missing json artifact before redirecting to it", async () => {
    const cachedSupabase = createSupabaseMock();
    getSupabaseServerClientMock.mockReturnValue(cachedSupabase);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/reports/actions.json?limit=1&days=30"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://supabase.test/storage/v1/object/sign/reports/actions-json/cache.json?token=abc123",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=300, stale-while-revalidate=86400",
    );
    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledTimes(1);
    expect(cachedSupabase.uploadMock).toHaveBeenCalledTimes(1);
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenCalledTimes(2);
    expect(cachedSupabase.createSignedUrlMock).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      60 * 60 * 24,
      { download: "export_actions_cmm_13-05-2026.json" },
    );
  });

  it("returns 403 when access is denied", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/reports/actions.json?limit=1"),
    );
    expect(response.status).toBe(403);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
