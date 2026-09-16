export type GeodesicCoordinate = [number, number];

const EARTH_RADIUS_KM = 6_371;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
  left: GeodesicCoordinate,
  right: GeodesicCoordinate,
): number {
  const latitudeDelta = toRadians(right[0] - left[0]);
  const longitudeDelta = toRadians(right[1] - left[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(left[0])) *
      Math.cos(toRadians(right[0])) *
      Math.sin(longitudeDelta / 2) ** 2;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function polylineDistanceKm(
  coordinates: readonly GeodesicCoordinate[],
): number {
  let total = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    total += haversineDistanceKm(coordinates[index - 1], coordinates[index]);
  }
  return total;
}
