import { auth } from"@clerk/nextjs/server";
import { z } from"zod";
import { NextResponse } from"next/server";
import { fetchUnifiedActionContracts } from"@/lib/actions/unified-source";
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
  routePolylineThroughStreetNetwork,
} from "@/lib/geo/osrm-routing";
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

export const runtime ="nodejs";

const requestSchema = z.object({
 availableMinutes: z.number().int().min(30).max(600).default(180),
 volunteers: z.number().int().min(1).max(200).default(4),
 accessibility: z
 .enum(["standard","accessible","strict"])
 .default("standard"),
 security: z.enum(["standard","renforced"]).default("standard"),
 weather: z.enum(["ok","rain","wind","heat","cold"]).default("ok"),
 impactVsDistance: z.number().min(0).max(100).default(65),
 maxStops: z.number().int().min(2).max(12).default(6),
});

export async function POST(request: Request) {
 const { userId } = await auth();
 if (!userId) {
 return unauthorizedJsonResponse();
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

 const constraints = parsed.data;

 try {
 const supabase = getSupabaseServerClient();
 const [locationPreference, eventPressureContext] = await Promise.all([
 getCurrentUserLocationPreference(),
 loadCachedEventPressureByArrondissement(() => supabase),
 ]);
 const { items: contracts } = await fetchUnifiedActionContracts(supabase, {
 limit: 600,
 status:"approved",
 floorDate: defaultRouteRecommendationFloorDate(),
 requireCoordinates: true,
 // The source loader may still be shared with other action surfaces, but the
 // candidate capability below accepts only validated canonical spot records.
 types: ["spot"],
 });

 const actionableCandidates = buildTrashSpotterActionableCandidates(contracts);
 const candidates: TrashSpotterRouteCandidate[] = buildTrashSpotterRouteCandidates(
 actionableCandidates,
 constraints,
 );

  const selected = candidates.slice(0, Math.max(constraints.maxStops * 2, 8));
  const routeStart = selected[0];
  if (routeStart === undefined) {
    return NextResponse.json({
      status: "ok",
      stops: [],
      routeGeometry: createFallbackRouteGeometry([]),
      scoreBreakdown: { impact: 0, distance: 0, constraints: 0, global: 0 },
      constraintsApplied: constraints,
      tradeoffs: [
        "Aucun point geolocalise disponible pour les contraintes selectionnees.",
      ],
      proactiveAssistant: {
        ...defaultRouteAssistantPayload(),
      },
    });
  }

 const impactWeight = constraints.impactVsDistance / 100;
 const distanceWeight = 1 - impactWeight;
 const route: TrashSpotterRouteCandidate[] = [routeStart];
 const unvisited = selected.slice(1);

 while (route.length < constraints.maxStops && unvisited.length > 0) {
  const current = route[route.length - 1];
  if (!current) {
   break;
  }

  const next = selectNextTrashSpotterStop(current, unvisited, impactWeight, distanceWeight);
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
 estimatedMinutes: Math.max(
 8,
 Math.round(
 segmentKm * 4 +
 constraints.availableMinutes / Math.max(1, route.length),
 ),
 ),
 priorityReason: item.reason,
 score: Number(item.score.toFixed(2)),
 };
 });

 const routeGeometry = await routePolylineThroughStreetNetwork(
   route.map((item) => [item.latitude, item.longitude] as [number, number]),
   {
     fallbackDurationMinutes: estimatedStops.reduce(
       (total, stop) => total + stop.estimatedMinutes,
       0,
     ),
   },
 );
 const stops = applyRouteGeometryLegs(estimatedStops, routeGeometry);
 const totalDistance =
   routeGeometry.mode === "network"
     ? routeGeometry.distanceKm
     : stops.reduce((acc, stop) => acc + stop.segmentKm, 0);
 const averageImpact =
 route.reduce((acc, item) => acc + item.score, 0) / route.length;
 const distanceScore = Math.max(0, 100 - totalDistance * 5);
 const constraintsScore = Math.max(
 0,
 100 -
 (constraints.weather ==="ok" ? 0 : 10) -
 (constraints.security ==="renforced" ? 5 : 0) -
 (constraints.accessibility ==="strict" ? 7 : 0),
 );
 const global = Math.round(
 averageImpact * 0.5 + distanceScore * 0.25 + constraintsScore * 0.25,
 );
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
 stops,
 routeGeometry,
 scoreBreakdown: {
 impact: Number(averageImpact.toFixed(1)),
 distance: Number(distanceScore.toFixed(1)),
 constraints: Number(constraintsScore.toFixed(1)),
 global,
 },
 constraintsApplied: constraints,
 tradeoffs: [
 `Arbitrage impact/distance: ${constraints.impactVsDistance}% / ${100 - constraints.impactVsDistance}%`,
 constraints.weather ==="ok"
 ?"Pas de contrainte meteo majeure."
 : `Contrainte meteo active: ${constraints.weather}`,
 ],
 proactiveAssistant,
 });
 } catch (error) {
 return handleApiError(error, "POST /api/route/recommend");
 }
}
