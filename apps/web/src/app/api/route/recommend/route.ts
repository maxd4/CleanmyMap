import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { NextResponse } from "next/server";
import { fetchUnifiedActionContracts } from "@/lib/actions/unified-source";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { unauthorizedJsonResponse } from "@/lib/http/auth-responses";

export const runtime = "nodejs";

const requestSchema = z.object({
  availableMinutes: z.number().int().min(30).max(600).default(180),
  volunteers: z.number().int().min(1).max(200).default(4),
  accessibility: z
    .enum(["standard", "accessible", "strict"])
    .default("standard"),
  security: z.enum(["standard", "renforced"]).default("standard"),
  weather: z.enum(["ok", "rain", "wind", "heat", "cold"]).default("ok"),
  impactVsDistance: z.number().min(0).max(100).default(65),
  maxStops: z.number().int().min(2).max(12).default(6),
});

type StopCandidate = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  wasteKg: number;
  butts: number;
  score: number;
  reason: string;
};

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = (a.latitude - b.latitude) * 111;
  const dLon = (a.longitude - b.longitude) * 73;
  return Math.sqrt(dLat * dLat + dLon * dLon);
}

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
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(rawPayload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const constraints = parsed.data;

  try {
    const supabase = getSupabaseServerClient();
    const { items: contracts } = await fetchUnifiedActionContracts(supabase, {
      limit: 260,
      status: "approved",
      floorDate: null,
      requireCoordinates: true,
      types: ["action", "clean_place", "spot"],
    });

    const candidates: StopCandidate[] = contracts
      .filter(
        (item) =>
          item.location.latitude !== null && item.location.longitude !== null,
      )
      .map((item) => {
        const wasteKg = Number(item.metadata.wasteKg || 0);
        const butts = Number(item.metadata.cigaretteButts || 0);
        const impactScore = wasteKg * 4 + butts * 0.03;
        const traceBonus = item.geometry.kind === "point" ? 0 : 4;
        const volunteersFactor = Math.min(
          1.4,
          Math.max(0.7, constraints.volunteers / 4),
        );
        const weatherPenalty =
          constraints.weather === "ok"
            ? 0
            : constraints.weather === "rain" || constraints.weather === "wind"
              ? 3
              : 2;
        const accessibilityPenalty =
          constraints.accessibility === "strict"
            ? 3
            : constraints.accessibility === "accessible"
              ? 1
              : 0;
        const securityPenalty = constraints.security === "renforced" ? 2 : 0;
        const score =
          impactScore * volunteersFactor +
          traceBonus -
          weatherPenalty -
          accessibilityPenalty -
          securityPenalty;
        const reason = `Impact ${wasteKg.toFixed(1)}kg/${butts} mégots, contraintes météo=${constraints.weather}, sécurité=${constraints.security}.`;
        return {
          id: item.id,
          label: item.location.label,
          latitude: Number(item.location.latitude),
          longitude: Number(item.location.longitude),
          wasteKg,
          butts,
          score,
          reason,
        };
      })
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

    const selected = candidates.slice(0, Math.max(constraints.maxStops * 2, 8));
    if (selected.length === 0) {
      return NextResponse.json({
        status: "ok",
        stops: [],
        scoreBreakdown: { impact: 0, distance: 0, constraints: 0, global: 0 },
        constraintsApplied: constraints,
        tradeoffs: [
          "Aucun point geolocalise disponible pour les contraintes selectionnees.",
        ],
      });
    }

    const impactWeight = constraints.impactVsDistance / 100;
    const distanceWeight = 1 - impactWeight;
    const route: StopCandidate[] = [selected[0]];
    const unvisited = selected.slice(1);

    while (route.length < constraints.maxStops && unvisited.length > 0) {
      const current = route[route.length - 1];
      let bestIndex = 0;
      let bestValue = Number.NEGATIVE_INFINITY;
      for (let i = 0; i < unvisited.length; i += 1) {
        const candidate = unvisited[i];
        const dist = distanceKm(current, candidate);
        const composite =
          candidate.score * impactWeight - dist * 8 * distanceWeight;
        if (composite > bestValue) {
          bestValue = composite;
          bestIndex = i;
        }
      }
      route.push(unvisited.splice(bestIndex, 1)[0]);
    }

    const stops = route.map((item, index) => {
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

    const totalDistance = stops.reduce((acc, stop) => acc + stop.segmentKm, 0);
    const averageImpact =
      route.reduce((acc, item) => acc + item.score, 0) / route.length;
    const distanceScore = Math.max(0, 100 - totalDistance * 5);
    const constraintsScore = Math.max(
      0,
      100 -
        (constraints.weather === "ok" ? 0 : 10) -
        (constraints.security === "renforced" ? 5 : 0) -
        (constraints.accessibility === "strict" ? 7 : 0),
    );
    const global = Math.round(
      averageImpact * 0.5 + distanceScore * 0.25 + constraintsScore * 0.25,
    );

    return NextResponse.json({
      status: "ok",
      stops,
      scoreBreakdown: {
        impact: Number(averageImpact.toFixed(1)),
        distance: Number(distanceScore.toFixed(1)),
        constraints: Number(constraintsScore.toFixed(1)),
        global,
      },
      constraintsApplied: constraints,
      tradeoffs: [
        `Arbitrage impact/distance: ${constraints.impactVsDistance}% / ${100 - constraints.impactVsDistance}%`,
        constraints.weather === "ok"
          ? "Pas de contrainte meteo majeure."
          : `Contrainte meteo active: ${constraints.weather}`,
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
