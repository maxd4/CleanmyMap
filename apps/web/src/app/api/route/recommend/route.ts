import { z } from"zod";
import { NextResponse } from"next/server";
import { buildTrashSpotterActionableCandidates } from"@/lib/actions/trash-spotter-actionable-candidates";
import { getSafeAuthSession } from "@/lib/auth/safe-session";
import { getCurrentUserLocationPreference } from"@/lib/auth/user-location";
import { trackRouteRecommendationUse } from"@/lib/gamification/progression";
import {
  buildTrashSpotterRouteCandidates,
  type TrashSpotterRouteCandidate,
} from"@/lib/route/trash-spotter-recommendation";
import {
  applyOriginRouteGeometryLegs,
  type RouteStop,
} from "@/lib/route/route-contract";
import {
  getTerritoryArrondissementCenter,
  type TerritoryArrondissement,
} from "@/lib/geo/paris-arrondissements";
import {
  createFallbackRouteGeometry,
} from "@/lib/geo/osrm-routing";
import { routePolylineThroughFossgisFoot } from "@/lib/route/fossgis-foot-routing";
import {
  buildHotspots,
  buildProactiveAssistant,
  defaultRouteAssistantPayload,
  defaultRouteRecommendationFloorDate,
  loadCachedEventPressureByArrondissement,
} from"@/lib/route/recommendation-assistant";
import { getSupabaseServerClient } from"@/lib/supabase/server";
import { unauthorizedJsonResponse } from"@/lib/http/auth-responses";
import { handleApiError } from"@/lib/http/api-errors";
import {
  createServerRateLimitResponse,
  verifyRateLimit,
} from "@/lib/rate-limit/server";
import { resolveRouteDataStatus } from "@/lib/route/route-data-status";
import { loadRouteRecommendationSource } from "@/lib/route/route-recommendation-loader";
import {
  fallbackRoutePrefixWithinBudget,
  longestNetworkPrefixWithinBudget,
  planRoute,
  ROUTE_PLANNER_ENGINE_VERSION,
  type RoutePlannerOrigin,
} from "@/lib/route/route-planner";

export const runtime ="nodejs";

const requestSchema = z.object({
 origin: z
   .object({
     latitude: z.number().finite().min(-90).max(90),
     longitude: z.number().finite().min(-180).max(180),
     source: z.enum(["browser", "map"]),
   })
   .optional(),
 travelBudgetMinutes: z.number().finite().min(0).default(60),
 maxStops: z.number().int().min(1).max(12).default(6),
 priorityVsTravel: z.number().finite().min(0).max(100).optional(),
 priorityVsDistance: z.number().finite().min(0).max(100).optional(),
}).strip();

const ROUTE_RECOMMENDATION_RATE_LIMIT = {
  limit: 6,
  window: 60,
} as const;

const EMPTY_EVENT_PRESSURE_CONTEXT = {
  pressureByArrondissement: new Map<number, number>(),
  eventSignals: [],
};

function resolveRouteOrigin(
  explicitOrigin: RoutePlannerOrigin | undefined,
  arrondissement: TerritoryArrondissement | undefined,
): RoutePlannerOrigin | null {
  if (explicitOrigin) {
    return explicitOrigin;
  }

  if (arrondissement === undefined) {
    return null;
  }

  const center = getTerritoryArrondissementCenter(arrondissement);
  if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) {
    return null;
  }

  return {
    latitude: center.lat,
    longitude: center.lng,
    source: "approximate_saved_area",
  };
}

function fallbackGeometryForPrefix(
  origin: RoutePlannerOrigin,
  stops: Array<{ latitude: number; longitude: number }>,
): ReturnType<typeof createFallbackRouteGeometry> {
  return createFallbackRouteGeometry([
    [origin.latitude, origin.longitude],
    ...stops.map(
      (stop) => [stop.latitude, stop.longitude] as [number, number],
    ),
  ]);
}

export async function POST(request: Request) {
 const session = await getSafeAuthSession();
 const userId = session.userId;
 if (!userId) {
 return unauthorizedJsonResponse();
 }

 const rateLimit = await verifyRateLimit(request, ROUTE_RECOMMENDATION_RATE_LIMIT);
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
 { error:"Invalid JSON payload" },
 { status: 400 },
 );
 }

 const parsed = requestSchema.safeParse(rawPayload);
 if (!parsed.success) {
 return NextResponse.json(
 { error:"Invalid payload", details: parsed.error.flatten().fieldErrors },
 { status: 400 },
 );
 }

 const options = parsed.data;
 const priorityVsTravel =
   options.priorityVsTravel ?? options.priorityVsDistance ?? 65;

 try {
 const supabase = getSupabaseServerClient();
 const eventPressurePromise = loadCachedEventPressureByArrondissement(() => supabase).catch(
   (eventPressureError: unknown) => {
     console.warn("Route recommendation event pressure unavailable; continuing without it", {
       message:
         eventPressureError instanceof Error
           ? eventPressureError.message
           : String(eventPressureError),
     });
     return EMPTY_EVENT_PRESSURE_CONTEXT;
   },
 );
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

 const { items: contracts, isTruncated, sourceHealth } =
   await loadRouteRecommendationSource(supabase, {
 limit: 600,
  floorDate: defaultRouteRecommendationFloorDate(),
 });

 const actionableCandidates = buildTrashSpotterActionableCandidates(contracts);
 const candidates: TrashSpotterRouteCandidate[] = buildTrashSpotterRouteCandidates(
 actionableCandidates,
 );
 const dataStatus = resolveRouteDataStatus({
   candidateCount: candidates.length,
   isTruncated,
   sourceHealth,
 });

  const selected = candidates.slice(0, Math.max(options.maxStops * 2, 8));
  const plannerResult = planRoute({
    origin,
    candidates: selected,
    travelBudgetMinutes: options.travelBudgetMinutes,
    maxStops: options.maxStops,
    priorityVsTravel,
  });
  let plannedStops = plannerResult.stops;
  let routeGeometry = createFallbackRouteGeometry([]);

  if (plannedStops.length === 0) {
    return NextResponse.json({
      status: "ok",
      dataStatus,
      isTruncated,
      sourceHealth,
      origin,
      travelDistanceKm: 0,
      travelMinutes: 0,
      travelBudgetMinutes: options.travelBudgetMinutes,
      withinBudget: true,
      serviceMinutesEstimate: null,
      totalMinutesEstimate: null,
      diagnostics: plannerResult.diagnostics,
      generatedAt: new Date().toISOString(),
      engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
      stops: [],
      routeGeometry,
      scoreBreakdown: { priority: 0, distance: 0 },
      tradeoffs: [
        "Aucun point géolocalisé disponible dans la source consultée.",
      ],
      proactiveAssistant: {
        ...defaultRouteAssistantPayload(),
      },
    });
  }

  const routeCoordinates: [number, number][] = [
    [origin.latitude, origin.longitude],
    ...plannedStops.map(
      ({ candidate }) =>
        [candidate.latitude, candidate.longitude] as [number, number],
    ),
  ];
  routeGeometry = await routePolylineThroughFossgisFoot(
    routeCoordinates,
    {},
  );

  if (routeGeometry.durationMinutes > options.travelBudgetMinutes) {
    if (routeGeometry.mode === "network") {
      const prefixLength = longestNetworkPrefixWithinBudget(
        routeGeometry.legs,
        options.travelBudgetMinutes,
      );
      plannedStops = plannedStops.slice(0, prefixLength);
    } else {
      const fallbackPrefix = fallbackRoutePrefixWithinBudget(
        origin,
        plannedStops.map(({ candidate }) => candidate),
        options.travelBudgetMinutes,
        (coordinates) => createFallbackRouteGeometry(coordinates),
      );
      plannedStops = plannedStops.slice(0, fallbackPrefix.length);
    }
    routeGeometry = fallbackGeometryForPrefix(
      origin,
      plannedStops.map(({ candidate }) => candidate),
    );
  }

 const estimatedStops: RouteStop[] = plannedStops.map(
   ({ candidate, incrementalDistanceKm, incrementalTravelMinutes }) => ({
     id: candidate.id,
     label: candidate.label,
     latitude: candidate.latitude,
     longitude: candidate.longitude,
     segmentKm: Number(incrementalDistanceKm.toFixed(2)),
     estimatedMinutes: Math.max(0, Math.round(incrementalTravelMinutes)),
     priorityReason: candidate.reason,
     score: Number(candidate.score.toFixed(2)),
   }),
 );
 const stops = applyOriginRouteGeometryLegs(estimatedStops, routeGeometry);
 const totalDistance = routeGeometry.distanceKm;
 const travelMinutes = Math.min(
   Math.max(0, routeGeometry.durationMinutes),
   options.travelBudgetMinutes,
 );
 const averagePriority =
 plannedStops.length > 0
   ? plannedStops.reduce((acc, { candidate }) => acc + candidate.score, 0) /
     plannedStops.length
   : 0;
 const distanceScore = Math.max(0, 100 - totalDistance * 5);
 const hotspots = buildHotspots({
 candidates,
 pressureByArrondissement: eventPressureContext.pressureByArrondissement,
 userArrondissement: locationPreference?.arrondissement ?? null,
 });
 const proactiveAssistant = buildProactiveAssistant({
 stops: plannedStops.map(({ candidate }) => ({
   label: candidate.label,
   score: candidate.score,
 })),
 hotspots,
 eventSignals: eventPressureContext.eventSignals,
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

 return NextResponse.json({
 status:"ok",
 dataStatus,
 isTruncated,
 sourceHealth,
 origin,
 travelDistanceKm: totalDistance,
 travelMinutes,
 travelBudgetMinutes: options.travelBudgetMinutes,
 withinBudget: travelMinutes <= options.travelBudgetMinutes,
 serviceMinutesEstimate: null,
 totalMinutesEstimate: null,
 diagnostics: plannerResult.diagnostics,
 generatedAt: new Date().toISOString(),
 engineVersion: ROUTE_PLANNER_ENGINE_VERSION,
 stops,
 routeGeometry,
 scoreBreakdown: {
 priority: Number(averagePriority.toFixed(1)),
 distance: Number(distanceScore.toFixed(1)),
 },
 tradeoffs: [
 `Pondération opérationnelle: ${priorityVsTravel}% priorité / ${100 - priorityVsTravel}% distance.`,
 ],
 proactiveAssistant,
 });
 } catch (error) {
 return handleApiError(error, "POST /api/route/recommend");
 }
}
