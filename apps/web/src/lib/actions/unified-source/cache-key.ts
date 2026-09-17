import type { ActionEntityType } from "@/lib/actions/contracts/contract-model";
import type { ActionStatus } from "@/lib/actions/types";

export type CachedUnifiedActionContractsParams = {
  limit: number | null;
  status: ActionStatus | null;
  floorDate: string | null;
  requireCoordinates: boolean;
  types: ActionEntityType[] | null;
};

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
