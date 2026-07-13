import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const parseEntityTypesParamMock = vi.hoisted(() => vi.fn());
const buildActionInsightsMock = vi.hoisted(() => vi.fn());
const toActionListItemMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());
const resolveReportQueryMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));

vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedActionContractsMock,
  parseEntityTypesParam: parseEntityTypesParamMock,
}));

vi.mock("@/lib/actions/insights", () => ({
  buildActionInsights: buildActionInsightsMock,
}));

vi.mock("@/lib/actions/data-contract", () => ({
  toActionListItem: toActionListItemMock,
}));

vi.mock("@/lib/reports/scope", () => ({
  filterActionContractsByScope: filterActionContractsByScopeMock,
}));

vi.mock("@/lib/reports/csv", () => ({
  resolveReportQuery: resolveReportQueryMock,
}));

vi.mock("@/lib/public-surface-snapshot-service", () => ({
  loadOrRefreshPublicSurfaceSnapshot: loadOrRefreshPublicSurfaceSnapshotMock,
}));

vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: (error: unknown) =>
    new Response(error instanceof Error ? error.message : "error", { status: 500 }),
}));

describe("GET /api/actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    getSupabaseServerClientMock.mockReturnValue({});
    fetchUnifiedActionContractsMock.mockResolvedValue({
      items: [{ id: "action-1", status: "approved" }],
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions", "spots", "local"],
        warnings: [],
      },
    });
    parseEntityTypesParamMock.mockReturnValue(null);
    buildActionInsightsMock.mockReturnValue({
      qualityScore: 80,
      qualityGrade: "B",
      qualityFlags: [],
      qualityBreakdown: {
        completeness: 80,
        coherence: 80,
        geoloc: 80,
        traceability: 80,
        freshness: 80,
      },
      toFixPriority: false,
      impactLevel: "critique",
    });
    toActionListItemMock.mockImplementation((contract: { id: string; status: string }) => ({
      id: contract.id,
      status: contract.status,
      quality_grade: "B",
      impact_level: "critique",
      to_fix_priority: false,
    }));
    filterActionContractsByScopeMock.mockImplementation((items) => items);
    resolveReportQueryMock.mockReturnValue({
      scopeKind: "global",
      scopeValue: null,
      association: null,
    });
    loadOrRefreshPublicSurfaceSnapshotMock.mockImplementation(
      async ({ buildPayload }: { buildPayload: () => Promise<unknown> }) => ({
        payload: await buildPayload(),
      }),
    );
  });

  it("limits the unified action prefetch to a 2x expansion", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?limit=10&status=approved"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      count: 1,
    });
    expect(getSupabaseServerClientMock).toHaveBeenCalledTimes(1);
    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        limit: 20,
        status: "approved",
        requireCoordinates: false,
      }),
    );
  });
});
