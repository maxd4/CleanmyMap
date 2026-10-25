"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import { extractTerritoryLocationPreferenceFromMetadata } from "@/lib/user-location-preference";
import { swrRecentViewOptions } from "@/lib/swr-config";
import { canRequestGeolocation } from "@/lib/browser/geolocation";
import { fetchOpenMeteoForecast } from "@/lib/weather/open-meteo-client";
import { storeWeatherLocation, readStoredWeatherLocation } from "./weather-location-storage";
import { useWeatherLocationSuggestions } from "./use-weather-location-suggestions";
import {
  assessForecastDay,
  buildForecastDays,
  buildHourlyPoints,
  buildInitialWeatherLocation,
  buildWeatherLocationFromCoordinates,
  canApplyDraftWeatherLocation,
  evaluateCurrentWeatherRisk,
  getWeatherDataStatus,
  getWeatherIssue,
  isSameWeatherLocation,
  selectAutomaticWeatherLocationSource,
  selectForecastDayIndex,
} from "./weather-data.model";
import { resolveWeatherLocationRequest } from "./weather-location-resolution";
import type {
  WeatherDataStatus,
  WeatherLocation,
  WeatherLocationResolution,
  WeatherLocationSuggestion,
  WeatherPoint,
} from "./weather-types";

export {
  buildFallbackWeatherLocation,
  buildWeatherLocationFromCoordinates,
  canApplyAutomaticWeatherLocation,
  canApplyDraftWeatherLocation,
  shouldApplyDraftForecastDate,
} from "./weather-data.model";

type WeatherDraftContext = {
  locationLabel?: string;
  actionDate?: string;
  departureTime?: string;
  latitude?: string;
  longitude?: string;
  contextReady?: boolean;
};

const WEATHER_FORECAST_OPTIONS = {
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
} as const;

export function useWeatherData(draftContext?: WeatherDraftContext) {
  const { isLoaded, user } = useUser();
  const [selectedForecastDayIndex, setSelectedForecastDayIndex] = useState(0);
  const [hasManualForecastDay, setHasManualForecastDay] = useState(false);
  const hasManualLocationRef = useRef(false);
  const hasResolvedInitialLocationRef = useRef(false);
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
  const preparationContextWithoutLocation = draftContext?.contextReady === true
    && !draftLocationLabel
    && !hasCanonicalActionLocation;
  const initialLocation = buildInitialWeatherLocation({
    contextReady,
    actionLocation,
    draftLocationLabel,
    preparationContextWithoutLocation,
  });
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation>(initialLocation);
  const [locationQuery, setLocationQuery] = useState(
    actionLocation?.label || draftLocationLabel || (preparationContextWithoutLocation ? "" : "France"),
  );
  const { locationSuggestions, locationSuggestionsError } =
    useWeatherLocationSuggestions(locationQuery);
  const locationPreference = useMemo(
    () => extractTerritoryLocationPreferenceFromMetadata(user?.unsafeMetadata as Record<string, unknown> | undefined)
      ?? extractTerritoryLocationPreferenceFromMetadata(user?.publicMetadata as Record<string, unknown> | undefined),
    [user?.publicMetadata, user?.unsafeMetadata],
  );

  const { data, isLoading, error } = useSWR(
    contextReady && selectedLocation.resolution === "resolved"
      ? ["section-weather-location", selectedLocation.latitude, selectedLocation.longitude]
      : null,
    () => fetchOpenMeteoForecast({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      ...WEATHER_FORECAST_OPTIONS,
    }),
    swrRecentViewOptions,
  );

  const weatherStatus: WeatherDataStatus = getWeatherDataStatus({
    contextReady,
    locationResolution: selectedLocation.resolution,
    error,
    hasHourlyData: Boolean(data?.hourly?.time?.length),
    isLoading,
  });
  const weatherIssue = getWeatherIssue(weatherStatus);

  const applyResolvedLocation = (location: WeatherLocation, persist = false) => {
    if (hasManualLocationRef.current) return;
    hasResolvedInitialLocationRef.current = true;
    setSelectedLocation(location);
    setLocationQuery(location.label);
    setSelectedForecastDayIndex(0);
    if (persist) {
      storeWeatherLocation({ label: location.label, subtitle: location.subtitle });
    }
  };

  const selectLocation = (location: WeatherLocationSuggestion) => {
    hasManualLocationRef.current = true;
    setSelectedLocation({ ...location, resolution: "resolved" });
    setLocationQuery(location.label);
    setSelectedForecastDayIndex(0);
    storeWeatherLocation({ label: location.label, subtitle: location.subtitle });
  };

  const selectForecastDay = (index: number) => {
    setHasManualForecastDay(true);
    setSelectedForecastDayIndex(index);
  };

  useEffect(() => {
    if (!contextReady || !actionLocation || hasManualLocationRef.current) {
      return;
    }
    if (isSameWeatherLocation(selectedLocation, actionLocation)) {
      hasResolvedInitialLocationRef.current = true;
      return;
    }

    applyResolvedLocation(actionLocation);
  }, [actionLocation, contextReady, selectedLocation]);

  useEffect(() => {
    if (!isLoaded || !contextReady || hasCanonicalActionLocation || preparationContextWithoutLocation) {
      return;
    }

    const storedLocation = canApplyDraftWeatherLocation(draftLocationLabel, false)
      ? null
      : readStoredWeatherLocation();
    const source = selectAutomaticWeatherLocationSource({
      contextReady,
      hasCanonicalActionLocation,
      preparationContextWithoutLocation,
      draftLocationLabel,
      hasManualLocation: hasManualLocationRef.current,
      hasResolvedInitialLocation: hasResolvedInitialLocationRef.current,
      hasStoredLocation: Boolean(storedLocation),
      hasPreference: Boolean(locationPreference),
      geolocationAvailable: canRequestGeolocation(),
    });
    if (!source) {
      return;
    }

    const controller = new AbortController();
    let isCancelled = false;
    void resolveWeatherLocationRequest({
      source,
      draftLocationLabel,
      storedLocation,
      preference: locationPreference,
      signal: controller.signal,
    }).then((location) => {
      if (isCancelled || controller.signal.aborted || !location) return;
      applyResolvedLocation(location, source === "stored" || source === "preference");
    });

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [
    contextReady,
    draftContext?.latitude,
    draftContext?.longitude,
    draftLocationLabel,
    hasCanonicalActionLocation,
    isLoaded,
    locationPreference,
    preparationContextWithoutLocation,
  ]);

  const hourlyPoints: WeatherPoint[] = useMemo(
    () => buildHourlyPoints(data, weatherStatus),
    [data, weatherStatus],
  );
  const forecastDays = useMemo(
    () => buildForecastDays(data, hourlyPoints, weatherStatus),
    [data, hourlyPoints, weatherStatus],
  );
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
