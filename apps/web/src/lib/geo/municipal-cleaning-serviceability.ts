import {
  MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION,
  MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION,
  type CleaningEvidenceType,
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
    documentedFrequency: 1,
    geometryProxy: 0.55,
    documentedOperation: 0.4,
    sourceReliability: {
      available: 1,
      partial: 0.7,
      unavailable: 0,
    },
    levelThresholds: {
      medium: 0.4,
      high: 0.75,
    },
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
  return 1 - clamp01(
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

function hasEvidence(
  evidence: CleaningSourceEvidence[],
  type: CleaningEvidenceType,
): boolean {
  return evidence.some((item) => item.evidenceType === type && item.status !== "unavailable");
}

function validDocumentedFrequency(
  raw: MunicipalCleaningRawZone,
  evidence: CleaningSourceEvidence[],
) {
  const frequency = raw.documentedCleaningFrequency;
  if (
    !frequency ||
    !Number.isFinite(frequency.visitsPerWeek) ||
    frequency.visitsPerWeek < 0 ||
    frequency.sourceEvidenceIds.length === 0 ||
    !frequency.sourceEvidenceIds.every((id) =>
      evidence.some(
        (item) => item.id === id && item.evidenceType === "cleaning_frequency",
      ),
    )
  ) {
    return null;
  }
  return { ...frequency, visitsPerWeek: Math.max(0, frequency.visitsPerWeek) };
}

function buildConfidence(
  basis: MunicipalCleaningServiceabilityZone["serviceabilityBasis"],
  surfaceClasses: CleaningSurfaceObservation[],
  hasObstacleSignal: boolean,
  hasFrequency: boolean,
  evidence: CleaningSourceEvidence[],
): ServiceabilityConfidence {
  const availableSignals = [
    surfaceClasses.length > 0 ? "surfaceClasses" : null,
    hasObstacleSignal ? "obstacleCount" : null,
    hasFrequency ? "documentedCleaningFrequency" : null,
    hasEvidence(evidence, "municipal_coverage") ? "municipalCoverage" : null,
    hasEvidence(evidence, "scheduled_operation") ? "scheduledOperation" : null,
  ].filter((value): value is string => value !== null);
  const missingSignals = [
    "surfaceClasses",
    "obstacleCount",
    "documentedCleaningFrequency",
    "municipalCoverage",
    "scheduledOperation",
  ].filter((signal) => !availableSignals.includes(signal));
  const dataCompleteness = round(availableSignals.length / 5);
  const sourceCompleteness = evidence.length === 0
    ? 0
    : round(
        evidence.reduce(
          (sum, item) =>
            sum +
            MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.confidence
              .sourceReliability[item.status],
          0,
        ) / evidence.length,
      );
  const basisReliability =
    basis === "documented_frequency"
      ? MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.confidence.documentedFrequency
      : basis === "geometry_proxy"
        ? MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.confidence.geometryProxy
        : 0;
  const score = round(Math.min(dataCompleteness, sourceCompleteness) * basisReliability);
  const thresholds = MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.confidence.levelThresholds;
  const level =
    score === 0
      ? "unknown"
      : score >= thresholds.high
        ? "high"
        : score >= thresholds.medium
          ? "medium"
          : "low";
  return {
    score,
    level,
    dataCompleteness,
    sourceCompleteness,
    availableSignals,
    missingSignals,
  };
}

function buildUnknownZone(seed: MunicipalCleaningZoneSeed, refreshedAt: string): MunicipalCleaningServiceabilityZone {
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
    municipalCleaningServiceability: null,
    serviceabilityBasis: "unknown",
    mechanizedCleaningAccessibility: null,
    mechanizedAccessibilityBasis: "unknown",
    manualCleaningLikely: { value: null, basis: "unknown" },
    documentedCleaningFrequency: null,
    surfaceClasses: [],
    sourceEvidence: [],
    observedAt: null,
    refreshedAt,
    serviceabilityConfidence: buildConfidence("unknown", [], false, false, []),
  };
}

export function deriveMunicipalCleaningServiceability(
  seed: MunicipalCleaningZoneSeed,
  raw: MunicipalCleaningRawZone | null | undefined,
  refreshedAt: string,
): MunicipalCleaningServiceabilityZone {
  if (!raw) return buildUnknownZone(seed, refreshedAt);

  const evidence = raw.sourceEvidence ?? [];
  const surfaceClasses = buildSurfaceClasses(raw.surfaceFeatureCounts);
  const classAccess = surfaceAccessibility(surfaceClasses);
  const obstacleCount = finiteOrNull(raw.obstacleCount);
  const obstacleAccess = obstacleAccessibility(obstacleCount, finiteOrNull(seed.areaKm2));
  const explicitAccess = finiteOrNull(raw.mechanizedCleaningAccessibility);
  const hasSourceDocumentedAccess = explicitAccess !== null && hasEvidence(evidence, "municipal_coverage");
  const mechanized = hasSourceDocumentedAccess
    ? clamp01(explicitAccess)
    : weightedAvailable([
        [classAccess, MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.weights.surfaceAccessibility],
        [obstacleAccess, MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.weights.obstacleAccessibility],
      ]);
  const frequency = validDocumentedFrequency(raw, evidence);
  const basis = frequency
    ? "documented_frequency"
    : mechanized === null
      ? "unknown"
      : "geometry_proxy";
  const serviceability = frequency
    ? normalizeFrequency(frequency.visitsPerWeek) * 100
    : mechanized === null
      ? null
      : mechanized * 100;
  const documentedManual =
    raw.documentedManualCleaning !== null && raw.documentedManualCleaning !== undefined &&
    (raw.documentedManualCleaningEvidenceIds ?? []).some((id) =>
      evidence.some((item) => item.id === id && item.evidenceType === "municipal_coverage"),
    )
      ? raw.documentedManualCleaning
      : null;
  const manualInferred =
    mechanized === null
      ? null
      : mechanized <= MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.manualCleaning.maximumMechanizedAccessibility ||
        (obstacleAccess !== null &&
          1 - obstacleAccess >= MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_CONFIG.manualCleaning.minimumObstaclePressure);
  const manualCleaningLikely = documentedManual === null
    ? { value: manualInferred, basis: manualInferred === null ? "unknown" as const : "geometric_inference" as const }
    : { value: documentedManual, basis: "documented" as const };
  const confidence = buildConfidence(
    basis,
    surfaceClasses,
    obstacleCount !== null,
    frequency !== null,
    evidence,
  );
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
    municipalCleaningServiceability: serviceability === null ? null : round(serviceability),
    serviceabilityBasis: basis,
    mechanizedCleaningAccessibility: mechanized === null ? null : round(mechanized * 100),
    mechanizedAccessibilityBasis: hasSourceDocumentedAccess ? "source_documented" : mechanized === null ? "unknown" : "geometry_proxy",
    manualCleaningLikely,
    documentedCleaningFrequency: frequency,
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
  const known = zones.filter((zone) => zone.municipalCleaningServiceability !== null).length;
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
  const known = zones.filter((zone) => zone.municipalCleaningServiceability !== null).length;
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
