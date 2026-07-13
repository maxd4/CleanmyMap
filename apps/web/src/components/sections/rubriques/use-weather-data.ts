"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import {
  buildInterventionWindows,
  evaluateWeatherRisk,
} from "@/lib/weather/ops-weather";
import { FRANCE_TERRITORY_CENTER } from "@/lib/geo/territory";
import {
  getLocalGeoAddressSuggestions,
  mergeGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";
import { extractTerritoryLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { formatDateShort } from "@/components/sections/rubriques/helpers";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import {
  readStoredWeatherLocation,
  storeWeatherLocation,
} from "./weather-location-storage";
import type {
  OpenMeteoResponse,
  WeatherDataStatus,
  WeatherLocation,
  WeatherLocationSuggestion,
  WeatherPoint,
} from "./weather-types";

const DEFAULT_LOCATION: WeatherLocation = {
  label: "France",
  subtitle: "Vue nationale",
  latitude: FRANCE_TERRITORY_CENTER[0],
  longitude: FRANCE_TERRITORY_CENTER[1],
  importance: null,
};

type AddressSuggestionsResponse = {
  status: string;
  query: string;
  items: GeoAddressSuggestion[];
};

type ReverseLocationResponse = {
  status: string;
  location: WeatherLocation | null;
};

type WeatherIssue = "weather_unavailable" | "weather_empty" | null;

function buildFallbackWeatherLocation(label: string, subtitle: string | null): WeatherLocation {
  return {
    label: label.trim() || DEFAULT_LOCATION.label,
    subtitle: subtitle?.trim() || DEFAULT_LOCATION.subtitle,
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    importance: null,
  };
}

async function resolveWeatherLocationFromLabel(
  label: string,
  subtitle: string | null,
): Promise<WeatherLocation> {
  const fallback = buildFallbackWeatherLocation(label, subtitle);
  const localSuggestion = getLocalGeoAddressSuggestions(label, 1)[0];
  if (localSuggestion) {
    return localSuggestion;
  }

  try {
    const response = await fetch(
      `/api/geo/address-suggestions?q=${encodeURIComponent(label)}&limit=1`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );

    if (response.ok) {
      const body = (await response.json()) as AddressSuggestionsResponse;
      const suggestion = body.items[0];
      if (suggestion) {
        return suggestion;
      }
    }
  } catch {
    // Ignore network or parsing failures and fall back to a neutral label.
  }

  return fallback;
}

async function resolveWeatherLocationFromPreference(
  preference: NonNullable<ReturnType<typeof extractTerritoryLocationPreferenceFromMetadata>>,
): Promise<WeatherLocation> {
  if (preference.level === "country") {
    return buildFallbackWeatherLocation(preference.label, preference.subtitle ?? "Vue nationale");
  }

  return resolveWeatherLocationFromLabel(
    preference.label,
    preference.subtitle ?? "Localisation choisie",
  );
}

function formatDayLabel(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function isDaytimeHour(time: string): boolean {
  const hour = new Date(time).getHours();
  return hour >= 8 && hour < 22;
}

export function useWeatherData() {
  const { isLoaded, user } = useUser();
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation>(DEFAULT_LOCATION);
  const [locationQuery, setLocationQuery] = useState(DEFAULT_LOCATION.label);
  const [selectedForecastDayIndex, setSelectedForecastDayIndex] = useState(0);
  const hasManualLocationRef = useRef(false);
  const hasResolvedInitialLocationRef = useRef(false);

  const deferredLocationQuery = useDeferredValue(locationQuery.trim());

  const locationSuggestions = useSWR(
    deferredLocationQuery.length >= 3
      ? ["section-weather-location-suggestions", deferredLocationQuery]
      : null,
    async () => {
      const localSuggestions = getLocalGeoAddressSuggestions(deferredLocationQuery, 6);
      if (localSuggestions.length >= 6) {
        return { status: "ok", query: deferredLocationQuery, items: localSuggestions };
      }

      const response = await fetch(
        `/api/geo/address-suggestions?q=${encodeURIComponent(deferredLocationQuery)}&limit=6`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error("location_suggestions_unavailable");
      }

      const remote = (await response.json()) as AddressSuggestionsResponse;
      return {
        ...remote,
        items: mergeGeoAddressSuggestions(localSuggestions, remote.items ?? [], 6),
      };
    },
    swrRecentViewOptions,
  );
  const locationSuggestionsError = locationSuggestions.error ? "location_suggestions_unavailable" : null;

  const { data, isLoading, error } = useSWR(
    ["section-weather-location", selectedLocation.latitude, selectedLocation.longitude],
    async () => {
      const query = new URLSearchParams({
        latitude: String(selectedLocation.latitude),
        longitude: String(selectedLocation.longitude),
        timezone: "Europe/Paris",
        forecast_days: "7",
        current:
          "temperature_2m,precipitation,precipitation_probability,wind_speed_10m,uv_index,relative_humidity_2m,weather_code",
        hourly:
          "temperature_2m,precipitation,precipitation_probability,wind_speed_10m,relative_humidity_2m,uv_index,weather_code",
        daily:
          "temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max,weather_code",
      });

      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("weather_unavailable");
      }

      return (await response.json()) as OpenMeteoResponse;
    },
    swrRecentViewOptions,
  );

  const weatherStatus: WeatherDataStatus = error
    ? "error"
    : data?.hourly?.time?.length
      ? "ready"
      : isLoading
        ? "loading"
        : "empty";

  const weatherIssue: WeatherIssue =
    weatherStatus === "error"
      ? "weather_unavailable"
      : weatherStatus === "empty"
        ? "weather_empty"
        : null;

  const selectLocation = (location: WeatherLocationSuggestion) => {
    hasManualLocationRef.current = true;
    setSelectedLocation(location);
    setLocationQuery(location.label);
    setSelectedForecastDayIndex(0);
    storeWeatherLocation({
      label: location.label,
      subtitle: location.subtitle,
    });
  };

  useEffect(() => {
    if (hasResolvedInitialLocationRef.current) {
      return;
    }

    const storedLocation = readStoredWeatherLocation();
    if (!storedLocation) {
      return;
    }

    let isCancelled = false;

    void resolveWeatherLocationFromLabel(storedLocation.label, storedLocation.subtitle).then(
      (location) => {
        if (isCancelled || hasResolvedInitialLocationRef.current || hasManualLocationRef.current) {
          return;
        }

        hasResolvedInitialLocationRef.current = true;
        hasManualLocationRef.current = true;
        setSelectedLocation(location);
        setLocationQuery(location.label);
        setSelectedForecastDayIndex(0);
        storeWeatherLocation({
          label: location.label,
          subtitle: location.subtitle,
        });
      },
    );

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || hasResolvedInitialLocationRef.current || hasManualLocationRef.current) {
      return;
    }

    const preference =
      extractTerritoryLocationPreferenceFromMetadata(user?.unsafeMetadata as Record<string, unknown> | undefined) ??
      extractTerritoryLocationPreferenceFromMetadata(user?.publicMetadata as Record<string, unknown> | undefined);

    if (!preference) {
      return;
    }

    let isCancelled = false;

    void resolveWeatherLocationFromPreference(preference).then((location) => {
      if (isCancelled || hasResolvedInitialLocationRef.current || hasManualLocationRef.current) {
        return;
      }

      hasResolvedInitialLocationRef.current = true;
      hasManualLocationRef.current = true;
      setSelectedLocation(location);
      setLocationQuery(location.label);
      setSelectedForecastDayIndex(0);
      storeWeatherLocation(location);
    });

    return () => {
      isCancelled = true;
    };
  }, [isLoaded, user?.publicMetadata, user?.unsafeMetadata]);

  useEffect(() => {
    if (!isLoaded || hasResolvedInitialLocationRef.current || hasManualLocationRef.current) {
      return;
    }

    if (!canRequestGeolocation()) {
      return;
    }

    let isCancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (isCancelled || hasManualLocationRef.current) {
          return;
        }

        try {
          const reverseUrl = new URL("/api/geo/reverse-location", window.location.origin);
          reverseUrl.searchParams.set("lat", String(position.coords.latitude));
          reverseUrl.searchParams.set("lon", String(position.coords.longitude));

          const response = await fetch(reverseUrl.toString(), {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          });

          if (!response.ok) {
            return;
          }

          const body = (await response.json()) as ReverseLocationResponse;
          if (isCancelled || hasManualLocationRef.current || !body.location) {
            return;
          }

          hasResolvedInitialLocationRef.current = true;
          setSelectedLocation(body.location);
          setLocationQuery(body.location.label);
          setSelectedForecastDayIndex(0);
        } catch {
          // Silent fallback: the default/manual location remains available.
        }
      },
      () => {
        // Silent fallback: the default/manual location remains available.
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 },
    );

    return () => {
      isCancelled = true;
    };
  }, [isLoaded]);

  const hourlyPoints: WeatherPoint[] =
    weatherStatus === "ready" && data?.hourly?.time?.length
      ? data.hourly.time
          .map((time, index) => ({
            time,
            temperature: Number(
              data.hourly?.temperature_2m?.[index] ?? data.current?.temperature_2m ?? 0,
            ),
            rain: Number(data.hourly?.precipitation?.[index] ?? data.current?.precipitation ?? 0),
            precipitationProbability: Number(
              data.hourly?.precipitation_probability?.[index] ??
                data.current?.precipitation_probability ??
                0,
            ),
            wind: Number(
              data.hourly?.wind_speed_10m?.[index] ?? data.current?.wind_speed_10m ?? 0,
            ),
            humidity: Number(
              data.hourly?.relative_humidity_2m?.[index] ?? data.current?.relative_humidity_2m ?? 0,
            ),
            uv: Number(data.hourly?.uv_index?.[index] ?? data.current?.uv_index ?? 0),
            weatherCode: Number(
              data.hourly?.weather_code?.[index] ?? data.current?.weather_code ?? 0,
            ),
          }))
          .filter((point) => isDaytimeHour(point.time))
      : [];

  const forecastDays =
    weatherStatus === "ready" && data?.daily?.time?.length
      ? data.daily.time.map((day, index) => {
          const hours = hourlyPoints.filter((point) => point.time.slice(0, 10) === day);
          return {
            date: day,
            label: index === 0 ? "Aujourd’hui" : formatDayLabel(day),
            subtitle: formatDateShort(day),
            min: Number(data.daily?.temperature_2m_min?.[index] ?? 0),
            max: Number(data.daily?.temperature_2m_max?.[index] ?? 0),
            rain: Number(data.daily?.precipitation_sum?.[index] ?? 0),
            wind: Number(data.daily?.wind_speed_10m_max?.[index] ?? 0),
            uv: Number(data.daily?.uv_index_max?.[index] ?? 0),
            weatherCode: Number(data.daily?.weather_code?.[index] ?? hours[0]?.weatherCode ?? 0),
            hours,
          };
        })
      : [];

  const currentRisk =
    weatherStatus === "ready" && hourlyPoints[0]
      ? evaluateWeatherRisk({
          temperature: Number(data?.current?.temperature_2m ?? hourlyPoints[0].temperature),
          rain: Number(data?.current?.precipitation ?? hourlyPoints[0].rain),
          wind: Number(data?.current?.wind_speed_10m ?? hourlyPoints[0].wind),
        })
      : null;

  const windows =
    weatherStatus === "ready" && hourlyPoints.length > 0
      ? buildInterventionWindows(hourlyPoints)
      : { recommended: [], avoid: [] };

  return {
    selectedLocation,
    setSelectedLocation,
    locationQuery,
    setLocationQuery,
    locationSuggestions: locationSuggestions.data?.items ?? [],
    isLocationSuggestionsLoading: locationSuggestions.isLoading,
    locationSuggestionsError,
    selectLocation,
    forecastDays,
    selectedForecastDayIndex,
    setSelectedForecastDayIndex,
    data,
    isLoading,
    error,
    weatherStatus,
    weatherIssue,
    hourlyPoints,
    windows,
    currentRisk,
  };
}
