import { describe, expect, it } from "vitest";
import {
  buildMunicipalCleaningServiceabilitySnapshot,
  deriveMunicipalCleaningServiceability,
  materializeMunicipalCleaningZones,
} from "./municipal-cleaning-serviceability";
import type {
  CleaningSourceEvidence,
  MunicipalCleaningRawZone,
  MunicipalCleaningZoneSeed,
} from "./municipal-cleaning-serviceability-contract";

const refreshedAt = "2026-09-04T00:00:00.000Z";
const seed: MunicipalCleaningZoneSeed = {
  id: "iris-a",
  label: "Zone A",
  geographicLevel: "iris",
  centroid: { latitude: 48.86, longitude: 2.35 },
  areaKm2: 0.04,
};

function evidence(
  id: string,
  evidenceType: CleaningSourceEvidence["evidenceType"],
): CleaningSourceEvidence {
  return {
    id,
    evidenceType,
    publisher: "Ville de Paris",
    dataset: "Snapshot de test",
    url: "https://opendata.paris.fr/",
    license: "Licence Ouverte Etalab",
    datasetVersion: "test-2026",
    observedAt: "2026-09-04",
    refreshedAt,
    geographicLevel: "site",
    status: "available",
    notes: [],
  };
}

function raw(overrides: Partial<MunicipalCleaningRawZone> = {}): MunicipalCleaningRawZone {
  return {
    ...seed,
    surfaceFeatureCounts: { standard_sidewalk: 10 },
    sourceEvidence: [evidence("geometry", "geometry_proxy")],
    ...overrides,
  };
}

describe("municipal cleaning serviceability", () => {
  it("uses an explicit frequency as the serviceability source of truth", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        surfaceFeatureCounts: { stairs: 10 },
        documentedCleaningFrequency: {
          visitsPerWeek: 7,
          label: "nettoiement documenté hebdomadaire",
          sourceEvidenceIds: ["frequency"],
        },
        sourceEvidence: [
          evidence("geometry", "geometry_proxy"),
          evidence("frequency", "cleaning_frequency"),
        ],
      }),
      refreshedAt,
    );

    expect(zone.municipalCleaningServiceability).toBe(50);
    expect(zone.serviceabilityBasis).toBe("documented_frequency");
    expect(zone.mechanizedCleaningAccessibility).toBe(10);
    expect(zone.manualCleaningLikely).toEqual({
      value: true,
      basis: "geometric_inference",
    });
    expect(zone.serviceabilityConfidence.level).toBe("medium");
    expect(zone.documentedCleaningFrequency?.visitsPerWeek).toBe(7);
  });

  it("keeps ordinary sidewalks more serviceable than stairs without calling stairs uncleaned", () => {
    const sidewalk = deriveMunicipalCleaningServiceability(seed, raw(), refreshedAt);
    const stairs = deriveMunicipalCleaningServiceability(
      seed,
      raw({ surfaceFeatureCounts: { stairs: 10 } }),
      refreshedAt,
    );

    expect(sidewalk.municipalCleaningServiceability).toBe(100);
    expect(stairs.municipalCleaningServiceability).toBe(10);
    expect(stairs.manualCleaningLikely.value).toBe(true);
    expect(stairs.serviceabilityBasis).toBe("geometry_proxy");
  });

  it("combines overlapping surface classes and obstacle density deterministically", () => {
    const input = raw({
      surfaceFeatureCounts: {
        standard_sidewalk: 2,
        tree_surround: 1,
        street_furniture_cluster: 1,
      },
      obstacleCount: 5,
    });
    const first = deriveMunicipalCleaningServiceability(seed, input, refreshedAt);
    const second = deriveMunicipalCleaningServiceability(seed, input, refreshedAt);

    expect(first).toEqual(second);
    expect(first.surfaceClasses).toEqual([
      { surfaceClass: "standard_sidewalk", featureCount: 2, share: 0.5 },
      { surfaceClass: "tree_surround", featureCount: 1, share: 0.25 },
      { surfaceClass: "street_furniture_cluster", featureCount: 1, share: 0.25 },
    ]);
    expect(first.mechanizedCleaningAccessibility).toBe(65);
    expect(first.spatialExtent.radiusBasis).toBe("equivalent_circle");
    expect(first.spatialExtent.radiusM).toBeGreaterThan(0);
  });

  it("returns explicit unknowns when no cleaning or geometry signal exists", () => {
    const zone = deriveMunicipalCleaningServiceability(seed, undefined, refreshedAt);
    expect(zone.municipalCleaningServiceability).toBeNull();
    expect(zone.mechanizedCleaningAccessibility).toBeNull();
    expect(zone.manualCleaningLikely).toEqual({ value: null, basis: "unknown" });
    expect(zone.documentedCleaningFrequency).toBeNull();
    expect(zone.serviceabilityConfidence).toMatchObject({
      score: 0,
      level: "unknown",
      sourceCompleteness: 0,
    });
  });

  it("does not promote an unproven frequency into a documented fact", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        documentedCleaningFrequency: {
          visitsPerWeek: 10,
          label: null,
          sourceEvidenceIds: [],
        },
        sourceEvidence: [],
      }),
      refreshedAt,
    );
    expect(zone.documentedCleaningFrequency).toBeNull();
    expect(zone.serviceabilityBasis).toBe("geometry_proxy");
    expect(zone.serviceabilityConfidence.sourceCompleteness).toBe(0);
    expect(zone.serviceabilityConfidence.level).toBe("unknown");
  });

  it("preserves documented manual coverage as evidence instead of geometric inference", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        documentedManualCleaning: true,
        documentedManualCleaningEvidenceIds: ["coverage"],
        sourceEvidence: [evidence("coverage", "municipal_coverage")],
      }),
      refreshedAt,
    );

    expect(zone.manualCleaningLikely).toEqual({
      value: true,
      basis: "documented",
    });
    expect(zone.sourceEvidence[0]?.id).toBe("coverage");
  });

  it("keeps the layer aligned to every base zone without fabricating a spot", () => {
    const snapshot = buildMunicipalCleaningServiceabilitySnapshot({
      snapshotId: "test",
      generatedAt: refreshedAt,
      refreshedAt,
      baseZones: [seed, { ...seed, id: "iris-b", label: "Zone B" }],
      rawZones: [raw()],
      sources: [evidence("geometry", "geometry_proxy")],
    });
    const materialized = materializeMunicipalCleaningZones(snapshot, [
      seed,
      { ...seed, id: "iris-b", label: "Zone B" },
      { ...seed, id: "iris-c", label: "Zone C" },
    ]);

    expect(materialized.zones).toHaveLength(3);
    expect(materialized.coverage).toMatchObject({
      zoneCount: 3,
      complete: false,
      status: "partial",
    });
    expect(materialized.zones.find((zone) => zone.id === "iris-c")?.municipalCleaningServiceability).toBeNull();
    expect(materialized.zones.every((zone) => zone.spatialExtent.centroid)).toBe(true);
  });
});
