export type TerritorialInput = {
  locationLabel: string;
  wasteKg: number;
  volunteersCount: number;
  actionsCount?: number;
};

export type TerritorialBenchmarkRow = {
  area: string;
  surfaceKm2: number;
  densityPerKm2: number;
  estimatedPopulation: number;
  actionsCount: number;
  totalKg: number;
  totalVolunteers: number;
  actionsPerKm2: number;
  kgPerKm2: number;
  volunteersPer10k: number;
  normalizedScore: number;
  decisionLabel: "Priorite haute" | "Priorite moyenne" | "Priorite de fond";
};

type AreaReference = {
  surfaceKm2: number;
  densityPerKm2: number;
};

const AREA_REFERENCE: Record<string, AreaReference> = {
  "1e": { surfaceKm2: 1.83, densityPerKm2: 9600 },
  "2e": { surfaceKm2: 0.99, densityPerKm2: 21000 },
  "3e": { surfaceKm2: 1.17, densityPerKm2: 30900 },
  "4e": { surfaceKm2: 1.6, densityPerKm2: 17000 },
  "5e": { surfaceKm2: 2.54, densityPerKm2: 22500 },
  "6e": { surfaceKm2: 2.15, densityPerKm2: 19700 },
  "7e": { surfaceKm2: 4.09, densityPerKm2: 14000 },
  "8e": { surfaceKm2: 3.88, densityPerKm2: 10000 },
  "9e": { surfaceKm2: 2.18, densityPerKm2: 27700 },
  "10e": { surfaceKm2: 2.89, densityPerKm2: 32000 },
  "11e": { surfaceKm2: 3.67, densityPerKm2: 42000 },
  "12e": { surfaceKm2: 16.32, densityPerKm2: 8800 },
  "13e": { surfaceKm2: 7.15, densityPerKm2: 26000 },
  "14e": { surfaceKm2: 5.62, densityPerKm2: 24000 },
  "15e": { surfaceKm2: 8.48, densityPerKm2: 28000 },
  "16e": { surfaceKm2: 16.37, densityPerKm2: 10000 },
  "17e": { surfaceKm2: 5.67, densityPerKm2: 30000 },
  "18e": { surfaceKm2: 6.01, densityPerKm2: 33000 },
  "19e": { surfaceKm2: 6.79, densityPerKm2: 27000 },
  "20e": { surfaceKm2: 5.98, densityPerKm2: 32000 },
};

function extractArrondissement(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:e|eme|er)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalized(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / max) * 100));
}

export function buildTerritorialBenchmark(
  rows: TerritorialInput[],
): TerritorialBenchmarkRow[] {
  const grouped = new Map<
    string,
    { actionsCount: number; totalKg: number; totalVolunteers: number }
  >();
  for (const row of rows) {
    const area = extractArrondissement(row.locationLabel);
    const previous = grouped.get(area) ?? {
      actionsCount: 0,
      totalKg: 0,
      totalVolunteers: 0,
    };
    previous.actionsCount += row.actionsCount ?? 1;
    previous.totalKg += Number(row.wasteKg || 0);
    previous.totalVolunteers += Number(row.volunteersCount || 0);
    grouped.set(area, previous);
  }

  const computed = [...grouped.entries()].map(([area, stats]) => {
    const reference = AREA_REFERENCE[area] ?? {
      surfaceKm2: 8,
      densityPerKm2: 18000,
    };
    const estimatedPopulation = reference.surfaceKm2 * reference.densityPerKm2;
    const actionsPerKm2 =
      stats.actionsCount / Math.max(reference.surfaceKm2, 0.1);
    const kgPerKm2 = stats.totalKg / Math.max(reference.surfaceKm2, 0.1);
    const volunteersPer10k =
      estimatedPopulation > 0
        ? (stats.totalVolunteers / estimatedPopulation) * 10000
        : 0;
    return {
      area,
      surfaceKm2: reference.surfaceKm2,
      densityPerKm2: reference.densityPerKm2,
      estimatedPopulation,
      actionsCount: stats.actionsCount,
      totalKg: stats.totalKg,
      totalVolunteers: stats.totalVolunteers,
      actionsPerKm2,
      kgPerKm2,
      volunteersPer10k,
    };
  });

  const maxActionsPerKm2 = Math.max(
    1,
    ...computed.map((row) => row.actionsPerKm2),
  );
  const maxKgPerKm2 = Math.max(1, ...computed.map((row) => row.kgPerKm2));
  const maxVolunteersPer10k = Math.max(
    1,
    ...computed.map((row) => row.volunteersPer10k),
  );
  const maxDensity = Math.max(1, ...computed.map((row) => row.densityPerKm2));

  return computed
    .map((row) => {
      const actionsScore = normalized(row.actionsPerKm2, maxActionsPerKm2);
      const kgScore = normalized(row.kgPerKm2, maxKgPerKm2);
      const volunteersScore = normalized(
        row.volunteersPer10k,
        maxVolunteersPer10k,
      );
      const densityPressure = normalized(row.densityPerKm2, maxDensity);
      const normalizedScore = round1(
        actionsScore * 0.35 +
          kgScore * 0.35 +
          volunteersScore * 0.2 +
          densityPressure * 0.1,
      );
      const decisionLabel: TerritorialBenchmarkRow["decisionLabel"] =
        normalizedScore >= 66
          ? "Priorite haute"
          : normalizedScore >= 40
            ? "Priorite moyenne"
            : "Priorite de fond";
      return {
        ...row,
        actionsPerKm2: round1(row.actionsPerKm2),
        kgPerKm2: round1(row.kgPerKm2),
        volunteersPer10k: round1(row.volunteersPer10k),
        normalizedScore,
        decisionLabel,
      };
    })
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 12);
}
