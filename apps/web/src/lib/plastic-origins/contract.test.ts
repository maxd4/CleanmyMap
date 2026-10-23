import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  filterPlasticOriginsObservationsByBounds,
  isPlasticOriginsObservationInBounds,
  resolvePlasticOriginsAvailableData,
  type PlasticOriginsObservation,
} from "./contract";

const observation = (coordinates: [number, number], availableSourceFields = ["date", "trash_type"]) => ({
  stableKey: "plastic-origins:2025:2",
  geometry: { type: "Point" as const, coordinates },
  properties: {
    sourceCampaignId: "campaign-1",
    observedAt: "2025-01-22T11:25:26.020",
    sourceDate: "2025-01-22 11:25:26.020",
    category: "Trash",
    method: "manual",
    move: "kayak",
    bank: "right",
    municipality: null,
    department: null,
    region: null,
    country: "France",
    riverName: null,
    availableSourceFields,
    source: {
      resourceId: "resource-1",
      sourceFile: "2025.csv",
      sourceRows: [2],
      sourceRecordCount: 1,
      exactDuplicateGroup: false,
    },
  },
}) satisfies PlasticOriginsObservation;

describe("Plastic Origins map contract", () => {
  it("keeps resource provenance in the dataset while internalizing its helper type", () => {
    const source = readFileSync(new URL("./contract.ts", import.meta.url), "utf8");

    expect(source).toContain("sourceResources: PlasticOriginsResourceAudit[]");
    expect(source).toContain("export type PlasticOriginsDataset");
    expect(source).not.toContain("export type PlasticOriginsResourceAudit");
  });

  it("keeps longitude/latitude order explicit and filters by viewport", () => {
    const inside = observation([2.35, 48.85]);
    const outside = observation([6.35, 46.85]);
    const bounds = { south: 48, west: 2, north: 49, east: 3 };

    expect(isPlasticOriginsObservationInBounds(inside, bounds)).toBe(true);
    expect(filterPlasticOriginsObservationsByBounds([inside, outside], bounds)).toEqual([inside]);
  });

  it("supports bounds crossing the antimeridian without changing source coordinates", () => {
    const observationAt179 = observation([179, 10]);
    const observationAtMinus179 = observation([-179, 10]);
    const bounds = { south: 0, west: 170, north: 20, east: -170 };

    expect(filterPlasticOriginsObservationsByBounds([observationAt179, observationAtMinus179], bounds)).toHaveLength(2);
  });

  it("does not present coordinate fields as extra available metadata", () => {
    const item = observation([2.35, 48.85], ["lat", "lon", "date", "river_name"]);

    expect(resolvePlasticOriginsAvailableData(item)).toEqual(["date", "river_name"]);
  });

  it("keeps viewport filtering bounded for a full-size historical layer", () => {
    const observations = Array.from({ length: 24_927 }, (_, index) => observation([
      index < 1_000 ? 2 : 100,
      index < 1_000 ? 48 : 0,
    ]));
    const startedAt = performance.now();
    const visible = filterPlasticOriginsObservationsByBounds(observations, {
      south: 40,
      west: -5,
      north: 52,
      east: 10,
    });

    expect(visible.length).toBeGreaterThan(0);
    expect(performance.now() - startedAt).toBeLessThan(2_500);
  });
});
