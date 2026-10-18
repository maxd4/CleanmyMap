import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAuthenticatedAccessMock = vi.hoisted(() => vi.fn());
const unauthorizedJsonResponseMock = vi.hoisted(() => vi.fn());
const getSupabaseServerClientMock = vi.hoisted(() => vi.fn());
const fetchUnifiedActionContractsMock = vi.hoisted(() => vi.fn());
const buildRecyclingBreakdownMock = vi.hoisted(() => vi.fn());
const handleApiErrorMock = vi.hoisted(() =>
  vi.fn(() => Response.json({ status: "error" }, { status: 500 })),
);
const loadOrRefreshPublicSurfaceSnapshotMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/authz", () => ({
  requireAuthenticatedAccess: requireAuthenticatedAccessMock,
}));
vi.mock("@/lib/http/auth-responses", () => ({
  unauthorizedJsonResponse: unauthorizedJsonResponseMock,
}));
vi.mock("@/lib/http/api-errors", () => ({
  handleApiError: handleApiErrorMock,
}));
vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: getSupabaseServerClientMock,
}));
vi.mock("@/lib/actions/unified-source", () => ({
  fetchUnifiedActionContracts: fetchUnifiedActionContractsMock,
}));
vi.mock("@/lib/recycling/breakdown", () => ({
  buildRecyclingBreakdown: buildRecyclingBreakdownMock,
}));
vi.mock("@/lib/public-surface-snapshot-service", () => ({
  loadOrRefreshPublicSurfaceSnapshot: loadOrRefreshPublicSurfaceSnapshotMock,
}));

import { GET } from "./route";

describe("recycling breakdown route", () => {
  let lastSnapshotOptions:
    | {
        buildPayload: () => Promise<unknown>;
        version: string;
        allowStaleOnBuildError?: boolean;
      }
    | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    requireAuthenticatedAccessMock.mockResolvedValue({ ok: true, userId: "user-1" });
    unauthorizedJsonResponseMock.mockReturnValue(new Response("forbidden", { status: 401 }));
    getSupabaseServerClientMock.mockReturnValue({});
    fetchUnifiedActionContractsMock.mockResolvedValue({
      items: [],
      isTruncated: false,
      sourceHealth: {
        partial: false,
        failedSources: [],
        availableSources: ["actions"],
        warnings: [],
      },
    });
    buildRecyclingBreakdownMock.mockReturnValue({
      totalKg: 0,
      wasteKnownActions: 0,
      wasteCoverageRate: 0,
      lines: [],
      triQuality: "unknown",
    });
    loadOrRefreshPublicSurfaceSnapshotMock.mockImplementation(async (options) => {
      lastSnapshotOptions = options;
      return {
        payload: await options.buildPayload(),
      };
    });
  });

  it("builds a complete v3 snapshot", async () => {
    const response = await GET();
    const body = (await response.json()) as { status?: string };

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(lastSnapshotOptions).toMatchObject({
      version: "public-recycling-breakdown-v3",
      allowStaleOnBuildError: false,
    });
    expect(fetchUnifiedActionContractsMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        limit: 2000,
        status: "approved",
        floorDate: null,
        types: ["action"],
      }),
    );
  });

  it.each([
    { isTruncated: true, partial: false },
    { isTruncated: false, partial: true },
  ])("fails closed when the recycling source is incomplete", async (health) => {
    fetchUnifiedActionContractsMock.mockResolvedValueOnce({
      items: [],
      isTruncated: health.isTruncated,
      sourceHealth: {
        partial: health.partial,
        failedSources: health.partial ? ["actions"] : [],
        availableSources: [],
        warnings: ["incomplete"],
      },
    });

    const response = await GET();

    expect(response.status).toBe(500);
    expect(handleApiErrorMock).toHaveBeenCalledOnce();
    expect(buildRecyclingBreakdownMock).not.toHaveBeenCalled();
  });
});
