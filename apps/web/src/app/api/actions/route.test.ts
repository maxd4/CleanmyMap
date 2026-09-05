import { beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const parseEntityTypesParamMock = vi.hoisted(() => vi.fn());
const buildActionInsightsMock = vi.hoisted(() => vi.fn());
const toActionListItemMock = vi.hoisted(() => vi.fn());
const filterActionContractsByScopeMock = vi.hoisted(() => vi.fn());
const resolveReportQueryMock = vi.hoisted(() => vi.fn());
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());
const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const getCurrentUserActiveRoleMock = vi.hoisted(() => vi.fn());
const canModerateAnyActionMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  canAutoApproveOwnAction: vi.fn(),
  canUseAdminOverride: vi.fn(),
  getCurrentUserIdentity: vi.fn(),
  getCurrentUserActiveRole: getCurrentUserActiveRoleMock,
  pickTraceableActorName: vi.fn(),
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));

vi.mock("@/lib/actions/permissions", () => ({
  canAutoApproveOwnAction: vi.fn(),
  canUseAdminOverride: vi.fn(),
  canModerateAnyAction: canModerateAnyActionMock,
}));

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
    fetchUnifiedActionContractsMock.mockImplementation(
      async (_supabase: unknown, params: { status: "approved" | "pending" | "rejected" | null }) => {
        const items = [
          { id: "action-approved", status: "approved", type: "action" },
          { id: "action-pending", status: "pending", type: "action" },
          { id: "action-rejected", status: "rejected", type: "action" },
          {
            id: "spot-new",
            status: "pending",
            type: "spot",
            source: "trash_spotter_spots",
            sourceStatus: "new",
          },
          {
            id: "spot-validated",
            status: "approved",
            type: "spot",
            source: "trash_spotter_spots",
            sourceStatus: "validated",
          },
          {
            id: "spot-cleaned",
            status: "approved",
            type: "clean_place",
            source: "trash_spotter_spots",
            sourceStatus: "cleaned",
          },
        ];
        const filteredItems =
          params.status === "approved"
            ? items.filter((item) => item.status === "approved")
            : params.status === "pending"
              ? items.filter((item) => item.status === "pending")
              : params.status === "rejected"
                ? items.filter((item) => item.status === "rejected")
                : items;

        return {
          items: filteredItems,
          sourceHealth: {
            partial: false,
            failedSources: [],
            availableSources: ["actions", "spots", "local"],
            warnings: [],
          },
        };
      },
    );
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
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: false,
      status: 401,
      error: "Unauthorized",
    });
    getCurrentUserActiveRoleMock.mockResolvedValue("benevole");
    canModerateAnyActionMock.mockReturnValue(false);
  });

  it("limits the unified action prefetch to a 2x expansion", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?limit=10&status=approved"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      count: 3,
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
  }, 15000);

  it("keeps the public default on approved data and excludes new/pending/rejected records", async () => {
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/actions"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ status: "approved" }),
    );
    expect(payload.items.map((item: { id: string }) => item.id)).toEqual([
      "action-approved",
      "spot-validated",
      "spot-cleaned",
    ]);
    expect(loadOrRefreshPublicSurfaceSnapshotMock).toHaveBeenCalledTimes(1);
    const snapshotRequest = loadOrRefreshPublicSurfaceSnapshotMock.mock.calls[0][0];
    expect(JSON.parse(snapshotRequest.snapshotKey)).toMatchObject({
      status: "approved",
    });
    expect(snapshotRequest.meta).toMatchObject({ status: "approved" });
    expect(requireAuthenticatedAccessMock).not.toHaveBeenCalled();
  });

  it("keeps approved validated and cleaned Trash Spotter records public", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?status=approved"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "spot-validated", status: "approved" }),
        expect.objectContaining({ id: "spot-cleaned", status: "approved" }),
      ]),
    );
  });

  it("refuses anonymous pending reads before unified loading or snapshot access", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?status=pending"),
    );

    expect(response.status).toBe(401);
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it("refuses anonymous rejected reads before unified loading or snapshot access", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?status=rejected"),
    );

    expect(response.status).toBe(401);
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it("refuses anonymous explicit all reads because they include non-public states", async () => {
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?status=all"),
    );

    expect(response.status).toBe(401);
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it("refuses an ordinary authenticated user from reading the global pending queue", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "user-1",
    });
    getCurrentUserActiveRoleMock.mockResolvedValue("benevole");
    canModerateAnyActionMock.mockReturnValue(false);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?status=pending"),
    );

    expect(response.status).toBe(403);
    expect(fetchUnifiedActionContractsMock).not.toHaveBeenCalled();
    expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });

  it.each(["admin", "elu", "max"] as const)(
    "allows %s to read pending actions and signalements without a public snapshot",
    async (role) => {
      requireAuthenticatedAccessMock.mockResolvedValue({
        ok: true,
        userId: `${role}-1`,
      });
      getCurrentUserActiveRoleMock.mockResolvedValue(role);
      canModerateAnyActionMock.mockReturnValue(true);
      const { GET } = await import("./route");

      const response = await GET(
        new Request("http://localhost/api/actions?status=pending"),
      );
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "action-pending", status: "pending" }),
          expect.objectContaining({ id: "spot-new", status: "pending" }),
        ]),
      );
      expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
    },
  );

  it("keeps the explicit all moderation view direct and includes rejected actions", async () => {
    requireAuthenticatedAccessMock.mockResolvedValue({
      ok: true,
      userId: "admin-1",
    });
      getCurrentUserActiveRoleMock.mockResolvedValue("admin");
    canModerateAnyActionMock.mockReturnValue(true);
    const { GET } = await import("./route");

    const response = await GET(
      new Request("http://localhost/api/actions?status=all"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "action-rejected", status: "rejected" }),
        expect.objectContaining({ id: "spot-new", status: "pending" }),
      ]),
    );
    expect(loadOrRefreshPublicSurfaceSnapshotMock).not.toHaveBeenCalled();
  });
});
