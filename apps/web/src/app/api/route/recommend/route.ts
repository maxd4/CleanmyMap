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
import type { RouteRecommendationResponseInput } from "./route.response.builders";
import {
  buildPlannerPollutionRelevance,
} from "./route.response.builders";
import { loadRouteEventCenteredAnchor } from "@/lib/route/route-event-centered-loader";
import { resolveEffectiveRiskFocus } from "@/lib/route/route-risk-focus";
import { routeGuidedBudgetForMode } from "@/lib/route/route-planning-mode";
import { fetchPlannerWeatherContext } from "@/lib/weather/planner-weather";
import { loadActivePedestrianNetwork } from "@/lib/route/pedestrian-network-store";
import { loadActivePedestrianRiskProjection } from "@/lib/route/pedestrian-risk-projection-store";
import { isPedestrianRiskProjectionCompatible } from "@/lib/route/pedestrian-segment-route-planner";
import {
  buildRouteNearestRelevantProbePoints,
  createRouteNearestRelevantReference,
  findNearestRelevantRoute,
} from "@/lib/route/route-nearest-relevant";
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
    const searchMode = options.searchMode;
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
    const nearestRelevantReference = searchMode === "nearest_relevant"
      ? createRouteNearestRelevantReference({
          origin: startZone
            ? undefined
            : {
                ...origin,
                ...(options.startLocation?.mode === "precise" ? { label: options.startLocation.label } : {}),
              },
          zone: startZone
            ? {
                label: options.startLocation?.label ?? "Zone demandée",
                center: startZone.center,
                radiusKm: startZone.radiusKm,
                bounds: startZone.bounds,
              }
            : undefined,
        })
      : null;
    const nearestRelevantProbePoints = nearestRelevantReference
      ? buildRouteNearestRelevantProbePoints(nearestRelevantReference)
      : [];
    const spatialCandidates = candidateData.spatialCandidates;
    const loadedPedestrianNetwork = await loadActivePedestrianNetwork(supabase, [
      origin,
      ...(options.arrival ? [options.arrival] : []),
      ...spatialCandidates.map((candidate) => ({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      })),
      ...nearestRelevantProbePoints,
    ]);
    const pedestrianRiskProjection = await loadActivePedestrianRiskProjection(supabase, [
      origin,
      ...(options.arrival ? [options.arrival] : []),
      ...spatialCandidates.map((candidate) => ({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      })),
      ...nearestRelevantProbePoints,
    ]);
    const pedestrianNetwork = loadedPedestrianNetwork &&
      (!pedestrianRiskProjection || isPedestrianRiskProjectionCompatible(loadedPedestrianNetwork, pedestrianRiskProjection))
      ? loadedPedestrianNetwork
      : null;
    const weatherContext = await fetchPlannerWeatherContext({
      latitude: origin.latitude,
      longitude: origin.longitude,
      scheduledStartAt: options.scheduledStartAt,
      scheduledEndAt: options.scheduledEndAt,
    });
    const buildPlanning = (
      candidateOrigin: typeof origin,
      candidateArrival: typeof options.arrival,
      candidateTopology: typeof options.routeTopology,
    ) => planRouteRecommendation({
      origin: candidateOrigin,
      arrival: candidateArrival,
      routeTopology: candidateTopology,
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

    const initialPlanning = await buildPlanning(origin, options.arrival, options.routeTopology);
    const buildResponseInput = (
      candidateOrigin: typeof origin,
      candidateArrival: typeof options.arrival,
      candidateTopology: typeof options.routeTopology,
      candidatePlanning: typeof initialPlanning,
      nearestRelevantSearch?: RouteRecommendationResponseInput["nearestRelevantSearch"],
    ): RouteRecommendationResponseInput => ({
      origin: candidateOrigin,
      arrival: candidateArrival,
      routeTopology: candidateTopology,
      locationPreference,
      eventPressureContext,
      candidateData,
      planning: candidatePlanning,
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
      ...(nearestRelevantSearch ? { nearestRelevantSearch } : {}),
    });

    const initialResponseInput = buildResponseInput(
      origin,
      options.arrival,
      options.routeTopology,
      initialPlanning,
    );
    let selectedResponseInput = initialResponseInput;
    if (searchMode === "nearest_relevant" && nearestRelevantReference) {
      const initialRelevance = buildPlannerPollutionRelevance(initialResponseInput);
      const alternativePlans = new Map<string, typeof initialPlanning>();
      const nearestSearch = await findNearestRelevantRoute({
        graph: pedestrianNetwork,
        reference: nearestRelevantReference,
        baseline: {
          relevance: initialRelevance,
          withinBudget: initialPlanning.routeGeometry.durationMinutes <= effectiveTravelBudgetMinutes,
          loopVerified: initialPlanning.routeGeometry.isLoop,
          routingStatus: initialPlanning.routeGeometry.mode === "network" ? "network" : "fallback",
          providerCalls: initialPlanning.finalRoutingReconciliation?.providerCalls ?? 0,
        },
        evaluate: async (candidateOrigin) => {
          const candidatePlanning = await buildPlanning(candidateOrigin, undefined, "loop");
          const candidateInput = buildResponseInput(candidateOrigin, undefined, "loop", candidatePlanning);
          alternativePlans.set(`${candidateOrigin.latitude.toFixed(7)}:${candidateOrigin.longitude.toFixed(7)}`, candidatePlanning);
          const candidateGroupRoutes = candidatePlanning.groupRoutes ?? [];
          return {
            relevance: buildPlannerPollutionRelevance(candidateInput),
            withinBudget: candidateGroupRoutes.length > 0
              ? candidateGroupRoutes.every((group) => group.withinBudget)
              : candidatePlanning.routeGeometry.durationMinutes <= effectiveTravelBudgetMinutes,
            loopVerified: candidatePlanning.routeGeometry.isLoop &&
              candidateGroupRoutes.every((group) => group.routeGeometry.isLoop),
            routingStatus: candidatePlanning.routeGeometry.mode === "network" ? "network" : "fallback",
            providerCalls: candidatePlanning.finalRoutingReconciliation?.providerCalls ?? 0,
          };
        },
      });
      if (nearestSearch.selected) {
        const selectedKey = `${nearestSearch.selected.origin.latitude.toFixed(7)}:${nearestSearch.selected.origin.longitude.toFixed(7)}`;
        const selectedPlanning = alternativePlans.get(selectedKey);
        if (selectedPlanning) {
          selectedResponseInput = buildResponseInput(
            nearestSearch.selected.origin,
            undefined,
            "loop",
            selectedPlanning,
            nearestSearch.search,
          );
        }
      } else {
        selectedResponseInput = buildResponseInput(
          origin,
          options.arrival,
          options.routeTopology,
          initialPlanning,
          nearestSearch.search,
        );
      }
    }
    const response = buildRouteRecommendationResponse(selectedResponseInput);

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
