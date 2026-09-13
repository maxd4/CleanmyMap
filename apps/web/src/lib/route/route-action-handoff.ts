import {
  isActualRoute,
  type ActualRoute,
  type PlannerActionHandoff,
} from "./route-actual";
import { isRouteCalibrationContext } from "./route-calibration";

export const ROUTE_ACTION_HANDOFF_STORAGE_KEY =
  "cleanmymap.route-action-handoff.v1";

export function writePlannerActionHandoff(input: PlannerActionHandoff): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      ROUTE_ACTION_HANDOFF_STORAGE_KEY,
      JSON.stringify(input),
    );
  } catch {
    // The form remains usable without the optional handoff when storage is unavailable.
  }
}

export function consumePlannerActionHandoff(): PlannerActionHandoff | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(ROUTE_ACTION_HANDOFF_STORAGE_KEY);
    window.sessionStorage.removeItem(ROUTE_ACTION_HANDOFF_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PlannerActionHandoff>;
    if (
      !isActualRoute(parsed.actualRoute) ||
      (parsed.routeCalibrationContext !== null &&
        !isRouteCalibrationContext(parsed.routeCalibrationContext))
    ) {
      return null;
    }
    return {
      actualRoute: parsed.actualRoute,
      routeCalibrationContext: parsed.routeCalibrationContext ?? null,
    };
  } catch {
    return null;
  }
}

export function cloneActualRoute(value: ActualRoute): ActualRoute {
  return structuredClone(value);
}
