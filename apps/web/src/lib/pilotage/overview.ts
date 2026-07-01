import { unstable_cache } from "next/cache";
import type { ActionDataContract, ActionEntityType } from "../actions/data-contract";
import { fetchCachedUnifiedActionContracts } from "../actions/unified-source-cache";
import {
  computePilotageComparison,
  type PilotageComparisonResult,
} from "./metrics";
import { buildMethods } from "./overview.methods";
import { buildSummary } from "./overview.summary";
import type {
  LoadPilotageOverviewParams,
  PilotageOverview,
} from "./overview.types";
import { buildDateFloor } from "./overview.utils";
import { buildZones } from "./overview.zones";
import { buildOperationalPriorities } from "./prioritization";

export type {
  DecisionSummary,
  DecisionSummaryKpi,
  LoadPilotageOverviewParams,
  MethodDefinition,
  PilotageOverview,
} from "./overview.types";

type BuildPilotageOverviewParams = {
  contracts: ActionDataContract[];
  periodDays: number;
  now?: Date;
};

function buildComparisonsByWindow(
  contracts: ActionDataContract[],
  now: Date,
): Record<"30" | "90" | "365", PilotageComparisonResult> {
  return {
    "30": computePilotageComparison(contracts, 30, now),
    "90": computePilotageComparison(contracts, 90, now),
    "365": computePilotageComparison(contracts, 365, now),
  };
}

export function buildPilotageOverviewFromContracts(
  params: BuildPilotageOverviewParams,
): PilotageOverview {
  const now = params.now ?? new Date();
  const comparison = computePilotageComparison(params.contracts, params.periodDays, now);
  const comparisonsByWindow = buildComparisonsByWindow(params.contracts, now);
  const zones = buildZones(params.contracts, params.periodDays, now);
  const priorities = buildOperationalPriorities({ comparison, zones });

  return {
    generatedAt: now.toISOString(),
    periodDays: params.periodDays,
    comparison,
    comparisonsByWindow,
    priorities,
    methods: buildMethods(),
    zones,
    summary: buildSummary(comparison, priorities),
    contracts: params.contracts,
  };
}

const PILOTAGE_OVERVIEW_CACHE_REVALIDATE_SECONDS = 600;

function buildPilotageOverviewCacheKey(
  params: LoadPilotageOverviewParams,
): string {
  const types =
    params.types && params.types.length > 0
      ? [...params.types].sort().join(",")
      : "all";
  return [
    `period:${params.periodDays}`,
    `limit:${params.limit ?? 1500}`,
    `types:${types}`,
  ].join("|");
}

export async function loadPilotageOverview(
  params: LoadPilotageOverviewParams,
): Promise<PilotageOverview> {
  const cached = unstable_cache(
    async () => {
      const limit = params.limit ?? 1500;
      const floorDate = buildDateFloor(Math.max(params.periodDays * 2, 730));
      const { items: contracts } = await fetchCachedUnifiedActionContracts({
        limit,
        status: "approved",
        floorDate,
        requireCoordinates: false,
        types: (params.types ?? null) as ActionEntityType[] | null,
      });

      return buildPilotageOverviewFromContracts({
        contracts,
        periodDays: params.periodDays,
      });
    },
    ["pilotage-overview", buildPilotageOverviewCacheKey(params)],
    {
      revalidate: PILOTAGE_OVERVIEW_CACHE_REVALIDATE_SECONDS,
      tags: ["pilotage-overview"],
    },
  );

  return cached();
}
