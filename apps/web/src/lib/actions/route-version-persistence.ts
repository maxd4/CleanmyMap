import type { ActionPreparationData } from "./types";
import {
  buildActionRouteVersioning,
  type ActionRouteVersioning,
} from "@/lib/route/route-active-version";
import { hashRoutePlannerSnapshot } from "@/lib/route/route-planner-snapshot-hash";

export function initializeActionRouteVersioning(params: {
  preparationData: ActionPreparationData | null | undefined;
  appliedAt: string;
  appliedByUserId: string;
}): ActionPreparationData {
  const preparationData = params.preparationData ?? {};
  if (preparationData.routeVersioning) return preparationData;
  const snapshot = preparationData.routeCalibrationContext?.plannerSnapshot;
  const operationalRoute = preparationData.operationalRoute;
  if (!snapshot || !operationalRoute) return preparationData;

  const routeVersioning: ActionRouteVersioning = buildActionRouteVersioning({
    snapshot,
    operationalRoute,
    appliedAt: params.appliedAt,
    appliedByUserId: params.appliedByUserId,
    snapshotHash: hashRoutePlannerSnapshot(snapshot),
  });
  return { ...preparationData, routeVersioning };
}
