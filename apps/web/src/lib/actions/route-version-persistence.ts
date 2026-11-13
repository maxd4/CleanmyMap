import type { ActionPreparationData } from "./types";
import {
  buildActionRouteVersioning,
  type ActionRouteVersioning,
} from "@/lib/route/route-active-version";
import { hashRoutePlannerSnapshot } from "@/lib/route/route-planner-snapshot-hash";
import { hasCryptographicallyVerifiedPlannerRouteInPreparation } from "@/lib/route/route-provenance-server";

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
  return {
    ...preparationData,
    routeVersioning,
    ...(routeVersioning.active.provenance === "server_verified" && hasCryptographicallyVerifiedPlannerRouteInPreparation({
      operationalRoute,
      routeCalibrationContext: preparationData.routeCalibrationContext,
    })
      ? { routeGeometryProvenance: "server_verified" as const }
      : {}),
  };
}
