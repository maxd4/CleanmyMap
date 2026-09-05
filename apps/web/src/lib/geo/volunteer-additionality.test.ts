import { describe, expect, it } from "vitest";
import type { MunicipalCleaningServiceabilityZone } from "./municipal-cleaning-serviceability-contract";
import type {
  ParisPressureRiskContribution,
  ParisPressureRiskEstimate,
} from "./paris-pressure-risk-contract";
import type { ParisPressureZone } from "./paris-pressure-contract";
import { calculateVolunteerAdditionality } from "./volunteer-additionality";
import type { VolunteerAdditionalityInput } from "./volunteer-additionality-contract";

function zone(overrides: Partial<ParisPressureZone> = {}): ParisPressureZone {
  return {
    id: "zone-1",
    label: "Zone test",
    geographicLevel: "iris",
    arrondissementCode: "1",
    centroid: { latitude: 48.8566, longitude: 2.3522 },
    areaKm2: 0.05,
    signals: {
      residentPopulation: { population: 100, densityPerKm2: 100, normalized: 0.5 },
      transport: { stationCount: 1, annualEntrants: 100, normalized: 0.5 },
      tourism: { visitorAttendance: 100, tourismPresenceProxy: 0.5, normalized: 0.5 },
      publicActivity: { authorisedTerraces: 2, openAirMarkets: 1, otherPlaces: 1, normalized: 0.5 },
      cleanlinessPrior: { normalized: 0.8, rawObservations: 12, resolution: "iris", measuredAt: "2026-09-01" },
    },
    humanPressure: 0.5,
    ...overrides,
  };
}

function contribution(
  key: string,
  normalized: number,
  sourceReliability = 1,
): ParisPressureRiskContribution {
  return {
    key: key as ParisPressureRiskContribution["key"],
    label: key,
    normalized,
    weight: 0.1,
    points: normalized * 10,
    available: true,
    sourceFamilies: [],
    sourceReliability,
  };
}

function risk(overrides: Partial<ParisPressureRiskEstimate> = {}): ParisPressureRiskEstimate {
  const contributions = [
    contribution("residentialPressure", 0.6),
    contribution("eventPressure", 0.8),
    contribution("validatedWastePressure", 0.9),
  ];
  const score = {
    baseRisk: 80,
    cleanlinessCorrection: {
      normalizedPressure: 0.8,
      points: 0,
      available: true,
      resolution: "iris" as const,
      resolutionReason: "resolved" as const,
      sourceReliability: 1,
      explanation: "test",
    },
    finalRisk: 80,
    contributions,
  };
  return {
    zoneId: "zone-1",
    zoneLabel: "Zone test",
    predictionModelVersion: "paris-pressure-risk-v2",
    snapshot: {
      snapshotId: "snapshot-test",
      schemaVersion: "paris-pressure-v1",
      generatedAt: "2026-09-01",
      refreshedAt: "2026-09-01",
    },
    wasteRisk: 80,
    cigaretteButtRisk: 75,
    waste: { ...score, contributions },
    cigaretteButts: { ...score, contributions },
    confidence: {
      waste: { dataCompleteness: 1, sourceCompleteness: 1, cleanlinessCorrectionCompleteness: 1, cleanlinessCorrectionSourceReliability: 1, score: 1, level: "high", availableFactors: 3, totalFactors: 3, missingFactors: [] },
      cigaretteButts: { dataCompleteness: 1, sourceCompleteness: 1, cleanlinessCorrectionCompleteness: 1, cleanlinessCorrectionSourceReliability: 1, score: 1, level: "high", availableFactors: 3, totalFactors: 3, missingFactors: [] },
    },
    provenance: [],
    contextProvenance: [],
    provenanceGaps: [],
    ...overrides,
  };
}

function municipal(overrides: Partial<MunicipalCleaningServiceabilityZone> = {}): MunicipalCleaningServiceabilityZone {
  const evidence = { sourceEvidenceIds: ["test"], resolution: "resolved" as const, confidence: 1 };
  return {
    id: "zone-1",
    label: "Zone test",
    geographicLevel: "iris",
    spatialExtent: { centroid: { latitude: 48.8566, longitude: 2.3522 }, areaKm2: 0.05, radiusM: 125, radiusBasis: "equivalent_circle" },
    municipalCleaningServiceLevel: 20,
    municipalCleaningServiceLevelBasis: "documented_coverage",
    municipalCleaningServiceLevelEvidence: evidence,
    geometryServiceabilityProxy: 20,
    geometryServiceabilityProxyEvidence: evidence,
    mechanizedCleaningAccessibility: 20,
    mechanizedAccessibilityBasis: "geometry_proxy",
    manualCleaningLikely: { value: true, basis: "geometric_inference", evidence },
    documentedCleaningFrequency: null,
    documentedCleaningFrequencyResolution: "unknown",
    surfaceClasses: [{ surfaceClass: "stairs", featureCount: 2, share: 1 }],
    sourceEvidence: [],
    observedAt: null,
    refreshedAt: "2026-09-01",
    serviceabilityConfidence: {
      score: 1,
      level: "high",
      dataCompleteness: 1,
      sourceCompleteness: 1,
      availableSignals: ["municipalCleaningServiceLevel", "geometryServiceabilityProxy", "mechanizedCleaningAccessibility", "manualCleaning"],
      missingSignals: [],
      signalConfidence: {
        municipalCleaningServiceLevel: evidence,
        geometryServiceabilityProxy: evidence,
        mechanizedCleaningAccessibility: evidence,
        manualCleaning: evidence,
      },
    },
    ...overrides,
  };
}

function input(overrides: Partial<VolunteerAdditionalityInput> = {}): VolunteerAdditionalityInput {
  return {
    zone: zone(),
    risk: risk(),
    municipalCleaning: municipal(),
    volunteerSafety: { status: "safe", suitability: 1, confidence: 1, evidenceIds: ["safe-test"] },
    ...overrides,
  };
}

describe("volunteer additionality", () => {
  it("est moins prioritaire dans une rue très polluée nettoyée quotidiennement", () => {
    const daily = calculateVolunteerAdditionality(input({
      municipalCleaning: municipal({
        municipalCleaningServiceLevel: 100,
        municipalCleaningServiceLevelBasis: "documented_frequency",
        documentedCleaningFrequency: { visitsPerWeek: 14, label: "quotidien", sourceEvidenceIds: ["frequency"] },
      }),
    }));
    const stairs = calculateVolunteerAdditionality(input({
      municipalCleaning: municipal({ municipalCleaningServiceLevel: null, municipalCleaningServiceLevelBasis: "unknown", municipalCleaningServiceLevelEvidence: { sourceEvidenceIds: [], resolution: "unknown", confidence: 0 } }),
    }));
    expect(daily.volunteerAdditionality).toBeLessThan(stairs.volunteerAdditionality);
    expect(daily.municipalCleaning.documentedFrequency.normalized).toBe(1);
  });

  it("valorise une zone complexe mais sûre sans bonus automatique de catégorie", () => {
    const complex = calculateVolunteerAdditionality(input());
    const standard = calculateVolunteerAdditionality(input({
      municipalCleaning: municipal({
        surfaceClasses: [{ surfaceClass: "standard_sidewalk", featureCount: 1, share: 1 }],
      }),
    }));
    expect(complex.volunteerAdditionality).toBeGreaterThan(standard.volunteerAdditionality);
    expect(complex.adjustments.bonuses.join(" ")).toContain("influence limitée");
  });

  it("reconnaît un pied d'arbre ou un mobilier dense comme complexité contextuelle", () => {
    const tree = calculateVolunteerAdditionality(input({
      risk: risk({ cigaretteButtRisk: 92 }),
      municipalCleaning: municipal({
        surfaceClasses: [{ surfaceClass: "tree_surround", featureCount: 4, share: 1 }],
      }),
    }));
    const furniture = calculateVolunteerAdditionality(input({
      municipalCleaning: municipal({
        surfaceClasses: [{ surfaceClass: "street_furniture_cluster", featureCount: 8, share: 1 }],
      }),
    }));
    expect(tree.pollutionRisk.cigaretteButtRisk).toBe(92);
    expect(tree.municipalCleaning.surfaceComplexity.normalized).toBeGreaterThan(0.5);
    expect(furniture.municipalCleaning.surfaceComplexity.normalized).toBeGreaterThan(0.5);
    expect(tree.volunteerAdditionality).toBeGreaterThan(0);
    expect(furniture.volunteerAdditionality).toBeGreaterThan(0);
  });

  it("exclut une zone dangereuse même si son additionnalité théorique est forte", () => {
    const result = calculateVolunteerAdditionality(input({
      volunteerSafety: { status: "excluded", suitability: 1, confidence: 1, exclusionReasons: ["active_roadway"] },
    }));
    expect(result.volunteerAdditionality).toBe(0);
    expect(result.eligible).toBe(false);
    expect(result.volunteerSuitability.value).toBe(0);
    expect(result.explanation).not.toContain("Les agents municipaux ne nettoient pas");
  });

  it("ne transforme pas l'absence de couverture en absence de nettoyage", () => {
    const unknown = calculateVolunteerAdditionality(input({ municipalCleaning: null }));
    expect(unknown.municipalCleaning.lowRelativeCoverage.raw).toBeNull();
    expect(unknown.municipalCleaning.lowRelativeCoverage.effective).toBe(0.5);
    expect(unknown.adjustments.maluses.join(" ")).toContain("non documentée");
  });

  it("réduit le score lorsqu'un marché vient de fermer avec remise en état prévue", () => {
    const withoutOperation = calculateVolunteerAdditionality(input());
    const withOperation = calculateVolunteerAdditionality(input({
      municipalInterventions: [{ type: "market_cleanup", timing: "imminent", strength: 1, confidence: 1, evidenceIds: ["market-cleanup"] }],
    }));
    expect(withOperation.volunteerAdditionality).toBeLessThan(withoutOperation.volunteerAdditionality);
    expect(withOperation.municipalCleaning.scheduledInterventionPenalty).toBe(0.85);
  });

  it("conserve séparément les événements, les prédictions et le signalement observé", () => {
    const result = calculateVolunteerAdditionality(input());
    expect(result.pollutionRisk.recentEvents.evidenceKind).toBe("recent_event");
    expect(result.pollutionRisk.observedReports.evidenceKind).toBe("observed_report");
    expect(result.pollutionRisk.predictedSignals.evidenceKind).toBe("prediction");
    expect(result.adjustments.bonuses.join(" ")).toContain("signalement réellement observé");
  });

  it("borne toujours le score et limite l'influence d'un risque peu fiable", () => {
    const result = calculateVolunteerAdditionality(input({
      risk: risk({
        wasteRisk: 100,
        cigaretteButtRisk: 100,
        confidence: {
          waste: { dataCompleteness: 1, sourceCompleteness: 0.1, cleanlinessCorrectionCompleteness: 1, cleanlinessCorrectionSourceReliability: 0.1, score: 0.1, level: "low", availableFactors: 1, totalFactors: 3, missingFactors: [] },
          cigaretteButts: { dataCompleteness: 1, sourceCompleteness: 0.1, cleanlinessCorrectionCompleteness: 1, cleanlinessCorrectionSourceReliability: 0.1, score: 0.1, level: "low", availableFactors: 1, totalFactors: 3, missingFactors: [] },
        },
      }),
    }));
    expect(result.volunteerAdditionality).toBeGreaterThan(0);
    expect(result.volunteerAdditionality).toBeLessThan(100);
    expect(result.pollutionRisk.value).toBeLessThan(1);
  });
});
