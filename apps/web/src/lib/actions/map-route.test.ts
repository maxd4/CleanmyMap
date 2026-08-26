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
      action_date: "2026-06-01",
      location_label: "Quai de test",
      latitude: 48.8566,
      longitude: 2.3522,
      status: contract.status,
      created_by_clerk_id: null,
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

  it.each(["pending", "rejected", "all"])(
    "normalizes non-public status %s to approved",
    (status) => {
      const params = parseMapActionsParams(
        new URL(`http://localhost/api/actions/map?status=${status}&floorDate=all`),
        () => null,
      );

      expect(params.status).toBe("approved");
      expect(params.floorDate).toBeNull();
    },
  );

  it("parses bounded viewport parameters for progressive map searches", () => {
    const params = parseMapActionsParams(
      new URL("http://localhost/api/actions/map?south=48.8&west=2.2&north=48.9&east=2.4&zoom=12"),
      () => null,
    );

    expect(params.viewport).toEqual({
      south: 48.8,
      west: 2.2,
      north: 48.9,
      east: 2.4,
      zoom: 12,
    });
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
    expect(result.body.items[0]).toMatchObject({
      latitude: 48.8566,
      longitude: 2.3522,
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

  it("forwards bounded viewport parameters to the unified source", async () => {
    const deps = buildDeps();

    await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map?south=48.8&west=2.2&north=48.9&east=2.4&zoom=12"),
      deps,
    );

    expect(deps.fetchUnifiedActionContracts).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        viewport: {
          south: 48.8,
          west: 2.2,
          north: 48.9,
          east: 2.4,
          zoom: 12,
        },
      }),
    );
  });

  it.each(["pending", "rejected", "all"])(
    "keeps viewport reads public for status %s",
    async (status) => {
      const deps = buildDeps();

      await buildMapActionsRouteResult(
        new URL(
          `http://localhost/api/actions/map?status=${status}&south=48.8&west=2.2&north=48.9&east=2.4&zoom=12`,
        ),
        deps,
      );

      expect(deps.fetchUnifiedActionContracts).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ status: "approved" }),
      );
    },
  );

  it("filters non-public contracts even when a source returns them", async () => {
    const deps = buildDeps({
      fetchUnifiedActionContracts: vi.fn().mockResolvedValue({
        items: [
          { id: "approved", status: "approved" },
          { id: "pending", status: "pending" },
          { id: "rejected", status: "rejected" },
        ],
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions", "spots"],
          warnings: [],
        },
      }),
    });

    const result = await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map?status=all"),
      deps,
    );

    expect(result.body.items.map((item) => item.id)).toEqual(["approved"]);
    expect(result.body.count).toBe(1);
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
