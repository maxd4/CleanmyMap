export type PlasticOriginsBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type PlasticOriginsObservation = {
  stableKey: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    sourceCampaignId: string | null;
    observedAt: string | null;
    sourceDate: string | null;
    category: string | null;
    method: string | null;
    move: string | null;
    bank: string | null;
    municipality: string | null;
    department: string | null;
    region: string | null;
    country: string | null;
    riverName: string | null;
    availableSourceFields: string[];
    source: {
      resourceId: string;
      sourceFile: string;
      sourceRows: number[];
      sourceRecordCount: number;
      exactDuplicateGroup: boolean;
    };
  };
};

type PlasticOriginsResourceAudit = {
  year: number;
  filename: string;
  resourceId: string;
  sourceUrl: string;
  sourceSha1: string;
  delimiter: "," | ";";
  headers: string[];
  rows: number;
  normalizedObservations: number;
  exactDuplicateRows: number;
  missingByField: Record<string, number>;
  invalidCoordinates: { latitude: number; longitude: number };
  unparsedDates: number;
  dateMin: string | null;
  dateMax: string | null;
  campaigns: number;
  categories: Record<string, number>;
  methods: Record<string, number>;
  quality: {
    schemaMatchesExpected: boolean;
    requiredFieldsComplete: boolean;
    coordinatesInBounds: boolean;
    datesParseable: boolean;
  };
};

export type PlasticOriginsDataset = {
  schemaVersion: 1;
  generatedAt: string;
  source: {
    title: string;
    publisher: string;
    datasetUrl: string;
    documentationUrl: string;
    license: string;
    licenseUrl: string;
    documentationDeclaredLicense: string;
    licenseNote: string;
    coordinateOrder: string;
    coordinateReferenceSystem: string | null;
    coordinateReferenceSystemNote: string;
  };
  sourceResources: PlasticOriginsResourceAudit[];
  quality: {
    sourceRows: number;
    normalizedObservations: number;
    exactDuplicateRowsGrouped: number;
    crossResourceExactDuplicateGroups: number;
    missingByField: Record<string, number>;
    dateMin: string | null;
    dateMax: string | null;
    sourceCrsDeclared: boolean;
    allCoordinatesInBounds: boolean;
    allDatesParseable: boolean;
    allSchemasValid: boolean;
  };
  observations: PlasticOriginsObservation[];
};

export const PLASTIC_ORIGINS_DATA_URL = "/data/plastic-origins/observations.json";
export const PLASTIC_ORIGINS_MARKER_COLOR = "#d946ef";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isPlasticOriginsDataset(value: unknown): value is PlasticOriginsDataset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<PlasticOriginsDataset>;
  return candidate.schemaVersion === 1
    && Array.isArray(candidate.observations)
    && candidate.observations.every((observation) => {
      const coordinates = observation?.geometry?.coordinates;
      return observation?.geometry?.type === "Point"
        && Array.isArray(coordinates)
        && coordinates.length === 2
        && isFiniteNumber(coordinates[0])
        && isFiniteNumber(coordinates[1])
        && typeof observation.stableKey === "string"
        && typeof observation.properties?.source?.resourceId === "string";
    });
}

export function isPlasticOriginsObservationInBounds(
  observation: PlasticOriginsObservation,
  bounds: PlasticOriginsBounds,
): boolean {
  const [longitude, latitude] = observation.geometry.coordinates;
  const longitudeInBounds = bounds.west <= bounds.east
    ? longitude >= bounds.west && longitude <= bounds.east
    : longitude >= bounds.west || longitude <= bounds.east;
  return latitude >= bounds.south
    && latitude <= bounds.north
    && longitudeInBounds;
}

export function filterPlasticOriginsObservationsByBounds(
  observations: readonly PlasticOriginsObservation[],
  bounds: PlasticOriginsBounds,
): PlasticOriginsObservation[] {
  return observations.filter((observation) => isPlasticOriginsObservationInBounds(observation, bounds));
}

export function resolvePlasticOriginsAvailableData(
  observation: PlasticOriginsObservation,
): string[] {
  return observation.properties.availableSourceFields.filter(
    (field) => field !== "lat" && field !== "lon",
  );
}
