import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordActionGeometryContribution } from "./record-action-geometry-contribution";
import { reconcileUserGamification } from "@/lib/gamification/gamification-reconciliation";
import { logFailure } from "@/lib/logging/failure-log";

export async function recordGpxGeometryContributionIfPresent({
  supabase,
  actionId,
  userId,
  updateData,
}: {
  supabase: SupabaseClient;
  actionId: string;
  userId: string;
  updateData: Record<string, unknown>;
}): Promise<boolean | Response> {
  if (
    updateData["geometry_source"] !== "gpx_import" ||
    typeof updateData["derived_geometry_geojson"] !== "string"
  ) {
    return false;
  }

  const preparationData = updateData["preparation_data"] as
    | { routeObservedDistanceKm?: number; gpxImport?: Record<string, unknown> }
    | undefined;
  const contribution = await recordActionGeometryContribution({
    supabase,
    actionId,
    contributorClerkId: userId,
    source: "gpx_import",
    geojson: updateData["derived_geometry_geojson"],
    observedDistanceKm: Number(preparationData?.routeObservedDistanceKm ?? 0),
    technicalProvenance: {
      actionUpdate: true,
      gpxImport: preparationData?.gpxImport ?? null,
    },
  });
  if (contribution.accepted) return true;

  return NextResponse.json(
    {
      error:
        "La trace GPX est conservée comme preuve refusée : vous devez être participant confirmé ou organisateur canonique.",
      code: "geometry_contribution_refused",
    },
    { status: 403 },
  );
}

export async function reconcileGeometryContributionProgressionIfNeeded({
  accepted,
  supabase,
  actionId,
  userId,
}: {
  accepted: boolean;
  supabase: SupabaseClient;
  actionId: string;
  userId: string;
}): Promise<void> {
  if (!accepted) return;
  await reconcileUserGamification(supabase, userId, { reasonCategory: "other" }).catch((error: unknown) => {
    logFailure(
      "action-geometry-contribution",
      "Geometry contribution progression reconciliation failed",
      error,
      { actionId, userId },
    );
  });
}
