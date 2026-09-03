export const COMMUNITY_EVENT_LOCATION_SOURCES = ["manual", "import"] as const;

export type CommunityEventLocationSource =
  (typeof COMMUNITY_EVENT_LOCATION_SOURCES)[number];

export type CommunityEventLocation = {
  label: string;
  latitude: number | null;
  longitude: number | null;
  source: CommunityEventLocationSource | null;
};

export type CommunityEventLocationInput = {
  latitude: number;
  longitude: number;
  source: CommunityEventLocationSource;
};

export function isValidCommunityEventCoordinatePair(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function hasPreciseCommunityEventLocation(
  location: Pick<CommunityEventLocation, "latitude" | "longitude"> & {
    label?: string;
  },
): location is CommunityEventLocationInput {
  return (
    location.latitude !== null &&
    location.longitude !== null &&
    isValidCommunityEventCoordinatePair(location.latitude, location.longitude)
  );
}

export function communityEventLocationToDatabase(
  location: CommunityEventLocationInput | null | undefined,
): {
  latitude: number | null;
  longitude: number | null;
  location_source: CommunityEventLocationSource | null;
} {
  if (!location) {
    return { latitude: null, longitude: null, location_source: null };
  }

  return {
    latitude: location.latitude,
    longitude: location.longitude,
    location_source: location.source,
  };
}

export function distanceToCommunityEventKm(
  origin: { latitude: number; longitude: number },
  event: Pick<CommunityEventLocation, "latitude" | "longitude"> & {
    label?: string;
  },
): number | null {
  if (!hasPreciseCommunityEventLocation(event)) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(event.latitude - origin.latitude);
  const longitudeDelta = toRadians(event.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const eventLatitude = toRadians(event.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 *
      Math.cos(originLatitude) *
      Math.cos(eventLatitude);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
