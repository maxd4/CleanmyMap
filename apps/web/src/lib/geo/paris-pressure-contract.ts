/**
 * Versioned, source-aware spatial prior used by route calculations.
 *
 * The snapshot is deliberately a plain data contract: no provider or network
 * call is needed by the route request. `null` means that a signal was not
 * available at this resolution; it is never silently replaced by zero.
 */

export const PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION =
  "paris-pressure-v1" as const;

export type ParisPressureGeographicLevel = "iris" | "grid" | "arrondissement";

export type ParisPressureSourceStatus =
  | "available"
  | "partial"
  | "unavailable";

export type ParisPressureSignalFamily =
  | "resident_population"
  | "transport"
  | "tourism"
  | "public_activity"
  | "cleanliness";

export type ParisPressureProvenance = {
  family: ParisPressureSignalFamily;
  publisher: string;
  dataset: string;
  url: string;
  license: string;
  datasetVersion: string;
  observedAt: string | null;
  refreshedAt: string;
  geographicLevel: ParisPressureGeographicLevel;
  status: ParisPressureSourceStatus;
  notes: string[];
};
export type ParisPressurePoint = {
  latitude: number;
  longitude: number;
};

export type ParisPressureZone = {
  id: string;
  label: string;
  geographicLevel: "iris" | "grid";
  arrondissementCode: string | null;
  centroid: ParisPressurePoint;
  areaKm2: number | null;
  signals: {
    residentPopulation: {
      population: number | null;
      densityPerKm2: number | null;
      normalized: number | null;
    };
    transport: {
      stationCount: number | null;
      annualEntrants: number | null;
      normalized: number | null;
    };
    tourism: {
      visitorAttendance: number | null;
      tourismPresenceProxy: number | null;
      normalized: number | null;
    };
    publicActivity: {
      authorisedTerraces: number | null;
      openAirMarkets: number | null;
      otherPlaces: number | null;
      normalized: number | null;
    };
    cleanlinessPrior: {
      normalized: number | null;
      rawObservations: number | null;
      resolution: "iris" | "arrondissement" | null;
      measuredAt: string | null;
    };
  };
  humanPressure: number | null;
};

export type ParisPressureSnapshot = {
  schemaVersion: typeof PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION;
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
    notes: string[];
  };
  sources: ParisPressureProvenance[];
  zones: ParisPressureZone[];
};

export type ParisPressureRawZone = {
  id: string;
  label: string;
  geographicLevel: "iris" | "grid";
  arrondissementCode?: string | null;
  centroid: ParisPressurePoint;
  areaKm2?: number | null;
  residentPopulation?: number | null;
  transportStationCount?: number | null;
  transportAnnualEntrants?: number | null;
  visitorAttendance?: number | null;
  tourismPresenceProxy?: number | null;
  authorisedTerraces?: number | null;
  openAirMarkets?: number | null;
  otherPlaces?: number | null;
  cleanlinessPrior?: number | null;
  cleanlinessRawObservations?: number | null;
  cleanlinessResolution?: "iris" | "arrondissement" | null;
  cleanlinessMeasuredAt?: string | null;
};
