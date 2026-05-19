import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());
const buildActionsCsvMock = vi.hoisted(() => vi.fn());
const buildActionsCsvFilenameMock = vi.hoisted(() => vi.fn());

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

vi.mock("@/lib/reports/csv", async () => {
  const actual = await vi.importActual<typeof import("@/lib/reports/csv")>(
    "@/lib/reports/csv",
  );
  return {
    ...actual,
    buildActionsCsv: buildActionsCsvMock,
    buildActionsCsvFilename: buildActionsCsvFilenameMock,
  };
});

describe("GET /api/reports/actions.csv", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-13T12:00:00Z"));
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getSupabaseServerClientMock.mockReturnValue({});
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
    buildActionsCsvMock.mockReturnValue("id\naction-1");
    buildActionsCsvFilenameMock.mockReturnValue("export_actions_cmm_13-05-2026.csv");
  });

  it("returns a csv attachment with warning headers", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/reports/actions.csv?limit=1&days=30"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="export_actions_cmm_13-05-2026.csv"',
    );
    expect(response.headers.get("X-Deliverable-Name")).toBe(
      "export_actions_cmm_13-05-2026.csv",
    );
    expect(response.headers.get("X-Deliverable-Format")).toBe("csv");
    expect(response.headers.get("X-Export-Warning")).toBe(
      "Dataset truncated to limit",
    );
    expect(response.headers.get("X-Data-Warning")).toBe("sheet lag");
    expect(await response.text()).toContain("action-1");
  });

  it("returns 403 when access is denied", async () => {
    requireAdminAccessMock.mockResolvedValueOnce({ ok: false });
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/reports/actions.csv?limit=1"),
    );
    expect(response.status).toBe(403);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
