import { describe, expect, it } from "vitest";
import {
  buildParisHeatmapPilot,
  getParisHeatmapPilotReferenceScores,
  groupParisHeatmapPilotMicroPlaces,
  splitParisHeatmapPilotWays,
  type ParisHeatmapPilotSnapshot,
} from "./paris-heatmap-pilot";

describe("paris predictive polarized heatmap pilot", () => {
  it("splits the versioned OSM ways into deterministic short segments", () => {
    const first = splitParisHeatmapPilotWays();
    const second = splitParisHeatmapPilotWays();

    expect(first.length).toBeGreaterThan(100);
    expect(first.map((segment) => segment.id)).toEqual(second.map((segment) => segment.id));
    expect(new Set(first.map((segment) => segment.id)).size).toBe(first.length);
    expect(Math.max(...first.map((segment) => segment.lengthKm))).toBeLessThanOrEqual(0.042001);
    expect(first.every((segment) => segment.irisReferenceId)).toBe(true);
  });

  it.each([
    ["mixed", "mixed"],
    ["cigaretteButts", "cigaretteButts"],
    ["waste", "waste"],
  ] as const)("publishes the %s polarized mode without neutral UI modes", (mode, expectedMode) => {
    const layer = buildParisHeatmapPilot({ mode });

    expect(layer.mode).toBe(expectedMode);
    expect(layer.status).toBe("predicted");
    expect(layer.segments.every((segment) => segment.status === "predicted")).toBe(true);
    expect(layer.segments.every((segment) => segment.scores.cigaretteButts !== null && segment.scores.waste !== null)).toBe(true);
    expect(layer.warnings.join(" ")).toContain("coefficients socio-démographiques");
  });

  it("preserves each invisible IRIS reference mean after coefficient clipping", () => {
    const layer = buildParisHeatmapPilot();
    const references = getParisHeatmapPilotReferenceScores();
    const byZone = new Map<string, typeof layer.segments>();

    for (const segment of layer.segments) {
      const current = byZone.get(segment.irisReferenceId!) ?? [];
      current.push(segment);
      byZone.set(segment.irisReferenceId!, current);
    }

    for (const [zoneId, segments] of byZone) {
      const totalLength = segments.reduce((sum, segment) => sum + segment.lengthKm, 0);
      const weighted = (key: "cigaretteButts" | "waste") => segments.reduce(
        (sum, segment) => sum + (segment.scores[key] ?? 0) * segment.lengthKm,
        0,
      ) / totalLength;
      expect(weighted("cigaretteButts")).toBeCloseTo(references.get(zoneId)!.cigaretteButts, 4);
      expect(weighted("waste")).toBeCloseTo(references.get(zoneId)!.waste, 4);
    }
  });

  it("deduplicates micro-places and groups them at low zoom", () => {
    const layer = buildParisHeatmapPilot();
    const keys = layer.microPlaces.map((place) => `${place.family}:${place.name.toLocaleLowerCase()}:${place.coordinate.join(":")}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(groupParisHeatmapPilotMicroPlaces(layer.microPlaces, 12).length).toBeLessThanOrEqual(layer.microPlaces.length);
    expect(groupParisHeatmapPilotMicroPlaces(layer.microPlaces, 17)).toHaveLength(layer.microPlaces.length);
  });

  it("does not show micro-points when the street snapshot cannot be mapped", () => {
    const unavailable = buildParisHeatmapPilot({
      snapshot: {
        schemaVersion: 1,
        snapshotId: "empty",
        retrievedAt: "2026-11-01T00:00:00.000Z",
        license: "ODbL-1.0",
        source: { provider: "OSM", endpoint: "offline", selection: "test" },
        tiles: [],
        ways: [{ id: "way-1", highway: "footway", name: "Test", footAccess: "type", sourceUrl: "offline", geometry: [[48.85, 2.35], [48.8501, 2.3501]], referenceZoneIds: [null] }],
        pois: [{ id: "node-1", lat: 48.85, lon: 2.35, name: "Test", kind: "bar" }],
        zoneReferences: [],
      } as ParisHeatmapPilotSnapshot,
    });

    expect(unavailable.status).toBe("unavailable");
    expect(unavailable.segments[0]?.status).toBe("unavailable");
    expect(unavailable.microPlaces).toEqual([]);
    expect(unavailable.warnings[0]).toContain("tronçons OSM");
  });
});
