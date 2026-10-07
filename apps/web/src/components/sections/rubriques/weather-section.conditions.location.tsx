"use client";

import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { WeatherLocationPicker } from "./weather-location-picker";
import type { WeatherLocationAndStateProps } from "./weather-section.conditions.types";

export function WeatherLocationAndState({
  weatherStatus,
  selectedLocation,
  locationQuery,
  setLocationQuery,
  locationSuggestions,
  locationSuggestionsError,
  isLocationSuggestionsLoading,
  selectLocation,
  weatherState,
  fr,
}: WeatherLocationAndStateProps) {
  const stateVariant =
    weatherStatus === "error"
      ? "error"
      : weatherStatus === "loading"
        ? "loading"
        : "empty";

  return (
    <div className="space-y-6">
      <WeatherLocationPicker
        query={locationQuery}
        onQueryChange={setLocationQuery}
        suggestions={locationSuggestions}
        isLoading={isLocationSuggestionsLoading}
        errorMessage={
          locationSuggestionsError
            ? fr
              ? "La recherche de villes est momentanément indisponible."
              : "City search is temporarily unavailable."
            : null
        }
        selectedLocation={selectedLocation}
        onSelectLocation={selectLocation}
        label={fr ? "Lieu d’action" : "Action place"}
        currentLocationLabel={fr ? "Lieu actif" : "Active place"}
        helperText={
          fr
            ? "Choisis une commune, une ville ou un lieu précis pour obtenir la météo réelle."
            : "Choose a commune, city or precise place to get the real weather."
        }
        emptyMessage={
          fr
            ? "Lieu introuvable. Essaie une autre commune ou une autre ville."
            : "Place not found. Try another commune or another city."
        }
      />

      <SystemStateLayout variant={stateVariant} className="max-w-none">
        <SystemStateIcon variant={stateVariant}>
          <weatherState.icon
            size={28}
            className={weatherState.variant === "loading" ? "animate-spin" : undefined}
          />
        </SystemStateIcon>
        <SystemStateTitle variant={stateVariant}>{weatherState.title}</SystemStateTitle>
        <SystemStateDescription variant={stateVariant}>
          {weatherState.description}
        </SystemStateDescription>
        <SystemStateMeta variant={stateVariant} label={fr ? "Lieu sélectionné" : "Selected place"}>
          {selectedLocation.label}
          <div className="mt-2">{weatherState.meta}</div>
        </SystemStateMeta>
        {weatherState.action ? <SystemStateAction>{weatherState.action}</SystemStateAction> : null}
      </SystemStateLayout>
    </div>
  );
}
