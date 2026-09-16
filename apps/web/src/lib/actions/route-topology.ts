import type {
  ActionPreparationData,
  ActionRecordType,
  ActionRouteTopology,
  LegacyActionRecordType,
} from "./types";

export const ACTION_ROUTE_TOPOLOGIES = ["loop", "point_to_point"] as const satisfies readonly ActionRouteTopology[];

/**
 * Resolves the canonical topology once at the contract boundary.
 * `routeStyle` is deliberately not part of this decision.
 */
export function resolveActionRouteTopology(params: {
  topology?: ActionRouteTopology | null;
  arrivalLocationLabel?: string | null;
  recordType?: ActionRecordType | LegacyActionRecordType | null;
}): ActionRouteTopology {
  if (params.recordType && params.recordType !== "action") {
    return "loop";
  }

  if (params.topology === "loop" || params.topology === "point_to_point") {
    return params.topology;
  }

  return params.arrivalLocationLabel?.trim()
    ? "point_to_point"
    : "loop";
}

export function requiresActionRouteArrival(topology: ActionRouteTopology): boolean {
  return topology === "point_to_point";
}

/** Removes legacy route-arrival fields from ordinary loop preparations only. */
export function clearActionRouteArrivalForLoop(
  preparationData: ActionPreparationData,
  params: {
    recordType?: ActionRecordType | LegacyActionRecordType | null;
    topology: ActionRouteTopology;
  },
): ActionPreparationData {
  if (params.recordType !== "action" || params.topology !== "loop") {
    return preparationData;
  }

  const normalized = { ...preparationData };
  delete normalized.zoneCiblePrevue;
  delete normalized.arrivalCoordinates;
  return normalized;
}
