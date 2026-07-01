import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());
const computePeriodComparisonMock = vi.hoisted(() => vi.fn());
const buildTerritorialBenchmarkMock = vi.hoisted(() => vi.fn());
const buildPilotageOverviewFromContractsMock = vi.hoisted(() => vi.fn());
const buildPersonalImpactMethodologyMock = vi.hoisted(() => vi.fn());
const evaluateActionQualityMock = vi.hoisted(() => vi.fn());
const toActionListItemMock = vi.hoisted(() => vi.fn());

function createSupabaseMock(options?: {
  cachedPdf?: Blob | null;
}) {
  const cachedPdf = options?.cachedPdf ?? null;
  const reportsQuery = {
    data: cachedPdf ? [{ file_path: "elus-dossier/cache.pdf" }] : [],
    error: null,
  };
  const storage = {
    from: vi.fn(() => ({
      createSignedUrl: vi.fn(async () =>
        cachedPdf
          ? {
              data: {
                signedUrl:
                  "https://supabase.test/storage/v1/object/sign/reports/elus-dossier/cache.pdf?token=abc123",
              },
              error: null,
            }
          : { data: null, error: { message: "not found" } },
      ),
      upload: vi.fn(async () => ({
        data: { path: "elus-dossier/cache.pdf" },
        error: null,
      })),
    })),
  };

  const queryChain = {
    select: vi.fn(() => queryChain),
    eq: vi.fn(() => queryChain),
    order: vi.fn(() => queryChain),
    limit: vi.fn(async () => reportsQuery),
    insert: vi.fn(async () => ({ data: null, error: null })),
  };

  return {
    from: vi.fn(() => queryChain),
    storage,
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
    getSupabaseServerClientMock.mockReturnValue(createSupabaseMock());
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
  });

  it("returns markdown deliverables with coherent headers", async () => {
    const { GET } = await import("./route");

    const markdownResponse = await GET(
      new Request("http://localhost/api/reports/elus-dossier?format=md&days=30"),
    );

    expect(markdownResponse.status).toBe(200);
    expect(markdownResponse.headers.get("Content-Type")).toContain("text/markdown");
    expect(markdownResponse.headers.get("Content-Disposition")).toContain(
      'filename="reports_elus_dossier_',
    );
    expect(markdownResponse.headers.get("Cache-Control")).toBe(
      "private, max-age=300, stale-while-revalidate=86400",
    );
    expect(markdownResponse.headers.get("X-Deliverable-Format")).toBe("md");
    expect(await markdownResponse.text()).toContain("# Dossier elu - Pack institutionnel");
  });

  it("returns 409 when the pdf cache is missing and points to the browser export", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/reports/elus-dossier?format=pdf&days=30"),
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("Content-Type")).toContain("application/json");
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("généré côté navigateur"),
    });
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(buildTerritorialBenchmarkMock).not.toHaveBeenCalled();
    expect(buildPilotageOverviewFromContractsMock).not.toHaveBeenCalled();
  });

  it("serves a cached pdf asset without rebuilding it", async () => {
    getSupabaseServerClientMock.mockReturnValue(
      createSupabaseMock({
        cachedPdf: new Blob(["cached-pdf"], { type: "application/pdf" }),
      }),
    );
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/reports/elus-dossier?format=pdf&days=30"),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "https://supabase.test/storage/v1/object/sign/reports/elus-dossier/cache.pdf?token=abc123",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=300, stale-while-revalidate=86400",
    );
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(await response.text()).toBe("");
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
    expect(response.headers.get("Cache-Control")).toBe(
      "private, max-age=300, stale-while-revalidate=86400",
    );

    const body = (await response.json()) as {
      summary: { totalKg: number; totalVolunteers: number; geocoverageRate: number };
    };

    expect(body.summary.totalKg).toBe(0);
    expect(body.summary.totalVolunteers).toBe(4);
    expect(body.summary.geocoverageRate).toBe(0);
  });
});
