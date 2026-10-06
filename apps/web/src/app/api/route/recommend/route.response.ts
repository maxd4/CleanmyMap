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

export function buildRouteRecommendationResponse(
  input: RouteRecommendationResponseInput,
): NextResponse {
  const context = buildRouteOperationalContext(input);
  const proofs = buildRouteProofContext(input, context);
  const responsePayload = input.planning.plannedStops.length === 0
    ? buildEmptyRouteResponsePayload(input, context, proofs)
    : buildResultRouteResponsePayload(input, context, proofs);
  return NextResponse.json(responsePayload);
}
