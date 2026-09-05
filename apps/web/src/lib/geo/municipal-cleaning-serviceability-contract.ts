/**
 * Local, source-aware contract for municipal cleaning serviceability.
 *
 * This contract describes how easily a zone is plausibly covered by a
 * cleaning operation. It is not a pollution measurement and it never means
 * that a zone is "not cleaned".
 */

export const MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION =
  "paris-municipal-cleaning-serviceability-v2" as const;
export const MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION =
  "municipal-cleaning-serviceability-v2" as const;

export type CleaningSurfaceClass =
  | "standard_sidewalk"
  | "pedestrian_area"
  | "stairs"
  | "tree_surround"
  | "planter_edge"
  | "street_furniture_cluster"
  | "barrier_edge"
  | "bridge_or_footbridge"
  | "underpass"
  | "embankment"
  | "other_complex_public_space";

export type CleaningSourceStatus = "available" | "partial" | "unavailable";

export type CleaningEvidenceType =
  | "municipal_coverage"
  | "cleaning_frequency"
  | "scheduled_operation"
  | "mechanized_accessibility"
  | "manual_cleaning"
  | "geometry_proxy"
  | "unknown";

export type CleaningSourceEvidence = {
  id: string;
  evidenceType: CleaningEvidenceType;
  publisher: string;
  dataset: string;
  url: string;
  license: string;
  datasetVersion: string;
  observedAt: string | null;
  refreshedAt: string;
  geographicLevel: "street" | "site" | "iris" | "arrondissement" | "paris";
  status: CleaningSourceStatus;
  notes: string[];
};

export type CleaningPoint = {
  latitude: number;
  longitude: number;
};

export type CleaningFrequency = {
  visitsPerWeek: number;
  label: string | null;
  sourceEvidenceIds: string[];
};

export type CleaningSignalResolution = "resolved" | "conflict" | "unknown";

export type CleaningSignalEvidence = {
  sourceEvidenceIds: string[];
  resolution: CleaningSignalResolution;
  confidence: number;
};

export type CleaningSurfaceObservation = {
  surfaceClass: CleaningSurfaceClass;
  featureCount: number;
  share: number;
};

export type ServiceabilityConfidence = {
  score: number;
  level: "unknown" | "low" | "medium" | "high";
  dataCompleteness: number;
  sourceCompleteness: number;
  availableSignals: string[];
  missingSignals: string[];
  signalConfidence: {
    municipalCleaningServiceLevel: CleaningSignalEvidence;
    geometryServiceabilityProxy: CleaningSignalEvidence;
    mechanizedCleaningAccessibility: CleaningSignalEvidence;
    manualCleaning: CleaningSignalEvidence;
  };
};

export type MunicipalCleaningServiceabilityZone = {
  id: string;
  label: string;
  geographicLevel: "iris" | "grid";
  spatialExtent: {
    centroid: CleaningPoint;
    areaKm2: number | null;
    radiusM: number | null;
    radiusBasis: "equivalent_circle" | "unknown";
  };
  /** Direct municipal evidence only; never populated by geometry alone. */
  municipalCleaningServiceLevel: number | null;
  municipalCleaningServiceLevelBasis:
    | "documented_frequency"
    | "documented_coverage"
    | "unknown"
    | "conflict";
  municipalCleaningServiceLevelEvidence: CleaningSignalEvidence;
  /** Relative 0–100 geometry proxy; not municipal coverage or frequency. */
  geometryServiceabilityProxy: number | null;
  geometryServiceabilityProxyEvidence: CleaningSignalEvidence;
  /** Relative 0–100 score; it is not proof of a cleaning route. */
  mechanizedCleaningAccessibility: number | null;
  mechanizedAccessibilityBasis:
    | "source_documented"
    | "geometry_proxy"
    | "unknown";
  manualCleaningLikely: {
    value: boolean | null;
    basis: "documented" | "geometric_inference" | "unknown" | "conflict";
    evidence: CleaningSignalEvidence;
  };
  documentedCleaningFrequency: CleaningFrequency | null;
  documentedCleaningFrequencyResolution: CleaningSignalResolution;
  surfaceClasses: CleaningSurfaceObservation[];
  sourceEvidence: CleaningSourceEvidence[];
  observedAt: string | null;
  refreshedAt: string;
  serviceabilityConfidence: ServiceabilityConfidence;
};

export type MunicipalCleaningServiceabilitySnapshot = {
  schemaVersion: typeof MUNICIPAL_CLEANING_SERVICEABILITY_SCHEMA_VERSION;
  predictionModelVersion: typeof MUNICIPAL_CLEANING_SERVICEABILITY_MODEL_VERSION;
  snapshotId: string;
  generatedAt: string;
  refreshedAt: string;
  geographicLevel: "iris" | "grid";
  coverage: {
    country: "FR";
    department: "75";
    commune: "75056";
    zoneCount: number;
    complete: boolean;
    status: CleaningSourceStatus;
    notes: string[];
  };
  sources: CleaningSourceEvidence[];
  zones: MunicipalCleaningServiceabilityZone[];
};

export type MunicipalCleaningZoneSeed = {
  id: string;
  label: string;
  geographicLevel: "iris" | "grid";
  centroid: CleaningPoint;
  areaKm2?: number | null;
};

export type MunicipalCleaningRawZone = MunicipalCleaningZoneSeed & {
  /** Counts from a pre-aggregated Paris Data/PVP snapshot. */
  surfaceFeatureCounts?: Partial<Record<CleaningSurfaceClass, number | null>>;
  /** Optional score supplied by a documented accessibility source, 0–1. */
  mechanizedCleaningAccessibility?: number | null;
  mechanizedCleaningAccessibilityEvidenceIds?: string[];
  mechanizedCleaningAccessibilityResolution?: CleaningSignalResolution;
  /** Direct municipal level, 0–100; never inferred from geometry. */
  documentedMunicipalCleaningServiceLevel?: number | null;
  documentedMunicipalCleaningServiceLevelEvidenceIds?: string[];
  documentedMunicipalCleaningServiceLevelResolution?: CleaningSignalResolution;
  /** Optional obstacle count from the same preloaded geometry snapshot. */
  obstacleCount?: number | null;
  documentedCleaningFrequency?: CleaningFrequency | null;
  documentedManualCleaning?: boolean | null;
  documentedManualCleaningEvidenceIds?: string[];
  documentedCleaningFrequencyResolution?: CleaningSignalResolution;
  documentedManualCleaningResolution?: CleaningSignalResolution;
  obstacleCountResolution?: CleaningSignalResolution;
  observedAt?: string | null;
  sourceEvidence?: CleaningSourceEvidence[];
};
