import {
  normalizeOperationalRoute,
  type OperationalRoute,
  type PlannerActionHandoff,
} from "./route-operational";
import { isRouteCalibrationContext } from "./route-calibration";
import { isRoutePlannerProofShape } from "./route-planner-proof-contract";

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
    const parsed = JSON.parse(raw) as Partial<PlannerActionHandoff> & {
      actualRoute?: unknown;
      operationalRoute?: unknown;
    };
    const operationalRoute = normalizeOperationalRoute(
      parsed.operationalRoute ?? parsed.actualRoute,
    );
    if (
      !operationalRoute ||
      (parsed.routeCalibrationContext !== undefined &&
        parsed.routeCalibrationContext !== null &&
        !isRouteCalibrationContext(parsed.routeCalibrationContext)) ||
      !isIsoDateInFuture(parsed.expiresAt) ||
      (parsed.routeCalibrationContext?.plannerSnapshot !== undefined &&
        (!isRoutePlannerProofShape(parsed.plannerProof) ||
          parsed.plannerProof.expiresAt !== parsed.expiresAt))
    ) {
      return null;
    }
    return {
      operationalRoute,
      routeCalibrationContext: parsed.routeCalibrationContext ?? null,
      plannerProof: parsed.plannerProof ?? null,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function isIsoDateInFuture(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) && Date.parse(value) > Date.now();
}

export function cloneOperationalRoute(value: OperationalRoute): OperationalRoute {
  return structuredClone(value);
}
