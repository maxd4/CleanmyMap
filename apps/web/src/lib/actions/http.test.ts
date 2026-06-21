import { afterEach, describe, expect, it, vi } from "vitest";
import { buildMapActionsQueryString, buildMapFeedRpcParams, createAction } from "./http";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it("supports an all time map window", () => {
    const query = buildMapActionsQueryString({ floorDate: null });
    const params = new URLSearchParams(query);

    expect(params.get("floorDate")).toBe("all");
    expect(params.has("days")).toBe(false);
  });
});

describe("buildMapFeedRpcParams", () => {
  it("serializes the viewport and caps the requested limit", () => {
    const params = buildMapFeedRpcParams({
      limit: 200,
      status: "approved",
      days: 15,
      impact: "fort",
      viewport: {
        center: [48.8566, 2.3522],
        zoom: 12,
        bounds: {
          south: 48.4,
          west: 2.0,
          north: 49.0,
          east: 2.8,
        },
      },
    });

    expect(params).toEqual(
      expect.objectContaining({
        p_status: "approved",
        p_floor_date: expect.any(String),
        p_impact: "fort",
        p_zoom: 12,
        p_south: 48.4,
        p_west: 2.0,
        p_north: 49.0,
        p_east: 2.8,
      }),
    );
    expect(params.p_limit).toBe(300);
  });

  it("keeps the map open when no viewport is provided", () => {
    const params = buildMapFeedRpcParams({});

    expect(params.p_south).toBeNull();
    expect(params.p_west).toBeNull();
    expect(params.p_north).toBeNull();
    expect(params.p_east).toBeNull();
    expect(params.p_zoom).toBeNull();
    expect(params.p_status).toBeNull();
  });
});
