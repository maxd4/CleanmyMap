export type ActionNavigationLinks = {
  googleMaps: string;
  waze: string;
};

function isValidCoordinatePair(latitude: number | null | undefined, longitude: number | null | undefined): latitude is number {
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function buildActionNavigationLinks({
  latitude,
  longitude,
  address,
}: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): ActionNavigationLinks | null {
  const destination = isValidCoordinatePair(latitude, longitude)
    ? `${latitude},${longitude}`
    : address?.trim() || null;
  if (!destination) return null;

  const encodedDestination = encodeURIComponent(destination);
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`,
    waze: isValidCoordinatePair(latitude, longitude)
      ? `https://www.waze.com/ul?ll=${encodedDestination}&navigate=yes`
      : `https://www.waze.com/ul?q=${encodedDestination}&navigate=yes`,
  };
}
