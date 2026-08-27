import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTION_ENTITY_TYPES } from "@/lib/actions/types";
import type {
  ActionDataContract,
  ActionEntityType,
} from "@/lib/actions/contracts/contract-model";
import {
  type UnifiedActionContractsParams,
  type UnifiedSourceHealth,
} from "./contracts";
import { loadUnifiedActionSourceData } from "./load";
import { buildUnifiedActionContracts, filterContractsByViewport } from "./merge";

export * from "./contracts";

export function parseEntityTypesParam(
  raw: string | null,
): ActionEntityType[] | null {
  if (!raw || raw.trim() === "" || raw === "all") {
    return null;
  }
  const tokens = raw
    .split(",")
    .map((token) => token.trim())
    .filter((token): token is ActionEntityType =>
      ACTION_ENTITY_TYPES.includes(token as ActionEntityType),
    );
  if (tokens.length === 0) {
    return null;
  }
  return [...new Set(tokens)];
}

function buildUnifiedSourceHealth(
  failedSources: UnifiedSourceHealth["failedSources"],
  availableSources: UnifiedSourceHealth["availableSources"],
): UnifiedSourceHealth {
  return {
    partial: failedSources.length > 0,
    failedSources,
    availableSources,
    warnings:
      failedSources.length > 0
        ? [`Partial data: source(s) unavailable (${failedSources.join(", ")}).`]
        : [],
  };
}

export async function fetchUnifiedActionContracts(
  supabase: SupabaseClient,
  params: UnifiedActionContractsParams,
): Promise<{
  items: ActionDataContract[];
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
}> {
  const {
    remoteRows,
    remoteSpots,
    localContracts,
    failedSources,
    availableSources,
  } = await loadUnifiedActionSourceData(supabase, params);
  const { items, isTruncated } = buildUnifiedActionContracts(
    remoteRows,
    remoteSpots,
    filterContractsByViewport(localContracts, params.viewport),
    params.types,
    params.limit,
  );

  return {
    items,
    isTruncated,
    sourceHealth: buildUnifiedSourceHealth(failedSources, availableSources),
  };
}

export type { UnifiedActionContractsParams };
export { buildUnifiedActionContracts, filterContractsByViewport } from "./merge";
