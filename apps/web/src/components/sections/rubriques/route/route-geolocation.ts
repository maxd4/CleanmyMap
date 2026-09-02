import { canRequestGeolocation } from "@/lib/browser/geolocation";
import type { RouteRecommendationOrigin } from "./route-types";

const BROWSER_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 0,
  timeout: 10_000,
};

function isValidCoordinatePair(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function resolveBrowserRouteOrigin(): Promise<RouteRecommendationOrigin | undefined> {
  if (!canRequestGeolocation()) {
    return Promise.resolve(undefined);
  }

  try {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          if (!isValidCoordinatePair(coords.latitude, coords.longitude)) {
            resolve(undefined);
            return;
          }

          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
            source: "browser",
          });
        },
        () => resolve(undefined),
        BROWSER_GEOLOCATION_OPTIONS,
      );
    });
  } catch {
    return Promise.resolve(undefined);
  }
}
