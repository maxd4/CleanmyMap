import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordActionGeometryContribution } from "./record-action-geometry-contribution";
import { isActionGeometryContributorEligible } from "./action-geometry-contributor-eligibility";
import { reconcileUserGamification } from "@/lib/gamification/gamification-reconciliation";
import { logFailure } from "@/lib/logging/failure-log";
import { polylineDistanceKm } from "@/lib/geo/geodesic-distance";

const OBSERVED_PROJECTION_FIELDS = [
  "derived_geometry_kind",
  "derived_geometry_geojson",
  "geometry_source",
  "geometry_confidence",
] as const;

type GpxContributionPayload = {
  traces: Array<{ geojson: string; observedDistanceKm: number; sourceFingerprint: string }>;
  technicalProvenance: Record<string, unknown>;
};

type StoredGpxSegment = {
  fileId?: unknown;
  fileName?: unknown;
  traceIndex?: unknown;
  segmentIndex?: unknown;
  coordinates?: unknown;
  distanceKm?: unknown;
  sourceFingerprint?: unknown;
};

function fingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `gpx-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function parseGeoJsonTraces(geojson: string): Array<{ geojson: string; observedDistanceKm: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(geojson);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return [];
  const value = parsed as { type?: unknown; coordinates?: unknown };
  const lines = value.type === "LineString"
    ? [value.coordinates]
    : value.type === "MultiLineString" && Array.isArray(value.coordinates)
      ? value.coordinates
      : [];
  return lines.flatMap((line) => {
    if (!Array.isArray(line) || line.length < 2) return [];
    const coordinates = line.map((point) =>
      Array.isArray(point) && point.length === 2 && typeof point[0] === "number" && typeof point[1] === "number"
        ? [point[0], point[1]] as [number, number]
        : null,
    );
    if (coordinates.some((point): point is null => point === null)) return [];
    const validCoordinates = coordinates as [number, number][];
    const latitudeLongitude = validCoordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
    return [{
      geojson: JSON.stringify({ type: "LineString", coordinates: validCoordinates }),
      observedDistanceKm: Number(polylineDistanceKm(latitudeLongitude).toFixed(3)),
    }];
  });
}

function parseStoredGpxSegments(value: unknown): GpxContributionPayload["traces"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((segment: StoredGpxSegment) => {
    const coordinates = Array.isArray(segment.coordinates)
      ? segment.coordinates.filter((point): point is [number, number] => Array.isArray(point) && point.length === 2 && typeof point[0] === "number" && typeof point[1] === "number")
      : [];
    if (coordinates.length < 2) return [];
    const geojson = JSON.stringify({
      type: "LineString",
      coordinates: coordinates.map(([latitude, longitude]) => [longitude, latitude]),
    });
    const sourceFingerprint = typeof segment.sourceFingerprint === "string"
      ? segment.sourceFingerprint
      : fingerprint(`${String(segment.fileId ?? segment.fileName ?? "unknown")}:${String(segment.traceIndex ?? 0)}:${String(segment.segmentIndex ?? 0)}:${geojson}`);
    return [{
      geojson,
      observedDistanceKm: typeof segment.distanceKm === "number" && Number.isFinite(segment.distanceKm)
        ? segment.distanceKm
        : Number(polylineDistanceKm(coordinates).toFixed(3)),
      sourceFingerprint,
    }];
  });
}

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
    | {
        routeObservedDistanceKm?: number;
        gpxImport?: { fileName?: unknown; segmentDistancesKm?: unknown; intent?: unknown; provenance?: unknown; files?: unknown };
      }
    | undefined;
  const traces = parseGeoJsonTraces(updateData["derived_geometry_geojson"]);
  const intent = preparationData?.gpxImport?.intent;
  const files = preparationData?.gpxImport?.files && Array.isArray(preparationData.gpxImport.files)
    ? preparationData.gpxImport.files
    : [];
  const hasCandidateFiles = files.length > 0;
  const hasPlannedProvenance = preparationData?.gpxImport?.provenance === "planned" ||
    files.some((file: { provenance?: unknown }) => file.provenance === "planned");
  if (intent === "planned" || hasPlannedProvenance || (hasCandidateFiles && intent !== "observed")) return null;
  const storedTraces = hasCandidateFiles
    ? parseStoredGpxSegments(files.flatMap((file: { fileId?: unknown; segments?: unknown }) => Array.isArray(file.segments)
      ? file.segments.map((segment: Record<string, unknown>) => ({ ...segment, fileId: segment.fileId ?? file.fileId }))
      : []))
    : [];
  const contributionTraces = storedTraces.length > 0 ? storedTraces : traces.map((trace, index) => ({
    ...trace,
    sourceFingerprint: fingerprint(`${String(preparationData?.gpxImport?.fileName ?? "unknown")}:${index}:${trace.geojson}`),
  }));
  if (contributionTraces.length === 0) return null;
  const fileName = typeof preparationData?.gpxImport?.fileName === "string"
    ? preparationData.gpxImport.fileName
    : "unknown";
  const segmentDistances = Array.isArray(preparationData?.gpxImport?.segmentDistancesKm)
    ? preparationData.gpxImport.segmentDistancesKm.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    : [];
  return {
    traces: contributionTraces.map((trace, index) => ({
      ...trace,
      observedDistanceKm: Number(segmentDistances[index] ?? trace.observedDistanceKm ?? preparationData?.routeObservedDistanceKm ?? 0),
      sourceFingerprint: trace.sourceFingerprint || fingerprint(`${fileName}:${index}:${trace.geojson}`),
    })),
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
    const gpxImport = nextPreparationData["gpxImport"];
    const planned = gpxImport && typeof gpxImport === "object" && !Array.isArray(gpxImport) &&
      ((gpxImport as Record<string, unknown>).intent === "planned" || (gpxImport as Record<string, unknown>).provenance === "planned");
    if (!planned) delete nextPreparationData["gpxImport"];
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
}): Promise<{ accepted: boolean; persisted: boolean; traceCount?: number } | Response | null> {
  const payload = getGpxContributionPayload(updateData);
  if (!payload) {
    return null;
  }
  let persisted = false;
  let lastTraceCount: number | undefined;
  let accepted = true;
  for (const trace of payload.traces) {
    const contribution = await recordActionGeometryContribution({
      supabase,
      actionId,
      contributorClerkId: userId,
      source: "gpx_import",
      geojson: trace.geojson,
      observedDistanceKm: trace.observedDistanceKm,
      sourceFingerprint: trace.sourceFingerprint,
      technicalProvenance: {
        ...payload.technicalProvenance,
        segmentFingerprint: trace.sourceFingerprint,
      },
    });
    if (!contribution.accepted) {
      accepted = false;
      lastTraceCount = contribution.traceCount;
      continue;
    }
    persisted ||= Boolean(contribution.contributionId);
    lastTraceCount = contribution.traceCount;
  }
  return { accepted, persisted, traceCount: lastTraceCount };
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
