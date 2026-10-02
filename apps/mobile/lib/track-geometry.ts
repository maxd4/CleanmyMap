import type { ForegroundTrackPoint } from '../types/mission'

const DUPLICATE_DISTANCE_METERS = 5
const DUPLICATE_TIME_WINDOW_MS = 15_000

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function distanceBetweenPointsMeters(first: ForegroundTrackPoint, second: ForegroundTrackPoint): number {
  const earthRadiusMeters = 6_371_000
  const latitudeDelta = toRadians(second.latitude - first.latitude)
  const longitudeDelta = toRadians(second.longitude - first.longitude)
  const firstLatitude = toRadians(first.latitude)
  const secondLatitude = toRadians(second.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(firstLatitude) * Math.cos(secondLatitude)

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(Math.min(1, haversine)))
}

export function mergeTrackPoints(
  ...sources: ReadonlyArray<ReadonlyArray<ForegroundTrackPoint>>
): ForegroundTrackPoint[] {
  const sorted = sources
    .flat()
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .sort((first, second) => Date.parse(first.recordedAt) - Date.parse(second.recordedAt))

  return sorted.reduce<ForegroundTrackPoint[]>((merged, point) => {
    const previous = merged[merged.length - 1]
    if (!previous) return [point]

    const timeDelta = Math.abs(Date.parse(point.recordedAt) - Date.parse(previous.recordedAt))
    if (
      timeDelta <= DUPLICATE_TIME_WINDOW_MS &&
      distanceBetweenPointsMeters(previous, point) <= DUPLICATE_DISTANCE_METERS
    ) {
      return merged
    }

    return [...merged, point]
  }, [])
}

export function calculateTrackDistanceMeters(points: ReadonlyArray<ForegroundTrackPoint>): number {
  return points.reduce((distance, point, index) => {
    if (index === 0) return distance
    return distance + distanceBetweenPointsMeters(points[index - 1], point)
  }, 0)
}
