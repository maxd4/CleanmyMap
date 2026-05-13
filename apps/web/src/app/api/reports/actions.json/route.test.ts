import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());

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
      isTruncated: false,
      sourceHealth: { partial: false, warnings: [] },
    });
    filterActionContractsByScopeMock.mockImplementation((items) => items);
  });

  it("returns a json attachment with exported items", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/reports/actions.json?limit=1&days=30"),
    );
    const payload = (await response.json()) as {
      count: number;
      items: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toContain(
      'filename="export_actions_',
    );
    expect(response.headers.get("X-Deliverable-Format")).toBe("json");
    expect(response.headers.get("X-Deliverable-Name")).toContain(
      "export_actions_",
    );
    expect(payload.count).toBe(1);
    expect(payload.items[0]?.id).toBe("action-1");
  });
});
