import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActionDataContract,
  ActionEntityType,
} from "../actions/data-contract";
import { computePilotageComparison } from "./metrics";
import { buildMethods } from "./overview-methods";
import { buildDateFloor } from "./overview-shared";
import { buildSummary } from "./overview-summary";
import type { PilotageOverview } from "./overview-types";
import { buildZones } from "./overview-zones";
import { buildOperationalPriorities } from "./prioritization";

export type {
  DecisionSummary,
  DecisionSummaryKpi,
  MethodDefinition,
  PilotageOverview,
} from "./overview-types";

export function buildPilotageOverviewFromContracts(params: {
  contracts: ActionDataContract[];
  periodDays: number;
  now?: Date;
}): PilotageOverview {
  const now = params.now ?? new Date();
  const comparison = computePilotageComparison(
    params.contracts,
    params.periodDays,
    now,
  );
  const comparisonsByWindow = {
    "30": computePilotageComparison(params.contracts, 30, now),
    "90": computePilotageComparison(params.contracts, 90, now),
    "365": computePilotageComparison(params.contracts, 365, now),
  } as const;
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
  };
}

export async function loadPilotageOverview(params: {
  supabase: SupabaseClient;
  periodDays: number;
  limit?: number;
  types?: ActionEntityType[] | null;
}): Promise<PilotageOverview> {
  const { fetchUnifiedActionContracts } =
    await import("../actions/unified-source");
  const limit = params.limit ?? 1500;
  const floorDate = buildDateFloor(Math.max(params.periodDays * 2, 730));
  const { items: contracts } = await fetchUnifiedActionContracts(
    params.supabase,
    {
      limit,
      status: null,
      floorDate,
      requireCoordinates: false,
      types: params.types ?? null,
    },
  );

  return buildPilotageOverviewFromContracts({
    contracts,
    periodDays: params.periodDays,
  });
}
