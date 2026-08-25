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

  it("keeps collection metrics and territorial priority unchanged when spots are present", () => {
    const actionContracts = [
      buildActionDataContract({
        id: "priority-action",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 10,
        volunteersCount: 3,
      }),
    ];
    const nonActionContracts = [
      buildActionDataContract({
        id: "artificial-spot",
        type: "spot",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 999,
        volunteersCount: 99,
      }),
      buildActionDataContract({
        id: "artificial-clean-place",
        type: "clean_place",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 888,
        volunteersCount: 88,
      }),
    ];

    expect(
      buildZones(
        [...actionContracts, ...nonActionContracts],
        30,
        new Date("2026-04-10T00:00:00.000Z"),
      ),
    ).toEqual(
      buildZones(actionContracts, 30, new Date("2026-04-10T00:00:00.000Z")),
    );
  });

  it("keeps pending actions only in moderation metrics when available", () => {
    const contracts = [
      buildActionDataContract({
        id: "approved-action",
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T00:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 10,
        volunteersCount: 2,
      }),
      buildActionDataContract({
        id: "pending-action",
        type: "action",
        status: "pending",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-01T00:00:00.000Z",
        locationLabel: "Paris 10e",
        latitude: 48.87,
        longitude: 2.35,
        wasteKg: 999,
        volunteersCount: 99,
      }),
    ];

    const available = buildZones(
      contracts,
      30,
      new Date("2026-04-10T00:00:00.000Z"),
      "available",
    );
    const unavailable = buildZones(
      contracts,
      30,
      new Date("2026-04-10T00:00:00.000Z"),
      "unavailable",
    );
    const availableZone = available.find((zone) => zone.area === "10e");
    const unavailableZone = unavailable.find((zone) => zone.area === "10e");

    expect(availableZone?.currentActions).toBe(1);
    expect(availableZone?.currentKg).toBe(10);
    expect(availableZone?.currentModerationDelayDays).toBe(9);
    expect(unavailableZone?.currentActions).toBe(1);
    expect(unavailableZone?.currentKg).toBe(10);
    expect(unavailableZone?.currentModerationDelayDays).toBeNull();
  });

  it("keeps the territorial result capped at 12 zones", () => {
    const contracts = Array.from({ length: 20 }, (_, index) =>
      buildActionDataContract({
        id: `zone-${index}`,
        type: "action",
        status: "approved",
        source: "test",
        observedAt: "2026-04-09",
        createdAt: "2026-04-08T10:00:00.000Z",
        locationLabel: `Paris ${index + 1}e`,
        latitude: 48.85 + index * 0.001,
        longitude: 2.3 + index * 0.001,
        wasteKg: index + 1,
        volunteersCount: 1,
      }),
    );

    expect(
      buildZones(contracts, 30, new Date("2026-04-10T00:00:00.000Z")),
    ).toHaveLength(12);
  });
});
