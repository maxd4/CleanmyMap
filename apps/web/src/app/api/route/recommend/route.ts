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
import { selectRouteOriginWithinZone } from "@/lib/route/route-start-location";
import { planRouteRecommendation } from "./route.planning";
import { buildRouteRecommendationResponse } from "./route.response";
import { loadRouteEventCenteredAnchor } from "@/lib/route/route-event-centered-loader";
import { resolveEffectiveRiskFocus } from "@/lib/route/route-risk-focus";
import { routeGuidedBudgetForMode } from "@/lib/route/route-planning-mode";
import { fetchPlannerWeatherContext } from "@/lib/weather/planner-weather";
import { loadActivePedestrianNetwork } from "@/lib/route/pedestrian-network-store";
import { loadActivePedestrianRiskProjection } from "@/lib/route/pedestrian-risk-projection-store";
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
    const effectiveRiskFocus = resolveEffectiveRiskFocus({
      pickupPreference: options.pickupPreference,
      riskFocus: options.riskFocus,
    });
    const startZone = options.startLocation?.mode === "zone"
      ? options.startLocation.zone
      : null;

  try {
    const supabase = getSupabaseServerClient(true);
    const eventPressurePromise = loadRouteEventPressure(supabase);
    const [locationPreference, eventPressureContext] = await Promise.all([
      getCurrentUserLocationPreference(),
      eventPressurePromise,
    ]);
    const preciseOrigin = options.startLocation?.mode === "precise"
      ? options.startLocation.origin
      : options.origin;
    let origin = resolveRouteOrigin(
      preciseOrigin,
      locationPreference?.arrondissement,
    );

    if (!origin && !startZone) {
      return NextResponse.json({ error: "A route origin is required." }, { status: 422 });
    }

    const planningMode = options.planningMode;
    const guidedBudget = routeGuidedBudgetForMode(
      planningMode,
      options.travelBudgetMinutes,
    );
    const effectiveTravelBudgetMinutes = guidedBudget?.totalMinutes ?? options.travelBudgetMinutes;
    const eventCenteredAnchor =
      planningMode.type === "event-centered"
        ? await loadRouteEventCenteredAnchor(supabase, planningMode.eventId)
        : null;
    if (planningMode.type === "event-centered" && !eventCenteredAnchor) {
      return NextResponse.json(
        { error: "A geolocated event is required for event-centered planning." },
        { status: 422 },
      );
    }

    const candidateData = await loadRouteCandidateData(supabase);
    if (startZone) {
      origin = selectRouteOriginWithinZone(
        startZone,
        candidateData.spatialCandidates,
      );
      if (!origin) {
        return NextResponse.json(
          { error: "Aucun départ piéton admissible n’a été trouvé dans la zone confirmée." },
          { status: 422 },
        );
      }
    }
    if (!origin) {
      return NextResponse.json({ error: "A route origin is required." }, { status: 422 });
    }
    const spatialCandidates = candidateData.spatialCandidates;
    const pedestrianNetwork = await loadActivePedestrianNetwork(supabase, [
      origin,
      ...(options.arrival ? [options.arrival] : []),
      ...spatialCandidates.map((candidate) => ({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      })),
    ]);
    const pedestrianRiskProjection = await loadActivePedestrianRiskProjection(supabase, [
      origin,
      ...(options.arrival ? [options.arrival] : []),
      ...spatialCandidates.map((candidate) => ({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      })),
    ]);
    const weatherContext = await fetchPlannerWeatherContext({
      latitude: origin.latitude,
      longitude: origin.longitude,
      scheduledStartAt: options.scheduledStartAt,
      scheduledEndAt: options.scheduledEndAt,
    });
    const planning = await planRouteRecommendation({
      origin,
      arrival: options.arrival,
      routeTopology: options.routeTopology,
      spatialCandidates,
      // Predicted targets are server-backed by the materialized projection;
      // the historical pressure snapshot remains available only to observed
      // candidate enrichment in loadRouteCandidateData.
      parisPressureSnapshot: null,
      pedestrianRiskProjection,
      municipalCleaningSnapshot: candidateData.municipalCleaningSnapshot,
      travelBudgetMinutes: effectiveTravelBudgetMinutes,
      maxStops: options.maxStops,
      priorityVsTravel,
      volunteers: options.volunteers,
      groupCount: options.groupCount,
      effectiveRiskFocus,
      planningMode,
      guidedBudget: guidedBudget ?? undefined,
      eventCenteredAnchor,
      eventSignalContext: candidateData.routeEventSignalContext,
      weatherContext,
      pedestrianNetwork,
    });
    const response = buildRouteRecommendationResponse({
      origin,
      arrival: options.arrival,
      routeTopology: options.routeTopology,
      locationPreference,
      eventPressureContext,
      candidateData,
      planning,
      planningMode,
      guidedBudget: guidedBudget ?? undefined,
      maxStops: options.maxStops,
      travelBudgetMinutes: effectiveTravelBudgetMinutes,
      priorityVsTravel,
      volunteers: options.volunteers,
      groupCount: options.groupCount,
      pickupPreference: options.pickupPreference,
      weatherContext,
      startLocation: options.startLocation,
      pedestrianRiskProjection,
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
