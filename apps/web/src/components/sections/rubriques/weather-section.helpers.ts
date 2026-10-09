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

import type { WeatherRiskAssessment } from "@/lib/weather/ops-weather";

export type WeatherRiskLevel = "vert" | "orange" | "rouge";

export function getDurationLabel(
  assessment: WeatherRiskAssessment | null,
  fr: boolean,
): string {
  if (!assessment) return fr ? "Prévision indisponible" : "Forecast unavailable";
  return assessment.constraints.find((constraint) => constraint.toLowerCase().startsWith("durée indicative")) ??
    (fr ? "Durée selon les conditions" : "Duration depends on conditions");
}

export function getCurrentWindowLabel(
  from?: string,
  to?: string,
  locale: "fr" | "en" = "fr",
): string {
  if (!from || !to) {
    return locale === "fr" ? "Pas de fenêtre horaire claire" : "No clear time window";
  }

  const start = formatWeatherDateTime(from, locale);
  const end = formatWeatherDateTime(to, locale);
  return `${start} → ${end}`;
}

function formatWeatherDateTime(value: string, locale: "fr" | "en"): string {
  const localMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (localMatch) {
    return locale === "fr"
      ? `${localMatch[1]!.slice(8, 10)}/${localMatch[1]!.slice(5, 7)} ${localMatch[2]}:${localMatch[3]}`
      : `${localMatch[1]!.slice(5, 7)}/${localMatch[1]!.slice(8, 10)} ${localMatch[2]}:${localMatch[3]}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(parsed);
}

type WeatherStateCopy = {
  icon: LucideIcon;
  variant: "loading" | "ready" | "error" | "empty";
  title: string;
  description: string;
  meta: ReactNode;
  action: ReactNode | null;
};

type WeatherStateCopyArgs = {
  weatherStatus: WeatherStateCopy["variant"];
  locationResolution: "resolved" | "unresolved";
  selectedZoneLabel: string;
  fr: boolean;
};

function getUnresolvedLocationCopy(selectedZoneLabel: string, fr: boolean): WeatherStateCopy {
  return {
    icon: MapPin,
    variant: "empty",
    title: fr ? "Localisation à préciser" : "Location needs clarification",
    description: fr
      ? "La météo n'est pas affichée tant que ce libellé n'a pas été géocodé avec succès."
      : "Weather is not shown until this label has been geocoded successfully.",
    meta: fr
      ? `Aucune prévision associée à « ${selectedZoneLabel} ».`
      : `No forecast is associated with “${selectedZoneLabel}”.`,
    action: null,
  };
}

function getLoadingWeatherCopy(selectedZoneLabel: string, fr: boolean): WeatherStateCopy {
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
}

function getErrorWeatherCopy(selectedZoneLabel: string, fr: boolean): WeatherStateCopy {
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
}

function getEmptyWeatherCopy(selectedZoneLabel: string, fr: boolean): WeatherStateCopy {
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
}

function getReadyWeatherCopy(selectedZoneLabel: string, fr: boolean): WeatherStateCopy {
  return {
    icon: CloudSun,
    variant: "ready",
    title: fr ? "Conditions disponibles" : "Conditions available",
    description: fr
      ? "Les données météo du lieu sélectionné sont disponibles. La météo actuelle et le jour choisi restent distingués."
      : "Weather data for the selected place is available. Current conditions and the chosen day remain separate.",
    meta: fr ? `Zone analysée: ${selectedZoneLabel}.` : `Analyzed area: ${selectedZoneLabel}.`,
    action: null,
  };
}

export function getWeatherStateCopy({
  weatherStatus,
  locationResolution,
  selectedZoneLabel,
  fr,
}: WeatherStateCopyArgs): WeatherStateCopy {
  if (locationResolution === "unresolved") return getUnresolvedLocationCopy(selectedZoneLabel, fr);

  switch (weatherStatus) {
    case "loading":
      return getLoadingWeatherCopy(selectedZoneLabel, fr);
    case "error":
      return getErrorWeatherCopy(selectedZoneLabel, fr);
    case "empty":
      return getEmptyWeatherCopy(selectedZoneLabel, fr);
    case "ready":
    default:
      return getReadyWeatherCopy(selectedZoneLabel, fr);
  }
}

export function getForecastHourLabel(time: string): string {
  const localMatch = /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/.exec(time);
  if (localMatch) return `${localMatch[1]}:${localMatch[2]}`;
  const date = new Date(time);
  return Number.isNaN(date.getTime())
    ? time
    : new Intl.DateTimeFormat("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Paris",
      }).format(date);
}

export function getForecastConditionLabel(
  point: {
    time: string;
    temperature: number | null;
    rain: number | null;
    precipitationProbability: number | null;
    wind: number | null;
    weatherCode: number | null;
  },
  index: number,
): { label: string; icon: typeof SunMedium } {
  const hour = getLocalWeatherHour(point.time);
  return getWeatherCodeCondition(point.weatherCode, hour) ?? getFallbackCondition(point, hour, index);
}

function getLocalWeatherHour(value: string): number {
  const localMatch = /^\d{4}-\d{2}-\d{2}T(\d{2}):/.exec(value);
  if (localMatch) return Number(localMatch[1]);
  return new Date(value).getHours();
}

function getWeatherCodeCondition(
  weatherCode: number | null,
  hour: number,
): { label: string; icon: typeof SunMedium } | null {
  if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
    return { label: "Orage", icon: CloudRain };
  }
  if ([61, 63, 65, 80, 81, 82].includes(weatherCode ?? -1)) {
    return { label: "Pluie", icon: CloudRain };
  }
  if (weatherCode === 45 || weatherCode === 48) {
    return { label: "Brouillard", icon: CloudSun };
  }
  if (weatherCode === 0) {
    return hour >= 21 || hour < 6
      ? { label: "Ciel clair", icon: Moon }
      : { label: "Ensoleillé", icon: SunMedium };
  }
  return null;
}

function getFallbackCondition(
  point: {
    rain: number | null;
    temperature: number | null;
    wind: number | null;
  },
  hour: number,
  index: number,
): { label: string; icon: typeof SunMedium } {
  if (point.rain !== null && point.rain >= 0.8) return { label: "Pluie", icon: CloudRain };
  if (hour >= 21 || hour < 6) return { label: "Ciel clair", icon: Moon };
  if (index === 0 || (point.temperature !== null && point.temperature >= 17)) {
    return { label: "Ensoleillé", icon: SunMedium };
  }
  if (point.wind !== null && point.wind >= 14) return { label: "Vent léger", icon: Wind };
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
    return fr ? "À envisager selon les conditions" : "Consider based on conditions";
  }
  if (level === "orange") {
    return fr ? "À confirmer selon le créneau" : "Confirm based on the slot";
  }
  return fr ? "Pas de signal identifié" : "No signal identified";
}
