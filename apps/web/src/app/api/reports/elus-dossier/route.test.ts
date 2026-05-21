import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());
const computePeriodComparisonMock = vi.hoisted(() => vi.fn());
const buildTerritorialBenchmarkMock = vi.hoisted(() => vi.fn());
const buildPilotageOverviewFromContractsMock = vi.hoisted(() => vi.fn());
const buildPersonalImpactMethodologyMock = vi.hoisted(() => vi.fn());
const buildSimplePdfMock = vi.hoisted(() => vi.fn());
const evaluateActionQualityMock = vi.hoisted(() => vi.fn());
const toActionListItemMock = vi.hoisted(() => vi.fn());

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
}));

vi.mock("@/lib/reports/scope", () => ({
  filterActionContractsByScope: filterActionContractsByScopeMock,
}));

vi.mock("@/lib/analytics/period-comparison", () => ({
  computePeriodComparison: computePeriodComparisonMock,
}));

vi.mock("@/lib/analytics/territorial-benchmark", () => ({
  buildTerritorialBenchmark: buildTerritorialBenchmarkMock,
}));

vi.mock("@/lib/pilotage/overview", () => ({
  buildPilotageOverviewFromContracts: buildPilotageOverviewFromContractsMock,
}));

vi.mock("@/lib/gamification/progression-impact", () => ({
  buildPersonalImpactMethodology: buildPersonalImpactMethodologyMock,
}));

vi.mock("@/lib/pdf-export/simple-pdf", () => ({
  buildSimplePdf: buildSimplePdfMock,
}));

vi.mock("@/lib/actions/quality", () => ({
  evaluateActionQuality: evaluateActionQualityMock,
}));

vi.mock("@/lib/actions/data-contract", () => ({
  toActionListItem: toActionListItemMock,
}));

describe("GET /api/reports/elus-dossier", () => {
  const contract = {
    id: "action-1",
    status: "approved",
    dates: { observedAt: "2026-05-02", createdAt: "2026-05-01", importedAt: null },
    location: { label: "Paris", latitude: 48.85, longitude: 2.35 },
    metadata: { wasteKg: 12, volunteersCount: 4 },
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    getSupabaseServerClientMock.mockReturnValue({});
    fetchUnifiedActionContractsMock.mockResolvedValue({
      items: [contract],
      isTruncated: false,
    });
    filterActionContractsByScopeMock.mockImplementation((items) => items);
    computePeriodComparisonMock.mockReturnValue({ current: {}, previous: {} });
    buildTerritorialBenchmarkMock.mockReturnValue([]);
    buildPilotageOverviewFromContractsMock.mockReturnValue({
      generatedAt: "2026-05-13T10:00:00.000Z",
      zones: [],
    });
    buildPersonalImpactMethodologyMock.mockReturnValue({
      proxyVersion: "v1",
      qualityRulesVersion: "q1",
      pollutionScoreAverage: 80,
      formulas: [{ label: "f1", formula: "a/b" }],
      scope: "scope",
      approximations: ["approx"],
      hypotheses: ["hyp"],
      errorMargins: {
        waterSavedLitersPct: 20,
        co2AvoidedKgPct: 20,
        surfaceCleanedM2Pct: 20,
        pollutionScoreMeanPoints: 5,
      },
    });
    evaluateActionQualityMock.mockReturnValue({ score: 88 });
    toActionListItemMock.mockReturnValue({});
    buildSimplePdfMock.mockReturnValue(new TextEncoder().encode("%PDF-1.4 test"));
  });

  it("returns markdown and pdf deliverables with coherent headers", async () => {
    const { GET } = await import("./route");

    const markdownResponse = await GET(
      new Request("http://localhost/api/reports/elus-dossier?format=md&days=30"),
    );
    const pdfResponse = await GET(
      new Request("http://localhost/api/reports/elus-dossier?format=pdf&days=30"),
    );

    expect(markdownResponse.status).toBe(200);
    expect(markdownResponse.headers.get("Content-Type")).toContain("text/markdown");
    expect(markdownResponse.headers.get("Content-Disposition")).toContain(
      'filename="reports_elus_dossier_',
    );
    expect(markdownResponse.headers.get("X-Deliverable-Format")).toBe("md");
    expect(await markdownResponse.text()).toContain("# Dossier elu - Pack institutionnel");

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get("Content-Type")).toContain("application/pdf");
    expect(pdfResponse.headers.get("Content-Disposition")).toContain(
      'filename="reports_elus_dossier_',
    );
    expect(pdfResponse.headers.get("X-Deliverable-Format")).toBe("pdf");
  });

  it("sanitizes malformed numeric fields in JSON output", async () => {
    fetchUnifiedActionContractsMock.mockResolvedValueOnce({
      items: [
        {
          ...contract,
          metadata: { wasteKg: "12.5kg", volunteersCount: "4" },
          location: { label: "Paris", latitude: null, longitude: null },
        },
      ],
      isTruncated: false,
    });

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/reports/elus-dossier"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/json");

    const body = (await response.json()) as {
      summary: { totalKg: number; totalVolunteers: number; geocoverageRate: number };
    };

    expect(body.summary.totalKg).toBe(0);
    expect(body.summary.totalVolunteers).toBe(4);
    expect(body.summary.geocoverageRate).toBe(0);
  });
});
