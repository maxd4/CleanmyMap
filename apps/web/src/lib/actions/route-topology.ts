import type { ActionRouteTopology } from "./types";

export const ACTION_ROUTE_TOPOLOGIES = ["loop", "point_to_point"] as const satisfies readonly ActionRouteTopology[];

/**
 * Resolves the canonical topology once at the contract boundary.
 * `routeStyle` is deliberately not part of this decision.
 */
export function resolveActionRouteTopology(params: {
  topology?: ActionRouteTopology | null;
  arrivalLocationLabel?: string | null;
}): ActionRouteTopology {
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
