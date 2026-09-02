import { auth } from"@clerk/nextjs/server";
import { z } from"zod";
import { NextResponse } from"next/server";
import { buildTrashSpotterActionableCandidates } from"@/lib/actions/trash-spotter-actionable-candidates";
import { getCurrentUserLocationPreference } from"@/lib/auth/user-location";
import { trackRouteRecommendationUse } from"@/lib/gamification/progression";
import {
  buildTrashSpotterRouteCandidates,
 distanceKm,
 selectNextTrashSpotterStop,
 type TrashSpotterRouteCandidate,
} from"@/lib/route/trash-spotter-recommendation";
import {
  applyRouteGeometryLegs,
  type RouteStop,
} from "@/lib/route/route-contract";
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

export const runtime ="nodejs";

const requestSchema = z.object({
 priorityVsDistance: z.number().min(0).max(100).default(65),
 maxStops: z.number().int().min(2).max(12).default(6),
}).strip();

const ROUTE_RECOMMENDATION_RATE_LIMIT = {
  limit: 6,
  window: 60,
} as const;

const EMPTY_EVENT_PRESSURE_CONTEXT = {
  pressureByArrondissement: new Map<number, number>(),
  eventSignals: [],
};

export async function POST(request: Request) {
 const { userId } = await auth();
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
  const routeStart = selected[0];
  if (routeStart === undefined) {
    return NextResponse.json({
      status: "ok",
      dataStatus,
      isTruncated,
      sourceHealth,
      stops: [],
      routeGeometry: createFallbackRouteGeometry([]),
      scoreBreakdown: { priority: 0, distance: 0 },
      tradeoffs: [
        "Aucun point géolocalisé disponible dans la source consultée.",
      ],
      proactiveAssistant: {
        ...defaultRouteAssistantPayload(),
      },
    });
  }

 const priorityWeight = options.priorityVsDistance / 100;
 const distanceWeight = 1 - priorityWeight;
 const route: TrashSpotterRouteCandidate[] = [routeStart];
 const unvisited = selected.slice(1);

 while (route.length < options.maxStops && unvisited.length > 0) {
  const current = route[route.length - 1];
  if (!current) {
   break;
  }

  const next = selectNextTrashSpotterStop(current, unvisited, priorityWeight, distanceWeight);
  if (!next) {
   break;
  }

  route.push(next);
  const nextIndex = unvisited.indexOf(next);
  if (nextIndex >= 0) {
   unvisited.splice(nextIndex, 1);
  }
 }

 const estimatedStops: RouteStop[] = route.map((item, index) => {
 const prev = index > 0 ? route[index - 1] : null;
 const segmentKm = prev ? distanceKm(prev, item) : 0;
 return {
 id: item.id,
 label: item.label,
 latitude: item.latitude,
 longitude: item.longitude,
 segmentKm: Number(segmentKm.toFixed(2)),
 estimatedMinutes: Math.max(0, Math.round((segmentKm / 4.5) * 60)),
 priorityReason: item.reason,
 score: Number(item.score.toFixed(2)),
 };
 });

 const routeGeometry = await routePolylineThroughFossgisFoot(
   route.map((item) => [item.latitude, item.longitude] as [number, number]),
   {},
 );
 const stops = applyRouteGeometryLegs(estimatedStops, routeGeometry);
 const totalDistance =
   routeGeometry.mode === "network"
     ? routeGeometry.distanceKm
     : stops.reduce((acc, stop) => acc + stop.segmentKm, 0);
 const averagePriority =
 route.reduce((acc, item) => acc + item.score, 0) / route.length;
 const distanceScore = Math.max(0, 100 - totalDistance * 5);
 const hotspots = buildHotspots({
 candidates,
 pressureByArrondissement: eventPressureContext.pressureByArrondissement,
 userArrondissement: locationPreference?.arrondissement ?? null,
 });
 const proactiveAssistant = buildProactiveAssistant({
 stops: route.map((item) => ({ label: item.label, score: item.score })),
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
 stops,
 routeGeometry,
 scoreBreakdown: {
 priority: Number(averagePriority.toFixed(1)),
 distance: Number(distanceScore.toFixed(1)),
 },
 tradeoffs: [
 `Pondération opérationnelle: ${options.priorityVsDistance}% priorité / ${100 - options.priorityVsDistance}% distance.`,
 ],
 proactiveAssistant,
 });
 } catch (error) {
 return handleApiError(error, "POST /api/route/recommend");
 }
}
