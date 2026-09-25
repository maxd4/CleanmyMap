import { revalidateTag } from "next/cache";

export const UNIFIED_ACTION_CONTRACTS_CACHE_TAG = "unified-action-contracts";

export function revalidateUnifiedActionContractsCache(): void {
  revalidateTag(UNIFIED_ACTION_CONTRACTS_CACHE_TAG, "max");
}
