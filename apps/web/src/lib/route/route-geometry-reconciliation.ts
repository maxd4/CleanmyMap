import { createFallbackRouteGeometry } from "@/lib/geo/osrm-routing";
import {
  fallbackRoutePrefixWithinBudget,
  type RoutePlannerOrigin,
  type RoutePlannerResult,
} from "@/lib/route/route-planner";
import type { RouteGeometry, RouteTopology } from "@/lib/route/route-contract";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";
import {
  routeThroughPedestrianNetwork,
  type PedestrianNetworkGraph,
} from "@/lib/route/pedestrian-network";
import type { RouteRoutingOperationBudget } from "@/lib/route/route-routing-operation-budget";

export function fallbackGeometryForPrefix(
  origin: RoutePlannerOrigin,
  stops: Array<{ latitude: number; longitude: number }>,
  topology: RouteTopology = "loop",
  arrival?: RoutePlannerOrigin,
): ReturnType<typeof createFallbackRouteGeometry> {
  const coordinates: [number, number][] = [
    [origin.latitude, origin.longitude],
    ...stops.map(
      (stop) => [stop.latitude, stop.longitude] as [number, number],
    ),
    ...(topology === "loop"
      ? [[origin.latitude, origin.longitude] as [number, number]]
      : arrival
        ? [[arrival.latitude, arrival.longitude] as [number, number]]
        : []),
  ];
  if (coordinates.length < 2) {
    coordinates.push([origin.latitude, origin.longitude]);
  }
  return createFallbackRouteGeometry(coordinates, { topology });
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

async function routeWithAvailableNetwork(
  coordinates: [number, number][],
  topology: RouteTopology,
  pedestrianNetwork?: PedestrianNetworkGraph | null,
  signal?: AbortSignal,
): Promise<RouteGeometry> {
  if (pedestrianNetwork) {
    return routeThroughPedestrianNetwork(pedestrianNetwork, coordinates, { topology }) ??
      createFallbackRouteGeometry(coordinates, { topology });
  }
  return routePolylineThroughFossgisFoot(
    coordinates,
    topology === "loop" ? { signal } : { topology, signal },
  );
}

async function tryReconcileRetainedStops(
  origin: RoutePlannerOrigin,
  retainedStops: RoutePlannerResult["stops"],
  travelBudgetMinutes: number,
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
  pedestrianNetwork?: PedestrianNetworkGraph | null,
  signal?: AbortSignal,
): Promise<{ geometry: RouteGeometry; degraded: boolean; warning: string | null } | null> {
  const retainedCoordinates: [number, number][] = [
    [origin.latitude, origin.longitude],
    ...retainedStops.map(
      ({ candidate }) => [candidate.latitude, candidate.longitude] as [number, number],
    ),
    ...(topology === "loop"
      ? [[origin.latitude, origin.longitude] as [number, number]]
      : arrival
        ? [[arrival.latitude, arrival.longitude] as [number, number]]
        : []),
  ];
  try {
    const geometry = await routeWithAvailableNetwork(retainedCoordinates, topology, pedestrianNetwork, signal);
    if (geometry.durationMinutes > travelBudgetMinutes) return null;
    return {
      geometry,
      degraded: geometry.mode === "fallback",
      warning:
        geometry.mode === "fallback"
          ? "Le réseau n'a pas pu être recalculé dans le budget ; un fallback local fermé est utilisé."
          : null,
    };
  } catch {
    return {
      geometry: fallbackGeometryForPrefix(origin, retainedStops.map(({ candidate }) => candidate), topology, arrival),
      degraded: true,
      warning: "La mesure réseau de la boucle réduite a échoué ; un fallback local fermé est utilisé.",
    };
  }
}

async function reconcileNetworkRoute(
  origin: RoutePlannerOrigin,
  travelBudgetMinutes: number,
  initialGeometry: RouteGeometry,
  initialStops: RoutePlannerResult["stops"],
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
  pedestrianNetwork?: PedestrianNetworkGraph | null,
  signal?: AbortSignal,
  routingBudget?: RouteRoutingOperationBudget,
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
    if (routingBudget && !routingBudget.tryConsume()) break;
    providerCalls += 1;
    const attempt = await tryReconcileRetainedStops(
      origin,
      retainedStops,
      travelBudgetMinutes,
      topology,
      arrival,
      pedestrianNetwork,
      signal,
    );
    if (attempt?.warning?.startsWith("La mesure réseau")) {
      finalRoutingDegraded = true;
      finalRoutingWarning = attempt.warning;
      break;
    }
    if (!attempt) continue;
    plannedStops = retainedStops;
    routeGeometry = attempt.geometry;
    reconciled = true;
    finalRoutingDegraded ||= attempt.degraded;
    finalRoutingWarning = attempt.warning;
    break;
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
  topology: RouteTopology,
  arrival?: RoutePlannerOrigin,
): Pick<NetworkReconciliation, "plannedStops" | "routeGeometry"> {
  const fallbackCandidates = fallbackStops.map(({ candidate }) => candidate);
  const fallbackPrefix = topology === "loop"
    ? fallbackRoutePrefixWithinBudget(
        origin,
        fallbackCandidates,
        travelBudgetMinutes,
        (coordinates) => createFallbackRouteGeometry(coordinates),
      )
    : fallbackRoutePrefixWithinBudget(
        origin,
        fallbackCandidates,
        travelBudgetMinutes,
        (coordinates) => createFallbackRouteGeometry(coordinates, { topology }),
        topology,
        arrival,
      );
  const plannedStops = fallbackStops.slice(0, fallbackPrefix.length);
  return {
    plannedStops,
    routeGeometry: fallbackGeometryForPrefix(
      origin,
      plannedStops.map(({ candidate }) => candidate),
      topology,
      arrival,
    ),
  };
}

export async function reconcileSingleRouteGeometry(
  origin: RoutePlannerOrigin,
  travelBudgetMinutes: number,
  initialStops: RoutePlannerResult["stops"],
  topology: RouteTopology = "loop",
  arrival?: RoutePlannerOrigin,
  pedestrianNetwork?: PedestrianNetworkGraph | null,
  signal?: AbortSignal,
  routingBudget?: RouteRoutingOperationBudget,
): Promise<RouteGeometryReconciliation> {
  let plannedStops = initialStops;
  let routeGeometry = fallbackGeometryForPrefix(origin, [], topology, arrival);
  let budgetPrefixApplied = false;
  let providerCalls = 0; let firstProviderMode: RouteGeometry["mode"] | null = null;
  let finalRoutingWarning: string | null = null;
  let finalRoutingDegraded = false;

  const hasExplicitOpenArrival = topology === "open" && arrival !== undefined;
  if (plannedStops.length > 0 || hasExplicitOpenArrival) {
    const routeCoordinates: [number, number][] = [
      [origin.latitude, origin.longitude],
      ...plannedStops.map(
        ({ candidate }) =>
          [candidate.latitude, candidate.longitude] as [number, number],
      ),
      ...(topology === "loop"
        ? [[origin.latitude, origin.longitude] as [number, number]]
        : arrival
          ? [[arrival.latitude, arrival.longitude] as [number, number]]
          : []),
    ];
    if (routingBudget && !routingBudget.tryConsume()) {
      routeGeometry = fallbackGeometryForPrefix(origin, [], topology, arrival);
      finalRoutingDegraded = true;
      finalRoutingWarning = "Le quota de routage nearest_relevant est épuisé ; une géométrie locale dégradée est utilisée.";
    } else {
      routeGeometry = await routeWithAvailableNetwork(routeCoordinates, topology, pedestrianNetwork, signal);
      providerCalls += 1; firstProviderMode = routeGeometry.mode;
    }

    if (routeGeometry.durationMinutes > travelBudgetMinutes) {
      budgetPrefixApplied = true;
      const network = routeGeometry.mode === "network"
        ? await reconcileNetworkRoute(origin, travelBudgetMinutes, routeGeometry, plannedStops, topology, arrival, pedestrianNetwork, signal, routingBudget)
        : null;
      if (network) {
        plannedStops = network.plannedStops;
        routeGeometry = network.routeGeometry;
        providerCalls += network.providerCalls;
        finalRoutingWarning = network.finalRoutingWarning ?? (
          network.routeGeometry.mode === "fallback" && topology === "loop"
            ? "La mesure réseau de la boucle réduite a échoué ; un fallback local fermé est utilisé."
            : null
        );
        finalRoutingDegraded = network.finalRoutingDegraded;
      }
      if (!network?.reconciled) {
        finalRoutingDegraded = true;
        if (!finalRoutingWarning) {
          finalRoutingWarning = network && network.providerCalls > 0 && topology === "loop"
            ? "La mesure réseau de la boucle réduite a échoué ; un fallback local fermé est utilisé."
            : topology === "loop"
              ? "La géométrie réseau de la boucle dépasse le budget ; un fallback local fermé est utilisé."
              : "La géométrie réseau du trajet ouvert dépasse le budget ; un fallback local estimé est utilisé.";
        }
        const fallbackStops = network?.fallbackStops ?? plannedStops;
        const fallback = applyFallbackRoutePrefix(
          origin,
          travelBudgetMinutes,
          fallbackStops,
          topology,
          arrival,
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
