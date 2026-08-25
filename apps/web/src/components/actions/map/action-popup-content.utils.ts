export function hasValidCoordinates(coords: {
  latitude: number | null;
  longitude: number | null;
}): coords is { latitude: number; longitude: number } {
  return coords.latitude !== null && coords.longitude !== null;
}

export function buildActionUpdateHref(
  hasPollution: boolean,
  coords: { latitude: number | null; longitude: number | null },
  isAction = false,
): string | null {
  if (!hasValidCoordinates(coords)) {
    return null;
  }

  const observationUrl = `/signalement?lat=${coords.latitude}&lng=${coords.longitude}`;
  const actionUrl = `/actions/new?lat=${coords.latitude}&lng=${coords.longitude}`;
  return hasPollution || isAction ? actionUrl : observationUrl;
}
