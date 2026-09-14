import {
  normalizeOperationalRoute,
  type OperationalRoute,
  type PlannerActionHandoff,
} from "./route-operational";
import type { ActionPreparationData } from "@/lib/actions/types";
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
      preparationData?: unknown;
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
          parsed.plannerProof.expiresAt !== parsed.expiresAt)) ||
      (parsed.preparationData !== undefined &&
        parsed.preparationData !== null &&
        !isPlannerPreparationData(parsed.preparationData))
    ) {
      return null;
    }
    return {
      operationalRoute,
      routeCalibrationContext: parsed.routeCalibrationContext ?? null,
      plannerProof: parsed.plannerProof ?? null,
      ...(parsed.preparationData
        ? { preparationData: structuredClone(parsed.preparationData) }
        : {}),
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function isPlannerPreparationData(value: unknown): value is ActionPreparationData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  const stringFields = [
    "actionDate",
    "meetingTime",
    "departureTime",
    "actionTitle",
    "shortDescription",
    "communeZoneLabel",
    "pointDeRendezVous",
    "zoneCiblePrevue",
    "midRouteLocationLabel",
  ];
  if (stringFields.some((field) => data[field] !== undefined && typeof data[field] !== "string")) {
    return false;
  }
  return (
    data.estimatedDurationMinutes === undefined ||
    (typeof data.estimatedDurationMinutes === "number" &&
      Number.isInteger(data.estimatedDurationMinutes) &&
      data.estimatedDurationMinutes >= 0 &&
      data.estimatedDurationMinutes <= 24 * 60)
  ) && (
    data.volunteersExpected === undefined ||
    (typeof data.volunteersExpected === "number" &&
      Number.isInteger(data.volunteersExpected) &&
      data.volunteersExpected >= 0 &&
      data.volunteersExpected <= 500)
  );
}

function isIsoDateInFuture(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) && Date.parse(value) > Date.now();
}

export function cloneOperationalRoute(value: OperationalRoute): OperationalRoute {
  return structuredClone(value);
}
