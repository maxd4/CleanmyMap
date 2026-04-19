export const PARIS_ARRONDISSEMENTS = [
  { value: 1, label: "Paris 1er", center: { lat: 48.8626, lng: 2.3363 } },
  { value: 2, label: "Paris 2e", center: { lat: 48.8676, lng: 2.3441 } },
  { value: 3, label: "Paris 3e", center: { lat: 48.8635, lng: 2.3615 } },
  { value: 4, label: "Paris 4e", center: { lat: 48.8549, lng: 2.3572 } },
  { value: 5, label: "Paris 5e", center: { lat: 48.8463, lng: 2.3488 } },
  { value: 6, label: "Paris 6e", center: { lat: 48.8492, lng: 2.3325 } },
  { value: 7, label: "Paris 7e", center: { lat: 48.8562, lng: 2.3123 } },
  { value: 8, label: "Paris 8e", center: { lat: 48.8722, lng: 2.3126 } },
  { value: 9, label: "Paris 9e", center: { lat: 48.8761, lng: 2.3378 } },
  { value: 10, label: "Paris 10e", center: { lat: 48.8761, lng: 2.3591 } },
  { value: 11, label: "Paris 11e", center: { lat: 48.8579, lng: 2.3812 } },
  { value: 12, label: "Paris 12e", center: { lat: 48.8374, lng: 2.4158 } },
  { value: 13, label: "Paris 13e", center: { lat: 48.8282, lng: 2.3622 } },
  { value: 14, label: "Paris 14e", center: { lat: 48.8339, lng: 2.3265 } },
  { value: 15, label: "Paris 15e", center: { lat: 48.8414, lng: 2.2968 } },
  { value: 16, label: "Paris 16e", center: { lat: 48.8632, lng: 2.2769 } },
  { value: 17, label: "Paris 17e", center: { lat: 48.8873, lng: 2.3079 } },
  { value: 18, label: "Paris 18e", center: { lat: 48.8924, lng: 2.3444 } },
  { value: 19, label: "Paris 19e", center: { lat: 48.8871, lng: 2.3849 } },
  { value: 20, label: "Paris 20e", center: { lat: 48.8637, lng: 2.3994 } },
] as const;

export type ParisArrondissement = (typeof PARIS_ARRONDISSEMENTS)[number]["value"];

const ARRONDISSEMENT_LOOKUP = new Map(
  PARIS_ARRONDISSEMENTS.map((item) => [item.value, item]),
);

export function parseParisArrondissement(value: unknown): ParisArrondissement | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }
  return parsed as ParisArrondissement;
}

export function getParisArrondissementLabel(
  arrondissement: ParisArrondissement,
): string {
  return ARRONDISSEMENT_LOOKUP.get(arrondissement)?.label ?? `Paris ${arrondissement}e`;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  latA: number,
  lngA: number,
  latB: number,
  lngB: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latA)) *
      Math.cos(toRadians(latB)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function distanceToParisArrondissementKm(
  lat: number,
  lng: number,
  arrondissement: ParisArrondissement,
): number {
  const center = ARRONDISSEMENT_LOOKUP.get(arrondissement)?.center;
  if (!center) {
    return Number.POSITIVE_INFINITY;
  }
  return haversineDistanceKm(lat, lng, center.lat, center.lng);
}
