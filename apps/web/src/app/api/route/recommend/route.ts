import { NextResponse } from "next/server";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserLocationPreference } from "@/lib/auth/user-location";
import { trackRouteRecommendationUse } from "@/lib/gamification/progression";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";
import { handleApiError } from "@/lib/http/api-errors";
import {
  createServerRateLimitResponse,
  verifyRateLimit,
} from "@/lib/rate-limit/server";
import {
  loadRouteCandidateData,
  loadRouteEventPressure,
} from "./route.candidates";
import { resolveRouteOrigin } from "./route.origin";
import { planRouteRecommendation } from "./route.planning";
import { buildRouteRecommendationResponse } from "./route.response";
import {
  parseRouteRecommendationRequest,
  resolvePriorityVsTravel,
  ROUTE_RECOMMENDATION_RATE_LIMIT,
} from "./route.schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSafeAuthSession();
  const userId = session.userId;
  if (!userId) {
    return unauthorizedJsonResponse();
  }

  const rateLimit = await verifyRateLimit(
    request,
    ROUTE_RECOMMENDATION_RATE_LIMIT,
  );
  const rateLimitResponse = createServerRateLimitResponse(
    rateLimit.allowed,
    rateLimit.retryAfter,
    rateLimit,
  );
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = parseRouteRecommendationRequest(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const options = parsed.data;
  const priorityVsTravel = resolvePriorityVsTravel(options);

  try {
    const supabase = getSupabaseServerClient();
    const eventPressurePromise = loadRouteEventPressure(supabase);
    const [locationPreference, eventPressureContext] = await Promise.all([
      getCurrentUserLocationPreference(),
      eventPressurePromise,
    ]);
    const origin = resolveRouteOrigin(
      options.origin,
      locationPreference?.arrondissement,
    );

    if (!origin) {
      return NextResponse.json(
        { error: "A route origin is required." },
        { status: 422 },
      );
    }

    const candidateData = await loadRouteCandidateData(supabase);
    const planning = await planRouteRecommendation({
      origin,
      spatialCandidates: candidateData.spatialCandidates,
      parisPressureSnapshot: candidateData.parisPressureSnapshot,
      travelBudgetMinutes: options.travelBudgetMinutes,
      maxStops: options.maxStops,
      priorityVsTravel,
    });
    const response = buildRouteRecommendationResponse({
      origin,
      locationPreference,
      eventPressureContext,
      candidateData,
      planning,
      travelBudgetMinutes: options.travelBudgetMinutes,
      priorityVsTravel,
    });

    try {
      await trackRouteRecommendationUse(supabase, { userId });
    } catch (progressionError) {
      console.error("Progression tracking failed for route recommendation", {
        userId,
        message:
          progressionError instanceof Error
            ? progressionError.message
            : String(progressionError),
      });
    }

    return response;
  } catch (error) {
    return handleApiError(error, "POST /api/route/recommend");
  }
}
