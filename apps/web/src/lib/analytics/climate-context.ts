export const CLIMATE_PROXY_MODEL_VERSION = "v1.2";

export const CLIMATE_PROXY_FACTORS = {
  co2PerKgWaste: 1.2,
  plasticLeakagePerKgPlastic: 0.18,
  estimatedPlasticShare: 0.35,
  factorVersionDate: "2026-04-10",
} as const;

export type ClimateInputRecord = {
  observedAt: string;
  wasteKg: number;
  cigaretteButts: number;
  durationMinutes: number;
  volunteersCount: number;
  latitude: number | null;
  longitude: number | null;
  plasticKg?: number | null;
};

export type IndicatorConfidence = "eleve" | "moyen" | "faible";

export type ClimateIndicator = {
  id:
    | "volume"
    | "butts"
    | "hours"
    | "co2_proxy"
    | "plastic_leakage_proxy"
    | "geocoverage";
  label: string;
  value: number;
  unit: string;
  confidence: IndicatorConfidence;
};

export type ClimateComparison = {
  current: {
    actionsTotal: number;
    volumeKg: number;
    butts: number;
    citizenHours: number;
    geocoverageRate: number;
    co2ProxyKg: number;
    plasticLeakageProxyKg: number;
    plasticKgUsed: number;
  };
  previous: {
    actionsTotal: number;
    volumeKg: number;
    butts: number;
    citizenHours: number;
    geocoverageRate: number;
    co2ProxyKg: number;
    plasticLeakageProxyKg: number;
    plasticKgUsed: number;
  };
};

export type ClimateMethodDefinition = {
  metric: string;
  formula: string;
  source: string;
  frequency: string;
  version: string;
};

export type ClimateDecision = {
  decision: string;
  rationale: string;
  confidence: IndicatorConfidence;
};

export type ClimateContextOutput = {
  periodDays: number;
  generatedAt: string;
  modelVersion: string;
  factors: typeof CLIMATE_PROXY_FACTORS;
  comparison: ClimateComparison;
  indicators: ClimateIndicator[];
  methods: ClimateMethodDefinition[];
  interpretationLimits: string[];
  weeklyDecisions: ClimateDecision[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseMs(raw: string): number | null {
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isGeolocated(record: ClimateInputRecord): boolean {
  if (record.latitude === null || record.longitude === null) {
    return false;
  }
  return (
    record.latitude >= -90 &&
    record.latitude <= 90 &&
    record.longitude >= -180 &&
    record.longitude <= 180
  );
}

function confidenceFromSample(
  sampleSize: number,
  signalRate?: number,
): IndicatorConfidence {
  if (sampleSize >= 45 && (signalRate === undefined || signalRate >= 75)) {
    return "eleve";
  }
  if (sampleSize >= 20 && (signalRate === undefined || signalRate >= 55)) {
    return "moyen";
  }
  return "faible";
}

function aggregate(
  records: ClimateInputRecord[],
): ClimateComparison["current"] {
  const actionsTotal = records.length;
  const volumeKg = records.reduce(
    (acc, record) => acc + Number(record.wasteKg || 0),
    0,
  );
  const butts = records.reduce(
    (acc, record) => acc + Number(record.cigaretteButts || 0),
    0,
  );
  const citizenHours =
    records.reduce(
      (acc, record) =>
        acc +
        Number(record.durationMinutes || 0) *
          Math.max(0, Number(record.volunteersCount || 0)),
      0,
    ) / 60;
  const geolocated = records.filter((record) => isGeolocated(record)).length;
  const geocoverageRate =
    actionsTotal > 0 ? (geolocated / actionsTotal) * 100 : 0;

  const plasticKgObserved = records
    .map((record) => record.plasticKg)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    )
    .reduce((acc, value) => acc + value, 0);
  const hasObservedPlastic = plasticKgObserved > 0;
  const plasticKgUsed = hasObservedPlastic
    ? plasticKgObserved
    : volumeKg * CLIMATE_PROXY_FACTORS.estimatedPlasticShare;

  const co2ProxyKg = volumeKg * CLIMATE_PROXY_FACTORS.co2PerKgWaste;
  const plasticLeakageProxyKg =
    plasticKgUsed * CLIMATE_PROXY_FACTORS.plasticLeakagePerKgPlastic;

  return {
    actionsTotal,
    volumeKg: round1(volumeKg),
    butts: Math.round(butts),
    citizenHours: round1(citizenHours),
    geocoverageRate: round1(geocoverageRate),
    co2ProxyKg: round1(co2ProxyKg),
    plasticLeakageProxyKg: round1(plasticLeakageProxyKg),
    plasticKgUsed: round1(plasticKgUsed),
  };
}

function buildMethods(): ClimateMethodDefinition[] {
  return [
    {
      metric: "CO2 evite (proxy)",
      formula:
        "dechets_kg * facteur_co2_versionne (facteur_co2_versionne = 1.2)",
      source: "Declarations actions validees (waste_kg).",
      frequency: "Recalcul a chaque chargement de la rubrique.",
      version: CLIMATE_PROXY_MODEL_VERSION,
    },
    {
      metric: "Fuite plastique evitee (proxy)",
      formula:
        "dechets_plastique_kg * facteur_fuite_versionne (0.18). dechets_plastique_kg observe ou estime.",
      source: "Plastic kg observe, sinon estimation depuis waste_kg.",
      frequency: "Recalcul a chaque chargement de la rubrique.",
      version: CLIMATE_PROXY_MODEL_VERSION,
    },
    {
      metric: "Heures citoyennes",
      formula: "somme(duration_minutes * volunteers_count) / 60",
      source: "Declarations actions validees.",
      frequency: "Recalcul a chaque chargement de la rubrique.",
      version: CLIMATE_PROXY_MODEL_VERSION,
    },
    {
      metric: "Taux geocouverture",
      formula: "actions_geo_validees / actions_total",
      source: "Latitude/longitude des declarations validees.",
      frequency: "Recalcul a chaque chargement de la rubrique.",
      version: CLIMATE_PROXY_MODEL_VERSION,
    },
  ];
}

function buildLimits(usingEstimatedPlastic: boolean): string[] {
  return [
    "Ces proxies donnent un ordre de grandeur pour pilotage hebdomadaire, pas une mesure instrumentale.",
    "CO2 evite proxy mesure un potentiel evite via retrait de dechets, pas un bilan carbone complet.",
    usingEstimatedPlastic
      ? "Le plastique est partiellement estime (part moyenne 35%), biais possible selon la composition locale."
      : "Le plastique utilise est observe sur les declarations disponibles.",
    "La geocouverture depend de la qualite de saisie des coordonnees et des traces.",
    "Communication externe: mentionner explicitement le statut proxy et la version de modele.",
  ];
}

function buildWeeklyDecisions(params: {
  current: ClimateComparison["current"];
  previous: ClimateComparison["previous"];
  confidence: {
    volume: IndicatorConfidence;
    geocoverage: IndicatorConfidence;
    co2: IndicatorConfidence;
  };
}): ClimateDecision[] {
  const decisions: ClimateDecision[] = [];
  const deltaCoverage =
    params.current.geocoverageRate - params.previous.geocoverageRate;
  const deltaVolume = params.current.volumeKg - params.previous.volumeKg;

  if (params.current.geocoverageRate < 70 || deltaCoverage < -5) {
    decisions.push({
      decision: "Renforcer la preuve spatiale sur les sorties a venir.",
      rationale:
        "La geocouverture est insuffisante pour une lecture robuste des effets territoriaux.",
      confidence: params.confidence.geocoverage,
    });
  }

  if (deltaVolume > 0) {
    decisions.push({
      decision: "Augmenter les equipes sur les zones a plus forte charge.",
      rationale:
        "Le volume collecte progresse vs N-1, signal d'intensification terrain.",
      confidence: params.confidence.volume,
    });
  } else {
    decisions.push({
      decision:
        "Maintenir la cadence actuelle et consolider la qualite de saisie.",
      rationale:
        "Le volume est stable ou en baisse, levier principal = fiabilite et couverture.",
      confidence: params.confidence.volume,
    });
  }

  decisions.push({
    decision:
      "Valider le message institutionnel avec mention explicite des proxies.",
    rationale:
      "Les indicateurs climat sont defendables si limites et version de modele sont affichees.",
    confidence: params.confidence.co2,
  });

  return decisions.slice(0, 3);
}

export function computeClimateContext(params: {
  records: ClimateInputRecord[];
  periodDays: number;
  now?: Date;
}): ClimateContextOutput {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const currentFloorMs = nowMs - params.periodDays * DAY_MS;
  const previousFloorMs = currentFloorMs - params.periodDays * DAY_MS;

  const currentRecords = params.records.filter((record) => {
    const observedMs = parseMs(record.observedAt);
    return (
      observedMs !== null && observedMs >= currentFloorMs && observedMs <= nowMs
    );
  });

  const previousRecords = params.records.filter((record) => {
    const observedMs = parseMs(record.observedAt);
    return (
      observedMs !== null &&
      observedMs >= previousFloorMs &&
      observedMs < currentFloorMs
    );
  });

  const current = aggregate(currentRecords);
  const previous = aggregate(previousRecords);

  const volumeConfidence = confidenceFromSample(current.actionsTotal);
  const geocoverageConfidence = confidenceFromSample(
    current.actionsTotal,
    current.geocoverageRate,
  );
  const co2Confidence = confidenceFromSample(current.actionsTotal);
  const plasticConfidence =
    current.plasticKgUsed > 0 && current.actionsTotal >= 30
      ? "moyen"
      : "faible";

  const indicators: ClimateIndicator[] = [
    {
      id: "volume",
      label: "Volume collecte",
      value: current.volumeKg,
      unit: "kg",
      confidence: volumeConfidence,
    },
    {
      id: "butts",
      label: "Megots retires",
      value: current.butts,
      unit: "u",
      confidence: volumeConfidence,
    },
    {
      id: "hours",
      label: "Heures citoyennes",
      value: current.citizenHours,
      unit: "h",
      confidence: volumeConfidence,
    },
    {
      id: "co2_proxy",
      label: "CO2 evite (proxy)",
      value: current.co2ProxyKg,
      unit: "kgCO2e",
      confidence: co2Confidence,
    },
    {
      id: "plastic_leakage_proxy",
      label: "Fuite plastique evitee (proxy)",
      value: current.plasticLeakageProxyKg,
      unit: "kg",
      confidence: plasticConfidence,
    },
    {
      id: "geocoverage",
      label: "Taux geocouverture",
      value: current.geocoverageRate,
      unit: "%",
      confidence: geocoverageConfidence,
    },
  ];

  const weeklyDecisions = buildWeeklyDecisions({
    current,
    previous,
    confidence: {
      volume: volumeConfidence,
      geocoverage: geocoverageConfidence,
      co2: co2Confidence,
    },
  });

  const usingEstimatedPlastic =
    current.plasticKgUsed > 0 &&
    current.plasticKgUsed ===
      round1(current.volumeKg * CLIMATE_PROXY_FACTORS.estimatedPlasticShare);

  return {
    periodDays: params.periodDays,
    generatedAt: now.toISOString(),
    modelVersion: CLIMATE_PROXY_MODEL_VERSION,
    factors: CLIMATE_PROXY_FACTORS,
    comparison: {
      current,
      previous,
    },
    indicators,
    methods: buildMethods(),
    interpretationLimits: buildLimits(usingEstimatedPlastic),
    weeklyDecisions,
  };
}
