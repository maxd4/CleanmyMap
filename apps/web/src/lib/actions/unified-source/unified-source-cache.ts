import { unstable_cache } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  fetchUnifiedActionContracts,
  type UnifiedSourceHealth,
} from "../unified-source";
import {
  buildUnifiedActionContractsCacheKey,
  type CachedUnifiedActionContractsParams,
} from "./cache-key";

export { buildUnifiedActionContractsCacheKey } from "./cache-key";
export type { CachedUnifiedActionContractsParams } from "./cache-key";

export type UnifiedActionContractsCacheOptions = {
  revalidateSeconds?: number;
};

export const UNIFIED_ACTION_CONTRACTS_CACHE_REVALIDATE_SECONDS = 600;


export async function fetchCachedUnifiedActionContracts(
  params: CachedUnifiedActionContractsParams,
  options: UnifiedActionContractsCacheOptions = {},
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
      revalidate:
        options.revalidateSeconds ?? UNIFIED_ACTION_CONTRACTS_CACHE_REVALIDATE_SECONDS,
      tags: ["unified-action-contracts"],
    },
  );

  return cached();
}
