import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordActionGeometryContribution } from "./record-action-geometry-contribution";
import { isActionGeometryContributorEligible } from "./action-geometry-contributor-eligibility";
import { reconcileUserGamification } from "@/lib/gamification/gamification-reconciliation";
import { logFailure } from "@/lib/logging/failure-log";

const OBSERVED_PROJECTION_FIELDS = [
  "derived_geometry_kind",
  "derived_geometry_geojson",
  "geometry_source",
  "geometry_confidence",
] as const;

type GpxContributionPayload = {
  geojson: string;
  observedDistanceKm: number;
  technicalProvenance: Record<string, unknown>;
};

function getGpxContributionPayload(
  updateData: Record<string, unknown>,
): GpxContributionPayload | null {
  if (
    updateData["geometry_source"] !== "gpx_import" ||
    typeof updateData["derived_geometry_geojson"] !== "string"
  ) {
    return null;
  }

  const preparationData = updateData["preparation_data"] as
    | { routeObservedDistanceKm?: number; gpxImport?: Record<string, unknown> }
    | undefined;
  return {
    geojson: updateData["derived_geometry_geojson"],
    observedDistanceKm: Number(preparationData?.routeObservedDistanceKm ?? 0),
    technicalProvenance: {
      actionUpdate: true,
      gpxImport: preparationData?.gpxImport ?? null,
    },
  };
}

export function hasGpxGeometryContribution(
  updateData: Record<string, unknown>,
): boolean {
  return getGpxContributionPayload(updateData) !== null;
}

export async function ensureGpxGeometryContributionEligible({
  supabase,
  actionId,
  userId,
  updateData,
}: {
  supabase: SupabaseClient;
  actionId: string;
  userId: string;
  updateData: Record<string, unknown>;
}): Promise<Response | null> {
  if (!hasGpxGeometryContribution(updateData)) return null;
  const eligible = await isActionGeometryContributorEligible(supabase, {
    actionId,
    contributorClerkId: userId,
  });
  if (eligible) return null;

  return NextResponse.json(
    {
      error:
        "La trace GPX est conservée comme preuve refusée : vous devez être le créateur, l'organisateur, un participant confirmé ou avoir une inscription confirmée pour cette action.",
      code: "geometry_contribution_refused",
    },
    { status: 403 },
  );
}

/** Remove only observed projection fields before the scalar action update. */
export function stripObservedGeometryProjectionFields(
  updateData: Record<string, unknown>,
): Record<string, unknown> {
  const nextUpdateData = { ...updateData };
  for (const field of OBSERVED_PROJECTION_FIELDS) {
    delete nextUpdateData[field];
  }

  const preparationData = nextUpdateData["preparation_data"];
  if (preparationData && typeof preparationData === "object" && !Array.isArray(preparationData)) {
    const nextPreparationData = { ...(preparationData as Record<string, unknown>) };
    delete nextPreparationData["observedCoverage"];
    delete nextPreparationData["routeObservedDistanceKm"];
    delete nextPreparationData["gpxImport"];
    nextUpdateData["preparation_data"] = nextPreparationData;
  }

  return nextUpdateData;
}

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
}): Promise<{ accepted: boolean; persisted: boolean } | Response | null> {
  const payload = getGpxContributionPayload(updateData);
  if (!payload) {
    return null;
  }
  const contribution = await recordActionGeometryContribution({
    supabase,
    actionId,
    contributorClerkId: userId,
    source: "gpx_import",
    geojson: payload.geojson,
    observedDistanceKm: payload.observedDistanceKm,
    technicalProvenance: payload.technicalProvenance,
  });
  if (contribution.accepted) {
    return { accepted: true, persisted: Boolean(contribution.contributionId) };
  }

  return NextResponse.json(
    {
      error:
        "La trace GPX est conservée comme preuve refusée : vous devez être le créateur, l'organisateur, un participant confirmé ou avoir une inscription confirmée pour cette action.",
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
