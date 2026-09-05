import {
  PARIS_PRESSURE_RISK_MODEL_CONFIG,
  type ParisPressureRiskContext,
  type ParisPressureRiskEvent,
} from "./paris-pressure-risk-contract";

export function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function normalizedSignal(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp01(value)
    : null;
}

export function normalizedCount(
  value: number | null | undefined,
  scale: number,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    return null;
  }
  return clamp01(1 - Math.exp(-value / scale));
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

function eventPressure(event: ParisPressureRiskEvent): number | null {
  if (
    !Number.isFinite(event.distanceKm) ||
    event.distanceKm < 0 ||
    !Number.isFinite(event.ageDays) ||
    event.ageDays < 0
  ) {
    return null;
  }

  const distanceFactor = clamp01(
    1 - event.distanceKm / PARIS_PRESSURE_RISK_MODEL_CONFIG.decayDistances.eventRadiusKm,
  );
  const recencyFactor = clamp01(
    1 - event.ageDays / PARIS_PRESSURE_RISK_MODEL_CONFIG.decayDistances.eventHorizonDays,
  );
  const attendanceFactor =
    event.attendancePressure === null
      ? 0.5
      : normalizedSignal(event.attendancePressure);
  if (attendanceFactor === null) return null;

  return distanceFactor * recencyFactor * attendanceFactor;
}

export function resolveEventPressure(
  context: ParisPressureRiskContext,
): number | null {
  const direct = normalizedSignal(context.eventPressure);
  if (direct !== null) return direct;

  if (!context.recentEvents || context.recentEvents.length === 0) {
    return null;
  }

  const pressures = context.recentEvents
    .map(eventPressure)
    .filter((value): value is number => value !== null);
  if (pressures.length === 0) return null;

  return round(
    clamp01(1 - pressures.reduce((remaining, pressure) => remaining * (1 - pressure), 1)),
  );
}

export function cleanlinessCorrection(
  normalizedCleanlinessPressure: number | null,
  resolution: "iris" | "arrondissement" | null,
): {
  points: number;
  available: boolean;
  resolution: "iris" | "arrondissement" | "unknown";
  resolutionReason: "resolved" | "missing_prior" | "unknown_resolution";
  sourceReliability: number;
  explanation: string;
} {
  const pressure = normalizedSignal(normalizedCleanlinessPressure);
  if (pressure === null) {
    return {
      points: 0,
      available: false,
      resolution: "unknown",
      resolutionReason: "missing_prior",
      sourceReliability: 0,
      explanation: "Prior de propreté indisponible : aucune correction appliquée.",
    };
  }

  if (resolution === null) {
    return {
      points: 0,
      available: false,
      resolution: "unknown",
      resolutionReason: "unknown_resolution",
      sourceReliability: 0,
      explanation:
        "Résolution géographique du prior de propreté inconnue : aucune correction appliquée.",
    };
  }

  const resolutionMultiplier =
    resolution === "arrondissement"
      ? PARIS_PRESSURE_RISK_MODEL_CONFIG.cleanlinessCorrection.resolutionMultiplier.arrondissement
      : PARIS_PRESSURE_RISK_MODEL_CONFIG.cleanlinessCorrection.resolutionMultiplier.iris;
  const centeredPressure =
    (pressure - PARIS_PRESSURE_RISK_MODEL_CONFIG.cleanlinessCorrection.neutralPressure) * 2;
  const points = round(
    centeredPressure *
      PARIS_PRESSURE_RISK_MODEL_CONFIG.cleanlinessCorrection.maximumPoints *
      resolutionMultiplier,
  );

  return {
    points,
    available: true,
    resolution,
    resolutionReason: "resolved",
    sourceReliability: 1,
    explanation:
      points < 0
        ? "La faible pression d’anomalies documentée réduit le risque."
        : points > 0
          ? "La forte pression d’anomalies documentée augmente le risque."
          : "La pression d’anomalies documentée est neutre.",
  };
}
