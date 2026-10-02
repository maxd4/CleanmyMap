import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import {
  fallbackRoutePrefixWithinBudget,
  type RoutePlannerOrigin,
  type RoutePlannerResult,
} from "@/lib/route/route-planner";
import type { RouteGeometry } from "@/lib/route/route-contract";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";

export function fallbackGeometryForPrefix(
  origin: RoutePlannerOrigin,
  stops: Array<{ latitude: number; longitude: number }>,
): ReturnType<typeof createFallbackRouteGeometry> {
  return createFallbackRouteGeometry([
    [origin.latitude, origin.longitude],
    ...stops.map(
      (stop) => [stop.latitude, stop.longitude] as [number, number],
    ),
    [origin.latitude, origin.longitude],
  ]);
}

export type RouteGeometryReconciliation = {
  plannedStops: RoutePlannerResult["stops"];
  routeGeometry: RouteGeometry;
  budgetPrefixApplied: boolean;
  providerCalls: number;
  firstProviderMode: RouteGeometry["mode"] | null;
  finalRoutingWarning: string | null;
  finalRoutingDegraded: boolean;
};

type NetworkReconciliation = {
  plannedStops: RoutePlannerResult["stops"];
  routeGeometry: RouteGeometry;
  fallbackStops: RoutePlannerResult["stops"];
  providerCalls: number;
  finalRoutingWarning: string | null;
  finalRoutingDegraded: boolean;
  reconciled: boolean;
};

async function reconcileNetworkRoute(
  origin: RoutePlannerOrigin,
  travelBudgetMinutes: number,
  initialGeometry: RouteGeometry,
  initialStops: RoutePlannerResult["stops"],
): Promise<NetworkReconciliation> {
  let plannedStops = initialStops;
  let routeGeometry = initialGeometry;
  let providerCalls = 0;
  let finalRoutingWarning: string | null = null;
  let finalRoutingDegraded = false;
  let reconciled = false;
  let retainedStops = [...initialStops];

  while (retainedStops.length > 0) {
    retainedStops = retainedStops.slice(0, -1);
    if (retainedStops.length === 0) break;
    const retainedCoordinates: [number, number][] = [
      [origin.latitude, origin.longitude],
      ...retainedStops.map(
        ({ candidate }) =>
          [candidate.latitude, candidate.longitude] as [number, number],
      ),
      [origin.latitude, origin.longitude],
    ];
    try {
      providerCalls += 1;
      const reconciledGeometry = await routePolylineThroughFossgisFoot(
        retainedCoordinates,
        {},
      );
      if (reconciledGeometry.durationMinutes <= travelBudgetMinutes) {
        plannedStops = retainedStops;
        routeGeometry = reconciledGeometry;
        reconciled = true;
        if (reconciledGeometry.mode === "fallback") {
          finalRoutingDegraded = true;
          finalRoutingWarning =
            "Le réseau n'a pas pu être recalculé dans le budget ; un fallback local fermé est utilisé.";
        }
        break;
      }
    } catch {
      finalRoutingDegraded = true;
      finalRoutingWarning =
        "La mesure réseau de la boucle réduite a échoué ; un fallback local fermé est utilisé.";
      break;
    }
  }

  return {
    plannedStops,
    routeGeometry,
    fallbackStops: retainedStops,
    providerCalls,
    finalRoutingWarning,
    finalRoutingDegraded,
    reconciled,
  };
}

function applyFallbackRoutePrefix(
  origin: RoutePlannerOrigin,
  travelBudgetMinutes: number,
  fallbackStops: RoutePlannerResult["stops"],
): Pick<NetworkReconciliation, "plannedStops" | "routeGeometry"> {
  const fallbackPrefix = fallbackRoutePrefixWithinBudget(
    origin,
    fallbackStops.map(({ candidate }) => candidate),
    travelBudgetMinutes,
    (coordinates) => createFallbackRouteGeometry(coordinates),
  );
  const plannedStops = fallbackStops.slice(0, fallbackPrefix.length);
  return {
    plannedStops,
    routeGeometry: fallbackGeometryForPrefix(
      origin,
      plannedStops.map(({ candidate }) => candidate),
    ),
  };
}

export async function reconcileSingleRouteGeometry(
  origin: RoutePlannerOrigin,
  travelBudgetMinutes: number,
  initialStops: RoutePlannerResult["stops"],
): Promise<RouteGeometryReconciliation> {
  let plannedStops = initialStops;
  let routeGeometry = fallbackGeometryForPrefix(origin, []);
  let budgetPrefixApplied = false;
  let providerCalls = 0; let firstProviderMode: RouteGeometry["mode"] | null = null;
  let finalRoutingWarning: string | null = null;
  let finalRoutingDegraded = false;

  if (plannedStops.length > 0) {
    const routeCoordinates: [number, number][] = [
      [origin.latitude, origin.longitude],
      ...plannedStops.map(
        ({ candidate }) =>
          [candidate.latitude, candidate.longitude] as [number, number],
      ),
      [origin.latitude, origin.longitude],
    ];
    routeGeometry = await routePolylineThroughFossgisFoot(routeCoordinates, {});
    providerCalls += 1; firstProviderMode = routeGeometry.mode;

    if (routeGeometry.durationMinutes > travelBudgetMinutes) {
      budgetPrefixApplied = true;
      const network = routeGeometry.mode === "network"
        ? await reconcileNetworkRoute(origin, travelBudgetMinutes, routeGeometry, plannedStops)
        : null;
      if (network) {
        plannedStops = network.plannedStops;
        routeGeometry = network.routeGeometry;
        providerCalls += network.providerCalls;
        finalRoutingWarning = network.finalRoutingWarning;
        finalRoutingDegraded = network.finalRoutingDegraded;
      }
      if (!network?.reconciled) {
        finalRoutingDegraded = true;
        finalRoutingWarning =
          finalRoutingWarning ??
          "La géométrie réseau de la boucle dépasse le budget ; un fallback local fermé est utilisé.";
        const fallbackStops = network?.fallbackStops ?? plannedStops;
        const fallback = applyFallbackRoutePrefix(
          origin,
          travelBudgetMinutes,
          fallbackStops,
        );
        plannedStops = fallback.plannedStops;
        routeGeometry = fallback.routeGeometry;
      }
    }
  }

  return {
    plannedStops,
    routeGeometry,
    budgetPrefixApplied,
    providerCalls,
    firstProviderMode,
    finalRoutingWarning,
    finalRoutingDegraded,
  };
}
