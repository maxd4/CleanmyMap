import { describe, expect, it } from "vitest";
import pilotData from "@/../data/geospatial/paris-heatmap-pilot.json";
import pressureSnapshot from "@/../data/geospatial/paris-pressure-snapshot.json";
import {
  buildParisHeatmapPilot,
  getParisHeatmapPilotReferenceScores,
  groupParisHeatmapPilotMicroPlaces,
  splitParisHeatmapPilotWays,
  type ParisHeatmapPilotSnapshot,
} from "./paris-heatmap-pilot";
import { pointInParisPressureGeometry } from "./paris-pressure-geometry-core.mjs";

describe("paris predictive polarized heatmap pilot", () => {
  it("splits the versioned OSM ways into deterministic short segments", () => {
    const first = splitParisHeatmapPilotWays();
    const second = splitParisHeatmapPilotWays();

    expect(first.length).toBeGreaterThan(100);
    expect(first.map((segment) => segment.id)).toEqual(second.map((segment) => segment.id));
    expect(new Set(first.map((segment) => segment.id)).size).toBe(first.length);
    expect(Math.max(...first.map((segment) => segment.lengthKm))).toBeLessThanOrEqual(0.042001);
    expect(first.every((segment) => segment.irisReferenceId)).toBe(true);
    expect(first.every((segment) => segment.id.startsWith("iris-clipped-v1:"))).toBe(true);
  });

  it("keeps every published segment inside exactly one real 5e/6e IRIS polygon", () => {
    const zones = pressureSnapshot.zones.filter((zone) =>
      ["75105", "75106"].includes(zone.arrondissementCode) && zone.geometry,
    );
    const segments = splitParisHeatmapPilotWays();

    expect(zones.length).toBeGreaterThan(0);
    expect(segments.every((segment) => {
      const matches = zones.filter((zone) => pointInParisPressureGeometry(
        { latitude: segment.midpoint[0], longitude: segment.midpoint[1] },
        zone.geometry,
      ));
      return matches.length === 1 && matches[0]?.id === segment.irisReferenceId;
    })).toBe(true);
  });

  it("preserves canonical IRIS provenance while keeping network provenance separate", () => {
    const layer = buildParisHeatmapPilot();
    const transport = layer.source.scores.provenance.find((source) => source.family === "transport");
    const cleanliness = layer.source.scores.provenance.find((source) => source.family === "cleanliness");

    expect(layer.source.network.snapshotId).toBe(pilotData.snapshotId);
    expect(layer.source.network.provider).toBe(pilotData.source.provider);
    expect(layer.source.scores.snapshotId).toBe(pressureSnapshot.snapshotId);
    expect(layer.source.scores.generatedAt).toBe(pressureSnapshot.generatedAt);
    expect(layer.source.scores.refreshedAt).toBe(pressureSnapshot.refreshedAt);
    expect(layer.source.scores.provenance).toEqual(pressureSnapshot.sources);
    expect(transport).toMatchObject({
      publisher: "RATP / Île-de-France Mobilités",
      datasetVersion: "2021",
      status: "partial",
    });
    expect(cleanliness).toMatchObject({
      publisher: "Ville de Paris / partenaires publics",
      status: "partial",
      geographicLevel: "arrondissement",
    });
  });

  it("applique indépendamment le bar aux mégots et le fast-food aux déchets", () => {
    const baseZone = pressureSnapshot.zones.find((zone) => zone.arrondissementCode === "75105")!;
    const layer = buildParisHeatmapPilot({
      snapshot: {
        schemaVersion: 2,
        snapshotId: "micro-place-test",
        retrievedAt: "2026-11-02T00:00:00.000Z",
        license: "ODbL-1.0",
        geometryVersion: "test",
        identifierVersion: "test",
        pressureSnapshotId: pressureSnapshot.snapshotId,
        pressureGeneratedAt: pressureSnapshot.generatedAt,
        pressureRefreshedAt: pressureSnapshot.refreshedAt,
        pressureSources: pressureSnapshot.sources,
        source: { provider: "OSM", endpoint: "offline", selection: "test" },
        tiles: [],
        ways: [{
          id: "way-micro-place-test",
          highway: "footway",
          name: "Test",
          footAccess: "type",
          sourceUrl: "offline",
          geometry: [[48.85, 2.35], [48.8501, 2.3501]],
          referenceZoneIds: [baseZone.id],
        }],
        pois: [
          { id: "bar-test", lat: 48.85005, lon: 2.35005, name: "Bar test", kind: "bar" },
          { id: "fast-food-test", lat: 48.85005, lon: 2.35005, name: "Fast-food test", kind: "fast_food" },
        ],
        zoneReferences: [{ ...baseZone, geometry: null, urbanMorphology: null }] as unknown as ParisHeatmapPilotSnapshot["zoneReferences"],
      } as ParisHeatmapPilotSnapshot,
    });
    const segment = layer.segments[0]!;

    expect(segment.appliedMicroPlaceInfluences.cigaretteButts?.microPlace.kind).toBe("bar");
    expect(segment.appliedMicroPlaceInfluences.waste?.microPlace.kind).toBe("fast_food");
    expect(segment.appliedMicroPlaceInfluences.cigaretteButts?.status).toBe("hypothesis");
    expect(segment.appliedMicroPlaceInfluences.waste?.status).toBe("hypothesis");
    expect(segment.appliedMicroPlaceInfluences.cigaretteButts?.attenuatedCoefficient).toBeCloseTo(3.35, 5);
    expect(segment.appliedMicroPlaceInfluences.waste?.attenuatedCoefficient).toBeCloseTo(3.65, 5);
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
