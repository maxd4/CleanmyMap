import type {
  ParisPressureProvenance,
  ParisPressureSignalFamily,
  ParisPressureSnapshot,
  ParisPressureZone,
} from "./paris-pressure-contract";
import {
  PARIS_PRESSURE_RISK_MODEL_CONFIG,
  type ParisPressureContextFactor,
  type ParisPressureContextProvenance,
  type ParisPressureRiskConfidence,
  type ParisPressureRiskContext,
  type ParisPressureRiskContribution,
  type ParisPressureRiskEstimate,
  type ParisPressureRiskFactor,
  type ParisPressureRiskKind,
  type ParisPressureRiskScore,
} from "./paris-pressure-risk-contract";
import {
  cleanlinessCorrection,
  normalizedCount,
  normalizedSignal,
  resolveEventPressure,
} from "./paris-pressure-risk-normalization";

type Factor = {
  key: ParisPressureRiskFactor;
  label: string;
  normalized: number | null;
  weight: number;
  sourceFamilies: ParisPressureSignalFamily[];
  contextFactor?: ParisPressureContextFactor;
};

const LABELS: Record<ParisPressureRiskFactor, string> = {
  residentialPressure: "Pression résidentielle",
  transportPressure: "Pression transport",
  stationPressure: "Présence de stations",
  tourismPressure: "Pression touristique",
  publicPlacesPressure: "Lieux fortement fréquentés",
  terracePressure: "Terrasses",
  marketPressure: "Marchés",
  eventPressure: "Événements récents",
  validatedWastePressure: "Historique déchets validé",
  validatedCigarettePressure: "Historique mégots validé",
};

function round(value: number): number {
  return Number(value.toFixed(3));
}

function sourceReliability(
  snapshot: ParisPressureSnapshot,
  factor: Factor,
  context: ParisPressureRiskContext,
): number {
  if (factor.contextFactor) {
    const sources = context.contextProvenance?.[factor.contextFactor] ?? [];
    return sources.length > 0
      ? Math.max(...sources.map((source) =>
          PARIS_PRESSURE_RISK_MODEL_CONFIG.confidence.sourceReliability[source.status],
        ))
      : PARIS_PRESSURE_RISK_MODEL_CONFIG.confidence.sourceReliability.contextWithoutProvenance;
  }

  const matches = snapshot.sources.filter((source) =>
    factor.sourceFamilies.includes(source.family),
  );
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((source) =>
    PARIS_PRESSURE_RISK_MODEL_CONFIG.confidence.sourceReliability[source.status],
  ));
}

function buildFactors(
  kind: ParisPressureRiskKind,
  zone: ParisPressureZone,
  context: ParisPressureRiskContext,
): Factor[] {
  const resident = normalizedSignal(zone.signals.residentPopulation.normalized);
  const transport = normalizedSignal(zone.signals.transport.normalized);
  const tourism = normalizedSignal(zone.signals.tourism.normalized);
  const places = normalizedSignal(zone.signals.publicActivity.normalized);
  const stations = normalizedCount(
    zone.signals.transport.stationCount,
    PARIS_PRESSURE_RISK_MODEL_CONFIG.normalization.stationCountScale,
  );
  const terraces = normalizedCount(
    zone.signals.publicActivity.authorisedTerraces,
    PARIS_PRESSURE_RISK_MODEL_CONFIG.normalization.terraceCountScale,
  );
  const markets = normalizedCount(
    zone.signals.publicActivity.openAirMarkets,
    PARIS_PRESSURE_RISK_MODEL_CONFIG.normalization.marketCountScale,
  );
  const event = resolveEventPressure(context);

  if (kind === "waste") {
    return [
      { key: "residentialPressure", label: LABELS.residentialPressure, normalized: resident, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.waste.residentialPressure, sourceFamilies: ["resident_population"] },
      { key: "transportPressure", label: LABELS.transportPressure, normalized: transport, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.waste.transportPressure, sourceFamilies: ["transport"] },
      { key: "tourismPressure", label: LABELS.tourismPressure, normalized: tourism, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.waste.tourismPressure, sourceFamilies: ["tourism"] },
      { key: "publicPlacesPressure", label: LABELS.publicPlacesPressure, normalized: places, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.waste.publicPlacesPressure, sourceFamilies: ["public_activity"] },
      { key: "marketPressure", label: LABELS.marketPressure, normalized: markets, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.waste.marketPressure, sourceFamilies: ["public_activity"] },
      { key: "eventPressure", label: LABELS.eventPressure, normalized: event, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.waste.eventPressure, sourceFamilies: [], contextFactor: "eventPressure" },
      { key: "validatedWastePressure", label: LABELS.validatedWastePressure, normalized: normalizedCount(context.validatedWasteReports, PARIS_PRESSURE_RISK_MODEL_CONFIG.normalization.validatedWasteCountScale), weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.waste.validatedWastePressure, sourceFamilies: [], contextFactor: "validatedWastePressure" },
    ];
  }

  return [
    { key: "residentialPressure", label: LABELS.residentialPressure, normalized: resident, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.residentialPressure, sourceFamilies: ["resident_population"] },
    { key: "transportPressure", label: LABELS.transportPressure, normalized: transport, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.transportPressure, sourceFamilies: ["transport"] },
    { key: "stationPressure", label: LABELS.stationPressure, normalized: stations, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.stationPressure, sourceFamilies: ["transport"] },
    { key: "tourismPressure", label: LABELS.tourismPressure, normalized: tourism, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.tourismPressure, sourceFamilies: ["tourism"] },
    { key: "terracePressure", label: LABELS.terracePressure, normalized: terraces, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.terracePressure, sourceFamilies: ["public_activity"] },
    { key: "marketPressure", label: LABELS.marketPressure, normalized: markets, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.marketPressure, sourceFamilies: ["public_activity"] },
    { key: "eventPressure", label: LABELS.eventPressure, normalized: event, weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.eventPressure, sourceFamilies: [], contextFactor: "eventPressure" },
    { key: "validatedCigarettePressure", label: LABELS.validatedCigarettePressure, normalized: normalizedCount(context.validatedCigaretteButts, PARIS_PRESSURE_RISK_MODEL_CONFIG.normalization.validatedCigaretteCountScale), weight: PARIS_PRESSURE_RISK_MODEL_CONFIG.weights.cigaretteButts.validatedCigarettePressure, sourceFamilies: [], contextFactor: "validatedCigarettePressure" },
  ];
}

function score(
  kind: ParisPressureRiskKind,
  zone: ParisPressureZone,
  snapshot: ParisPressureSnapshot,
  context: ParisPressureRiskContext,
): ParisPressureRiskScore {
  const factors = buildFactors(kind, zone, context);
  const contributions: ParisPressureRiskContribution[] = factors.map((factor) => ({
    key: factor.key,
    label: factor.label,
    normalized: factor.normalized,
    weight: factor.weight,
    points: factor.normalized === null ? 0 : round(factor.normalized * factor.weight * 100),
    available: factor.normalized !== null,
    sourceFamilies: factor.sourceFamilies,
    sourceReliability: round(sourceReliability(snapshot, factor, context)),
  }));
  const baseRisk = round(contributions.reduce((sum, contribution) => sum + contribution.points, 0));
  const prior = zone.signals.cleanlinessPrior;
  const correction = cleanlinessCorrection(prior.normalized, prior.resolution);
  const cleanlinessSources = snapshot.sources.filter(
    (source) => source.family === "cleanliness",
  );
  const cleanlinessSourceReliability =
    correction.available && cleanlinessSources.length > 0
      ? Math.max(
          ...cleanlinessSources.map(
            (source) =>
              PARIS_PRESSURE_RISK_MODEL_CONFIG.confidence.sourceReliability[
                source.status
              ],
          ),
        )
      : 0;

  return {
    baseRisk,
    cleanlinessCorrection: {
      normalizedPressure: normalizedSignal(prior.normalized),
      points: correction.points,
      available: correction.available,
      resolution: correction.resolution,
      resolutionReason: correction.resolutionReason,
      sourceReliability: round(cleanlinessSourceReliability),
      explanation: correction.explanation,
    },
    finalRisk: round(Math.min(100, Math.max(0, baseRisk + correction.points))),
    contributions,
  };
}

function confidence(
  score: ParisPressureRiskScore,
): ParisPressureRiskConfidence {
  const totalWeight = score.contributions.reduce((sum, item) => sum + item.weight, 0);
  const available = score.contributions.filter((item) => item.available);
  const dataCompleteness = round(
    available.reduce((sum, item) => sum + item.weight, 0) / totalWeight,
  );
  const sourceCompleteness = round(
    available.reduce((sum, item) => sum + item.weight * item.sourceReliability, 0) /
      totalWeight,
  );
  const cleanlinessCorrectionCompleteness = score.cleanlinessCorrection.available
    ? 1
    : 0;
  const cleanlinessCorrectionSourceReliability = score.cleanlinessCorrection
    .available
    ? score.cleanlinessCorrection.sourceReliability
    : 0;
  const confidenceScore = round(
    Math.min(
      dataCompleteness,
      sourceCompleteness,
      cleanlinessCorrectionCompleteness,
      cleanlinessCorrectionSourceReliability,
    ),
  );
  const thresholds = PARIS_PRESSURE_RISK_MODEL_CONFIG.confidence.levelThresholds;
  const level =
    confidenceScore === 0
      ? "unknown"
      : confidenceScore >= thresholds.high
        ? "high"
        : confidenceScore >= thresholds.medium
          ? "medium"
          : "low";

  return {
    dataCompleteness,
    sourceCompleteness,
    cleanlinessCorrectionCompleteness,
    cleanlinessCorrectionSourceReliability,
    score: confidenceScore,
    level,
    availableFactors: available.length,
    totalFactors: score.contributions.length,
    missingFactors: score.contributions
      .filter((item) => !item.available)
      .map((item) => item.key),
  };
}

function relevantProvenance(
  snapshot: ParisPressureSnapshot,
  waste: ParisPressureRiskScore,
  cigaretteButts: ParisPressureRiskScore,
  context: ParisPressureRiskContext,
): {
  snapshot: ParisPressureProvenance[];
  context: ParisPressureContextProvenance[];
} {
  const families = new Set<ParisPressureSignalFamily>();
  for (const contribution of [...waste.contributions, ...cigaretteButts.contributions]) {
    if (contribution.available) {
      for (const family of contribution.sourceFamilies) families.add(family);
    }
  }
  if (waste.cleanlinessCorrection.available || cigaretteButts.cleanlinessCorrection.available) {
    families.add("cleanliness");
  }
  const sources = snapshot.sources.filter((source) => families.has(source.family));
  const contextFactors = new Set<ParisPressureContextFactor>();
  for (const contribution of [...waste.contributions, ...cigaretteButts.contributions]) {
    if (contribution.available) {
      if (contribution.key === "eventPressure") contextFactors.add("eventPressure");
      if (contribution.key === "validatedWastePressure") contextFactors.add("validatedWastePressure");
      if (contribution.key === "validatedCigarettePressure") contextFactors.add("validatedCigarettePressure");
    }
  }
  const contextSources = [...contextFactors].flatMap(
    (factor) => context.contextProvenance?.[factor] ?? [],
  );
  const seenSnapshot = new Set<string>();
  const relevantSnapshot = sources.filter((source) => {
    const key = `${source.family}:${source.dataset}:${source.datasetVersion}`;
    if (seenSnapshot.has(key)) return false;
    seenSnapshot.add(key);
    return true;
  });
  const seenContext = new Set<string>();
  const relevantContext = contextSources.filter((source) => {
    const key = `${source.factor}:${source.dataset}:${source.datasetVersion}`;
    if (seenContext.has(key)) return false;
    seenContext.add(key);
    return true;
  });
  return { snapshot: relevantSnapshot, context: relevantContext };
}

function provenanceGaps(
  waste: ParisPressureRiskScore,
  cigaretteButts: ParisPressureRiskScore,
  context: ParisPressureRiskContext,
): Array<{ factor: ParisPressureContextFactor; message: string }> {
  const factorOrder: ParisPressureContextFactor[] = [
    "eventPressure",
    "validatedWastePressure",
    "validatedCigarettePressure",
  ];
  const contextFactors = new Set<ParisPressureContextFactor>();
  for (const contribution of [...waste.contributions, ...cigaretteButts.contributions]) {
    if (contribution.available) {
      if (contribution.key === "eventPressure") contextFactors.add("eventPressure");
      if (contribution.key === "validatedWastePressure") contextFactors.add("validatedWastePressure");
      if (contribution.key === "validatedCigarettePressure") contextFactors.add("validatedCigarettePressure");
    }
  }
  return factorOrder
    .filter((factor) => contextFactors.has(factor))
    .flatMap((factor) => {
      const sources = context.contextProvenance?.[factor] ?? [];
      if (sources.some((source) => source.status === "available" || source.status === "partial")) {
        return [];
      }
      return [{
        factor,
        message: sources.length === 0
          ? "Provenance contextuelle absente"
          : "Provenance contextuelle indisponible",
      }];
    });
}

export function estimateWasteRisk(
  zone: ParisPressureZone,
  snapshot: ParisPressureSnapshot,
  context: ParisPressureRiskContext = {},
): ParisPressureRiskScore {
  return score("waste", zone, snapshot, context);
}

export function estimateCigaretteButtRisk(
  zone: ParisPressureZone,
  snapshot: ParisPressureSnapshot,
  context: ParisPressureRiskContext = {},
): ParisPressureRiskScore {
  return score("cigaretteButts", zone, snapshot, context);
}

export function estimateParisPressureRisk(
  zone: ParisPressureZone,
  snapshot: ParisPressureSnapshot,
  context: ParisPressureRiskContext = {},
): ParisPressureRiskEstimate {
  const waste = estimateWasteRisk(zone, snapshot, context);
  const cigaretteButts = estimateCigaretteButtRisk(zone, snapshot, context);
  const provenance = relevantProvenance(snapshot, waste, cigaretteButts, context);
  return {
    zoneId: zone.id,
    zoneLabel: zone.label,
    predictionModelVersion: PARIS_PRESSURE_RISK_MODEL_CONFIG.predictionModelVersion,
    snapshot: {
      snapshotId: snapshot.snapshotId,
      schemaVersion: snapshot.schemaVersion,
      generatedAt: snapshot.generatedAt,
      refreshedAt: snapshot.refreshedAt,
    },
    wasteRisk: waste.finalRisk,
    cigaretteButtRisk: cigaretteButts.finalRisk,
    waste,
    cigaretteButts,
    confidence: {
      waste: confidence(waste),
      cigaretteButts: confidence(cigaretteButts),
    },
    provenance: provenance.snapshot,
    contextProvenance: provenance.context,
    provenanceGaps: provenanceGaps(waste, cigaretteButts, context),
  };
}

export function estimateParisPressureRiskByZone(
  snapshot: ParisPressureSnapshot,
  contexts: ReadonlyMap<string, ParisPressureRiskContext> = new Map(),
): ParisPressureRiskEstimate[] {
  return snapshot.zones
    .map((zone) => estimateParisPressureRisk(zone, snapshot, contexts.get(zone.id) ?? {}))
    .sort((left, right) =>
      right.wasteRisk - left.wasteRisk ||
      right.cigaretteButtRisk - left.cigaretteButtRisk ||
      left.zoneId.localeCompare(right.zoneId),
    );
}
