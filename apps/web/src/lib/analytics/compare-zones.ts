import { DAY_MS, parseInstantMs } from "@/lib/time/utc-runtime";
import { median } from "@/lib/reports/report-model/math";

export type ZoneCompareInput = {
  observedAt: string;
  locationLabel: string;
  wasteKg: number | null;
  butts: number;
  volunteersCount: number | null;
};

type ZoneCompareRow = {
  area: string;
  surfaceKm2: number;
  currentActions: number;
  previousActions: number;
  currentKg: number;
  previousKg: number;
  currentButts: number;
  previousButts: number;
  kgPerAction: number;
  wasteKnownActions: number;
  wasteCoverageRate: number;
  buttsPerAction: number;
  densityActions: number;
  participationPerAction: number;
  recurrenceScore: number;
  medianGapKgPerAction: number;
  medianGapDensity: number;
  normalizedRankScore: number;
  trend: "amelioration" | "degradation" | "stable";
  effort: "faible" | "moyen" | "fort";
};

export type ZoneCompareOutput = {
  periodDays: number;
  rows: ZoneCompareRow[];
  rawRanking: string[];
  normalizedRanking: string[];
  priorityZones: Array<{
    area: string;
    reason: string;
    effort: ZoneCompareRow["effort"];
  }>;
  improvingZones: string[];
  degradingZones: string[];
};

const AREA_SURFACE_KM2: Record<string, number> = {
  "1e": 1.83,
  "2e": 0.99,
  "3e": 1.17,
  "4e": 1.6,
  "5e": 2.54,
  "6e": 2.15,
  "7e": 4.09,
  "8e": 3.88,
  "9e": 2.18,
  "10e": 2.89,
  "11e": 3.67,
  "12e": 16.32,
  "13e": 7.15,
  "14e": 5.62,
  "15e": 8.48,
  "16e": 16.37,
  "17e": 5.67,
  "18e": 6.01,
  "19e": 6.79,
  "20e": 5.98,
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function areaFromLabel(label: string): string {
  const matched = label
    .toLowerCase()
    .match(/\b([1-9]|1[0-9]|20)(?:eme|er|e)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

type ZoneCompareBucket = {
  actions: number;
  kg: number;
  knownWasteActions: number;
  butts: number;
  volunteers: number;
  pointKeys: Set<string>;
};

type ZoneCompareGroupedRow = { current: ZoneCompareBucket; previous: ZoneCompareBucket };

function emptyZoneCompareBucket(): ZoneCompareBucket {
  return { actions: 0, kg: 0, knownWasteActions: 0, butts: 0, volunteers: 0, pointKeys: new Set<string>() };
}

function groupZoneCompareRecords(
  records: ZoneCompareInput[],
  currentFloor: number,
  previousFloor: number,
  nowMs: number,
): Map<string, ZoneCompareGroupedRow> {
  const grouped = new Map<string, ZoneCompareGroupedRow>();
  for (const record of records) {
    const observedMs = parseInstantMs(record.observedAt);
    if (observedMs === null) continue;
    const area = areaFromLabel(record.locationLabel);
    const row = grouped.get(area) ?? { current: emptyZoneCompareBucket(), previous: emptyZoneCompareBucket() };
    const bucket = observedMs >= currentFloor && observedMs <= nowMs
      ? row.current
      : observedMs >= previousFloor && observedMs < currentFloor ? row.previous : null;
    if (bucket) {
      bucket.actions += 1;
      if (record.wasteKg !== null && Number.isFinite(record.wasteKg) && record.wasteKg >= 0) {
        bucket.kg += record.wasteKg;
        bucket.knownWasteActions += 1;
      }
      bucket.butts += Number(record.butts || 0);
      if (record.volunteersCount !== null) bucket.volunteers += Number(record.volunteersCount);
      bucket.pointKeys.add(record.locationLabel.trim().toLowerCase());
    }
    grouped.set(area, row);
  }
  return grouped;
}

type ZoneCompareBaseRow = {
  area: string;
  surfaceKm2: number;
  currentActions: number;
  previousActions: number;
  currentKg: number;
  previousKg: number;
  currentButts: number;
  previousButts: number;
  kgPerAction: number;
  wasteKnownActions: number;
  previousWasteKnownActions: number;
  wasteCoverageRate: number;
  buttsPerAction: number;
  densityActions: number;
  participationPerAction: number;
  recurrenceScore: number;
};

function buildZoneCompareBaseRows(grouped: Map<string, ZoneCompareGroupedRow>): ZoneCompareBaseRow[] {
  return [...grouped.entries()].map(([area, row]) => {
    const surfaceKm2 = AREA_SURFACE_KM2[area] ?? 8;
    const currentActions = row.current.actions;
    const currentKg = row.current.kg;
    const previousActions = row.previous.actions;
    const previousKg = row.previous.kg;
    const currentButts = row.current.butts;
    const previousButts = row.previous.butts;
    const kgPerAction = row.current.knownWasteActions > 0 ? currentKg / row.current.knownWasteActions : 0;
    const buttsPerAction = currentActions > 0 ? currentButts / currentActions : 0;
    const densityActions = currentActions / Math.max(surfaceKm2, 0.1);
    const participationPerAction = currentActions > 0 ? row.current.volunteers / currentActions : 0;
    const recurringSignals = Math.max(0, currentActions - row.current.pointKeys.size);
    const recurrenceScore = row.current.pointKeys.size > 0 ? recurringSignals / row.current.pointKeys.size : 0;
    return {
      area,
      surfaceKm2,
      currentActions,
      previousActions,
      currentKg,
      previousKg,
      currentButts,
      previousButts,
      kgPerAction,
      wasteKnownActions: row.current.knownWasteActions,
      previousWasteKnownActions: row.previous.knownWasteActions,
      wasteCoverageRate: currentActions > 0 ? (row.current.knownWasteActions / currentActions) * 100 : 0,
      buttsPerAction,
      densityActions,
      participationPerAction,
      recurrenceScore,
    };
  });
}

function projectZoneCompareRows(
  baseRows: ZoneCompareBaseRow[],
  medianKgPerAction: number,
  medianDensity: number,
): ZoneCompareRow[] {
  const maxDensity = Math.max(1, ...baseRows.map((row) => row.densityActions));
  const maxKgPerAction = Math.max(1, ...baseRows.map((row) => row.kgPerAction));
  const maxButtsPerAction = Math.max(1, ...baseRows.map((row) => row.buttsPerAction));
  const maxRecurrence = Math.max(1, ...baseRows.map((row) => row.recurrenceScore));
  return baseRows.map((row) => projectZoneCompareRow(
    row,
    { maxDensity, maxKgPerAction, maxButtsPerAction, maxRecurrence },
    medianKgPerAction,
    medianDensity,
  )).sort((a, b) => b.normalizedRankScore - a.normalizedRankScore);
}

function projectZoneCompareRow(
  row: ZoneCompareBaseRow,
  max: { maxDensity: number; maxKgPerAction: number; maxButtsPerAction: number; maxRecurrence: number },
  medianKgPerAction: number,
  medianDensity: number,
): ZoneCompareRow {
  const scoreParts = [
    { value: (row.densityActions / max.maxDensity) * 100, weight: 0.35 },
    { value: (row.buttsPerAction / max.maxButtsPerAction) * 100, weight: 0.2 },
    { value: (row.recurrenceScore / max.maxRecurrence) * 100, weight: 0.15 },
  ];
  if (row.wasteKnownActions > 0) scoreParts.push({ value: (row.kgPerAction / max.maxKgPerAction) * 100, weight: 0.3 });
  const scoreWeight = scoreParts.reduce((sum, part) => sum + part.weight, 0);
  const score = scoreWeight > 0
    ? scoreParts.reduce((sum, part) => sum + part.value * part.weight, 0) / scoreWeight
    : 0;
  const previousIntensity = row.previousWasteKnownActions > 0 ? row.previousKg / row.previousWasteKnownActions : 0;
  const currentIntensity = row.wasteKnownActions > 0 ? row.currentKg / row.wasteKnownActions : 0;
  const deltaIntensity = row.wasteKnownActions > 0 && row.previousWasteKnownActions > 0
    ? currentIntensity - previousIntensity
    : 0;
  const trend: ZoneCompareRow["trend"] = deltaIntensity < -0.3
    ? "amelioration"
    : deltaIntensity > 0.3 ? "degradation" : "stable";
  return {
    area: row.area,
    surfaceKm2: row.surfaceKm2,
    currentActions: row.currentActions,
    previousActions: row.previousActions,
    currentKg: round2(row.currentKg),
    previousKg: round2(row.previousKg),
    currentButts: Math.round(row.currentButts),
    previousButts: Math.round(row.previousButts),
    kgPerAction: round2(row.kgPerAction),
    wasteKnownActions: row.wasteKnownActions,
    wasteCoverageRate: round2(row.wasteCoverageRate),
    buttsPerAction: round2(row.buttsPerAction),
    densityActions: round2(row.densityActions),
    participationPerAction: round2(row.participationPerAction),
    recurrenceScore: round2(row.recurrenceScore),
    medianGapKgPerAction: round2(row.kgPerAction - medianKgPerAction),
    medianGapDensity: round2(row.densityActions - medianDensity),
    normalizedRankScore: round2(score),
    trend,
    effort: score >= 70 ? "fort" : score >= 45 ? "moyen" : "faible",
  };
}

export function computeZoneCompare(params: {
  records: ZoneCompareInput[];
  periodDays: number;
  now?: Date;
}): ZoneCompareOutput {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const currentFloor = nowMs - params.periodDays * DAY_MS;
  const previousFloor = currentFloor - params.periodDays * DAY_MS;

  const grouped = groupZoneCompareRecords(params.records, currentFloor, previousFloor, nowMs);
  const baseRows = buildZoneCompareBaseRows(grouped);

  const medianKgPerAction = median(baseRows.map((row) => row.kgPerAction));
  const medianDensity = median(baseRows.map((row) => row.densityActions));
  const rows = projectZoneCompareRows(baseRows, medianKgPerAction, medianDensity);

  const { rawRanking, normalizedRanking, priorityZones, improvingZones, degradingZones } =
    buildZoneCompareSummary(rows, medianDensity);

  return {
    periodDays: params.periodDays,
    rows,
    rawRanking,
    normalizedRanking,
    priorityZones,
    improvingZones,
    degradingZones,
  };
}

function buildZoneCompareSummary(rows: ZoneCompareRow[], medianDensity: number) {
  const rawRanking = [...rows]
    .sort((a, b) => b.currentActions - a.currentActions)
    .map((row) => row.area);
  const normalizedRanking = rows.map((row) => row.area);
  const priorityZones = rows.slice(0, 5).map((row) => ({
    area: row.area,
    effort: row.effort,
    reason: row.recurrenceScore >= 0.5
      ? "Forte recurrence sur points deja signales"
      : row.densityActions > medianDensity
        ? "Densite d'actions superieure a la mediane reseau"
        : "Intensite de collecte par action elevee",
  }));
  return {
    rawRanking,
    normalizedRanking,
    priorityZones,
    improvingZones: rows.filter((row) => row.trend === "amelioration").map((row) => row.area),
    degradingZones: rows.filter((row) => row.trend === "degradation").map((row) => row.area),
  };
}
