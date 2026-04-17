import { buildTerritorialBenchmark } from "../analytics/territorial-benchmark";
import type { ActionDataContract } from "../actions/data-contract";
import type { ZoneComparisonRow } from "./prioritization";
import {
  DAY_MS,
  areaFromLabel,
  parseDateMs,
  round1,
  safePercentDelta,
} from "./overview-shared";

export function buildZones(
  contracts: ActionDataContract[],
  periodDays: number,
  now: Date,
): ZoneComparisonRow[] {
  const nowMs = now.getTime();
  const currentFloorMs = nowMs - periodDays * DAY_MS;
  const previousFloorMs = currentFloorMs - periodDays * DAY_MS;

  const currentByArea = new Map<
    string,
    {
      actions: number;
      kg: number;
      geolocated: number;
      pendingAgesDays: number[];
    }
  >();
  const previousByArea = new Map<
    string,
    {
      actions: number;
      kg: number;
      geolocated: number;
      pendingAgesDays: number[];
    }
  >();

  for (const contract of contracts) {
    const observedMs = parseDateMs(contract.dates.observedAt);
    if (observedMs === null) {
      continue;
    }
    const area = areaFromLabel(contract.location.label);
    const isGeolocated =
      contract.location.latitude !== null &&
      contract.location.longitude !== null;
    const createdMs = parseDateMs(
      contract.dates.createdAt ?? contract.dates.importedAt,
    );
    const pendingAgeDays =
      contract.status === "pending" && createdMs !== null
        ? Math.max(0, (nowMs - createdMs) / DAY_MS)
        : null;

    if (observedMs >= currentFloorMs && observedMs <= nowMs) {
      const row = currentByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      if (contract.status === "approved") {
        row.actions += 1;
        row.kg += Number(contract.metadata.wasteKg || 0);
        row.geolocated += isGeolocated ? 1 : 0;
      }
      if (pendingAgeDays !== null) {
        row.pendingAgesDays.push(pendingAgeDays);
      }
      currentByArea.set(area, row);
      continue;
    }

    if (observedMs >= previousFloorMs && observedMs < currentFloorMs) {
      const row = previousByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      if (contract.status === "approved") {
        row.actions += 1;
        row.kg += Number(contract.metadata.wasteKg || 0);
        row.geolocated += isGeolocated ? 1 : 0;
      }
      if (pendingAgeDays !== null) {
        row.pendingAgesDays.push(pendingAgeDays);
      }
      previousByArea.set(area, row);
    }
  }

  const benchmark = buildTerritorialBenchmark(
    contracts
      .filter((contract) => contract.status === "approved")
      .map((contract) => ({
        locationLabel: contract.location.label,
        wasteKg: contract.metadata.wasteKg,
        volunteersCount: contract.metadata.volunteersCount,
      })),
  );
  const benchmarkByArea = new Map(benchmark.map((row) => [row.area, row]));

  const allAreas = new Set<string>([
    ...currentByArea.keys(),
    ...previousByArea.keys(),
  ]);

  return [...allAreas]
    .map((area) => {
      const current = currentByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      const previous = previousByArea.get(area) ?? {
        actions: 0,
        kg: 0,
        geolocated: 0,
        pendingAgesDays: [],
      };
      const deltaActionsAbsolute = round1(current.actions - previous.actions);
      const deltaKgAbsolute = round1(current.kg - previous.kg);
      const deltaActionsPercent = round1(
        safePercentDelta(current.actions, previous.actions),
      );
      const deltaKgPercent = round1(safePercentDelta(current.kg, previous.kg));
      const currentCoverageRate =
        current.actions > 0
          ? round1((current.geolocated / current.actions) * 100)
          : 0;
      const previousCoverageRate =
        previous.actions > 0
          ? round1((previous.geolocated / previous.actions) * 100)
          : 0;
      const deltaCoverageRateAbsolute = round1(
        currentCoverageRate - previousCoverageRate,
      );
      const deltaCoverageRatePercent = round1(
        safePercentDelta(currentCoverageRate, previousCoverageRate),
      );
      const currentModerationDelayDays =
        current.pendingAgesDays.length > 0
          ? round1(
              current.pendingAgesDays.reduce((acc, value) => acc + value, 0) /
                current.pendingAgesDays.length,
            )
          : 0;
      const previousModerationDelayDays =
        previous.pendingAgesDays.length > 0
          ? round1(
              previous.pendingAgesDays.reduce((acc, value) => acc + value, 0) /
                previous.pendingAgesDays.length,
            )
          : 0;
      const deltaModerationDelayDaysAbsolute = round1(
        currentModerationDelayDays - previousModerationDelayDays,
      );
      const deltaModerationDelayDaysPercent = round1(
        safePercentDelta(
          currentModerationDelayDays,
          previousModerationDelayDays,
        ),
      );
      const benchmarkRow = benchmarkByArea.get(area);
      const normalizedScore = benchmarkRow?.normalizedScore ?? 0;

      const urgency: ZoneComparisonRow["urgency"] =
        normalizedScore >= 70 || deltaKgPercent >= 30
          ? "critique"
          : normalizedScore >= 50 || deltaKgPercent >= 15
            ? "elevee"
            : "moderee";

      const justification =
        urgency === "critique"
          ? "Pression territoriale forte avec progression d'impact sur la periode courante."
          : urgency === "elevee"
            ? "Zone a surveiller: hausse d'activite et score territorial au-dessus de la moyenne."
            : "Zone stable, suivi de fond recommande.";

      const recommendedAction =
        urgency === "critique"
          ? "Declencher une campagne ciblee sous 7 jours avec renfort moderation/geotrace."
          : urgency === "elevee"
            ? "Planifier une intervention ciblee et renforcer la preuve geolocalisee."
            : "Maintenir la surveillance mensuelle et corriger les signaux de qualite faibles.";

      return {
        area,
        currentActions: current.actions,
        previousActions: previous.actions,
        deltaActionsAbsolute,
        currentKg: round1(current.kg),
        previousKg: round1(previous.kg),
        deltaKgAbsolute,
        deltaActionsPercent,
        deltaKgPercent,
        currentCoverageRate,
        previousCoverageRate,
        deltaCoverageRateAbsolute,
        deltaCoverageRatePercent,
        currentModerationDelayDays,
        previousModerationDelayDays,
        deltaModerationDelayDaysAbsolute,
        deltaModerationDelayDaysPercent,
        normalizedScore,
        urgency,
        justification,
        recommendedAction,
      };
    })
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .slice(0, 12);
}
