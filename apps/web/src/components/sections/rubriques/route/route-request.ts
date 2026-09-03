import type {
  RouteOptions,
  RouteOriginMode,
  RouteRecommendationOrigin,
  RouteResponse,
} from "./route-types";

export type RouteRecommendationRequest = {
  id: number;
  options: RouteOptions;
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

export function createRouteRecommendationRequest(
  id: number,
  options: RouteOptions,
  origin?: RouteRecommendationOrigin,
): RouteRecommendationRequest {
  return {
    id,
    options: { ...options },
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
  request: RouteRecommendationRequest,
  transport: typeof fetch = fetch,
): Promise<RouteResponse> {
  const response = await transport("/api/route/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...request.options,
      ...(request.origin ? { origin: request.origin } : {}),
    }),
  });

  if (!response.ok) {
    throw new RouteRecommendationError(response.status);
  }

  return (await response.json()) as RouteResponse;
}
