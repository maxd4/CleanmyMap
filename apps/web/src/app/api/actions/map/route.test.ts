import { beforeEach, describe, expect, it, vi } from "vitest";

const buildMapActionsRouteResultMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/map-route", async () => ({
  ...(await vi.importActual<typeof import("@/lib/actions/map-route")>("@/lib/actions/map-route")),
  buildMapActionsRouteResult: buildMapActionsRouteResultMock,
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
    buildMapActionsRouteResultMock.mockResolvedValue({
      body: { status: "ok", count: 0, items: [], partialSource: false },
    });
    loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValue({
      payload: {
        status: "ok",
        count: 2,
        daysWindow: 30,
        items: [
          { id: "approved", status: "approved" },
          { id: "pending", status: "pending" },
        ],
        partialSource: false,
      },
    });
  });

  it.each(["pending", "rejected", "all"])(
    "bypasses persistent snapshots for a bounded geolocated %s search",
    async (status) => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request(
          `http://localhost/api/actions/map?status=${status}&south=12.34&west=56.78&north=12.35&east=56.79&zoom=15`,
        ),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ status: "ok" });
      expect(buildMapActionsRouteResultMock).toHaveBeenCalledTimes(1);
      expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
    },
  );

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

  it.each(["approved", "pending", "rejected", "all"])(
    "returns only approved items for anonymous public status %s",
    async (status) => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request(`http://localhost/api/actions/map?status=${status}`),
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        count: 1,
        items: [{ id: "approved", status: "approved" }],
      });
    },
  );
});
