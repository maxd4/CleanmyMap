import type {
  ParisPressureUrbanMorphology,
  ParisPressureUrbanMorphologyFeature,
} from "./paris-pressure-contract";
import type {
  ParisPressureRiskContribution,
  ParisPressureRiskKind,
} from "./paris-pressure-risk-contract";
import {
  URBAN_MORPHOLOGY_PRIOR_VERSION,
} from "./urban-morphology-prior-contract";
import type {
  UrbanMorphologyPriorApplication,
  UrbanMorphologyPriorStatus,
} from "./urban-morphology-prior-contract";

export { URBAN_MORPHOLOGY_PRIOR_VERSION } from "./urban-morphology-prior-contract";
export type {
  UrbanMorphologyPriorApplication,
  UrbanMorphologyPriorStatus,
} from "./urban-morphology-prior-contract";

export const URBAN_MORPHOLOGY_PRIOR_CONFIG = {
  confidenceThreshold: 0.55,
  maximumPoints: {
    waste: 10,
    cigaretteButts: 8,
  },
  coefficients: {
    waste: {
      lowTrafficLocalStreet: 0.3,
      deadEnd: 0.2,
      parkInterior: 0.35,
      residentialLowFlow: 0.15,
    },
    cigaretteButts: {
      lowTrafficLocalStreet: 0.15,
      deadEnd: 0.1,
      parkInterior: 0.35,
      residentialLowFlow: 0.1,
    },
  },
  compensation: {
    eventPressureThreshold: 0.65,
    validatedHistoryThreshold: 0.4,
    hotspotThreshold: 0.65,
  },
} as const;

const FEATURE_KEYS: ParisPressureUrbanMorphologyFeature[] = [
  "lowTrafficLocalStreet",
  "deadEnd",
  "parkInterior",
  "residentialLowFlow",
  "parkEntrance",
  "parkEdge",
  "parkAmenity",
  "foodService",
  "stationProximity",
  "commerceProximity",
  "schoolProximity",
  "terraceProximity",
  "touristProximity",
];

function clamp01(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function emptyFeatures(): ParisPressureUrbanMorphology["features"] {
  return Object.fromEntries(FEATURE_KEYS.map((key) => [key, null])) as ParisPressureUrbanMorphology["features"];
}

function feature(
  morphology: ParisPressureUrbanMorphology,
  key: ParisPressureUrbanMorphologyFeature,
): number {
  return clamp01(morphology.features[key]);
}

function availableFeatures(
  morphology: ParisPressureUrbanMorphology,
): ParisPressureUrbanMorphology["features"] {
  return Object.fromEntries(
    FEATURE_KEYS.map((key) => [
      key,
      morphology.features[key] === null
        ? null
        : clamp01(morphology.features[key]),
    ]),
  ) as ParisPressureUrbanMorphology["features"];
}

function morphologyTypes(
  morphology: ParisPressureUrbanMorphology,
): ParisPressureUrbanMorphologyFeature[] {
  return FEATURE_KEYS.filter((key) => feature(morphology, key) > 0);
}

function contributionAtLeast(
  contributions: readonly ParisPressureRiskContribution[],
  keys: readonly ParisPressureRiskContribution["key"][],
  threshold: number,
): boolean {
  return contributions.some(
    (contribution) =>
      keys.includes(contribution.key) &&
      contribution.available &&
      (contribution.normalized ?? 0) >= threshold,
  );
}

function reliefFromFeatures(
  morphology: ParisPressureUrbanMorphology,
  keys: readonly ParisPressureUrbanMorphologyFeature[],
): number {
  return Math.max(...keys.map((key) => feature(morphology, key)), 0);
}

function explain(
  components: UrbanMorphologyPriorApplication["components"],
  appliedMalusPoints: number,
  compensatingSignals: readonly string[],
): string {
  const active = Object.entries(components)
    .filter(([, value]) => value > 0)
    .map(([key]) => key);
  if (active.length === 0) {
    return "Contexte morphologique géographique disponible sans composante pénalisante.";
  }
  if (appliedMalusPoints === 0 && compensatingSignals.length > 0) {
    return `Prior morphologique compensé par ${compensatingSignals.join(", ")}.`;
  }
  return `Prior morphologique géographique appliqué sur ${active.join(", ")} : ${round(appliedMalusPoints)} points.`;
}

function unavailable(
  beforeRisk: number,
  status: Exclude<UrbanMorphologyPriorStatus, "applied">,
  confidence: number,
  explanation: string,
): UrbanMorphologyPriorApplication {
  return {
    version: URBAN_MORPHOLOGY_PRIOR_VERSION,
    status,
    source: null,
    geographicSource: null,
    morphologyType: [],
    confidence: round(confidence),
    features: status === "unavailable" ? null : emptyFeatures(),
    components: {
      lowTrafficLocalStreet: 0,
      deadEnd: 0,
      parkInterior: 0,
      residentialLowFlow: 0,
    },
    baseMalusPoints: 0,
    compensationPoints: 0,
    appliedMalusPoints: 0,
    beforeRisk: round(clamp01(beforeRisk / 100) * 100),
    afterRisk: round(clamp01(beforeRisk / 100) * 100),
    compensatingSignals: [],
    explanation,
  };
}

export function applyUrbanMorphologyPrior(input: {
  kind: ParisPressureRiskKind;
  morphology?: ParisPressureUrbanMorphology;
  beforeRisk: number;
  contributions: readonly ParisPressureRiskContribution[];
  eventPressure: number | null;
}): UrbanMorphologyPriorApplication {
  const beforeRisk = round(Math.min(100, Math.max(0, input.beforeRisk)));
  if (!input.morphology) {
    return unavailable(
      beforeRisk,
      "unavailable",
      0,
      "Contexte morphologique géographique indisponible : aucune correction appliquée.",
    );
  }

  const confidence = clamp01(input.morphology.confidence);
  if (confidence < URBAN_MORPHOLOGY_PRIOR_CONFIG.confidenceThreshold) {
    return {
      ...unavailable(
        beforeRisk,
        "low_confidence",
        confidence,
        "Contexte morphologique géographique peu fiable : aucune correction appliquée.",
      ),
      source: input.morphology.source,
      geographicSource: input.morphology.source,
      morphologyType: morphologyTypes(input.morphology),
      features: availableFeatures(input.morphology),
    };
  }

  const parkRelief = reliefFromFeatures(input.morphology, [
    "parkEntrance",
    "parkEdge",
    "parkAmenity",
    "foodService",
  ]);
  const flowRelief = reliefFromFeatures(input.morphology, [
    "stationProximity",
    "commerceProximity",
    "schoolProximity",
    "terraceProximity",
    "touristProximity",
  ]);
  const components = {
    lowTrafficLocalStreet: round(
      feature(input.morphology, "lowTrafficLocalStreet") * (1 - flowRelief),
    ),
    deadEnd: round(feature(input.morphology, "deadEnd") * (1 - flowRelief)),
    parkInterior: round(
      feature(input.morphology, "parkInterior") * (1 - parkRelief),
    ),
    residentialLowFlow: round(
      feature(input.morphology, "residentialLowFlow") * (1 - flowRelief),
    ),
  };
  const coefficients = URBAN_MORPHOLOGY_PRIOR_CONFIG.coefficients[input.kind];
  const maximumPoints = URBAN_MORPHOLOGY_PRIOR_CONFIG.maximumPoints[input.kind];
  const baseMalusPoints = round(
    Math.min(
      maximumPoints,
      (components.lowTrafficLocalStreet * coefficients.lowTrafficLocalStreet +
        components.deadEnd * coefficients.deadEnd +
        components.parkInterior * coefficients.parkInterior +
        components.residentialLowFlow * coefficients.residentialLowFlow) *
        maximumPoints,
    ),
  );

  const compensatingSignals: string[] = [];
  const eventPressure = clamp01(input.eventPressure);
  if (
    eventPressure >=
    URBAN_MORPHOLOGY_PRIOR_CONFIG.compensation.eventPressureThreshold
  ) {
    compensatingSignals.push("événement récent documenté");
  }
  const historyKey =
    input.kind === "waste"
      ? "validatedWastePressure"
      : "validatedCigarettePressure";
  if (
    contributionAtLeast(
      input.contributions,
      [historyKey],
      URBAN_MORPHOLOGY_PRIOR_CONFIG.compensation.validatedHistoryThreshold,
    )
  ) {
    compensatingSignals.push("historique local validé");
  }
  if (
    contributionAtLeast(
      input.contributions,
      [
        "transportPressure",
        "stationPressure",
        "tourismPressure",
        "terracePressure",
        "marketPressure",
        "publicPlacesPressure",
      ],
      URBAN_MORPHOLOGY_PRIOR_CONFIG.compensation.hotspotThreshold,
    )
  ) {
    compensatingSignals.push("signal de fréquentation robuste");
  }

  const compensationPoints = compensatingSignals.length > 0 ? baseMalusPoints : 0;
  const appliedMalusPoints = round(
    Math.min(maximumPoints, Math.max(0, baseMalusPoints - compensationPoints)),
  );
  return {
    version: URBAN_MORPHOLOGY_PRIOR_VERSION,
    status: "applied",
    source: input.morphology.source,
    geographicSource: input.morphology.source,
    morphologyType: morphologyTypes(input.morphology),
    confidence: round(confidence),
    features: availableFeatures(input.morphology),
    components,
    baseMalusPoints,
    compensationPoints,
    appliedMalusPoints,
    beforeRisk,
    afterRisk: round(Math.max(0, beforeRisk - appliedMalusPoints)),
    compensatingSignals,
    explanation: explain(components, appliedMalusPoints, compensatingSignals),
  };
}
