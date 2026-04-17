export type ZoneCompareInput = {
  observedAt: string;
  locationLabel: string;
  wasteKg: number;
  butts: number;
  volunteersCount: number;
};

export type ZoneCompareRow = {
  area: string;
  surfaceKm2: number;
  currentActions: number;
  previousActions: number;
  currentKg: number;
  previousKg: number;
  currentButts: number;
  previousButts: number;
  kgPerAction: number;
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

const DAY_MS = 24 * 60 * 60 * 1000;

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
    .match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

function parseMs(raw: string): number | null {
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : null;
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

export function computeZoneCompare(params: {
  records: ZoneCompareInput[];
  periodDays: number;
  now?: Date;
}): ZoneCompareOutput {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const currentFloor = nowMs - params.periodDays * DAY_MS;
  const previousFloor = currentFloor - params.periodDays * DAY_MS;

  const grouped = new Map<
    string,
    {
      current: {
        actions: number;
        kg: number;
        butts: number;
        volunteers: number;
        pointKeys: Set<string>;
      };
      previous: {
        actions: number;
        kg: number;
        butts: number;
        volunteers: number;
        pointKeys: Set<string>;
      };
    }
  >();

  for (const record of params.records) {
    const observedMs = parseMs(record.observedAt);
    if (observedMs === null) {
      continue;
    }
    const area = areaFromLabel(record.locationLabel);
    const row = grouped.get(area) ?? {
      current: {
        actions: 0,
        kg: 0,
        butts: 0,
        volunteers: 0,
        pointKeys: new Set<string>(),
      },
      previous: {
        actions: 0,
        kg: 0,
        butts: 0,
        volunteers: 0,
        pointKeys: new Set<string>(),
      },
    };

    const pointKey = record.locationLabel.trim().toLowerCase();

    if (observedMs >= currentFloor && observedMs <= nowMs) {
      row.current.actions += 1;
      row.current.kg += Number(record.wasteKg || 0);
      row.current.butts += Number(record.butts || 0);
      row.current.volunteers += Number(record.volunteersCount || 0);
      row.current.pointKeys.add(pointKey);
    } else if (observedMs >= previousFloor && observedMs < currentFloor) {
      row.previous.actions += 1;
      row.previous.kg += Number(record.wasteKg || 0);
      row.previous.butts += Number(record.butts || 0);
      row.previous.volunteers += Number(record.volunteersCount || 0);
      row.previous.pointKeys.add(pointKey);
    }

    grouped.set(area, row);
  }

  const baseRows = [...grouped.entries()].map(([area, row]) => {
    const surfaceKm2 = AREA_SURFACE_KM2[area] ?? 8;
    const currentActions = row.current.actions;
    const previousActions = row.previous.actions;
    const currentKg = row.current.kg;
    const previousKg = row.previous.kg;
    const currentButts = row.current.butts;
    const previousButts = row.previous.butts;

    const kgPerAction = currentActions > 0 ? currentKg / currentActions : 0;
    const buttsPerAction =
      currentActions > 0 ? currentButts / currentActions : 0;
    const densityActions = currentActions / Math.max(surfaceKm2, 0.1);
    const participationPerAction =
      currentActions > 0 ? row.current.volunteers / currentActions : 0;
    const recurringSignals = Math.max(
      0,
      currentActions - row.current.pointKeys.size,
    );
    const recurrenceScore =
      row.current.pointKeys.size > 0
        ? recurringSignals / row.current.pointKeys.size
        : 0;

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
      buttsPerAction,
      densityActions,
      participationPerAction,
      recurrenceScore,
    };
  });

  const medianKgPerAction = median(baseRows.map((row) => row.kgPerAction));
  const medianDensity = median(baseRows.map((row) => row.densityActions));
  const maxDensity = Math.max(1, ...baseRows.map((row) => row.densityActions));
  const maxKgPerAction = Math.max(1, ...baseRows.map((row) => row.kgPerAction));
  const maxButtsPerAction = Math.max(
    1,
    ...baseRows.map((row) => row.buttsPerAction),
  );
  const maxRecurrence = Math.max(
    1,
    ...baseRows.map((row) => row.recurrenceScore),
  );

  const rows: ZoneCompareRow[] = baseRows
    .map((row) => {
      const score =
        (row.densityActions / maxDensity) * 100 * 0.35 +
        (row.kgPerAction / maxKgPerAction) * 100 * 0.3 +
        (row.buttsPerAction / maxButtsPerAction) * 100 * 0.2 +
        (row.recurrenceScore / maxRecurrence) * 100 * 0.15;

      const previousIntensity =
        row.previousActions > 0 ? row.previousKg / row.previousActions : 0;
      const currentIntensity =
        row.currentActions > 0 ? row.currentKg / row.currentActions : 0;
      const deltaIntensity = currentIntensity - previousIntensity;

      const trend: ZoneCompareRow["trend"] =
        deltaIntensity < -0.3
          ? "amelioration"
          : deltaIntensity > 0.3
            ? "degradation"
            : "stable";

      const effort: ZoneCompareRow["effort"] =
        score >= 70 ? "fort" : score >= 45 ? "moyen" : "faible";

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
        buttsPerAction: round2(row.buttsPerAction),
        densityActions: round2(row.densityActions),
        participationPerAction: round2(row.participationPerAction),
        recurrenceScore: round2(row.recurrenceScore),
        medianGapKgPerAction: round2(row.kgPerAction - medianKgPerAction),
        medianGapDensity: round2(row.densityActions - medianDensity),
        normalizedRankScore: round2(score),
        trend,
        effort,
      };
    })
    .sort((a, b) => b.normalizedRankScore - a.normalizedRankScore);

  const rawRanking = [...rows]
    .sort((a, b) => b.currentActions - a.currentActions)
    .map((row) => row.area);
  const normalizedRanking = rows.map((row) => row.area);

  const priorityZones = rows.slice(0, 5).map((row) => ({
    area: row.area,
    effort: row.effort,
    reason:
      row.recurrenceScore >= 0.5
        ? "Forte recurrence sur points deja signales"
        : row.densityActions > medianDensity
          ? "Densite d'actions superieure a la mediane reseau"
          : "Intensite de collecte par action elevee",
  }));

  const improvingZones = rows
    .filter((row) => row.trend === "amelioration")
    .map((row) => row.area);
  const degradingZones = rows
    .filter((row) => row.trend === "degradation")
    .map((row) => row.area);

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
