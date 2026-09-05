import type {
  RouteOptions,
  RouteOriginMode,
  RouteRecommendationOrigin,
  RouteResponse,
  RoutePlanningMode,
} from "./route-types";
import type { RouteRecommendationRequest } from "@/lib/route/route-response-contract";

export type RouteRecommendationSubmission = {
  id: number;
  options: RouteOptions;
  planningMode: RoutePlanningMode;
  origin?: RouteRecommendationOrigin;
};

export type RouteRequestGate = {
  start: () => boolean;
  finish: () => void;
};

export function createRouteRequestGate(): RouteRequestGate {
  let inFlight = false;

  return {
    start: () => {
      if (inFlight) return false;
      inFlight = true;
      return true;
    },
    finish: () => {
      inFlight = false;
    },
  };
}

export function createRouteRecommendationSubmission(
  id: number,
  options: RouteOptions,
  origin?: RouteRecommendationOrigin,
  planningMode: RoutePlanningMode = { type: "free" },
): RouteRecommendationSubmission {
  return {
    id,
    options: { ...options },
    planningMode:
      planningMode.type === "event-centered" ? { ...planningMode } : { type: "free" },
    ...(origin ? { origin: { ...origin } } : {}),
  };
}

export async function resolveRouteRequestOrigin(
  mode: RouteOriginMode,
  mapOrigin: RouteRecommendationOrigin | null,
  browserResolver: () => Promise<RouteRecommendationOrigin | undefined>,
): Promise<RouteRecommendationOrigin | undefined> {
  if (mode === "map") {
    return mapOrigin ?? undefined;
  }

  return browserResolver();
}

export class RouteRecommendationError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(status === 422 ? "Route origin unavailable" : "Route unavailable");
    this.name = "RouteRecommendationError";
    this.status = status;
  }
}

export function isRouteOriginUnavailableError(error: unknown): boolean {
  return error instanceof RouteRecommendationError && error.status === 422;
}

export async function fetchRouteRecommendation(
  request: RouteRecommendationSubmission,
  transport: typeof fetch = fetch,
): Promise<RouteResponse> {
  const payload = {
    ...request.options,
    planningMode: request.planningMode,
    ...(request.origin ? { origin: request.origin } : {}),
  } satisfies RouteRecommendationRequest;

  const response = await transport("/api/route/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new RouteRecommendationError(response.status);
  }

  return (await response.json()) as RouteResponse;
}
