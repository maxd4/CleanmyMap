import { buildTerritorialBenchmark } from "../analytics/territorial-benchmark";
import type { ActionDataContract } from "../actions/data-contract";
import { computeActionImpactKpis } from "../actions/impact-calculators";
import type { PilotageModerationAvailability } from "./metrics";
import type { ZoneComparisonRow } from "./prioritization";
import {
  DAY_MS,
  areaFromLabel,
  parseDateMs,
  round1,
  safePercentDelta,
} from "./overview.utils";

type ZoneAccumulator = {
  actions: number;
  kg: number;
  knownWasteActions: number;
  geolocated: number;
  pendingAgesDays: number[];
};

function emptyZoneAccumulator(): ZoneAccumulator {
  return {
    actions: 0,
    kg: 0,
    knownWasteActions: 0,
    geolocated: 0,
    pendingAgesDays: [],
  };
}

function addContractToZone(
  target: Map<string, ZoneAccumulator>,
  area: string,
  contract: ActionDataContract,
  pendingAgeDays: number | null,
  isGeolocated: boolean,
): void {
  const row = target.get(area) ?? emptyZoneAccumulator();
  if (contract.status === "approved") {
    const impact = computeActionImpactKpis(contract);
    row.actions += 1;
    if (impact.wasteKnown) {
      row.kg += impact.wasteKg;
      row.knownWasteActions += 1;
    }
    row.geolocated += isGeolocated ? 1 : 0;
  }
  if (pendingAgeDays !== null) row.pendingAgesDays.push(pendingAgeDays);
  target.set(area, row);
}

type ZoneMetrics = Pick<ZoneComparisonRow,
  "deltaActionsAbsolute" | "currentKg" | "previousKg" | "currentWasteCoverageRate" |
  "previousWasteCoverageRate" | "deltaKgAbsolute" | "deltaActionsPercent" | "deltaKgPercent" |
  "currentCoverageRate" | "previousCoverageRate" | "deltaCoverageRateAbsolute" |
  "deltaCoverageRatePercent" | "currentModerationDelayDays" | "previousModerationDelayDays" |
  "deltaModerationDelayDaysAbsolute" | "deltaModerationDelayDaysPercent"
>;

function averageZoneDelay(values: readonly number[]): number {
  return values.length > 0
    ? round1(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function buildZoneMetrics(
  current: ZoneAccumulator,
  previous: ZoneAccumulator,
  moderationAvailability: PilotageModerationAvailability,
): ZoneMetrics {
  const currentWasteCoverageRate = current.actions > 0
    ? round1((current.knownWasteActions / current.actions) * 100)
    : 0;
  const previousWasteCoverageRate = previous.actions > 0
    ? round1((previous.knownWasteActions / previous.actions) * 100)
    : 0;
  const currentCoverageRate = current.actions > 0
    ? round1((current.geolocated / current.actions) * 100)
    : 0;
  const previousCoverageRate = previous.actions > 0
    ? round1((previous.geolocated / previous.actions) * 100)
    : 0;
  const currentModerationDelayDays = moderationAvailability === "available"
    ? averageZoneDelay(current.pendingAgesDays)
    : null;
  const previousModerationDelayDays = moderationAvailability === "available"
    ? averageZoneDelay(previous.pendingAgesDays)
    : null;
  return {
    deltaActionsAbsolute: round1(current.actions - previous.actions),
    currentKg: round1(current.kg),
    previousKg: round1(previous.kg),
    currentWasteCoverageRate,
    previousWasteCoverageRate,
    deltaKgAbsolute: round1(current.kg - previous.kg),
    deltaActionsPercent: round1(safePercentDelta(current.actions, previous.actions)),
    deltaKgPercent: currentWasteCoverageRate === 100 && previousWasteCoverageRate === 100
      ? round1(safePercentDelta(current.kg, previous.kg))
      : 0,
    currentCoverageRate,
    previousCoverageRate,
    deltaCoverageRateAbsolute: round1(currentCoverageRate - previousCoverageRate),
    deltaCoverageRatePercent: round1(safePercentDelta(currentCoverageRate, previousCoverageRate)),
    currentModerationDelayDays,
    previousModerationDelayDays,
    deltaModerationDelayDaysAbsolute: currentModerationDelayDays === null || previousModerationDelayDays === null
      ? null
      : round1(currentModerationDelayDays - previousModerationDelayDays),
    deltaModerationDelayDaysPercent: currentModerationDelayDays === null || previousModerationDelayDays === null
      ? null
      : round1(safePercentDelta(currentModerationDelayDays, previousModerationDelayDays)),
  };
}

function zoneGuidance(normalizedScore: number, deltaKgPercent: number): Pick<ZoneComparisonRow, "urgency" | "justification" | "recommendedAction"> {
  const urgency: ZoneComparisonRow["urgency"] = normalizedScore >= 70 || deltaKgPercent >= 30
    ? "critique"
    : normalizedScore >= 50 || deltaKgPercent >= 15 ? "elevee" : "moderee";
  return {
    urgency,
    justification: urgency === "critique"
      ? "Pression territoriale forte avec progression d'impact sur la periode courante."
      : urgency === "elevee"
        ? "Zone a surveiller: hausse d'activite et score territorial au-dessus de la moyenne."
        : "Zone stable, suivi de fond recommande.",
    recommendedAction: urgency === "critique"
      ? "Declencher une campagne ciblee sous 7 jours avec renfort moderation/geotrace."
      : urgency === "elevee"
        ? "Planifier une intervention ciblee et renforcer la preuve geolocalisee."
        : "Maintenir la surveillance mensuelle et corriger les signaux de qualite faibles.",
  };
}

function buildZoneComparisonRow(params: {
  area: string;
  current: ZoneAccumulator;
  previous: ZoneAccumulator;
  benchmarkRow: { normalizedScore: number } | undefined;
  moderationAvailability: PilotageModerationAvailability;
}): ZoneComparisonRow {
  const metrics = buildZoneMetrics(params.current, params.previous, params.moderationAvailability);
  return {
    area: params.area,
    currentActions: params.current.actions,
    previousActions: params.previous.actions,
    currentWasteKnownActions: params.current.knownWasteActions,
    previousWasteKnownActions: params.previous.knownWasteActions,
    normalizedScore: params.benchmarkRow?.normalizedScore ?? 0,
    ...metrics,
    ...zoneGuidance(params.benchmarkRow?.normalizedScore ?? 0, metrics.deltaKgPercent),
  };
}

function partitionContractsByPeriod(params: {
  contracts: readonly ActionDataContract[];
  nowMs: number;
  currentFloorMs: number;
  previousFloorMs: number;
  moderationAvailability: PilotageModerationAvailability;
}): { current: Map<string, ZoneAccumulator>; previous: Map<string, ZoneAccumulator> } {
  const current = new Map<string, ZoneAccumulator>();
  const previous = new Map<string, ZoneAccumulator>();
  for (const contract of params.contracts) {
    if (contract.type !== "action") continue;
    const observedMs = parseDateMs(contract.dates.observedAt);
    if (observedMs === null) continue;
    const area = areaFromLabel(contract.location.label);
    const isGeolocated = contract.location.latitude !== null && contract.location.longitude !== null;
    const createdMs = parseDateMs(contract.dates.createdAt ?? contract.dates.importedAt);
    const pendingAgeDays = params.moderationAvailability === "available" && contract.status === "pending" && createdMs !== null
      ? Math.max(0, (params.nowMs - createdMs) / DAY_MS)
      : null;
    if (observedMs >= params.currentFloorMs && observedMs <= params.nowMs) {
      addContractToZone(current, area, contract, pendingAgeDays, isGeolocated);
      continue;
    }
    if (observedMs >= params.previousFloorMs && observedMs < params.currentFloorMs) {
      addContractToZone(previous, area, contract, pendingAgeDays, isGeolocated);
    }
  }
  return { current, previous };
}

export function buildZones(
  contracts: ActionDataContract[],
  periodDays: number,
  now: Date,
  moderationAvailability: PilotageModerationAvailability = "available",
): ZoneComparisonRow[] {
  const nowMs = now.getTime();
  const currentFloorMs = nowMs - periodDays * DAY_MS;
  const previousFloorMs = currentFloorMs - periodDays * DAY_MS;

  const { current: currentByArea, previous: previousByArea } = partitionContractsByPeriod({
    contracts,
    nowMs,
    currentFloorMs,
    previousFloorMs,
    moderationAvailability,
  });

  const benchmark = buildTerritorialBenchmark(
    contracts.map((contract) => ({
      type: contract.type,
      status: contract.status,
      locationLabel: contract.location.label,
      wasteKg: contract.metadata.wasteKg,
      volunteersCount: computeActionImpactKpis(contract).volunteers,
    })),
  );
  const benchmarkByArea = new Map(benchmark.map((row) => [row.area, row]));

  const allAreas = new Set<string>([...currentByArea.keys(), ...previousByArea.keys()]);

  return [...allAreas]
    .map((area) => buildZoneComparisonRow({
      area,
      current: currentByArea.get(area) ?? emptyZoneAccumulator(),
      previous: previousByArea.get(area) ?? emptyZoneAccumulator(),
      benchmarkRow: benchmarkByArea.get(area),
      moderationAvailability,
    }))
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 12);
}
