import type { ActionPreparationData } from "@/lib/actions/types";
import type { RouteCalibrationContext, RoutePlannerSnapshot } from "./route-calibration-types";
import { isServerVerifiedPlannerSnapshotContext } from "./route-calibration-validation";
import type { RouteGeometry } from "./route-contract";
import type { OperationalRoute } from "./route-operational";

export type PersistedRouteGeometrySource = "routed" | "estimated_route";

function structurallyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => structurallyEqual(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && structurallyEqual(leftRecord[key], rightRecord[key]));
}

/**
 * A network mode alone is not a proof: the provider and non-estimated marker
 * must also agree before the action-level source can be promoted to routed.
 */
export function resolvePersistedRouteGeometrySource(
  geometry: Pick<RouteGeometry, "mode" | "provider" | "estimated">,
): PersistedRouteGeometrySource {
  return geometry.mode === "network" && geometry.provider !== "none" && !geometry.estimated
    ? "routed"
    : "estimated_route";
}

export function operationalRouteMatchesPlannerSnapshot(
  operationalRoute: OperationalRoute,
  snapshot: RoutePlannerSnapshot,
): boolean {
  if (
    operationalRoute.plannerGroupCount !== snapshot.parameters.groupCount ||
    operationalRoute.routes.length !== snapshot.groups.length
  ) {
    return false;
  }

  const expected = new Map(
    snapshot.groups.map((group) => [group.groupIndex, group.routeGeometry]),
  );
  return operationalRoute.routes.every((route) => {
    const snapshotGeometry = expected.get(route.groupIndex);
    return snapshotGeometry !== undefined && structurallyEqual(route.geometry, snapshotGeometry);
  });
}

export function hasVerifiedPlannerOperationalRoute(
  operationalRoute: OperationalRoute | null | undefined,
  context: RouteCalibrationContext | null | undefined,
): boolean {
  return Boolean(
    operationalRoute &&
      context?.plannerSnapshot &&
      isServerVerifiedPlannerSnapshotContext(context) &&
      operationalRouteMatchesPlannerSnapshot(operationalRoute, context.plannerSnapshot),
  );
}

export function hasVerifiedPlannerRouteInPreparation(
  preparationData: Pick<ActionPreparationData, "operationalRoute" | "routeCalibrationContext"> | null | undefined,
): boolean {
  return hasVerifiedPlannerOperationalRoute(
    preparationData?.operationalRoute,
    preparationData?.routeCalibrationContext,
  );
}
