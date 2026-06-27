import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionEntityType } from "@/lib/actions/data-contract";
import type { ActionStatus } from "@/lib/actions/types";
import {
  fetchUnifiedActionContracts,
  type UnifiedSourceHealth,
} from "./unified-source";

export type CachedUnifiedActionContractsParams = {
  limit: number;
  status: ActionStatus | null;
  floorDate: string | null;
  requireCoordinates: boolean;
  types: ActionEntityType[] | null;
};

const UNIFIED_ACTION_CONTRACTS_CACHE_REVALIDATE_SECONDS = 300;

function buildTypesCacheKey(types: ActionEntityType[] | null): string {
  return types && types.length > 0 ? types.join(",") : "all";
}

export function buildUnifiedActionContractsCacheKey(
  params: CachedUnifiedActionContractsParams,
): string {
  return [
    `limit:${params.limit}`,
    `status:${params.status ?? "all"}`,
    `floor:${params.floorDate ?? "all"}`,
    `coords:${params.requireCoordinates ? "1" : "0"}`,
    `types:${buildTypesCacheKey(params.types)}`,
  ].join("|");
}

export async function fetchCachedUnifiedActionContracts(
  params: CachedUnifiedActionContractsParams,
): Promise<{
  items: Awaited<ReturnType<typeof fetchUnifiedActionContracts>>["items"];
  isTruncated: boolean;
  sourceHealth: UnifiedSourceHealth;
}> {
  const cached = unstable_cache(
    async () => {
      const supabase = getSupabaseServerClient();
      return fetchUnifiedActionContracts(supabase, params);
    },
    ["unified-action-contracts", buildUnifiedActionContractsCacheKey(params)],
    {
      revalidate: UNIFIED_ACTION_CONTRACTS_CACHE_REVALIDATE_SECONDS,
      tags: ["unified-action-contracts"],
    },
  );

  return cached();
}
