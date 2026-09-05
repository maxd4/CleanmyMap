import type {
  ParisPressureProvenance,
  ParisPressureSignalFamily,
  ParisPressureSnapshot,
  ParisPressureSourceStatus,
} from "./paris-pressure-contract";

export const PARIS_PRESSURE_RISK_MODEL_CONFIG = {
  predictionModelVersion: "paris-pressure-risk-v2",
  weights: {
    waste: {
      residentialPressure: 0.22,
      transportPressure: 0.16,
      tourismPressure: 0.16,
      publicPlacesPressure: 0.14,
      marketPressure: 0.08,
      eventPressure: 0.12,
      validatedWastePressure: 0.12,
    },
    cigaretteButts: {
      residentialPressure: 0.05,
      transportPressure: 0.18,
      stationPressure: 0.12,
      tourismPressure: 0.15,
      terracePressure: 0.25,
      marketPressure: 0.08,
      eventPressure: 0.12,
      validatedCigarettePressure: 0.05,
    },
  },
  normalization: {
    stationCountScale: 3,
    terraceCountScale: 40,
    marketCountScale: 4,
    validatedWasteCountScale: 6,
    validatedCigaretteCountScale: 150,
  },
  decayDistances: {
    eventRadiusKm: 2,
    eventHorizonDays: 56,
  },
  cleanlinessCorrection: {
    maximumPoints: 12,
    neutralPressure: 0.5,
    resolutionMultiplier: {
      iris: 1,
      arrondissement: 0.75,
    },
  },
  confidence: {
    sourceReliability: {
      available: 1,
      partial: 0.7,
      unavailable: 0,
      contextWithoutProvenance: 0.5,
    },
    levelThresholds: {
      medium: 0.4,
      high: 0.75,
    },
  },
} as const;

export type ParisPressureRiskKind = "waste" | "cigaretteButts";

export type ParisPressureRiskFactor =
  | "residentialPressure"
  | "transportPressure"
  | "stationPressure"
  | "tourismPressure"
  | "publicPlacesPressure"
  | "terracePressure"
  | "marketPressure"
  | "eventPressure"
  | "validatedWastePressure"
  | "validatedCigarettePressure";

export type ParisPressureContextFactor =
  | "eventPressure"
  | "validatedWastePressure"
  | "validatedCigarettePressure";

/** Provenance for context prepared outside the spatial snapshot. */
export type ParisPressureContextProvenance = {
  factor: ParisPressureContextFactor;
  publisher: string;
  dataset: string;
  url: string;
  license: string;
  datasetVersion: string;
  observedAt: string | null;
  refreshedAt: string;
  status: ParisPressureSourceStatus;
  notes: string[];
};

export type ParisPressureRiskEvent = {
  distanceKm: number;
  ageDays: number;
  attendancePressure: number | null;
};

export type ParisPressureRiskContext = {
  /** Already-normalized signal from the existing route event contract. */
  eventPressure?: number | null;
  /** Optional raw events for callers that need the model to apply decay. */
  recentEvents?: ParisPressureRiskEvent[];
  validatedWasteReports?: number | null;
  validatedCigaretteButts?: number | null;
  /** Provenance is scoped to the context factor it can actually support. */
  contextProvenance?: Partial<
    Record<ParisPressureContextFactor, ParisPressureContextProvenance[]>
  >;
};

export type ParisPressureRiskContribution = {
  key: ParisPressureRiskFactor;
  label: string;
  normalized: number | null;
  weight: number;
  points: number;
  available: boolean;
  sourceFamilies: ParisPressureSignalFamily[];
  sourceReliability: number;
};

export type ParisPressureCleanlinessCorrection = {
  /** The canonical prior is anomaly pressure: higher means less clean. */
  normalizedPressure: number | null;
  points: number;
  available: boolean;
  resolution: "iris" | "arrondissement" | "unknown";
  resolutionReason: "resolved" | "missing_prior" | "unknown_resolution";
  sourceReliability: number;
  explanation: string;
};

export type ParisPressureRiskScore = {
  baseRisk: number;
  cleanlinessCorrection: ParisPressureCleanlinessCorrection;
  finalRisk: number;
  contributions: ParisPressureRiskContribution[];
};

export type ParisPressureRiskConfidence = {
  /** Completeness and source reliability of the base risk factors only. */
  dataCompleteness: number;
  sourceCompleteness: number;
  /** Completeness and source reliability of the correction applied to finalRisk. */
  cleanlinessCorrectionCompleteness: number;
  cleanlinessCorrectionSourceReliability: number;
  score: number;
  level: "unknown" | "low" | "medium" | "high";
  availableFactors: number;
  totalFactors: number;
  missingFactors: ParisPressureRiskFactor[];
};

export type ParisPressureRiskEstimate = {
  zoneId: string;
  zoneLabel: string;
  predictionModelVersion: typeof PARIS_PRESSURE_RISK_MODEL_CONFIG.predictionModelVersion;
  snapshot: Pick<
    ParisPressureSnapshot,
    "snapshotId" | "schemaVersion" | "generatedAt" | "refreshedAt"
  >;
  wasteRisk: number;
  cigaretteButtRisk: number;
  waste: ParisPressureRiskScore;
  cigaretteButts: ParisPressureRiskScore;
  confidence: {
    waste: ParisPressureRiskConfidence;
    cigaretteButts: ParisPressureRiskConfidence;
  };
  provenance: ParisPressureProvenance[];
  contextProvenance: ParisPressureContextProvenance[];
  provenanceGaps: Array<{
    factor: ParisPressureContextFactor;
    message: string;
  }>;
};
