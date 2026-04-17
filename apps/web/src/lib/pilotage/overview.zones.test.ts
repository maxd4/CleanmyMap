import { describe, expect, it } from "vitest";
import { buildActionDataContract } from "../actions/data-contract";
import { buildZones } from "./overview.zones";

describe("buildZones", () => {
  it("builds zone deltas and urgency from current/previous windows", () => {
    const contracts = [
      buildActionDataContract({
        id: "current-approved",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 12,
        volunteersCount: 4,
      }),
      buildActionDataContract({
        id: "previous-approved",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-02-20",
        createdAt: "2026-02-19T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 4,
        volunteersCount: 2,
      }),
    ];

    const zones = buildZones(contracts, 30, new Date("2026-04-10T00:00:00.000Z"));
    const paris10 = zones.find((zone) => zone.area === "10e");

    expect(zones.length).toBeGreaterThan(0);
    expect(paris10).toBeDefined();
    expect(paris10?.currentActions).toBe(1);
    expect(paris10?.previousActions).toBe(1);
    expect(paris10?.deltaKgAbsolute).toBe(8);
    expect(paris10?.urgency).toMatch(/critique|elevee|moderee/);
  });
});
