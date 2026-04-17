import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActionDataContract, ActionEntityType } from "../actions/data-contract";
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
  };
}

export async function loadPilotageOverview(
  params: { supabase: SupabaseClient } & LoadPilotageOverviewParams,
): Promise<PilotageOverview> {
  const { fetchUnifiedActionContracts } = await import("../actions/unified-source");
  const limit = params.limit ?? 1500;
  const floorDate = buildDateFloor(Math.max(params.periodDays * 2, 730));
  const { items: contracts } = await fetchUnifiedActionContracts(params.supabase, {
    limit,
    status: null,
    floorDate,
    requireCoordinates: false,
    types: (params.types ?? null) as ActionEntityType[] | null,
  });

  return buildPilotageOverviewFromContracts({
    contracts,
    periodDays: params.periodDays,
  });
}
