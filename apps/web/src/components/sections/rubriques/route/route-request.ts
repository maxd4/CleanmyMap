import type { RouteConstraints, RouteResponse } from "./route-types";

export type RouteRecommendationRequest = {
  id: number;
  constraints: RouteConstraints;
};

export function createRouteRecommendationRequest(
  id: number,
  constraints: RouteConstraints,
): RouteRecommendationRequest {
  return {
    id,
    constraints: { ...constraints },
  };
}

export async function fetchRouteRecommendation(
  request: RouteRecommendationRequest,
  transport: typeof fetch = fetch,
): Promise<RouteResponse> {
  const response = await transport("/api/route/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request.constraints),
  });

  if (!response.ok) {
    throw new Error("Route unavailable");
  }

  return (await response.json()) as RouteResponse;
}
