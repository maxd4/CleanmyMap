import { beforeEach, describe, expect, it, vi } from "vitest";

const buildMapActionsRouteResultMock = vi.hoisted(() => vi.fn());
const parseMapActionsParamsMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/map-route", () => ({
  buildMapActionsRouteResult: buildMapActionsRouteResultMock,
  parseMapActionsParams: parseMapActionsParamsMock,
}));
vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: vi.fn(),
  parseEntityTypesParam: vi.fn(),
}));
vi.mock("@/lib/actions/insights", () => ({ buildActionInsights: vi.fn() }));
vi.mock("@/lib/actions/data-contract", () => ({ toActionMapItem: vi.fn() }));
vi.mock("@/lib/reports/scope", () => ({ filterActionContractsByScope: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: (error: unknown) =>
    new Response(error instanceof Error ? error.message : "error", { status: 500 }),
}));
vi.mock("@/lib/public-surface-snapshot-service", () => ({
  loadOrRefreshPublicSurfaceSnapshot: loadOrRefreshPublicSurfaceSnapshotMock,
}));

describe("GET /api/actions/map persistence boundary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    parseMapActionsParamsMock.mockImplementation((url: URL) => ({
      limit: 80,
      days: 30,
      floorDate: null,
      status: null,
      types: null,
      qualityMin: null,
      impact: null,
      scope: { kind: "global", value: null },
      viewport: url.searchParams.has("south")
        ? {
            south: Number(url.searchParams.get("south")),
            west: Number(url.searchParams.get("west")),
            north: Number(url.searchParams.get("north")),
            east: Number(url.searchParams.get("east")),
            zoom: Number(url.searchParams.get("zoom")),
          }
        : null,
    }));
    buildMapActionsRouteResultMock.mockResolvedValue({
      body: { status: "ok", count: 0, items: [], partialSource: false },
    });
    loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValue({
      payload: { status: "snapshot" },
    });
  });

  it("bypasses persistent snapshots for a bounded geolocated search", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/actions/map?south=12.34&west=56.78&north=12.35&east=56.79&zoom=15",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok" });
    expect(buildMapActionsRouteResultMock).toHaveBeenCalledTimes(1);
    expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it("keeps coordinates out of the persistent global snapshot key", async () => {
    const { GET } = await import("./route");
    await GET(new Request("http://localhost/api/actions/map?days=30"));

    expect(loadOrRefreshPublicSurfaceSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshotKey: expect.not.stringContaining("12.34"),
      }),
    );
    const snapshotKey = loadOrRefreshPublicSurfaceSnapshotMock.mock.calls[0][0]
      .snapshotKey as string;
    expect(JSON.parse(snapshotKey)).toMatchObject({ viewport: "global" });
  });
});
