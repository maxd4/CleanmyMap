import {
  PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION,
  type ParisPressureProvenance,
  type ParisPressureRawZone,
  type ParisPressureSnapshot,
  type ParisPressureZone,
} from "./paris-pressure-contract";

export const PARIS_PRESSURE_WEIGHTS = {
  residentPopulation: 0.35,
  transport: 0.25,
  tourism: 0.25,
  publicActivity: 0.15,
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function minMax(values: Array<number | null>): Array<number | null> {
  const finite = values.filter((value): value is number => value !== null);
  if (finite.length === 0) return values.map(() => null);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) {
    return values.map((value) => (value === null ? null : 0.5));
  }
  return values.map((value) =>
    value === null ? null : clamp01((value - min) / (max - min)),
  );
}

function logNormalise(values: Array<number | null>): Array<number | null> {
  return minMax(values.map((value) => (value === null ? null : Math.log1p(Math.max(0, value)))));
}

function weightedAverage(values: Array<[number | null, number]>): number | null {
  const available = values.filter(
    (entry): entry is [number, number] => entry[0] !== null,
  );
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return null;
  return clamp01(
    available.reduce((sum, [value, weight]) => sum + value * weight, 0) /
      totalWeight,
  );
}

export function buildParisPressureSnapshot(input: {
  snapshotId: string;
  generatedAt: string;
  refreshedAt: string;
  zones: ParisPressureRawZone[];
  sources: ParisPressureProvenance[];
  coverageNotes?: string[];
}): ParisPressureSnapshot {
  const population = logNormalise(input.zones.map((zone) => {
    const raw = finiteOrNull(zone.residentPopulation);
    const area = finiteOrNull(zone.areaKm2);
    return raw === null || area === null || area <= 0 ? null : raw / area;
  }));
  const transport = logNormalise(
    input.zones.map((zone) => finiteOrNull(zone.transportAnnualEntrants)),
  );
  const tourism = minMax(
    input.zones.map((zone) =>
      zone.visitorAttendance !== null && zone.visitorAttendance !== undefined
        ? zone.visitorAttendance
        : finiteOrNull(zone.tourismPresenceProxy),
    ),
  );
  const activity = logNormalise(
    input.zones.map((zone) => {
      const counts = [
        finiteOrNull(zone.authorisedTerraces),
        finiteOrNull(zone.openAirMarkets),
        finiteOrNull(zone.otherPlaces),
      ];
      return counts.every((value) => value === null)
        ? null
        : counts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    }),
  );

  const zones: ParisPressureZone[] = input.zones
    .map((rawZone, index) => {
      const areaKm2 = finiteOrNull(rawZone.areaKm2);
      const populationValue = finiteOrNull(rawZone.residentPopulation);
      const densityPerKm2 =
        populationValue !== null && areaKm2 !== null && areaKm2 > 0
          ? populationValue / areaKm2
          : null;
      const visitorAttendance = finiteOrNull(rawZone.visitorAttendance);
      const tourismPresenceProxy = finiteOrNull(rawZone.tourismPresenceProxy);
      const resident = population[index] ?? null;
      const transit = transport[index] ?? null;
      const tourismSignal = tourism[index] ?? null;
      const activitySignal = activity[index] ?? null;

      return {
        id: rawZone.id,
        label: rawZone.label,
        geographicLevel: rawZone.geographicLevel,
        arrondissementCode: rawZone.arrondissementCode ?? null,
        centroid: rawZone.centroid,
        areaKm2,
        signals: {
          residentPopulation: {
            population: populationValue,
            densityPerKm2,
            normalized: resident,
          },
          transport: {
            stationCount: finiteOrNull(rawZone.transportStationCount),
            annualEntrants: finiteOrNull(rawZone.transportAnnualEntrants),
            normalized: transit,
          },
          tourism: {
            visitorAttendance,
            tourismPresenceProxy,
            normalized: tourismSignal,
          },
          publicActivity: {
            authorisedTerraces: finiteOrNull(rawZone.authorisedTerraces),
            openAirMarkets: finiteOrNull(rawZone.openAirMarkets),
            otherPlaces: finiteOrNull(rawZone.otherPlaces),
            normalized: activitySignal,
          },
          cleanlinessPrior: {
            normalized: finiteOrNull(rawZone.cleanlinessPrior),
            rawObservations: finiteOrNull(rawZone.cleanlinessRawObservations),
            resolution: rawZone.cleanlinessResolution ?? null,
            measuredAt: rawZone.cleanlinessMeasuredAt ?? null,
          },
        },
        humanPressure: weightedAverage([
          [resident, PARIS_PRESSURE_WEIGHTS.residentPopulation],
          [transit, PARIS_PRESSURE_WEIGHTS.transport],
          [tourismSignal, PARIS_PRESSURE_WEIGHTS.tourism],
          [activitySignal, PARIS_PRESSURE_WEIGHTS.publicActivity],
        ]),
      } satisfies ParisPressureZone;
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    schemaVersion: PARIS_PRESSURE_SNAPSHOT_SCHEMA_VERSION,
    snapshotId: input.snapshotId,
    generatedAt: input.generatedAt,
    refreshedAt: input.refreshedAt,
    geographicLevel: zones.every((zone) => zone.geographicLevel === "iris")
      ? "iris"
      : "grid",
    coverage: {
      country: "FR",
      department: "75",
      commune: "75056",
      zoneCount: zones.length,
      complete: zones.length > 0,
      notes: input.coverageNotes ?? [],
    },
    sources: [...input.sources].sort((left, right) =>
      `${left.family}:${left.dataset}`.localeCompare(`${right.family}:${right.dataset}`),
    ),
    zones,
  };
}
