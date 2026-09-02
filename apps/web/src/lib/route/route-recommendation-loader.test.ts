import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

function queryResult(data: unknown[], error: Error | null = null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    not: vi.fn(() => query),
    gte: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(resolve({ data, error })),
  };
  return query;
}

function spot(overrides: Record<string, unknown> = {}) {
  return {
    id: "spot-1",
    created_at: "2026-08-24T10:00:00.000Z",
    created_by_clerk_id: "user-1",
    label: "Quai de Seine",
    spot_type: "spot",
    latitude: 48.85,
    longitude: 2.35,
    status: "validated",
    notes: null,
    ...overrides,
  };
}

describe("route recommendation source loader", () => {
  it("queries only validated spots with coordinates, floor date, deterministic order and limit + 1", async () => {
    const query = queryResult([spot(), spot({ id: "spot-2" }), spot({ id: "spot-3" })]);
    const supabase = { from: vi.fn(() => query) };

    const { loadRouteRecommendationSource } = await import(
      "./route-recommendation-loader"
    );
    const result = await loadRouteRecommendationSource(supabase as never, {
      limit: 2,
      floorDate: "2026-01-01",
    });

    expect(supabase.from).toHaveBeenCalledWith("trash_spotter_spots");
    expect(query.eq).toHaveBeenNthCalledWith(1, "status", "validated");
    expect(query.eq).toHaveBeenNthCalledWith(2, "spot_type", "spot");
    expect(query.not).toHaveBeenNthCalledWith(1, "latitude", "is", null);
    expect(query.not).toHaveBeenNthCalledWith(2, "longitude", "is", null);
    expect(query.gte).toHaveBeenCalledWith(
      "created_at",
      "2026-01-01T00:00:00.000Z",
    );
    expect(query.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "id", { ascending: true });
    expect(query.limit).toHaveBeenCalledWith(3);
    expect(result.items).toHaveLength(2);
    expect(result.isTruncated).toBe(true);
    expect(result.sourceHealth).toEqual({
      partial: false,
      failedSources: [],
      availableSources: ["spots"],
      warnings: [],
    });
  });

  it("cannot return cleaned or non-spot rows as route source items", async () => {
    const query = queryResult([
      spot(),
      spot({ id: "cleaned", status: "cleaned" }),
      spot({ id: "clean-place", spot_type: "clean_place" }),
    ]);
    const supabase = { from: vi.fn(() => query) };

    const { loadRouteRecommendationSource } = await import(
      "./route-recommendation-loader"
    );
    const result = await loadRouteRecommendationSource(supabase as never, {
      limit: 10,
      floorDate: "2026-01-01",
    });

    expect(result.items.map((item) => item.id)).toEqual(["spot-1"]);
    expect(result.items.every((item) => item.sourceStatus === "validated")).toBe(
      true,
    );
  });

  it("represents query errors as an unavailable spots source", async () => {
    const query = queryResult([], new Error("database unavailable"));
    const supabase = { from: vi.fn(() => query) };

    const { loadRouteRecommendationSource } = await import(
      "./route-recommendation-loader"
    );
    const result = await loadRouteRecommendationSource(supabase as never, {
      limit: 600,
      floorDate: "2026-01-01",
    });

    expect(result).toEqual({
      items: [],
      isTruncated: false,
      sourceHealth: {
        partial: true,
        failedSources: ["spots"],
        availableSources: [],
        warnings: ["Partial data: source(s) unavailable (spots)."],
      },
    });
  });
});
