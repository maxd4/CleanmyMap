import { describe, expect, it, vi } from "vitest";

const resolveActionTerritoryMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/geo/action-territory-resolver", () => ({
  resolveActionTerritory: resolveActionTerritoryMock,
}));

import { refreshMissingTerritorialLegendAttributions } from "./attribution-refresh";

function supabaseFixture() {
  const updates: unknown[] = [];
  const row = {
    id: "action-1",
    action_date: "2026-11-03",
    latitude: 48.8566,
    longitude: 2.3522,
    derived_geometry_kind: "point",
    derived_geometry_geojson: null,
    department_code: "75",
    department_name: "Paris",
  };
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    not: () => chain,
    or: () => chain,
    gte: () => chain,
    lte: () => chain,
    is: () => chain,
    order: () => chain,
    range: () => Promise.resolve({ data: [row], error: null }),
    update: (value: unknown) => { updates.push(value); return chain; },
  };
  return { client: chain as never, updates };
}

describe("territorial legend attribution refresh", () => {
  it("resolves and persists only missing server-owned projections", async () => {
    resolveActionTerritoryMock.mockResolvedValue({
      source: "geo.api.gouv.fr",
      region: { code: "11", name: "Île-de-France" },
      department: { code: "75", name: "Paris" },
      commune: { code: "75056", name: "Paris" },
      arrondissement: { code: "75105", name: "Paris 5e arrondissement" },
    });
    const fixture = supabaseFixture();

    await expect(refreshMissingTerritorialLegendAttributions(
      fixture.client,
      new Date("2026-11-03T12:00:00.000Z"),
    )).resolves.toEqual({ refreshed: 1, unverifiable: 0 });
    expect(resolveActionTerritoryMock).toHaveBeenCalledTimes(1);
    expect(fixture.updates).toHaveLength(1);
    expect(fixture.updates[0]).toEqual({ territorial_legend_attribution: expect.objectContaining({ cogYear: 2026 }) });
  });

  it("keeps an outage unverifiable and does not invent a territory", async () => {
    resolveActionTerritoryMock.mockResolvedValue(null);
    const fixture = supabaseFixture();

    await expect(refreshMissingTerritorialLegendAttributions(
      fixture.client,
      new Date("2026-11-03T12:00:00.000Z"),
    )).resolves.toEqual({ refreshed: 0, unverifiable: 1 });
    expect(fixture.updates).toHaveLength(0);
  });
});
