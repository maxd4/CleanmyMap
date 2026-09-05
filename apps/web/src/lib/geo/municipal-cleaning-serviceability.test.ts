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
  status: CleaningSourceEvidence["status"] = "available",
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
    status,
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
  it("sépare une fréquence municipale documentée du proxy géométrique", () => {
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

    expect(zone.municipalCleaningServiceLevel).toBe(50);
    expect(zone.municipalCleaningServiceLevelBasis).toBe("documented_frequency");
    expect(zone.geometryServiceabilityProxy).toBe(10);
    expect(zone.mechanizedCleaningAccessibility).toBe(10);
    expect(zone.manualCleaningLikely).toMatchObject({
      value: true,
      basis: "geometric_inference",
    });
  });

  it("n'invente aucun niveau de couverture à partir d'escaliers", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({ surfaceFeatureCounts: { stairs: 10 } }),
      refreshedAt,
    );

    expect(zone.municipalCleaningServiceLevel).toBeNull();
    expect(zone.municipalCleaningServiceLevelBasis).toBe("unknown");
    expect(zone.geometryServiceabilityProxy).toBe(10);
    expect(zone.manualCleaningLikely).toEqual({
      value: true,
      basis: "geometric_inference",
      evidence: expect.objectContaining({ resolution: "resolved" }),
    });
  });

  it("laisse le nettoyage manuel inconnu pour un trottoir accessible", () => {
    const zone = deriveMunicipalCleaningServiceability(seed, raw(), refreshedAt);

    expect(zone.geometryServiceabilityProxy).toBe(100);
    expect(zone.municipalCleaningServiceLevel).toBeNull();
    expect(zone.manualCleaningLikely).toMatchObject({
      value: null,
      basis: "unknown",
    });
  });

  it("rejette une fréquence dont la preuve est unavailable", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        documentedCleaningFrequency: {
          visitsPerWeek: 10,
          label: null,
          sourceEvidenceIds: ["frequency"],
        },
        sourceEvidence: [evidence("frequency", "cleaning_frequency", "unavailable")],
      }),
      refreshedAt,
    );

    expect(zone.documentedCleaningFrequency).toBeNull();
    expect(zone.documentedCleaningFrequencyResolution).toBe("unknown");
    expect(zone.municipalCleaningServiceLevel).toBeNull();
  });

  it("accepte une preuve partial avec une confiance réduite", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        documentedCleaningFrequency: {
          visitsPerWeek: 10,
          label: null,
          sourceEvidenceIds: ["frequency"],
        },
        sourceEvidence: [evidence("frequency", "cleaning_frequency", "partial")],
      }),
      refreshedAt,
    );

    expect(zone.documentedCleaningFrequency?.visitsPerWeek).toBe(10);
    expect(zone.serviceabilityConfidence.signalConfidence.municipalCleaningServiceLevel.confidence).toBe(0.7);
    expect(zone.serviceabilityConfidence.level).toBe("low");
  });

  it("ne documente pas un nettoyage manuel dont la preuve est unavailable", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        documentedManualCleaning: true,
        documentedManualCleaningEvidenceIds: ["manual"],
        sourceEvidence: [evidence("manual", "manual_cleaning", "unavailable")],
      }),
      refreshedAt,
    );

    expect(zone.manualCleaningLikely).toMatchObject({ value: null, basis: "unknown" });
  });

  it("expose un conflit de fréquences au lieu de prendre la première", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        documentedCleaningFrequency: null,
        documentedCleaningFrequencyResolution: "conflict",
        sourceEvidence: [
          evidence("frequency-a", "cleaning_frequency"),
          evidence("frequency-b", "cleaning_frequency"),
        ],
      }),
      refreshedAt,
    );

    expect(zone.documentedCleaningFrequency).toBeNull();
    expect(zone.documentedCleaningFrequencyResolution).toBe("conflict");
    expect(zone.municipalCleaningServiceLevelBasis).toBe("unknown");
  });

  it("expose un conflit de valeurs manuelles au lieu de choisir arbitrairement", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        documentedManualCleaning: null,
        documentedManualCleaningResolution: "conflict",
        sourceEvidence: [evidence("manual-a", "manual_cleaning"), evidence("manual-b", "manual_cleaning")],
      }),
      refreshedAt,
    );

    expect(zone.manualCleaningLikely).toMatchObject({ value: null, basis: "conflict" });
  });

  it("ne confond pas une accessibilité mécanisée documentée avec une couverture municipale", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        surfaceFeatureCounts: undefined,
        mechanizedCleaningAccessibility: 0.9,
        mechanizedCleaningAccessibilityEvidenceIds: ["access"],
        sourceEvidence: [evidence("access", "mechanized_accessibility")],
      }),
      refreshedAt,
    );

    expect(zone.mechanizedCleaningAccessibility).toBe(90);
    expect(zone.mechanizedAccessibilityBasis).toBe("source_documented");
    expect(zone.municipalCleaningServiceLevel).toBeNull();
    expect(zone.geometryServiceabilityProxy).toBeNull();
  });

  it("accepte un niveau municipal direct uniquement avec une preuve de couverture adaptée", () => {
    const zone = deriveMunicipalCleaningServiceability(
      seed,
      raw({
        surfaceFeatureCounts: undefined,
        documentedMunicipalCleaningServiceLevel: 30,
        documentedMunicipalCleaningServiceLevelEvidenceIds: ["coverage"],
        sourceEvidence: [evidence("coverage", "municipal_coverage")],
      }),
      refreshedAt,
    );

    expect(zone.municipalCleaningServiceLevel).toBe(30);
    expect(zone.municipalCleaningServiceLevelBasis).toBe("documented_coverage");
    expect(zone.geometryServiceabilityProxy).toBeNull();
  });

  it("conserve unknown lors de la matérialisation et ne crée pas de couverture", () => {
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
    expect(materialized.coverage).toMatchObject({ zoneCount: 3, complete: false, status: "partial" });
    expect(materialized.zones.find((zone) => zone.id === "iris-c")?.municipalCleaningServiceLevel).toBeNull();
    expect(materialized.zones.find((zone) => zone.id === "iris-c")?.geometryServiceabilityProxy).toBeNull();
  });
});
