import { LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS } from "./local-repollution-constants";
import type { DerivedPlaceObservation } from "./local-repollution-types";

function resolveNormalizedLabel(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeDerivedPlaceLabel(label: string): string {
  return resolveNormalizedLabel(label);
}

function resolveLabelTokens(label: string): Set<string> {
  const ignored = new Set(["a", "au", "aux", "de", "des", "du", "la", "le", "les"]);
  return new Set(
    resolveNormalizedLabel(label)
      .split(" ")
      .filter((token) => token.length > 1 && !ignored.has(token)),
  );
}

export function areDerivedPlaceLabelsCompatible(left: string, right: string): boolean {
  const leftTokens = resolveLabelTokens(left);
  const rightTokens = resolveLabelTokens(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return false;
  }

  const [smaller, larger] =
    leftTokens.size <= rightTokens.size
      ? [leftTokens, rightTokens]
      : [rightTokens, leftTokens];
  return [...smaller].every((token) => larger.has(token));
}

export function distanceBetweenCoordinatesMeters(
  left: Pick<DerivedPlaceObservation, "latitude" | "longitude">,
  right: Pick<DerivedPlaceObservation, "latitude" | "longitude">,
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function canMergeDerivedPlaceObservations(
  left: Pick<DerivedPlaceObservation, "latitude" | "longitude" | "normalizedLabel">,
  right: Pick<DerivedPlaceObservation, "latitude" | "longitude" | "normalizedLabel">,
): boolean {
  const distance = distanceBetweenCoordinatesMeters(left, right);
  if (distance <= LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.nearDistanceMeters) {
    return true;
  }
  if (distance > LOCAL_REPOLLUTION_CALIBRATION_CONSTANTS.labelRequiredDistanceMeters) {
    return false;
  }
  return areDerivedPlaceLabelsCompatible(left.normalizedLabel, right.normalizedLabel);
}
