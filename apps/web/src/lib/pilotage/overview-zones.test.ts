import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { buildZones } from "./overview-zones";

describe("buildZones", () => {
  it("aggregates current/previous windows and computes urgency fields", () => {
    const contracts = [
      buildActionDataContract({
        id: "c1",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 30,
        volunteersCount: 5,
      }),
      buildActionDataContract({
        id: "c2",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-01",
        createdAt: "2026-03-31T10:00:00.000Z",
        locationLabel: "Zone hors arr",
        latitude: null,
        longitude: null,
        wasteKg: 12,
        volunteersCount: 2,
      }),
      buildActionDataContract({
        id: "p1",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-02-20",
        createdAt: "2026-02-19T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 5,
        volunteersCount: 1,
      }),
      buildActionDataContract({
        id: "pend-1",
        type: "action",
        status: "pending",
        source: "test",
        observedAt: "2026-04-05",
        createdAt: "2026-04-03T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 0,
        volunteersCount: 0,
      }),
    ];

    const zones = buildZones(contracts, 30, new Date("2026-04-10T00:00:00Z"));

    expect(zones.length).toBeGreaterThan(0);
    const paris10 = zones.find((zone) => zone.area === "10e");
    expect(paris10).toBeDefined();
    expect(paris10?.currentActions).toBe(1);
    expect(paris10?.previousActions).toBe(1);
    expect(paris10?.currentKg).toBe(30);
    expect(paris10?.previousKg).toBe(5);
    expect(paris10?.deltaKgAbsolute).toBe(25);
    expect(["critique", "elevee", "moderee"]).toContain(paris10?.urgency);

    const outside = zones.find((zone) => zone.area === "Hors arrondissement");
    expect(outside).toBeDefined();
    expect(outside?.currentCoverageRate).toBe(0);
  });

  it("limits result set to 12 zones", () => {
    const contracts = Array.from({ length: 20 }).map((_, index) =>
      buildActionDataContract({
        id: `z-${index}`,
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: `Paris ${((index % 20) + 1).toString()}e`,
        latitude: 48.85 + index * 0.001,
        longitude: 2.3 + index * 0.001,
        wasteKg: 1 + index,
        volunteersCount: 1,
      }),
    );

    const zones = buildZones(contracts, 30, new Date("2026-04-10T00:00:00Z"));
    expect(zones.length).toBeLessThanOrEqual(12);
  });
});
