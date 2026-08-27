import { unstable_cache } from "next/cache";
import type { ActionDataContract, ActionEntityType } from "../actions/data-contract";
import { fetchCachedUnifiedActionContracts } from "../actions/unified-source/unified-source-cache";
import {
  computePilotageComparison,
  type PilotageModerationAvailability,
  type PilotageComparisonResult,
} from "./metrics";
import { PILOTAGE_COMPARISON_HISTORY_DAYS } from "./constants";
import { buildMethods } from "./overview.methods";
import { buildSummary } from "./overview.summary";
import type {
  LoadPilotageOverviewParams,
  PilotageDataAvailability,
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
  PilotageDataAvailability,
  PilotageOverview,
} from "./overview.types";

type BuildPilotageOverviewParams = {
  contracts: ActionDataContract[];
  periodDays: number;
  now?: Date;
  moderationAvailability?: PilotageModerationAvailability;
  dataAvailability?: PilotageDataAvailability;
};

const DEFAULT_PILOTAGE_DATA_AVAILABILITY: PilotageDataAvailability = {
  isTruncated: false,
  sourceHealth: {
    partial: false,
    failedSources: [],
    availableSources: ["actions"],
    warnings: [],
  },
};

function buildComparisonsByWindow(
  contracts: ActionDataContract[],
  now: Date,
  moderationAvailability: PilotageModerationAvailability,
): Record<"30" | "90" | "365", PilotageComparisonResult> {
  return {
    "30": computePilotageComparison(contracts, 30, now, {
      moderationAvailability,
    }),
    "90": computePilotageComparison(contracts, 90, now, {
      moderationAvailability,
    }),
    "365": computePilotageComparison(contracts, 365, now, {
      moderationAvailability,
    }),
  };
}

export function buildPilotageOverviewFromContracts(
  params: BuildPilotageOverviewParams,
): PilotageOverview {
  const now = params.now ?? new Date();
  const moderationAvailability = params.moderationAvailability ?? "available";
  const dataAvailability =
    params.dataAvailability ?? DEFAULT_PILOTAGE_DATA_AVAILABILITY;
  const comparison = computePilotageComparison(params.contracts, params.periodDays, now, {
    moderationAvailability,
  });
  const comparisonsByWindow = buildComparisonsByWindow(
    params.contracts,
    now,
    moderationAvailability,
  );
  const zones = buildZones(
    params.contracts,
    params.periodDays,
    now,
    moderationAvailability,
  );
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
    dataAvailability,
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
      const floorDate = buildDateFloor(
        Math.max(params.periodDays * 2, PILOTAGE_COMPARISON_HISTORY_DAYS),
      );
      const contractsResult = await fetchCachedUnifiedActionContracts({
        limit,
        status: "approved",
        floorDate,
        requireCoordinates: false,
        types: (params.types ?? null) as ActionEntityType[] | null,
      });

      return buildPilotageOverviewFromContracts({
        contracts: contractsResult.items,
        periodDays: params.periodDays,
        moderationAvailability: "unavailable",
        dataAvailability: {
          isTruncated: contractsResult.isTruncated,
          sourceHealth: contractsResult.sourceHealth,
        },
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
