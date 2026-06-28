import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  getSupabaseBrowserClientMock: vi.fn(),
  fetchActionPollutionScoreReferencesMock: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: mocks.getSupabaseBrowserClientMock,
}));

vi.mock("./pollution-score-references", () => ({
  fetchActionPollutionScoreReferences: mocks.fetchActionPollutionScoreReferencesMock,
}));

import {
  buildMapActionsQueryString,
  createAction,
  fetchMapActions,
} from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  mocks.rpcMock.mockReset();
  mocks.getSupabaseBrowserClientMock.mockReset();
  mocks.fetchActionPollutionScoreReferencesMock.mockReset();
});

function expectFetchPostMethods(fetchMock: ReturnType<typeof vi.fn>): void {
  expect(fetchMock.mock.calls[0]?.[1]).toEqual(
    expect.objectContaining({
      method: "POST",
    }),
  );
  expect(fetchMock.mock.calls[1]?.[1]).toEqual(
    expect.objectContaining({
      method: "POST",
    }),
  );
}

function expectMapActionsFallbackResult(
  result: Awaited<ReturnType<typeof fetchMapActions>>,
): void {
  expect(result.status).toBe("ok");
  expect(result.count).toBe(1);
  expect(result.daysWindow).toBe(15);
  expect(result.partialSource).toBe(false);
  expect(result.sourceHealth?.availableSources).toEqual([
    "actions",
    "spots",
  ]);
  expect(result.items[0]?.id).toBe("map-1");
  expect(result.items[0]?.waste_pollution_score).toBe(40);
  expect(result.items[0]?.cigarette_butts_pollution_score).toBe(100);
  expect(result.items[0]?.impact_level).toBe("fort");
  expect(result.items[0]?.contract?.metadata.associationName).toBe("Collectif Demo");
  expect(result.items[0]?.contract?.metadata.manualDrawing).toEqual({
    kind: "polyline",
    coordinates: [
      [48.8566, 2.3522],
      [48.857, 2.353],
    ],
  });
}

describe("createAction", () => {
  it("retries with the legacy payload when the contract payload is rejected", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Validation failed" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: "created", id: "action-1" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await createAction({
      actorName: "Test User",
      associationName: "Action spontanee",
      actionDate: "2026-04-22",
      locationLabel: "Test lieu",
      wasteKg: 1.5,
      cigaretteButts: 0,
      volunteersCount: 1,
      durationMinutes: 0,
      notes: "Test",
    });

    expect(result).toEqual({ id: "action-1", retentionLoop: null });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectFetchPostMethods(fetchMock);
  });
});

describe("buildMapActionsQueryString", () => {
  it("defaults to approved status for map safety", () => {
    const query = buildMapActionsQueryString();
    const params = new URLSearchParams(query);
    expect(params.get("status")).toBe("approved");
  });

  it("allows explicit all status", () => {
    const query = buildMapActionsQueryString({ status: "all" });
    const params = new URLSearchParams(query);
    expect(params.has("status")).toBe(false);
  });

  it("serializes impact and minimum quality filters", () => {
    const query = buildMapActionsQueryString({
      impact: "critique",
      qualityMin: 73,
    });
    const params = new URLSearchParams(query);

    expect(params.get("impact")).toBe("critique");
    expect(params.get("qualityMin")).toBe("73");
  });

  it("serializes viewport bounds when present", () => {
    const query = buildMapActionsQueryString({
      viewport: {
        center: [48.8566, 2.3522],
        zoom: 13,
        bounds: {
          south: 48.7,
          west: 2.2,
          north: 48.95,
          east: 2.5,
        },
      },
    });
    const params = new URLSearchParams(query);

    expect(params.get("south")).toBe("48.7");
    expect(params.get("west")).toBe("2.2");
    expect(params.get("north")).toBe("48.95");
    expect(params.get("east")).toBe("2.5");
    expect(params.get("zoom")).toBe("13");
  });

  it("supports an all time map window", () => {
    const query = buildMapActionsQueryString({ floorDate: null });
    const params = new URLSearchParams(query);

    expect(params.get("floorDate")).toBe("all");
    expect(params.has("days")).toBe(false);
  });
});

describe("fetchMapActions", () => {
  it("falls back to the browser RPC when the snapshot route is unavailable", async () => {
    const rpcRow = {
      source: "actions",
      entity_type: "action",
      id: "map-1",
      created_at: "2026-06-01T10:00:00.000Z",
      updated_at: "2026-06-01T11:00:00.000Z",
      created_by_clerk_id: "clerk_123",
      status: "approved",
      observed_at: "2026-06-01",
      location_label: "Quai de test",
      latitude: "48.8566",
      longitude: "2.3522",
      waste_kg: "10",
      cigarette_butts: "300",
      volunteers_count: "5",
      duration_minutes: "45",
      notes:
        "association: Collectif Demo\n[cmm-meta]{\"associationName\":\"Collectif Demo\"}\n[DRAWING_GEOJSON]{\"kind\":\"polyline\",\"coordinates\":[[48.8566,2.3522],[48.857,2.353]]}",
      derived_geometry_kind: "polyline",
      derived_geometry_geojson:
        '{"type":"LineString","coordinates":[[2.3522,48.8566],[2.353,48.857]]}',
      geometry_confidence: "0.8",
      geometry_source: "manual",
    };

    const supabaseClient = {
      rpc: mocks.rpcMock.mockResolvedValue({
        data: [rpcRow],
        error: null,
      }),
    };

    mocks.getSupabaseBrowserClientMock.mockReturnValue(supabaseClient);
    mocks.fetchActionPollutionScoreReferencesMock.mockResolvedValue({
      wastePerVolunteer: 5,
      buttsPerVolunteer: 50,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("", {
          status: 503,
        }),
      ),
    );

    const result = await fetchMapActions({
      status: "approved",
      days: 15,
      impact: "fort",
      limit: 200,
      viewport: {
        center: [48.8566, 2.3522],
        zoom: 13,
        bounds: {
          south: 48.7,
          west: 2.2,
          north: 48.95,
          east: 2.5,
        },
      },
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mocks.getSupabaseBrowserClientMock).toHaveBeenCalledTimes(1);
    expect(mocks.fetchActionPollutionScoreReferencesMock).toHaveBeenCalledTimes(1);
    expect(mocks.rpcMock).toHaveBeenCalledTimes(1);
    expect(mocks.rpcMock).toHaveBeenCalledWith(
      "actions_map_feed",
      expect.objectContaining({
        p_status: "approved",
        p_impact: "fort",
        p_limit: 800,
        p_south: 48.7,
        p_west: 2.2,
        p_north: 48.95,
        p_east: 2.5,
        p_zoom: 13,
      }),
    );
    expectMapActionsFallbackResult(result);
  });
});
