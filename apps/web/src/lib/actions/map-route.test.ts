import { describe, expect, it, vi } from "vitest";
import { buildMapActionsRouteResult, parseMapActionsParams } from "./map-route";

function buildDeps(overrides?: Partial<Parameters<typeof buildMapActionsRouteResult>[1]>) {
  const fetchUnifiedActionContracts = vi.fn().mockResolvedValue({
    items: [
      {
        id: "action-1",
        status: "approved",
      },
    ],
    sourceHealth: {
      partial: false,
      failedSources: [],
      availableSources: ["actions", "spots", "local"],
      warnings: [],
    },
  });

  const deps = {
    getSupabaseServerClient: vi.fn().mockReturnValue({}),
    fetchUnifiedActionContracts,
    parseEntityTypesParam: vi.fn().mockReturnValue(null),
    buildActionInsights: vi.fn().mockReturnValue({
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
    }),
    toActionMapItem: vi.fn().mockImplementation((contract: { id: string; status: string }) => ({
      id: contract.id,
      status: contract.status,
      quality_score: 80,
      impact_level: "critique",
      contract: {
        metadata: { associationName: null },
      },
    })),
    filterActionContractsByScope: vi.fn().mockImplementation((items) => items),
    ...overrides,
  } as const;

  return deps;
}

describe("parseMapActionsParams", () => {
  it("defaults to approved status and a 30 day window", () => {
    const params = parseMapActionsParams(
      new URL("http://localhost/api/actions/map"),
      () => null,
    );

    expect(params.status).toBe("approved");
    expect(params.days).toBe(30);
    expect(params.floorDate).toBeTruthy();
  });

  it("supports explicit all status and all time", () => {
    const params = parseMapActionsParams(
      new URL("http://localhost/api/actions/map?status=all&floorDate=all"),
      () => null,
    );

    expect(params.status).toBeNull();
    expect(params.floorDate).toBeNull();
  });
});

describe("buildMapActionsRouteResult", () => {
  it("builds the response body without importing the Next route", async () => {
    const deps = buildDeps();

    const result = await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map?days=15&limit=10&impact=critique&qualityMin=73"),
      deps,
    );

    expect(result.body).toMatchObject({
      status: "ok",
      count: 1,
      partialSource: false,
    });
    expect(result.headers).toBeUndefined();
    expect(deps.getSupabaseServerClient).toHaveBeenCalledWith(false);
    expect(deps.fetchUnifiedActionContracts).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        requireCoordinates: true,
        status: "approved",
        limit: 40,
      }),
    );
  });

  it("adds a partial-data warning header when needed", async () => {
    const deps = buildDeps({
      fetchUnifiedActionContracts: vi.fn().mockResolvedValue({
        items: [
          {
            id: "action-1",
            status: "approved",
          },
        ],
        sourceHealth: {
          partial: true,
          failedSources: ["local"],
          availableSources: ["actions", "spots"],
          warnings: ["Partial data"],
        },
      }),
    });

    const result = await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map?status=approved"),
      deps,
    );

    expect(result.headers).toEqual({
      "X-Data-Warning": "Partial source data",
    });
    expect(result.body.partialSource).toBe(true);
  });
});
