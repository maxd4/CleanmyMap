import { beforeEach, describe, expect, it, vi } from "vitest";

const buildMapActionsRouteResultMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());
const parseEntityTypesParamMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/map/map-route", async () => ({
  ...(await vi.importActual<typeof import("@/lib/actions/map/map-route")>("@/lib/actions/map/map-route")),
  buildMapActionsRouteResult: buildMapActionsRouteResultMock,
}));
vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: vi.fn(),
  parseEntityTypesParam: parseEntityTypesParamMock,
}));
vi.mock("@/lib/actions/insights", () => ({ buildActionInsights: vi.fn() }));
vi.mock("@/lib/actions/data-contract", () => ({
  toActionMapItem: vi.fn(),
  toPublicActionMapItem: vi.fn(),
  toPublicActionMapResponse: (payload: unknown) => payload,
}));
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
    parseEntityTypesParamMock.mockReturnValue(null);
    buildMapActionsRouteResultMock.mockResolvedValue({
      body: { status: "ok", count: 0, items: [], partialSource: false },
    });
    loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValue({
      payload: {
        status: "ok",
        count: 2,
        daysWindow: 30,
        items: [
          {
            id: "approved",
            status: "approved",
            created_by_clerk_id: "internal-owner",
            contract: { createdByClerkId: "internal-owner" },
          },
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

  it("surfaces a partial-source warning on bounded public map reads", async () => {
    buildMapActionsRouteResultMock.mockResolvedValueOnce({
      body: {
        status: "ok",
        count: 0,
        items: [],
        partialSource: true,
      },
    });
    const { GET } = await import("./route");

    const response = await GET(
      new Request(
        "http://localhost/api/actions/map?south=12.34&west=56.78&north=12.35&east=56.79&zoom=15",
      ),
    );

    expect(response.headers.get("x-data-warning")).toBe("Partial source data");
  });

  it("surfaces a partial-source warning from a persisted public snapshot", async () => {
    loadOrRefreshPublicSurfaceSnapshotMock.mockResolvedValueOnce({
      payload: {
        status: "ok",
        count: 0,
        items: [],
        partialSource: true,
      },
    });
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions/map"));

    expect(response.headers.get("x-data-warning")).toBe("Partial source data");
  });

  it("keeps snapshot failures behind the API error boundary", async () => {
    loadOrRefreshPublicSurfaceSnapshotMock.mockRejectedValueOnce(
      new Error("snapshot unavailable"),
    );
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions/map"));

    expect(response.status).toBe(500);
    expect(await response.text()).toContain("snapshot unavailable");
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

  it.each(["approved", "pending", "rejected", "all"])(
    "returns only approved items for anonymous public status %s",
    async (status) => {
      const { GET } = await import("./route");
      const response = await GET(
        new Request(`http://localhost/api/actions/map?status=${status}`),
      );

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload).toMatchObject({
        count: 1,
        items: [{ id: "approved", status: "approved" }],
      });
      expect(payload.items[0]).not.toHaveProperty("created_by_clerk_id");
      expect(payload.items[0].contract).not.toHaveProperty("createdByClerkId");
    },
  );

  it("bumps the public map snapshot contract version", async () => {
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/actions/map?days=30"));

    expect(loadOrRefreshPublicSurfaceSnapshotMock.mock.calls[0][0].version).toBe(
      "public-map-actions-v3",
    );
  });

  it("keeps explicit public type filters in the snapshot key", async () => {
    parseEntityTypesParamMock.mockReturnValue(["action"]);
    const { GET } = await import("./route");

    await GET(new Request("http://localhost/api/actions/map?types=action"));

    expect(loadOrRefreshPublicSurfaceSnapshotMock.mock.calls[0][0].snapshotKey).toContain(
      '"types":"action"',
    );
  });
});
