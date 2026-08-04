import type { ActionDataContract } from "./contract-model";
import type {
  ActionGeometryOrigin,
  ActionStatus,
  ActionVisionEstimate,
} from "./types";

export const ACTION_DATA_QUALITY_VERSION = "action-data-quality-2026.08-v1";

export const ACTION_DATA_QUALITY_THRESHOLDS = {
  monthlyWarningRate: 0.1,
  monthlyBlockingRate: 0,
  monthlyPartialGeolocationRate: 0,
  monthlyInvalidGeolocationRate: 0,
  monthlyEstimatedMeasureRate: 0.25,
  minimumGeometryConfidence: 0.6,
} as const;

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

export type ActionDataQualityInput = {
  status?: ActionStatus | null;
  observedAt?: string | null;
  locationLabel?: string | null;
  latitude?: unknown;
  longitude?: unknown;
  wasteKg?: unknown;
  cigaretteButts?: unknown;
  volunteersCount?: unknown;
  durationMinutes?: unknown;
  visionEstimate?: ActionVisionEstimate | null;
  geometrySource?: ActionGeometryOrigin | null;
  geometryConfidence?: number | null;
  hasGeometry?: boolean;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function classifyGeolocation(
  latitude: unknown,
  longitude: unknown,
): ActionGeolocationState {
  const latitudeMissing = latitude === null || latitude === undefined;
  const longitudeMissing = longitude === null || longitude === undefined;

  if (latitudeMissing && longitudeMissing) {
    return "missing";
  }
  if (latitudeMissing !== longitudeMissing) {
    return "partial";
  }
  if (
    !isFiniteNumber(latitude) ||
    !isFiniteNumber(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return "invalid";
  }
  return "valid";
}

function geometryProvenance(
  source: ActionGeometryOrigin | null | undefined,
  hasGeometry: boolean,
): ActionDataProvenance {
  if (!hasGeometry) {
    return "missing";
  }
  if (source === "reference" || source === "routed") {
    return "derived";
  }
  if (source === "estimated_area" || source === "fallback_point") {
    return "estimated";
  }
  return "measured";
}

function buildAnomaly(
  code: ActionDataAnomalyCode,
  severity: ActionDataAnomaly["severity"],
  message: string,
): ActionDataAnomaly {
  return { code, severity, message };
}

export function auditActionData(
  input: ActionDataQualityInput,
): ActionDataQualitySummary {
  const geolocationState = classifyGeolocation(input.latitude, input.longitude);
  const hasGeometry = input.hasGeometry ?? false;
  const measuresProvenance: ActionDataProvenance =
    input.wasteKg === null || input.wasteKg === undefined
      ? "missing"
      : input.visionEstimate?.provisional
        ? "estimated"
        : "measured";
  const anomalies: ActionDataAnomaly[] = [];

  if (!input.locationLabel?.trim()) {
    anomalies.push(
      buildAnomaly(
        "missing_location_label",
        "blocking",
        "Le libelle de localisation est absent.",
      ),
    );
  }

  if (!input.observedAt || Number.isNaN(new Date(input.observedAt).getTime())) {
    anomalies.push(
      buildAnomaly(
        "invalid_date",
        "blocking",
        "La date d'action est absente ou invalide.",
      ),
    );
  }

  if (geolocationState === "partial") {
    anomalies.push(
      buildAnomaly(
        "partial_coordinates",
        "blocking",
        "Une seule coordonnee geographique est renseignee.",
      ),
    );
  } else if (geolocationState === "invalid") {
    anomalies.push(
      buildAnomaly(
        "invalid_coordinates",
        "blocking",
        "Les coordonnees geographiques sont invalides ou hors limites.",
      ),
    );
  } else if (geolocationState === "missing") {
    anomalies.push(
      buildAnomaly(
        "missing_coordinates",
        "warning",
        "Les coordonnees sont absentes : l'action reste visible hors carte.",
      ),
    );
  }

  const numericMeasures = [
    input.wasteKg,
    input.cigaretteButts,
    input.volunteersCount,
    input.durationMinutes,
  ];
  if (numericMeasures.some((value) => value !== null && value !== undefined && !isFiniteNumber(value))) {
    anomalies.push(
      buildAnomaly(
        "invalid_measure",
        "blocking",
        "Une mesure n'est pas un nombre fini.",
      ),
    );
  }

  if (
    (isFiniteNumber(input.wasteKg) && (input.wasteKg < 0 || input.wasteKg > 100000)) ||
    (isFiniteNumber(input.cigaretteButts) && (input.cigaretteButts < 0 || input.cigaretteButts > 100000000)) ||
    (isFiniteNumber(input.volunteersCount) && (input.volunteersCount < 1 || input.volunteersCount > 10000)) ||
    (isFiniteNumber(input.durationMinutes) && (input.durationMinutes < 0 || input.durationMinutes > 100000))
  ) {
    anomalies.push(
      buildAnomaly(
        "implausible_measure",
        "blocking",
        "Une mesure depasse les bornes du contrat d'import.",
      ),
    );
  }

  if (measuresProvenance === "estimated") {
    anomalies.push(
      buildAnomaly(
        "estimated_measure",
        "warning",
        "L'impact poids provient d'une estimation provisoire.",
      ),
    );
  }

  if (
    input.geometryConfidence !== null &&
    input.geometryConfidence !== undefined &&
    isFiniteNumber(input.geometryConfidence) &&
    input.geometryConfidence < ACTION_DATA_QUALITY_THRESHOLDS.minimumGeometryConfidence
  ) {
    anomalies.push(
      buildAnomaly(
        "low_geometry_confidence",
        "warning",
        "La confiance de la geometrie est sous le seuil d'alerte.",
      ),
    );
  }

  if (hasGeometry && geolocationState !== "valid") {
    anomalies.push(
      buildAnomaly(
        "geometry_without_coordinates",
        "warning",
        "Une geometrie existe sans paire de coordonnees complete.",
      ),
    );
  }

  const blockingAnomalies = anomalies.filter((anomaly) => anomaly.severity === "blocking");
  const warnings = anomalies.filter((anomaly) => anomaly.severity === "warning");
  const status: ActionDataQualityStatus = blockingAnomalies.length > 0
    ? "blocking"
    : warnings.length > 0
      ? "warning"
      : "ok";

  return {
    version: ACTION_DATA_QUALITY_VERSION,
    status,
    anomalies,
    blockingAnomalies,
    warnings,
    geolocation: {
      state: geolocationState,
      provenance: geolocationState === "valid" ? "measured" : "missing",
      hasCoordinates: geolocationState === "valid",
      hasGeometry,
    },
    provenance: {
      measures: measuresProvenance,
      geometry: geometryProvenance(input.geometrySource, hasGeometry),
      impact: "derived",
    },
    confidence: isFiniteNumber(input.geometryConfidence)
      ? input.geometryConfidence
      : null,
  };
}

export function auditActionContract(
  contract: ActionDataContract,
): ActionDataQualitySummary {
  return auditActionData({
    status: contract.status,
    observedAt: contract.dates.observedAt,
    locationLabel: contract.location.label,
    latitude: contract.location.latitude,
    longitude: contract.location.longitude,
    wasteKg: contract.metadata.wasteKg,
    cigaretteButts: contract.metadata.cigaretteButts,
    volunteersCount: contract.metadata.volunteersCount,
    durationMinutes: contract.metadata.durationMinutes,
    visionEstimate: contract.metadata.visionEstimate,
    geometrySource: contract.geometry.geometrySource,
    geometryConfidence: contract.geometry.confidence,
    hasGeometry: contract.geometry.coordinates.length > 0,
  });
}

export type MonthlyActionDataQualityReview = {
  version: string;
  month: string;
  inspectedCount: number;
  status: ActionDataQualityStatus;
  blockingAnomalyCount: number;
  warningAnomalyCount: number;
  anomaliesByCode: Record<ActionDataAnomalyCode, number>;
  geolocation: Record<ActionGeolocationState, number>;
  provenance: Record<ActionDataProvenance, number>;
  thresholds: typeof ACTION_DATA_QUALITY_THRESHOLDS;
  alerts: Array<{
    id: string;
    severity: "critical" | "high" | "medium";
    message: string;
  }>;
};

const ANOMALY_CODES: ActionDataAnomalyCode[] = [
  "missing_location_label",
  "invalid_date",
  "partial_coordinates",
  "missing_coordinates",
  "invalid_coordinates",
  "invalid_measure",
  "implausible_measure",
  "estimated_measure",
  "low_geometry_confidence",
  "geometry_without_coordinates",
];

export function buildMonthlyActionDataQualityReview(params: {
  contracts: ActionDataContract[];
  month: string;
}): MonthlyActionDataQualityReview {
  const contracts = params.contracts.filter(
    (contract) => contract.dates.observedAt.slice(0, 7) === params.month,
  );
  const summaries = contracts.map((contract) =>
    contract.dataQuality ?? auditActionContract(contract),
  );
  const anomaliesByCode = Object.fromEntries(
    ANOMALY_CODES.map((code) => [code, 0]),
  ) as Record<ActionDataAnomalyCode, number>;
  const geolocation = {
    valid: 0,
    missing: 0,
    partial: 0,
    invalid: 0,
  } satisfies Record<ActionGeolocationState, number>;
  const provenance = {
    measured: 0,
    derived: 0,
    estimated: 0,
    missing: 0,
  } satisfies Record<ActionDataProvenance, number>;

  let blockingAnomalyCount = 0;
  let warningAnomalyCount = 0;
  for (const summary of summaries) {
    geolocation[summary.geolocation.state] += 1;
    provenance[summary.provenance.measures] += 1;
    for (const anomaly of summary.anomalies) {
      anomaliesByCode[anomaly.code] += 1;
      if (anomaly.severity === "blocking") {
        blockingAnomalyCount += 1;
      } else {
        warningAnomalyCount += 1;
      }
    }
  }

  const inspectedCount = contracts.length;
  const warningRate = inspectedCount === 0 ? 0 : warningAnomalyCount / inspectedCount;
  const blockingRate = inspectedCount === 0 ? 0 : blockingAnomalyCount / inspectedCount;
  const partialRate = inspectedCount === 0 ? 0 : geolocation.partial / inspectedCount;
  const invalidRate = inspectedCount === 0 ? 0 : geolocation.invalid / inspectedCount;
  const estimatedRate = inspectedCount === 0 ? 0 : provenance.estimated / inspectedCount;
  const alerts: MonthlyActionDataQualityReview["alerts"] = [];

  if (blockingRate > ACTION_DATA_QUALITY_THRESHOLDS.monthlyBlockingRate) {
    alerts.push({
      id: "blocking-anomalies",
      severity: "critical",
      message: `${blockingAnomalyCount} anomalie(s) bloquante(s) a revoir avant diffusion.`,
    });
  }
  if (partialRate > ACTION_DATA_QUALITY_THRESHOLDS.monthlyPartialGeolocationRate) {
    alerts.push({
      id: "partial-geolocation",
      severity: "high",
      message: "Des geolocalisations partielles sont presentes.",
    });
  }
  if (invalidRate > ACTION_DATA_QUALITY_THRESHOLDS.monthlyInvalidGeolocationRate) {
    alerts.push({
      id: "invalid-geolocation",
      severity: "high",
      message: "Des geolocalisations invalides sont presentes.",
    });
  }
  if (warningRate > ACTION_DATA_QUALITY_THRESHOLDS.monthlyWarningRate) {
    alerts.push({
      id: "quality-warning-rate",
      severity: "medium",
      message: `Le taux d'alertes qualite depasse ${ACTION_DATA_QUALITY_THRESHOLDS.monthlyWarningRate * 100}%.`,
    });
  }
  if (estimatedRate > ACTION_DATA_QUALITY_THRESHOLDS.monthlyEstimatedMeasureRate) {
    alerts.push({
      id: "estimated-measure-rate",
      severity: "medium",
      message: "La part de mesures estimees depasse le seuil mensuel.",
    });
  }

  return {
    version: ACTION_DATA_QUALITY_VERSION,
    month: params.month,
    inspectedCount,
    status: blockingAnomalyCount > 0 ? "blocking" : alerts.length > 0 ? "warning" : "ok",
    blockingAnomalyCount,
    warningAnomalyCount,
    anomaliesByCode,
    geolocation,
    provenance,
    thresholds: ACTION_DATA_QUALITY_THRESHOLDS,
    alerts,
  };
}
