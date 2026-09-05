import type { ReactNode } from "react";
import {
  CloudRain,
  CloudSun,
  MapPin,
  Moon,
  SunMedium,
  TriangleAlert,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { formatDateTimeShort } from "@/components/sections/rubriques/helpers";

export type WeatherRiskLevel = "vert" | "orange" | "rouge";

export function getDurationLabel(level: WeatherRiskLevel): string {
  if (level === "rouge") return "45 min max";
  if (level === "orange") return "60-90 min";
  return "90-120 min";
}

export function getCurrentWindowLabel(
  from?: string,
  to?: string,
  locale: "fr" | "en" = "fr",
): string {
  if (!from || !to) {
    return locale === "fr" ? "Pas de fenêtre horaire claire" : "No clear time window";
  }

  const start = formatDateTimeShort(from);
  const end = formatDateTimeShort(to);
  return `${start} → ${end}`;
}

export function getWeatherStateCopy({
  weatherStatus,
  selectedZoneLabel,
  fr,
}: {
  weatherStatus: "loading" | "ready" | "error" | "empty";
  selectedZoneLabel: string;
  fr: boolean;
}): {
  icon: LucideIcon;
  variant: "loading" | "ready" | "error" | "empty";
  title: string;
  description: string;
  meta: ReactNode;
  action: ReactNode | null;
} {
  switch (weatherStatus) {
    case "loading":
      return {
        icon: CloudRain,
        variant: "loading",
        title: fr ? "Chargement météo" : "Loading weather",
        description: fr
          ? "Les données météo en direct sont en cours de récupération."
          : "Live weather data is being fetched.",
        meta: fr
          ? `Prévision en cours pour ${selectedZoneLabel}.`
          : `Forecast in progress for ${selectedZoneLabel}.`,
        action: null,
      };
    case "error":
      return {
        icon: TriangleAlert,
        variant: "error",
        title: fr ? "Météo indisponible" : "Weather unavailable",
        description: fr
          ? "La météo n'a pas pu être chargée pour cette zone."
          : "Weather data could not be loaded for this area.",
        meta: fr
          ? `Vérifie la zone sélectionnée ou réessaie plus tard pour ${selectedZoneLabel}.`
          : `Check the selected area or try again later for ${selectedZoneLabel}.`,
        action: null,
      };
    case "empty":
      return {
        icon: MapPin,
        variant: "empty",
        title: fr ? "Aucune donnée météo" : "No weather data",
        description: fr
          ? "Aucune prévision exploitable n'est disponible pour cette zone."
          : "No usable forecast is available for this area.",
        meta: fr
          ? `Essaie un autre lieu autour de ${selectedZoneLabel}.`
          : `Try another place around ${selectedZoneLabel}.`,
        action: null,
      };
    case "ready":
    default:
      return {
        icon: CloudSun,
        variant: "ready",
        title: fr ? "Conditions disponibles" : "Conditions available",
        description: fr
          ? "Les conseils affichés ci-dessous sont basés sur les données météo courantes."
          : "The advice below is based on the current weather data.",
        meta: fr
          ? `Zone analysée: ${selectedZoneLabel}.`
          : `Analyzed area: ${selectedZoneLabel}.`,
        action: null,
      };
  }
}

export function getForecastHourLabel(time: string): string {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) {
    return time;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getForecastConditionLabel(
  point: {
    time: string;
    temperature: number;
    rain: number;
    precipitationProbability: number;
    wind: number;
    weatherCode: number;
  },
  index: number,
): { label: string; icon: typeof SunMedium } {
  const hour = new Date(point.time).getHours();

  const weatherCode = point.weatherCode;

  if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
    return { label: "Orage", icon: CloudRain };
  }

  if (weatherCode === 61 || weatherCode === 63 || weatherCode === 65 || weatherCode === 80 || weatherCode === 81 || weatherCode === 82) {
    return { label: "Pluie", icon: CloudRain };
  }

  if (weatherCode === 45 || weatherCode === 48) {
    return { label: "Brouillard", icon: CloudSun };
  }

  if (weatherCode === 0) {
    return hour >= 21 || hour < 6 ? { label: "Ciel clair", icon: Moon } : { label: "Ensoleillé", icon: SunMedium };
  }

  if (point.rain >= 0.8) {
    return { label: "Pluie", icon: CloudRain };
  }

  if (hour >= 21 || hour < 6) {
    return { label: "Ciel clair", icon: Moon };
  }

  if (index === 0 || point.temperature >= 17) {
    return { label: "Ensoleillé", icon: SunMedium };
  }

  if (point.wind >= 14) {
    return { label: "Vent léger", icon: Wind };
  }

  return { label: "Nuageux", icon: CloudSun };
}

export function getVigilanceLabel(level: WeatherRiskLevel, fr: boolean): string {
  if (level === "rouge") {
    return fr ? "Élevée" : "High";
  }
  if (level === "orange") {
    return fr ? "À surveiller" : "Watch";
  }
  return fr ? "Faible" : "Low";
}

export function getReportLabel(level: WeatherRiskLevel, fr: boolean): string {
  if (level === "rouge") {
    return fr ? "Oui, report recommandé" : "Yes, postpone";
  }
  if (level === "orange") {
    return fr ? "À confirmer selon le créneau" : "Confirm based on the slot";
  }
  return fr ? "Non" : "No";
}
