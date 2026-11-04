import { haversineMeters, type Coordinate } from "@/lib/route/pedestrian-network";
import type { PedestrianRiskProjectionSegment } from "./pedestrian-risk-projection";

export type PedestrianObservationCacheGeometry = readonly Coordinate[];

export type PedestrianObservationInvalidationEvent = {
  eventKey: string;
  sourceTable: "trash_spotter_spots" | "actions" | "system";
  sourceId: string | null;
  operation: "insert" | "update" | "delete" | "rebuild";
  reason: "observation" | "temporal" | "model" | "network";
  oldGeometry: PedestrianObservationCacheGeometry | null;
  newGeometry: PedestrianObservationCacheGeometry | null;
  sourceUpdatedAt: string;
  attempts: number;
  lockedAt?: string | null;
};

export type PedestrianObservationCacheRow = {
  projectionSegmentId: string;
  observationIds: string[];
  observedCount: number;
  latestObservedAt: string | null;
};

const DEFAULT_GEOMETRY_TOLERANCE_METERS = 25;

function pointToSegmentDistanceMeters(
  point: Coordinate,
  start: Coordinate,
  end: Coordinate,
): number {
  const latitudeScale = 111_000;
  const longitudeScale = 73_000;
  const px = point[1] * longitudeScale;
  const py = point[0] * latitudeScale;
  const sx = start[1] * longitudeScale;
  const sy = start[0] * latitudeScale;
  const ex = end[1] * longitudeScale;
  const ey = end[0] * latitudeScale;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : Math.min(1, Math.max(0, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
  return Math.hypot(
    px - (sx + projection * dx),
    py - (sy + projection * dy),
  );
}

function geometryTouchesSegment(
  geometry: PedestrianObservationCacheGeometry | null,
  segment: readonly Coordinate[],
  toleranceMeters: number,
): boolean {
  if (!geometry || geometry.length === 0 || segment.length === 0) return false;
  for (const point of geometry) {
    if (segment.length === 1 && haversineMeters(point, segment[0]!) <= toleranceMeters) return true;
    for (let index = 1; index < segment.length; index += 1) {
      if (pointToSegmentDistanceMeters(point, segment[index - 1]!, segment[index]!) <= toleranceMeters) return true;
    }
  }
  return false;
}

/** Returns the union of segments affected by both sides of a move/delete. */
export function affectedProjectionSegmentIds(
  segments: readonly PedestrianRiskProjectionSegment[],
  events: readonly PedestrianObservationInvalidationEvent[],
  toleranceMeters = DEFAULT_GEOMETRY_TOLERANCE_METERS,
): string[] {
  const affected = new Set<string>();
  for (const event of events) {
    if (event.sourceTable === "system") {
      for (const segment of segments) affected.add(segment.projectionSegmentId);
      continue;
    }
    for (const segment of segments) {
      if (geometryTouchesSegment(event.oldGeometry, segment.coordinates, toleranceMeters) ||
        geometryTouchesSegment(event.newGeometry, segment.coordinates, toleranceMeters)) {
        affected.add(segment.projectionSegmentId);
      }
    }
  }
  return [...affected].sort();
}

/** Deduplicates retries and combines a source move into one affected event. */
export function coalesceObservationInvalidationEvents(
  events: readonly PedestrianObservationInvalidationEvent[],
): PedestrianObservationInvalidationEvent[] {
  const bySource = new Map<string, PedestrianObservationInvalidationEvent>();
  for (const event of events) {
    const key = event.sourceTable === "system"
      ? event.eventKey
      : `${event.sourceTable}:${event.sourceId ?? "unknown"}`;
    const previous = bySource.get(key);
    if (!previous || event.sourceUpdatedAt > previous.sourceUpdatedAt) {
      bySource.set(key, {
        ...event,
        oldGeometry: previous?.oldGeometry ?? event.oldGeometry,
        newGeometry: event.operation === "delete"
          ? null
          : event.newGeometry ?? previous?.newGeometry ?? null,
        attempts: previous ? Math.max(previous.attempts, event.attempts) : event.attempts,
      });
    }
  }
  return [...bySource.values()].sort((left, right) => left.eventKey.localeCompare(right.eventKey));
}

export function isInvalidationLeaseExpired(
  event: Pick<PedestrianObservationInvalidationEvent, "lockedAt">,
  now: Date,
  leaseMs: number,
): boolean {
  if (!event.lockedAt) return true;
  const lockedAt = new Date(event.lockedAt).getTime();
  return !Number.isFinite(lockedAt) || now.getTime() - lockedAt >= leaseMs;
}

export function retryAvailableAt(
  attempts: number,
  now: Date,
  baseDelayMs = 5_000,
): string {
  const boundedAttempts = Math.min(8, Math.max(0, attempts));
  return new Date(now.getTime() + baseDelayMs * 2 ** boundedAttempts).toISOString();
}

/** Replaces only impacted rows; all other snapshot rows stay byte-for-byte equivalent. */
export function applyIncrementalObservationCacheUpdate(
  previous: readonly PedestrianObservationCacheRow[],
  refreshed: readonly PedestrianObservationCacheRow[],
  affectedSegmentIds: readonly string[],
): PedestrianObservationCacheRow[] {
  const affected = new Set(affectedSegmentIds);
  const refreshedById = new Map(refreshed.map((row) => [row.projectionSegmentId, row]));
  const result = previous
    .filter((row) => !affected.has(row.projectionSegmentId))
    .concat(refreshed.filter((row) => affected.has(row.projectionSegmentId)))
    .sort((left, right) => left.projectionSegmentId.localeCompare(right.projectionSegmentId));
  return result.map((row) => refreshedById.get(row.projectionSegmentId) ?? row);
}
