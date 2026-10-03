import type { SupabaseClient } from "@supabase/supabase-js";

type ActionGeometryContributionSource = "gpx_import" | "gps_tracking";

export type RecordActionGeometryContributionResult = {
  accepted: boolean;
  contributionId?: string;
  validationState?: "accepted" | "refused";
  traceCount?: number;
  reason?: string;
};

type RecordActionGeometryContributionParams = {
  supabase: SupabaseClient;
  actionId: string;
  contributorClerkId: string;
  source: ActionGeometryContributionSource;
  geojson: string;
  observedDistanceKm: number;
  missionId?: string | null;
  observedAt?: string | null;
  technicalProvenance?: Record<string, unknown>;
};

function parseLineString(geojson: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(geojson);
  } catch {
    throw new Error("La géométrie observée n'est pas un GeoJSON valide.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    (parsed as { type?: unknown }).type !== "LineString"
  ) {
    throw new Error("La contribution cartographique doit être une LineString.");
  }

  return parsed as Record<string, unknown>;
}

function mapContributionResult(payload: Record<string, unknown> | null): RecordActionGeometryContributionResult {
  const validationState = payload?.validationState;
  return {
    accepted: payload?.accepted === true,
    contributionId:
      typeof payload?.contributionId === "string" ? payload.contributionId : undefined,
    validationState:
      validationState === "accepted" || validationState === "refused"
        ? validationState
        : undefined,
    traceCount:
      typeof payload?.traceCount === "number" ? payload.traceCount : undefined,
    reason: typeof payload?.reason === "string" ? payload.reason : undefined,
  };
}

export async function recordActionGeometryContribution(
  params: RecordActionGeometryContributionParams,
): Promise<RecordActionGeometryContributionResult> {
  const observedGeometry = parseLineString(params.geojson);
  const result = await params.supabase.rpc("record_action_geometry_contribution", {
    p_action_id: params.actionId,
    p_contributor_clerk_id: params.contributorClerkId,
    p_source: params.source,
    p_observed_geometry: observedGeometry,
    p_observed_distance_km: params.observedDistanceKm,
    p_source_fingerprint: null,
    p_mission_id: params.missionId ?? null,
    p_observed_at: params.observedAt ?? null,
    p_technical_provenance: params.technicalProvenance ?? {},
  });

  if (result.error) {
    throw new Error(`Impossible d'enregistrer la contribution GPS : ${result.error.message}`);
  }

  return mapContributionResult(result.data as Record<string, unknown> | null);
}
