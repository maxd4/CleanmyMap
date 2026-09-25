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

  it("keeps an explicit public action deep-link independent from the viewport", () => {
    const params = parseMapActionsParams(
      new URL("http://localhost/api/actions/map?actionId=outside&south=48.8&west=2.2&north=48.9&east=2.4"),
      () => null,
    );

    expect(params.actionId).toBe("outside");
    expect(params.viewport).toBeUndefined();
  });

  it("fails closed for malformed filters and viewport bounds", () => {
    const params = parseMapActionsParams(
      new URL(
        "http://localhost/api/actions/map?limit=invalid&days=invalid&floorDate=  &qualityMin=invalid&impact=unknown&south=bad&west=2.2&north=48.9&east=2.4",
      ),
      () => [],
    );

    expect(params.limit).toBe(80);
    expect(params.days).toBe(30);
    expect(params.floorDate).toBeTruthy();
    expect(params.types).toEqual([]);
    expect(params.qualityMin).toBeNull();
    expect(params.impact).toBeNull();
    expect(params.viewport).toBeUndefined();
  });

  it.each([
    "south=49&west=2.2&north=48.9&east=2.4",
    "south=48.8&west=3&north=48.9&east=2.4",
    "south=-91&west=2.2&north=48.9&east=2.4",
    "south=48.8&west=2.2&north=91&east=2.4",
    "south=48.8&west=-181&north=48.9&east=2.4",
    "south=48.8&west=2.2&north=48.9&east=181",
  ])("rejects each invalid viewport boundary: %s", (query) => {
    const params = parseMapActionsParams(
      new URL(`http://localhost/api/actions/map?${query}`),
      () => null,
    );

    expect(params.viewport).toBeUndefined();
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
        includeFuturePublicActions: true,
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

  it("forwards the explicit action target to the unified public source", async () => {
    const deps = buildDeps();

    await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map?actionId=outside&floorDate=all"),
      deps,
    );

    expect(deps.fetchUnifiedActionContracts).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ actionId: "outside", viewport: undefined }),
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

  it("publishes only future pre-actions as a public map projection", async () => {
    const deps = buildDeps({
      fetchUnifiedActionContracts: vi.fn().mockResolvedValue({
        items: [
          {
            id: "future-action",
            type: "action",
            source: "actions",
            status: "pending",
            dates: { observedAt: "2999-01-01" },
            metadata: { actionPhase: "pre_action" },
            publishedAt: "2026-01-01T00:00:00.000Z",
          },
          {
            id: "pending-post-action",
            type: "action",
            source: "actions",
            status: "pending",
            dates: { observedAt: "2999-01-01" },
            metadata: { actionPhase: "post_action_complete" },
          },
        ],
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions"],
          warnings: [],
        },
      }),
    });

    const result = await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map?floorDate=all"),
      deps,
    );

    expect(result.body.items.map((item) => item.id)).toEqual(["future-action"]);
    expect(result.body.items[0]?.status).toBe("approved");
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

  it("uses a fail-safe source health value and drops items without coordinates", async () => {
    const deps = buildDeps({
      fetchUnifiedActionContracts: vi.fn().mockResolvedValue({
        items: [
          { id: "valid", status: "approved" },
          { id: "missing-coordinates", status: "approved" },
        ],
      }),
      toActionMapItem: vi.fn().mockImplementation((contract: { id: string; status: string }) => ({
        id: contract.id,
        status: contract.status,
        latitude: contract.id === "missing-coordinates" ? null : 48.8566,
        longitude: contract.id === "missing-coordinates" ? null : 2.3522,
      })),
    });

    const result = await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map"),
      deps,
    );

    expect(result.body.items.map((item) => item.id)).toEqual(["valid"]);
    expect(result.body.sourceHealth).toEqual({
      partial: false,
      failedSources: [],
      availableSources: [],
      warnings: [],
    });
  });

  it("applies quality and impact filters before limiting public items", async () => {
    const deps = buildDeps({
      fetchUnifiedActionContracts: vi.fn().mockResolvedValue({
        items: [
          { id: "kept", status: "approved" },
          { id: "wrong-impact", status: "approved" },
          { id: "low-quality", status: "approved" },
        ],
        sourceHealth: {
          partial: false,
          failedSources: [],
          availableSources: ["actions"],
          warnings: [],
        },
      }),
      buildActionInsights: vi.fn().mockImplementation((contract: { id: string }) => ({
        qualityScore: contract.id === "low-quality" ? 40 : 90,
        qualityGrade: "A",
        qualityFlags: [],
        qualityBreakdown: {
          completeness: 90,
          coherence: 90,
          geoloc: 90,
          traceability: 90,
          freshness: 90,
        },
        toFixPriority: false,
        impactLevel: contract.id === "wrong-impact" ? "faible" : "critique",
      })),
      toActionMapItem: vi.fn().mockImplementation(
        (contract: { id: string; status: string }, insights: { qualityScore: number; impactLevel: string }) => ({
          id: contract.id,
          status: contract.status,
          latitude: 48.8566,
          longitude: 2.3522,
          quality_score: insights.qualityScore,
          impact_level: insights.impactLevel,
        }),
      ),
    });

    const result = await buildMapActionsRouteResult(
      new URL("http://localhost/api/actions/map?qualityMin=80&impact=critique"),
      deps,
    );

    expect(result.body.items.map((item) => item.id)).toEqual(["kept"]);
  });
});
