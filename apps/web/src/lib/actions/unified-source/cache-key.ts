import { createHash } from "node:crypto";
import type { ActionEntityType } from "@/lib/actions/contracts/contract-model";
import type { ActionStatus } from "@/lib/actions/types";

export type CachedUnifiedActionContractsParams = {
  limit: number | null;
  actionIds?: string[] | null;
  status: ActionStatus | null;
  floorDate: string | null;
  ceilingDate?: string | null;
  requireCoordinates: boolean;
  types: ActionEntityType[] | null;
  requirePublicCompletedActions?: boolean;
};

function compareCanonicalStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function buildTypesCacheKey(types: ActionEntityType[] | null): string {
  return types && types.length > 0 ? [...types].sort(compareCanonicalStrings).join(",") : "all";
}

function buildActionIdsCacheKey(actionIds: string[] | null | undefined): string {
  if (actionIds == null) {
    return "all";
  }
  if (actionIds.length === 0) {
    return "empty";
  }
  return `sha256:${createHash("sha256")
    .update([...actionIds].sort(compareCanonicalStrings).join("\n"))
    .digest("hex")
    .slice(0, 32)}`;
}

export function buildUnifiedActionContractsCacheKey(
  params: CachedUnifiedActionContractsParams,
): string {
  return [
    `limit:${params.limit}`,
    `actionIds:${buildActionIdsCacheKey(params.actionIds)}`,
    `status:${params.status ?? "all"}`,
    `floor:${params.floorDate ?? "all"}`,
    `ceiling:${params.ceilingDate ?? "all"}`,
    `coords:${params.requireCoordinates ? "1" : "0"}`,
    `types:${buildTypesCacheKey(params.types)}`,
    `publicComplete:${params.requirePublicCompletedActions ? "1" : "0"}`,
  ].join("|");
}
