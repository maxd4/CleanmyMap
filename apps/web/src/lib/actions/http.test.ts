import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMapActionsQueryString,
  createAction,
  fetchMapActions,
} from "./http";

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

describe("fetchMapActions", () => {
  it("calls the map API with the serialized filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "ok",
          count: 0,
          daysWindow: 30,
          items: [],
          partialSource: false,
          sourceHealth: {
            partial: false,
            failedSources: [],
            availableSources: ["actions", "spots", "local"],
            warnings: [],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchMapActions({
      status: "approved",
      days: 15,
      impact: "critique",
      qualityMin: 73,
      limit: 200,
    });

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/actions/map?");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("limit=200");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("status=approved");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("days=15");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("impact=critique");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("qualityMin=73");
  });
});
