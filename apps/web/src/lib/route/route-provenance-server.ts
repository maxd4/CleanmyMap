import type { ActionPreparationData } from "@/lib/actions/types";
import {
  hasVerifiedPlannerOperationalRoute,
  operationalRouteMatchesPlannerSnapshot,
} from "./route-provenance";
import { isCryptographicallyVerifiedPlannerSnapshotContext } from "./route-calibration-server-validation";

/** Server-only route promotion predicate; client metadata is never authority. */
export function hasCryptographicallyVerifiedPlannerRouteInPreparation(
  preparationData: Pick<ActionPreparationData, "operationalRoute" | "routeCalibrationContext"> | null | undefined,
): boolean {
  const operationalRoute = preparationData?.operationalRoute;
  const context = preparationData?.routeCalibrationContext;
  return Boolean(
    operationalRoute &&
      context &&
      hasVerifiedPlannerOperationalRoute(operationalRoute, context) &&
      isCryptographicallyVerifiedPlannerSnapshotContext(context) &&
      context.plannerSnapshot &&
      operationalRouteMatchesPlannerSnapshot(operationalRoute, context.plannerSnapshot),
  );
}
