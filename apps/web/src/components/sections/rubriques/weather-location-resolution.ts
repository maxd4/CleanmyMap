import {
  getLocalGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import { TERRITORY_CENTER } from "@/lib/geo/territory";
import { extractTerritoryLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import {
  buildFallbackWeatherLocation,
  type WeatherLocationSource,
} from "./weather-data.model";
import type { WeatherLocation } from "./weather-types";

type AddressSuggestionsResponse = {
  status: string;
  query: string;
  items: GeoAddressSuggestion[];
};

type ReverseLocationResponse = {
  status: string;
  location: WeatherLocation | null;
};

type TerritoryLocationPreference = NonNullable<
  ReturnType<typeof extractTerritoryLocationPreferenceFromMetadata>
>;

function createLinkedAbortController(parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  const abort = () => controller.abort();

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort();
    } else {
      parentSignal.addEventListener("abort", abort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    dispose() {
      window.clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", abort);
    },
  };
}

export async function resolveWeatherLocationFromLabel(
  label: string,
  subtitle: string | null,
  parentSignal?: AbortSignal,
): Promise<WeatherLocation> {
  const fallback = buildFallbackWeatherLocation(label, subtitle);
  const localSuggestion = getLocalGeoAddressSuggestions(label, 1)[0];
  if (localSuggestion) {
    return { ...localSuggestion, resolution: "resolved" };
  }
  if (parentSignal?.aborted) {
    return fallback;
  }

  const request = createLinkedAbortController(parentSignal);
  try {
    const response = await fetch(
      `/api/geo/address-suggestions?q=${encodeURIComponent(label)}&limit=1`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: request.signal,
      },
    );

    if (response.ok) {
      const body = (await response.json()) as AddressSuggestionsResponse;
      const suggestion = body.items[0];
      if (suggestion) {
        return { ...suggestion, resolution: "resolved" };
      }
    }
  } catch {
    // Ignore network, timeout or parsing failures and keep the neutral fallback.
  } finally {
    request.dispose();
  }

  return fallback;
}

export async function resolveWeatherLocationFromPreference(
  preference: TerritoryLocationPreference,
  parentSignal?: AbortSignal,
): Promise<WeatherLocation> {
  if (preference.level === "country") {
    return {
      label: preference.label,
      subtitle: preference.subtitle ?? "Vue nationale",
      latitude: TERRITORY_CENTER[0],
      longitude: TERRITORY_CENTER[1],
      importance: null,
      resolution: "resolved",
    };
  }

  return resolveWeatherLocationFromLabel(
    preference.label,
    preference.subtitle ?? "Localisation choisie",
    parentSignal,
  );
}

export async function resolveGeolocationWeatherLocation(
  parentSignal?: AbortSignal,
): Promise<WeatherLocation | null> {
  if (!canRequestGeolocation() || parentSignal?.aborted) {
    return null;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (location: WeatherLocation | null) => {
      if (settled) return;
      settled = true;
      parentSignal?.removeEventListener("abort", abort);
      resolve(location);
    };
    const abort = () => finish(null);

    parentSignal?.addEventListener("abort", abort, { once: true });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (parentSignal?.aborted) {
          finish(null);
          return;
        }

        void (async () => {
          try {
            const reverseUrl = new URL("/api/geo/reverse-location", window.location.origin);
            reverseUrl.searchParams.set("lat", String(position.coords.latitude));
            reverseUrl.searchParams.set("lon", String(position.coords.longitude));
            const response = await fetch(reverseUrl.toString(), {
              method: "GET",
              headers: { Accept: "application/json" },
              cache: "no-store",
              signal: parentSignal,
            });
            if (!response.ok || parentSignal?.aborted) {
              finish(null);
              return;
            }
            const body = (await response.json()) as ReverseLocationResponse;
            finish(body.location);
          } catch {
            finish(null);
          }
        })().catch(() => undefined);
      },
      () => finish(null),
      { enableHighAccuracy: false, timeout: 6_000, maximumAge: 300_000 },
    );
  });
}

export type WeatherLocationResolutionRequest = {
  source: WeatherLocationSource;
  draftLocationLabel: string;
  storedLocation: { label: string; subtitle: string } | null;
  preference: TerritoryLocationPreference | null;
  signal: AbortSignal;
};

export async function resolveWeatherLocationRequest({
  source,
  draftLocationLabel,
  storedLocation,
  preference,
  signal,
}: WeatherLocationResolutionRequest): Promise<WeatherLocation | null> {
  switch (source) {
    case "draft":
      return resolveWeatherLocationFromLabel(draftLocationLabel, "Lieu du pré-formulaire", signal);
    case "stored":
      return storedLocation
        ? resolveWeatherLocationFromLabel(storedLocation.label, storedLocation.subtitle, signal)
        : null;
    case "preference":
      return preference ? resolveWeatherLocationFromPreference(preference, signal) : null;
    case "geolocation":
      return resolveGeolocationWeatherLocation(signal);
  }
}
