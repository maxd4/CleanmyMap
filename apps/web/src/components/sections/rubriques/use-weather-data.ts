"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { TERRITORY_CENTER } from "@/lib/geo/territory";
import {
  getLocalGeoAddressSuggestions,
  type GeoAddressSuggestion,
} from "@/lib/geo/address-suggestions";
import { extractTerritoryLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { formatDateShort } from "@/components/sections/rubriques/helpers";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import { fetchOpenMeteoForecast } from "@/lib/weather/open-meteo-client";
import { parseCivilDateAsUtc } from "@/lib/time/civil-date";
import {
  readStoredWeatherLocation,
  storeWeatherLocation,
} from "./weather-location-storage";
import { useWeatherLocationSuggestions } from "./use-weather-location-suggestions";
import {
  assessForecastDay,
  evaluateCurrentWeatherRisk,
  selectForecastDayIndex,
} from "./weather-data.model";
import type {
  WeatherDataStatus,
  WeatherLocation,
  WeatherLocationResolution,
  WeatherLocationSuggestion,
  WeatherPoint,
} from "./weather-types";

const DEFAULT_LOCATION: WeatherLocation = {
  label: "France",
  subtitle: "Vue nationale",
  latitude: TERRITORY_CENTER[0],
  longitude: TERRITORY_CENTER[1],
  importance: null,
  resolution: "resolved",
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

export function canApplyDraftWeatherLocation(
  draftLocationLabel: string,
  hasManualLocation: boolean,
): boolean {
  return draftLocationLabel.trim().length > 0 && !hasManualLocation;
}

export function canApplyAutomaticWeatherLocation({
  draftLocationLabel,
  hasManualLocation,
  hasResolvedInitialLocation,
}: {
  draftLocationLabel: string;
  hasManualLocation: boolean;
  hasResolvedInitialLocation: boolean;
}): boolean {
  return (
    draftLocationLabel.trim().length === 0 &&
    !hasManualLocation &&
    !hasResolvedInitialLocation
  );
}

export function shouldApplyDraftForecastDate({
  draftActionDate,
  hasManualForecastDay,
  forecastDaysLength,
}: {
  draftActionDate: string;
  hasManualForecastDay: boolean;
  forecastDaysLength: number;
}): boolean {
  return draftActionDate.trim().length > 0 && !hasManualForecastDay && forecastDaysLength > 0;
}

export function buildFallbackWeatherLocation(label: string, subtitle: string | null): WeatherLocation {
  return {
    label: label.trim() || DEFAULT_LOCATION.label,
    subtitle: subtitle?.trim() || DEFAULT_LOCATION.subtitle,
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
    importance: null,
    resolution: "unresolved",
  };
}

function parseCoordinate(value: string | number | undefined, minimum: number, maximum: number): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? numeric : null;
}

export function buildWeatherLocationFromCoordinates({
  label,
  latitude,
  longitude,
}: {
  label?: string;
  latitude?: string | number;
  longitude?: string | number;
}): WeatherLocation | null {
  const validLatitude = parseCoordinate(latitude, -90, 90);
  const validLongitude = parseCoordinate(longitude, -180, 180);
  if (validLatitude === null || validLongitude === null) return null;
  return {
    label: label?.trim() || "Lieu de l’action",
    subtitle: "Coordonnées confirmées de l’action",
    latitude: validLatitude,
    longitude: validLongitude,
    importance: null,
    resolution: "resolved",
  };
}

async function resolveWeatherLocationFromLabel(
  label: string,
  subtitle: string | null,
): Promise<WeatherLocation> {
  const fallback = buildFallbackWeatherLocation(label, subtitle);
  const localSuggestion = getLocalGeoAddressSuggestions(label, 1)[0];
  if (localSuggestion) {
    return { ...localSuggestion, resolution: "resolved" };
  }

  try {
    const response = await fetch(
      `/api/geo/address-suggestions?q=${encodeURIComponent(label)}&limit=1`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
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
    // Ignore network or parsing failures and fall back to a neutral label.
  }

  return fallback;
}

async function resolveWeatherLocationFromPreference(
  preference: NonNullable<ReturnType<typeof extractTerritoryLocationPreferenceFromMetadata>>,
): Promise<WeatherLocation> {
  if (preference.level === "country") {
    return {
      ...DEFAULT_LOCATION,
      label: preference.label,
      subtitle: preference.subtitle ?? "Vue nationale",
    };
  }

  return resolveWeatherLocationFromLabel(
    preference.label,
    preference.subtitle ?? "Localisation choisie",
  );
}

function formatDayLabel(value: string): string {
  const date = parseCivilDateAsUtc(value);
  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function isDaytimeHour(time: string): boolean {
  const hour = Number(/^\d{4}-\d{2}-\d{2}T(\d{2})/.exec(time)?.[1] ?? Number.NaN);
  return hour >= 8 && hour < 22;
}

export function useWeatherData(
  draftContext?: { locationLabel?: string; actionDate?: string; departureTime?: string; latitude?: string; longitude?: string; contextReady?: boolean },
) {
  const { isLoaded, user } = useUser();
  const [selectedForecastDayIndex, setSelectedForecastDayIndex] = useState(0);
  const [hasManualForecastDay, setHasManualForecastDay] = useState(false);
  const hasManualLocationRef = useRef(false);
  const hasResolvedInitialLocationRef = useRef(false);
  const draftLocationRef = useRef<string | null>(null);
  const draftLocationLabel = draftContext?.locationLabel?.trim() ?? "";
  const draftActionDate = draftContext?.actionDate?.trim() ?? "";
  const contextReady = draftContext?.contextReady !== false;
  const actionLocation = useMemo(
    () => buildWeatherLocationFromCoordinates({
      label: draftLocationLabel,
      latitude: draftContext?.latitude,
      longitude: draftContext?.longitude,
    }),
    [draftContext?.latitude, draftContext?.longitude, draftLocationLabel],
  );
  const hasCanonicalActionLocation = actionLocation !== null;
  const preparationContextWithoutLocation = draftContext?.contextReady === true && !draftLocationLabel && !hasCanonicalActionLocation;
  const initialLocation = !contextReady
    ? buildFallbackWeatherLocation("Lieu en cours de chargement", "Contexte de préparation")
    : actionLocation
      ? actionLocation
    : preparationContextWithoutLocation
      ? buildFallbackWeatherLocation("Localisation à préciser", "Lieu de l’action non renseigné")
    : draftLocationLabel
    ? buildFallbackWeatherLocation(draftLocationLabel, "Lieu du pré-formulaire")
    : DEFAULT_LOCATION;
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation>(initialLocation);
  const [locationQuery, setLocationQuery] = useState(actionLocation?.label || draftLocationLabel || (preparationContextWithoutLocation ? "" : DEFAULT_LOCATION.label));
  const { locationSuggestions, locationSuggestionsError } =
    useWeatherLocationSuggestions(locationQuery);

  const { data, isLoading, error } = useSWR(
    contextReady && selectedLocation.resolution === "resolved"
      ? ["section-weather-location", selectedLocation.latitude, selectedLocation.longitude]
      : null,
    async () => {
      return fetchOpenMeteoForecast({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        timezone: "Europe/Paris",
        forecastDays: 7,
        current: [
          "temperature_2m",
          "apparent_temperature",
          "precipitation",
          "precipitation_probability",
          "wind_speed_10m",
          "wind_gusts_10m",
          "uv_index",
          "relative_humidity_2m",
          "weather_code",
        ],
        hourly: [
          "temperature_2m",
          "apparent_temperature",
          "precipitation",
          "precipitation_probability",
          "wind_speed_10m",
          "wind_gusts_10m",
          "relative_humidity_2m",
          "uv_index",
          "weather_code",
        ],
        daily: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "wind_speed_10m_max",
          "uv_index_max",
          "weather_code",
        ],
      });
    },
    swrRecentViewOptions,
  );

  const weatherStatus: WeatherDataStatus = !contextReady
    ? "loading"
    : selectedLocation.resolution === "unresolved"
    ? "empty"
    : error
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
    setSelectedLocation({ ...location, resolution: "resolved" });
    setLocationQuery(location.label);
    setSelectedForecastDayIndex(0);
    storeWeatherLocation({
      label: location.label,
      subtitle: location.subtitle,
    });
  };

  const selectForecastDay = (index: number) => {
    setHasManualForecastDay(true);
    setSelectedForecastDayIndex(index);
  };

  useEffect(() => {
    if (
      !contextReady ||
      !hasCanonicalActionLocation ||
      !actionLocation ||
      hasManualLocationRef.current ||
      (selectedLocation.resolution === "resolved" && selectedLocation.latitude === actionLocation.latitude && selectedLocation.longitude === actionLocation.longitude)
    ) {
      return;
    }

    // The preparation context is the canonical source when coordinates are available.
    // Label geocoding must not replace a confirmed action location.
    setSelectedLocation(actionLocation);
    setLocationQuery(actionLocation.label);
    hasResolvedInitialLocationRef.current = true;
  }, [actionLocation, contextReady, hasCanonicalActionLocation, selectedLocation.latitude, selectedLocation.longitude, selectedLocation.resolution]);

  useEffect(() => {
    if (
      !contextReady ||
      hasCanonicalActionLocation ||
      preparationContextWithoutLocation ||
      !canApplyDraftWeatherLocation(draftLocationLabel, hasManualLocationRef.current) ||
      draftLocationRef.current === draftLocationLabel
    ) {
      return;
    }

    draftLocationRef.current = draftLocationLabel;
    let isCancelled = false;
    void resolveWeatherLocationFromLabel(draftLocationLabel, "Lieu du pré-formulaire").then((location) => {
      if (isCancelled || hasManualLocationRef.current) {
        return;
      }
      setSelectedLocation(location);
      setLocationQuery(location.label);
      setSelectedForecastDayIndex(0);
      hasResolvedInitialLocationRef.current = true;
    });

    return () => {
      isCancelled = true;
    };
  }, [contextReady, draftLocationLabel, hasCanonicalActionLocation, preparationContextWithoutLocation]);

  useEffect(() => {
    if (
      !contextReady ||
      hasCanonicalActionLocation ||
      preparationContextWithoutLocation ||
      !canApplyAutomaticWeatherLocation({
        draftLocationLabel,
        hasManualLocation: hasManualLocationRef.current,
        hasResolvedInitialLocation: hasResolvedInitialLocationRef.current,
      })
    ) {
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
  }, [contextReady, draftLocationLabel, hasCanonicalActionLocation, preparationContextWithoutLocation]);

  useEffect(() => {
    if (
      !contextReady ||
      hasCanonicalActionLocation ||
      preparationContextWithoutLocation ||
      !isLoaded ||
      !canApplyAutomaticWeatherLocation({
        draftLocationLabel,
        hasManualLocation: hasManualLocationRef.current,
        hasResolvedInitialLocation: hasResolvedInitialLocationRef.current,
      })
    ) {
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
      setSelectedLocation(location);
      setLocationQuery(location.label);
      setSelectedForecastDayIndex(0);
      storeWeatherLocation(location);
    });

    return () => {
      isCancelled = true;
    };
  }, [contextReady, draftLocationLabel, hasCanonicalActionLocation, isLoaded, preparationContextWithoutLocation, user?.publicMetadata, user?.unsafeMetadata]);

  useEffect(() => {
    if (
      !contextReady ||
      hasCanonicalActionLocation ||
      preparationContextWithoutLocation ||
      !isLoaded ||
      !canApplyAutomaticWeatherLocation({
        draftLocationLabel,
        hasManualLocation: hasManualLocationRef.current,
        hasResolvedInitialLocation: hasResolvedInitialLocationRef.current,
      })
    ) {
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
  }, [contextReady, draftLocationLabel, hasCanonicalActionLocation, isLoaded, preparationContextWithoutLocation]);

  const hourlyPoints: WeatherPoint[] = useMemo(
    () =>
      weatherStatus === "ready" && data?.hourly?.time?.length
        ? data.hourly.time
            .map((time, index) => ({
              time,
              temperature: data.hourly?.temperature_2m?.[index] ?? null,
              rain: data.hourly?.precipitation?.[index] ?? null,
              precipitationProbability: data.hourly?.precipitation_probability?.[index] ?? null,
              wind: data.hourly?.wind_speed_10m?.[index] ?? null,
              humidity: data.hourly?.relative_humidity_2m?.[index] ?? null,
              uv: data.hourly?.uv_index?.[index] ?? null,
              weatherCode: data.hourly?.weather_code?.[index] ?? null,
            }))
            .filter((point) => isDaytimeHour(point.time))
        : [],
    [data, weatherStatus],
  );

  const forecastDays = useMemo(
    () =>
      weatherStatus === "ready" && data?.daily?.time?.length
        ? data.daily.time.map((day, index) => {
            const hours = hourlyPoints.filter((point) => point.time.slice(0, 10) === day);
            return {
              date: day,
              label: index === 0 ? "Aujourd’hui" : formatDayLabel(day),
              subtitle: formatDateShort(day),
              min: data.daily?.temperature_2m_min?.[index] ?? null,
              max: data.daily?.temperature_2m_max?.[index] ?? null,
              rain: data.daily?.precipitation_sum?.[index] ?? null,
              wind: data.daily?.wind_speed_10m_max?.[index] ?? null,
              uv: data.daily?.uv_index_max?.[index] ?? null,
              weatherCode: data.daily?.weather_code?.[index] ?? hours.find((hour) => hour.weatherCode !== null)?.weatherCode ?? null,
              hours,
            };
          })
        : [],
    [data, hourlyPoints, weatherStatus],
  );

  useEffect(() => {
    if (
      !shouldApplyDraftForecastDate({
        draftActionDate,
        hasManualForecastDay,
        forecastDaysLength: forecastDays.length,
      })
    ) {
      return;
    }
    const matchingIndex = forecastDays.findIndex((day) => day.date === draftActionDate);
    if (matchingIndex >= 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronize optional pre-form date context
      setSelectedForecastDayIndex(matchingIndex);
    }
  }, [draftActionDate, forecastDays, hasManualForecastDay]);

  const currentRisk = weatherStatus === "ready"
    ? evaluateCurrentWeatherRisk({
        temperature: data?.current?.temperature_2m,
        rain: data?.current?.precipitation,
        wind: data?.current?.wind_speed_10m,
      })
    : null;
  const activeForecastDayIndex = selectForecastDayIndex({
    forecastDates: forecastDays.map((day) => day.date),
    draftActionDate,
    selectedIndex: selectedForecastDayIndex,
    hasManualSelection: hasManualForecastDay,
  });
  const selectedForecastDay = contextReady ? forecastDays[activeForecastDayIndex] ?? null : null;
  const forecastSelectionStatus: "selected" | "unavailable" = selectedForecastDay
    ? "selected"
    : "unavailable";
  const selectedForecastAssessment = weatherStatus === "ready" && forecastSelectionStatus === "selected"
    ? assessForecastDay(selectedForecastDay)
    : { risk: null, windows: { recommended: [], avoid: [] } };

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
    selectedForecastDayIndex: activeForecastDayIndex,
    setSelectedForecastDayIndex: selectForecastDay,
    data,
    isLoading,
    error,
    weatherStatus,
    weatherIssue,
    locationResolution: selectedLocation.resolution as WeatherLocationResolution,
    hourlyPoints,
    selectedForecastDay,
    forecastSelectionStatus,
    windows: selectedForecastAssessment.windows,
    currentRisk,
    selectedForecastRisk: selectedForecastAssessment.risk,
  };
}
