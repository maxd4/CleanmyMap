import {
  MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION,
  MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION,
  type CleaningEvidenceType,
  type CleaningFrequency,
  type CleaningSignalEvidence,
  type CleaningSignalResolution,
  type CleaningSourceEvidence,
  type CleaningSurfaceClass,
  type CleaningSurfaceObservation,
  type MunicipalCleaningRawZone,
  type MunicipalCleaningServiceabilitySnapshot,
  type MunicipalCleaningServiceabilityZone,
  type MunicipalCleaningZoneSeed,
  type ServiceabilityConfidence,
} from "./municipal-cleaning-serviceability-contract.ts";

export const MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG = {
  predictionModelVersion: MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION,
  weights: {
    surfaceAccessibility: 0.75,
    obstacleAccessibility: 0.25,
  },
  normalization: {
    maximumDocumentedVisitsPerWeek: 14,
    maximumObstaclesPerKm2: 250,
  },
  surfaceAccessibility: {
    standard_sidewalk: 1,
    pedestrian_area: 0.55,
    stairs: 0.1,
    tree_surround: 0.35,
    planter_edge: 0.35,
    street_furniture_cluster: 0.45,
    barrier_edge: 0.3,
    bridge_or_footbridge: 0.45,
    underpass: 0.25,
    embankment: 0.2,
    other_complex_public_space: 0.35,
  },
  manualCleaning: {
    maximumMechanizedAccessibility: 0.3,
    minimumObstaclePressure: 0.65,
  },
  confidence: {
    directEvidence: 1,
    geometryProxy: 0.55,
    sourceReliability: { available: 1, partial: 0.7, unavailable: 0 },
    levelThresholds: { medium: 0.4, high: 0.75 },
  },
} as const;

const SURFACE_CLASSES = Object.keys(
  MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.surfaceAccessibility,
) as CleaningSurfaceClass[];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function equivalentRadiusM(areaKm2: number | null): number | null {
  if (areaKm2 === null || areaKm2 <= 0) return null;
  return round(Math.sqrt((areaKm2 * 1_000_000) / Math.PI));
}

function normalizeFrequency(visitsPerWeek: number): number {
  return clamp01(
    visitsPerWeek /
      MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.normalization
        .maximumDocumentedVisitsPerWeek,
  );
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)].sort((left, right) => left.localeCompare(right));
}

function signalEvidence(
  evidence: CleaningSourceEvidence[],
  ids: string[],
  evidenceType: CleaningEvidenceType,
  resolution: CleaningSignalResolution = "resolved",
  confidenceCap = 1,
): CleaningSignalEvidence {
  const sourceEvidenceIds = uniqueIds(ids);
  if (resolution !== "resolved" || sourceEvidenceIds.length === 0) {
    return { sourceEvidenceIds, resolution, confidence: 0 };
  }
  const matching = sourceEvidenceIds.map((id) =>
    evidence.find(
      (item) => item.id === id && item.evidenceType === evidenceType,
    ),
  );
  if (matching.some((item) => !item || item.status === "unavailable")) {
    return { sourceEvidenceIds, resolution: "unknown", confidence: 0 };
  }
  const sourceConfidence = matching.reduce(
    (sum, item) =>
      sum +
      MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.confidence
        .sourceReliability[item!.status],
    0,
  ) / matching.length;
  return {
    sourceEvidenceIds,
    resolution: "resolved",
    confidence: round(Math.min(confidenceCap, sourceConfidence)),
  };
}

function evidenceIdsForType(
  evidence: CleaningSourceEvidence[],
  evidenceType: CleaningEvidenceType,
): string[] {
  return evidence
    .filter((item) => item.evidenceType === evidenceType)
    .map((item) => item.id);
}

function buildSurfaceClasses(
  counts: MunicipalCleaningRawZone["surfaceFeatureCounts"],
): CleaningSurfaceObservation[] {
  const known = SURFACE_CLASSES.map((surfaceClass) => ({
    surfaceClass,
    featureCount: finiteOrNull(counts?.[surfaceClass]),
  })).filter(
    (item): item is { surfaceClass: CleaningSurfaceClass; featureCount: number } =>
      item.featureCount !== null && item.featureCount > 0,
  );
  const total = known.reduce((sum, item) => sum + item.featureCount, 0);
  if (total <= 0) return [];
  return known.map((item) => ({
    surfaceClass: item.surfaceClass,
    featureCount: item.featureCount,
    share: round(item.featureCount / total),
  }));
}

function surfaceAccessibility(
  surfaceClasses: CleaningSurfaceObservation[],
): number | null {
  if (surfaceClasses.length === 0) return null;
  return surfaceClasses.reduce(
    (sum, item) =>
      sum +
      item.share *
        MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.surfaceAccessibility[
          item.surfaceClass
        ],
    0,
  );
}

function obstacleAccessibility(
  obstacleCount: number | null,
  areaKm2: number | null,
): number | null {
  if (obstacleCount === null || areaKm2 === null || areaKm2 <= 0) return null;
  const density = obstacleCount / areaKm2;
  return 1 -
    clamp01(
      density /
        MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.normalization
          .maximumObstaclesPerKm2,
    );
}

function weightedAvailable(values: Array<[number | null, number]>): number | null {
  const available = values.filter(
    (item): item is [number, number] => item[0] !== null,
  );
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return null;
  return clamp01(
    available.reduce((sum, [value, weight]) => sum + value * weight, 0) /
      totalWeight,
  );
}

function validFrequency(
  raw: MunicipalCleaningRawZone,
  evidence: CleaningSourceEvidence[],
): { value: CleaningFrequency | null; signal: CleaningSignalEvidence } {
  const frequency = raw.documentedCleaningFrequency;
  const ids = frequency?.sourceEvidenceIds ?? [];
  const signal = signalEvidence(evidence, ids, "cleaning_frequency");
  if (
    raw.documentedCleaningFrequencyResolution === "conflict" ||
    !frequency ||
    !Number.isFinite(frequency.visitsPerWeek) ||
    frequency.visitsPerWeek < 0 ||
    signal.resolution !== "resolved"
  ) {
    return {
      value: null,
      signal: {
        ...signal,
        resolution:
          raw.documentedCleaningFrequencyResolution === "conflict"
            ? "conflict"
            : signal.resolution === "resolved"
              ? "unknown"
              : signal.resolution,
        confidence: 0,
      },
    };
  }
  return {
    value: { ...frequency, visitsPerWeek: Math.max(0, frequency.visitsPerWeek) },
    signal,
  };
}

function validDirectLevel(
  raw: MunicipalCleaningRawZone,
  evidence: CleaningSourceEvidence[],
): { value: number | null; signal: CleaningSignalEvidence } {
  const value = finiteOrNull(raw.documentedMunicipalCleaningServiceLevel);
  const ids = raw.documentedMunicipalCleaningServiceLevelEvidenceIds ?? [];
  const signal = signalEvidence(evidence, ids, "municipal_coverage");
  if (raw.documentedMunicipalCleaningServiceLevelResolution === "conflict") {
    return { value: null, signal: { ...signal, resolution: "conflict", confidence: 0 } };
  }
  if (value === null || signal.resolution !== "resolved") {
    return { value: null, signal: { ...signal, confidence: 0 } };
  }
  return { value: clamp01(value / 100) * 100, signal };
}

function validDocumentedManual(
  raw: MunicipalCleaningRawZone,
  evidence: CleaningSourceEvidence[],
): { value: boolean | null; signal: CleaningSignalEvidence } {
  const value = raw.documentedManualCleaning;
  const ids = raw.documentedManualCleaningEvidenceIds ?? [];
  const signal = signalEvidence(evidence, ids, "manual_cleaning");
  if (
    raw.documentedManualCleaningResolution === "conflict" ||
    typeof value !== "boolean" ||
    signal.resolution !== "resolved"
  ) {
    return {
      value: null,
      signal: {
        ...signal,
        resolution:
          raw.documentedManualCleaningResolution === "conflict"
            ? "conflict"
            : signal.resolution === "resolved"
              ? "unknown"
              : signal.resolution,
        confidence: 0,
      },
    };
  }
  return { value, signal };
}

function buildConfidence(input: {
  direct: CleaningSignalEvidence;
  geometry: CleaningSignalEvidence;
  mechanized: CleaningSignalEvidence;
  manual: CleaningSignalEvidence;
  surfaceClasses: CleaningSurfaceObservation[];
  obstacleCount: number | null;
  frequency: CleaningFrequency | null;
  directLevel: number | null;
  geometryProxy: number | null;
}): ServiceabilityConfidence {
  const signals = [
    ["municipalCleaningServiceLevel", input.directLevel, input.direct],
    ["geometryServiceabilityProxy", input.geometryProxy, input.geometry],
    ["mechanizedCleaningAccessibility", input.geometryProxy, input.mechanized],
    ["manualCleaning", null, input.manual],
  ] as const;
  const availableSignals = signals
    .filter(([, value, evidence]) => value !== null || evidence.resolution === "resolved")
    .map(([name]) => name);
  const missingSignals = signals
    .filter(([, value, evidence]) => value === null && evidence.resolution !== "resolved")
    .map(([name]) => name);
  const dataCompleteness = round(availableSignals.length / signals.length);
  const presentConfidence = signals
    .map(([, value, evidence]) => (value !== null || evidence.resolution === "resolved" ? evidence.confidence : null))
    .filter((value): value is number => value !== null);
  const sourceCompleteness = presentConfidence.length === 0
    ? 0
    : round(presentConfidence.reduce((sum, value) => sum + value, 0) / presentConfidence.length);
  const score = round(Math.min(dataCompleteness, sourceCompleteness));
  const thresholds = MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.confidence.levelThresholds;
  const level = score === 0 ? "unknown" : score >= thresholds.high ? "high" : score >= thresholds.medium ? "medium" : "low";
  return {
    score,
    level,
    dataCompleteness,
    sourceCompleteness,
    availableSignals,
    missingSignals,
    signalConfidence: {
      municipalCleaningServiceLevel: input.direct,
      geometryServiceabilityProxy: input.geometry,
      mechanizedCleaningAccessibility: input.mechanized,
      manualCleaning: input.manual,
    },
  };
}

function unknownSignal(): CleaningSignalEvidence {
  return { sourceEvidenceIds: [], resolution: "unknown", confidence: 0 };
}

function buildUnknownZone(
  seed: MunicipalCleaningZoneSeed,
  refreshedAt: string,
): MunicipalCleaningServiceabilityZone {
  const unknown = unknownSignal();
  return {
    id: seed.id,
    label: seed.label,
    geographicLevel: seed.geographicLevel,
    spatialExtent: {
      centroid: seed.centroid,
      areaKm2: finiteOrNull(seed.areaKm2),
      radiusM: equivalentRadiusM(finiteOrNull(seed.areaKm2)),
      radiusBasis: equivalentRadiusM(finiteOrNull(seed.areaKm2)) === null ? "unknown" : "equivalent_circle",
    },
    municipalCleaningServiceLevel: null,
    municipalCleaningServiceLevelBasis: "unknown",
    municipalCleaningServiceLevelEvidence: unknown,
    geometryServiceabilityProxy: null,
    geometryServiceabilityProxyEvidence: unknown,
    mechanizedCleaningAccessibility: null,
    mechanizedAccessibilityBasis: "unknown",
    manualCleaningLikely: { value: null, basis: "unknown", evidence: unknown },
    documentedCleaningFrequency: null,
    documentedCleaningFrequencyResolution: "unknown",
    surfaceClasses: [],
    sourceEvidence: [],
    observedAt: null,
    refreshedAt,
    serviceabilityConfidence: buildConfidence({
      direct: unknown,
      geometry: unknown,
      mechanized: unknown,
      manual: unknown,
      surfaceClasses: [],
      obstacleCount: null,
      frequency: null,
      directLevel: null,
      geometryProxy: null,
    }),
  };
}

export function deriveMunicipalCleaningServiceability(
  seed: MunicipalCleaningZoneSeed,
  raw: MunicipalCleaningRawZone | null | undefined,
  refreshedAt: string,
): MunicipalCleaningServiceabilityZone {
  if (!raw) return buildUnknownZone(seed, refreshedAt);

  const evidence = [...(raw.sourceEvidence ?? [])].sort((left, right) => left.id.localeCompare(right.id));
  const surfaceClasses = buildSurfaceClasses(raw.surfaceFeatureCounts);
  const classAccess = surfaceAccessibility(surfaceClasses);
  const obstacleCount = finiteOrNull(raw.obstacleCount);
  const obstacleAccess = obstacleAccessibility(obstacleCount, finiteOrNull(seed.areaKm2));
  const geometryIds = evidenceIdsForType(evidence, "geometry_proxy");
  const geometryEvidence = signalEvidence(
    evidence,
    geometryIds,
    "geometry_proxy",
    classAccess !== null || obstacleAccess !== null ? "resolved" : "unknown",
    MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.confidence.geometryProxy,
  );
  const geometryProxy = weightedAvailable([
    [classAccess, MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.weights.surfaceAccessibility],
    [obstacleAccess, MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.weights.obstacleAccessibility],
  ]);
  const explicitAccess = finiteOrNull(raw.mechanizedCleaningAccessibility);
  const explicitAccessEvidence = signalEvidence(
    evidence,
    raw.mechanizedCleaningAccessibilityEvidenceIds ?? [],
    "mechanized_accessibility",
  );
  const hasDocumentedAccess = explicitAccess !== null && explicitAccessEvidence.resolution === "resolved";
  const mechanized = hasDocumentedAccess ? clamp01(explicitAccess) : geometryProxy;
  const mechanizedEvidence = hasDocumentedAccess ? explicitAccessEvidence : geometryEvidence;
  const mechanizedBasis = hasDocumentedAccess
    ? "source_documented" as const
    : mechanized === null
      ? "unknown" as const
      : "geometry_proxy" as const;

  const frequency = validFrequency(raw, evidence);
  const directLevel = validDirectLevel(raw, evidence);
  const frequencyScore = frequency.value === null ? null : normalizeFrequency(frequency.value.visitsPerWeek) * 100;
  const directCandidates = [
    directLevel.value === null ? null : { value: directLevel.value, basis: "documented_coverage" as const, evidence: directLevel.signal },
    frequencyScore === null ? null : { value: frequencyScore, basis: "documented_frequency" as const, evidence: frequency.signal },
  ].filter((candidate): candidate is { value: number; basis: "documented_coverage" | "documented_frequency"; evidence: CleaningSignalEvidence } => candidate !== null);
  const directConflict = directCandidates.length > 1 && new Set(directCandidates.map((candidate) => candidate.value)).size > 1;
  const directSelected = directConflict ? null : directCandidates[0] ?? null;
  const directEvidence = directConflict
    ? {
        sourceEvidenceIds: uniqueIds(directCandidates.flatMap((candidate) => candidate.evidence.sourceEvidenceIds)),
        resolution: "conflict" as const,
        confidence: 0,
      }
    : directSelected?.evidence ?? (directLevel.signal.resolution === "conflict" ? directLevel.signal : frequency.signal);
  const directBasis = directConflict
    ? "conflict" as const
    : directSelected?.basis ?? "unknown" as const;

  const documentedManual = validDocumentedManual(raw, evidence);
  const manualInferred = mechanized !== null && (
    mechanized <= MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.manualCleaning.maximumMechanizedAccessibility ||
    (obstacleAccess !== null && 1 - obstacleAccess >= MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.manualCleaning.minimumObstaclePressure)
  );
  const manualCleaningLikely = documentedManual.value !== null || documentedManual.signal.resolution === "conflict"
    ? { value: documentedManual.value, basis: documentedManual.signal.resolution === "conflict" ? "conflict" as const : "documented" as const, evidence: documentedManual.signal }
    : manualInferred
      ? { value: true, basis: "geometric_inference" as const, evidence: geometryEvidence }
      : {
          value: null,
          basis: "unknown" as const,
          evidence: { ...geometryEvidence, resolution: "unknown" as const, confidence: 0 },
        };

  const confidence = buildConfidence({
    direct: directEvidence,
    geometry: geometryEvidence,
    mechanized: mechanizedEvidence,
    manual: manualCleaningLikely.evidence,
    surfaceClasses,
    obstacleCount,
    frequency: frequency.value,
    directLevel: directSelected?.value ?? null,
    geometryProxy,
  });
  const areaKm2 = finiteOrNull(seed.areaKm2);
  return {
    id: seed.id,
    label: seed.label,
    geographicLevel: seed.geographicLevel,
    spatialExtent: {
      centroid: seed.centroid,
      areaKm2,
      radiusM: equivalentRadiusM(areaKm2),
      radiusBasis: equivalentRadiusM(areaKm2) === null ? "unknown" : "equivalent_circle",
    },
    municipalCleaningServiceLevel: directSelected?.value === null || directSelected === null ? null : round(directSelected.value),
    municipalCleaningServiceLevelBasis: directBasis,
    municipalCleaningServiceLevelEvidence: directEvidence,
    geometryServiceabilityProxy: geometryProxy === null ? null : round(geometryProxy * 100),
    geometryServiceabilityProxyEvidence: geometryEvidence,
    mechanizedCleaningAccessibility: mechanized === null ? null : round(mechanized * 100),
    mechanizedAccessibilityBasis: mechanizedBasis,
    manualCleaningLikely,
    documentedCleaningFrequency: frequency.value,
    documentedCleaningFrequencyResolution: frequency.signal.resolution,
    surfaceClasses,
    sourceEvidence: evidence,
    observedAt: raw.observedAt ?? null,
    refreshedAt,
    serviceabilityConfidence: confidence,
  };
}

export function buildMunicipalCleaningServiceabilitySnapshot(input: {
  snapshotId: string;
  generatedAt: string;
  refreshedAt: string;
  baseZones: MunicipalCleaningZoneSeed[];
  rawZones?: MunicipalCleaningRawZone[];
  sources: CleaningSourceEvidence[];
  coverageNotes?: string[];
}): MunicipalCleaningServiceabilitySnapshot {
  const rawById = new Map((input.rawZones ?? []).map((zone) => [zone.id, zone]));
  const zones = input.baseZones
    .map((seed) => deriveMunicipalCleaningServiceability(seed, rawById.get(seed.id), input.refreshedAt))
    .sort((left, right) => left.id.localeCompare(right.id));
  const known = zones.filter(
    (zone) => zone.geometryServiceabilityProxy !== null || zone.municipalCleaningServiceLevel !== null,
  ).length;
  const status = known === 0 ? "unavailable" : known === zones.length ? "available" : "partial";
  return {
    schemaVersion: MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION,
    predictionModelVersion: MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION,
    snapshotId: input.snapshotId,
    generatedAt: input.generatedAt,
    refreshedAt: input.refreshedAt,
    geographicLevel: zones.every((zone) => zone.geographicLevel === "iris") ? "iris" : "grid",
    coverage: {
      country: "FR",
      department: "75",
      commune: "75056",
      zoneCount: zones.length,
      complete: status === "available",
      status,
      notes: input.coverageNotes ?? [],
    },
    sources: [...input.sources].sort((left, right) => left.id.localeCompare(right.id)),
    zones,
  };
}

export function materializeMunicipalCleaningZones(
  snapshot: MunicipalCleaningServiceabilitySnapshot,
  baseZones: MunicipalCleaningZoneSeed[],
): MunicipalCleaningServiceabilitySnapshot {
  const knownById = new Map(snapshot.zones.map((zone) => [zone.id, zone]));
  const zones = baseZones
    .map((seed) => knownById.get(seed.id) ?? buildUnknownZone(seed, snapshot.refreshedAt))
    .sort((left, right) => left.id.localeCompare(right.id));
  const known = zones.filter(
    (zone) => zone.geometryServiceabilityProxy !== null || zone.municipalCleaningServiceLevel !== null,
  ).length;
  return {
    ...snapshot,
    geographicLevel: zones.every((zone) => zone.geographicLevel === "iris") ? "iris" : "grid",
    coverage: {
      ...snapshot.coverage,
      zoneCount: zones.length,
      complete: known === zones.length && zones.length > 0,
      status: known === 0 ? "unavailable" : known === zones.length ? "available" : "partial",
      notes: [
        ...snapshot.coverage.notes,
        "Les zones absentes du snapshot de serviceabilité restent explicitement unknown.",
      ],
    },
    zones,
  };
}
