export type ActionDataProvenance =
  | "measured"
  | "derived"
  | "estimated"
  | "missing";

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
    geometry: ActionDataProvenance;
    impact: "derived";
  };
  confidence: number | null;
};
