import {
  toActionListItem,
  type ActionDataContract,
} from "../actions/data-contract";
import { evaluateActionQuality } from "../actions/quality";
import { PILOTAGE_FORMULA_VERSION, PILOTAGE_THRESHOLDS } from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

export type PilotageWindowMetrics = {
  approvedActions: number;
  impactVolumeKg: number;
  mobilizationCount: number;
  qualityScore: number;
  coverageRate: number;
  moderationDelayDays: number;
  pendingCount: number;
  reliability: {
    level: "elevee" | "moyenne" | "faible";
    score: number;
    completeness: number;
    geoloc: number;
    freshness: number;
    sampleSize: number;
    reason: string;
  };
};

export type PilotageMetricComparison = {
  current: number;
  previous: number;
  deltaAbsolute: number;
  deltaPercent: number;
  trend: "up" | "down" | "flat";
  interpretation: "positive" | "negative" | "neutral";
  strength: "stable" | "moderate" | "strong";
};

export type PilotageComparisonResult = {
  formulaVersion: string;
  periodDays: number;
  generatedAt: string;
  current: PilotageWindowMetrics;
  previous: PilotageWindowMetrics;
  metrics: {
    approvedActions: PilotageMetricComparison;
    impactVolumeKg: PilotageMetricComparison;
    mobilizationCount: PilotageMetricComparison;
    qualityScore: PilotageMetricComparison;
    coverageRate: PilotageMetricComparison;
    moderationDelayDays: PilotageMetricComparison;
  };
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function reliabilityLevelFromScore(
  score: number,
): "elevee" | "moyenne" | "faible" {
  if (score >= PILOTAGE_THRESHOLDS.reliabilityHighScore) {
    return "elevee";
  }
  if (score >= PILOTAGE_THRESHOLDS.reliabilityMediumScore) {
    return "moyenne";
  }
  return "faible";
}

function buildReliability(input: {
  approvedActions: number;
  completeness: number;
  geoloc: number;
  freshness: number;
}): PilotageWindowMetrics["reliability"] {
  const baseScore =
    input.completeness * 0.4 + input.geoloc * 0.35 + input.freshness * 0.25;
  const lowSamplePenalty =
    input.approvedActions < PILOTAGE_THRESHOLDS.reliabilityLowSampleFloor
      ? 15
      : 0;
  const score = Math.max(
    0,
    Math.min(100, round1(baseScore - lowSamplePenalty)),
  );
  const level = reliabilityLevelFromScore(score);

  const reason =
    lowSamplePenalty > 0
      ? `Faible echantillon (${input.approvedActions} action(s))`
      : level === "elevee"
        ? "Qualite de donnees robuste"
        : level === "moyenne"
          ? "Lecture exploitable avec prudence"
          : "Risque de faux signaux (qualite insuffisante)";

  return {
    level,
    score,
    completeness: round1(input.completeness),
    geoloc: round1(input.geoloc),
    freshness: round1(input.freshness),
    sampleSize: input.approvedActions,
    reason,
  };
}

function parseDateMs(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function isGeolocated(contract: ActionDataContract): boolean {
  const latitude = contract.location.latitude;
  const longitude = contract.location.longitude;
  if (latitude === null || longitude === null) {
    return false;
  }
  return (
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
  );
}

function computeWindowMetrics(
  records: ActionDataContract[],
  windowEndMs: number,
): PilotageWindowMetrics {
  const approved = records.filter((record) => record.status === "approved");
  const pending = records.filter((record) => record.status === "pending");

  const approvedActions = approved.length;
  const impactVolumeKg = approved.reduce(
    (acc, record) => acc + Number(record.metadata.wasteKg || 0),
    0,
  );
  const mobilizationCount = approved.reduce(
    (acc, record) => acc + Number(record.metadata.volunteersCount || 0),
    0,
  );

  const qualityResults = approved.map((record) =>
    evaluateActionQuality(toActionListItem(record), new Date(windowEndMs)),
  );
  const qualitySamples = qualityResults.map((result) => result.score);
  const qualityScore = average(qualitySamples);
  const completeness = average(
    qualityResults.map((result) => result.breakdown.completeness),
  );
  const geoloc = average(
    qualityResults.map((result) => result.breakdown.geoloc),
  );
  const freshness = average(
    qualityResults.map((result) => result.breakdown.freshness),
  );

  const geolocatedCount = approved.filter((record) =>
    isGeolocated(record),
  ).length;
  const coverageRate =
    approvedActions > 0 ? (geolocatedCount / approvedActions) * 100 : 0;

  const pendingAges = pending
    .map((record) => {
      const createdAt = parseDateMs(
        record.dates.createdAt ?? record.dates.importedAt,
      );
      if (createdAt === null || createdAt > windowEndMs) {
        return null;
      }
      return (windowEndMs - createdAt) / DAY_MS;
    })
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );

  return {
    approvedActions,
    impactVolumeKg: round1(impactVolumeKg),
    mobilizationCount,
    qualityScore: round1(qualityScore),
    coverageRate: round1(coverageRate),
    moderationDelayDays: round1(median(pendingAges)),
    pendingCount: pending.length,
    reliability: buildReliability({
      approvedActions,
      completeness,
      geoloc,
      freshness,
    }),
  };
}

function compareMetric(
  current: number,
  previous: number,
  betterWhenLower: boolean,
): PilotageMetricComparison {
  const deltaAbsolute = round1(current - previous);
  const deltaPercent =
    previous === 0
      ? current === 0
        ? 0
        : 100
      : round1(((current - previous) / Math.abs(previous)) * 100);

  const trend: "up" | "down" | "flat" =
    deltaAbsolute > 0 ? "up" : deltaAbsolute < 0 ? "down" : "flat";

  const absPercent = Math.abs(deltaPercent);
  const strength: "stable" | "moderate" | "strong" =
    absPercent <= PILOTAGE_THRESHOLDS.deltaStablePercent
      ? "stable"
      : absPercent <= PILOTAGE_THRESHOLDS.deltaStrongPercent
        ? "moderate"
        : "strong";

  const improves = betterWhenLower ? trend === "down" : trend === "up";
  const interpretation: "positive" | "negative" | "neutral" =
    trend === "flat" ? "neutral" : improves ? "positive" : "negative";

  return {
    current: round1(current),
    previous: round1(previous),
    deltaAbsolute,
    deltaPercent,
    trend,
    interpretation,
    strength,
  };
}

export function computePilotageComparison(
  records: ActionDataContract[],
  periodDays: number,
  now: Date = new Date(),
): PilotageComparisonResult {
  const nowMs = now.getTime();
  const currentFloorMs = nowMs - periodDays * DAY_MS;
  const previousFloorMs = currentFloorMs - periodDays * DAY_MS;

  const currentRecords = records.filter((record) => {
    const observedMs = parseDateMs(record.dates.observedAt);
    return (
      observedMs !== null && observedMs >= currentFloorMs && observedMs <= nowMs
    );
  });

  const previousRecords = records.filter((record) => {
    const observedMs = parseDateMs(record.dates.observedAt);
    return (
      observedMs !== null &&
      observedMs >= previousFloorMs &&
      observedMs < currentFloorMs
    );
  });

  const current = computeWindowMetrics(currentRecords, nowMs);
  const previous = computeWindowMetrics(previousRecords, currentFloorMs);

  return {
    formulaVersion: PILOTAGE_FORMULA_VERSION,
    periodDays,
    generatedAt: now.toISOString(),
    current,
    previous,
    metrics: {
      approvedActions: compareMetric(
        current.approvedActions,
        previous.approvedActions,
        false,
      ),
      impactVolumeKg: compareMetric(
        current.impactVolumeKg,
        previous.impactVolumeKg,
        false,
      ),
      mobilizationCount: compareMetric(
        current.mobilizationCount,
        previous.mobilizationCount,
        false,
      ),
      qualityScore: compareMetric(
        current.qualityScore,
        previous.qualityScore,
        false,
      ),
      coverageRate: compareMetric(
        current.coverageRate,
        previous.coverageRate,
        false,
      ),
      moderationDelayDays: compareMetric(
        current.moderationDelayDays,
        previous.moderationDelayDays,
        true,
      ),
    },
  };
}
