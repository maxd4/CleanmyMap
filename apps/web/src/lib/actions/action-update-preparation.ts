import { preserveHistoricalRouteCalibrationContext } from "@/lib/route/route-calibration";
import type { ActionRow } from "@/types/database";
import type { ActionPreparationData } from "./types";
import type { ActionUpdateInput } from "./action-update-audit";
import {
  preserveCanonicalAdministrativeRequirements,
} from "./administrative-requirements";
import {
  preserveCanonicalFormalitiesWorkflow,
  preserveFormalitiesContextWhenOmitted,
} from "./formalities/workflow";

const SERVER_MANAGED_ROUTE_FIELDS = [
  "routeNetworkDistanceKm",
  "routeGeometryMode",
  "routeGeometryProvider",
] as const;

/** Route-provider metadata and planner evidence are server-owned projections. */
export function preserveServerManagedRouteMetadata(
  current: ActionPreparationData | null | undefined,
  incoming: ActionPreparationData | null | undefined,
): ActionPreparationData {
  const preserved = preserveHistoricalRouteCalibrationContext(current, incoming);
  const next = { ...preserved } as Record<string, unknown>;
  const currentRecord = (current ?? {}) as Record<string, unknown>;
  for (const field of SERVER_MANAGED_ROUTE_FIELDS) {
    delete next[field];
    if (Object.prototype.hasOwnProperty.call(currentRecord, field)) {
      next[field] = structuredClone(currentRecord[field]);
    }
  }
  return next as ActionPreparationData;
}

export function prepareActionUpdateBody(
  current: ActionRow,
  parsedBody: ActionUpdateInput,
): ActionUpdateInput {
  if (parsedBody.preparationData === undefined) {
    return parsedBody;
  }

  const preservedAdministrativeRequirements = preserveCanonicalAdministrativeRequirements(
    current.preparation_data,
    preserveServerManagedRouteMetadata(current.preparation_data, parsedBody.preparationData),
  );
  const withFormalitiesWorkflow = preserveCanonicalFormalitiesWorkflow(
    current.preparation_data,
    preservedAdministrativeRequirements as Record<string, unknown>,
  );
  const preservedPreparationData = preserveFormalitiesContextWhenOmitted(
    current.preparation_data,
    withFormalitiesWorkflow,
  ) as typeof parsedBody.preparationData;

  const legacyPreparationState = (
    current.preparation_data as ActionPreparationData | null | undefined
  )?.preparationState;
  const nextLegacyPreparationState = (
    preservedPreparationData as ActionPreparationData | null | undefined
  )?.preparationState;
  const preparationDataWithLegacyCompatibility =
    legacyPreparationState && preservedPreparationData && nextLegacyPreparationState === undefined
      ? ({ ...preservedPreparationData, preparationState: legacyPreparationState } as typeof parsedBody.preparationData)
      : preservedPreparationData;

  return { ...parsedBody, preparationData: preparationDataWithLegacyCompatibility };
}
