import type { RouteOptions, RouteResponse } from "./route-types";

export type RouteRecommendationRequest = {
  id: number;
  options: RouteOptions;
};

export function createRouteRecommendationRequest(
  id: number,
  options: RouteOptions,
): RouteRecommendationRequest {
  return {
    id,
    options: { ...options },
  };
}

export async function fetchRouteRecommendation(
  request: RouteRecommendationRequest,
  transport: typeof fetch = fetch,
): Promise<RouteResponse> {
  const response = await transport("/api/route/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.options),
  });

  if (!response.ok) {
    throw new Error("Route unavailable");
  }

  return (await response.json()) as RouteResponse;
}
