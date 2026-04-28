export function hasValidCoordinates(coords: {
  latitude: number | null;
  longitude: number | null;
}): coords is { latitude: number; longitude: number } {
  return coords.latitude !== null && coords.longitude !== null;
}

export function buildActionUpdateHref(
  score: number,
  coords: { latitude: number | null; longitude: number | null },
): string | null {
  if (!hasValidCoordinates(coords)) {
    return null;
  }

  const baseUrl = `/actions/new?lat=${coords.latitude}&lng=${coords.longitude}`;
  return score > 0 ? baseUrl : `${baseUrl}&mode=propre`;
}
