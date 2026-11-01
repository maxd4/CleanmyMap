import { NextResponse } from "next/server";
import {
  buildRouteOperationalContext,
  buildRouteProofContext,
  type RouteRecommendationResponseInput,
} from "./route.response.builders";
import {
  buildEmptyRouteResponsePayload,
  buildResultRouteResponsePayload,
} from "./route.response.payload";

function hasRealRouteGeometry(
  context: ReturnType<typeof buildRouteOperationalContext>,
): boolean {
  if (context.groupRoutes.length > 0) {
    return context.groupRoutes.some(({ routeGeometry }) =>
      routeGeometry.distanceKm > 0 || routeGeometry.durationMinutes > 0,
    );
  }
  return context.multiRoute.totalDistanceKm > 0 || context.multiRoute.totalDurationMinutes > 0;
}

export function buildRouteRecommendationResponse(
  input: RouteRecommendationResponseInput,
): NextResponse {
  const context = buildRouteOperationalContext(input);
  const proofs = buildRouteProofContext(input, context);
  const responsePayload = input.planning.plannedStops.length === 0 && !hasRealRouteGeometry(context)
    ? buildEmptyRouteResponsePayload(input, context, proofs)
    : buildResultRouteResponsePayload(input, context, proofs);
  return NextResponse.json(responsePayload);
}
