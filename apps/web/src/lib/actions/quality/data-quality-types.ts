/** Shared bounds for rejecting impossible numeric measurements. */
export const ACTION_DATA_MEASURE_LIMITS = {
  durationMinutesMax: 100_000,
} as const;

export type ActionDataProvenance =
  | "measured"
  | "derived"
  | "estimated"
  | "missing";

/**
 * Semantic projection of ActionGeometrySource for quality diagnostics.
 *
 * ActionGeometrySource remains the fine-grained source of truth. This type is
 * deliberately smaller so reports can distinguish observed, declared,
 * reference, reconstructed, estimated, fallback, missing, and unknown data.
 */
export type ActionGeometryProvenance =
  | "observed"
  | "declared"
  | "reference"
  | "reconstructed"
  | "estimated"
  | "fallback"
  | "missing"
  | "unknown";

export type ActionDataQualityStatus = "ok" | "warning" | "blocking";

export type ActionGeolocationState = "valid" | "missing" | "partial" | "invalid";

export type ActionDataAnomalyCode =
  | "missing_location_label"
  | "invalid_date"
  | "partial_coordinates"
  | "missing_coordinates"
  | "invalid_coordinates"
  | "invalid_measure"
  | "implausible_measure"
  | "estimated_measure"
  | "low_geometry_confidence"
  | "geometry_without_coordinates";

export type ActionDataAnomaly = {
  code: ActionDataAnomalyCode;
  severity: "blocking" | "warning";
  message: string;
};

export type ActionDataQualitySummary = {
  version: string;
  status: ActionDataQualityStatus;
  anomalies: ActionDataAnomaly[];
  blockingAnomalies: ActionDataAnomaly[];
  warnings: ActionDataAnomaly[];
  geolocation: {
    state: ActionGeolocationState;
    provenance: ActionDataProvenance;
    hasCoordinates: boolean;
    hasGeometry: boolean;
  };
  provenance: {
    measures: ActionDataProvenance;
    geometry: ActionGeometryProvenance;
    impact: "derived";
  };
  confidence: number | null;
};
