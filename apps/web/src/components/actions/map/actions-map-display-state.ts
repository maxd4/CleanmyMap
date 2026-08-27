import type { ActionDataContract } from "@/lib/actions/contract-model";
import {
  resolveCurrentPlaceStateForRecord,
  resolveCurrentPlaceStateViews,
  type CurrentPlaceState,
  type CurrentPlaceStateMode,
  type CurrentPlaceStateViews,
} from "@/lib/actions/pollution/current-place-state";
import type { PollutionScoreReferences } from "@/lib/actions/pollution/pollution-score";
import type {
  LocalRepollutionScoreResolver,
  RepollutionDatasetCompleteness,
} from "@/lib/actions/pollution/local-repollution-calibration";
import type { ActionMapItem } from "@/lib/actions/types";

export function resolveMapSourceContracts(
  items: readonly ActionMapItem[],
): ActionDataContract[] {
  const contracts = new Map<string, ActionDataContract>();
  for (const item of items) {
    if (!item.contract) {
      continue;
    }
    const contract = item.contract as unknown as ActionDataContract;
    contracts.set(`${contract.type}:${contract.id}`, contract);
  }
  return [...contracts.values()].sort(
    (left, right) => left.id.localeCompare(right.id) || left.type.localeCompare(right.type),
  );
}

export function resolveMapPlaceStateViews(
  items: readonly ActionMapItem[],
  options: {
    asOf: string | Date | number;
    sourceCompleteness: RepollutionDatasetCompleteness;
    pollutionScoreReferences?: PollutionScoreReferences | null;
    historicalScoreResolver?: LocalRepollutionScoreResolver;
  },
): CurrentPlaceStateViews[] {
  return resolveCurrentPlaceStateViews(resolveMapSourceContracts(items), options);
}

export function resolveMapPlaceStateForItem(
  views: readonly CurrentPlaceStateViews[],
  item: ActionMapItem,
  mode: CurrentPlaceStateMode,
): CurrentPlaceState | null {
  const recordId = item.contract?.id ?? item.id;
  return resolveCurrentPlaceStateForRecord(views, recordId, mode);
}
