"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  CloudRain,
  CloudSun,
  Droplets,
  Leaf,
  MapPin,
  Moon,
  Package,
  ShieldCheck,
  SunMedium,
  TriangleAlert,
  Truck,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { formatDateTimeShort } from "@/components/sections/rubriques/helpers";
import { PageHero } from "@/components/ui/page-hero";
import {
  SystemStateAction,
  SystemStateDescription,
  SystemStateIcon,
  SystemStateLayout,
  SystemStateMeta,
  SystemStateTitle,
} from "@/components/ui/system-state";
import { WeatherLocationPicker } from "./weather-location-picker";
import { useWeatherData } from "./use-weather-data";
import { useKitData } from "./use-kit-data";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { cn } from "@/lib/utils";
import { PreparationPanel } from "./weather-section.preparation";

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function getDurationLabel(level: "vert" | "orange" | "rouge"): string {
  if (level === "rouge") return "45 min max";
  if (level === "orange") return "60-90 min";
  return "90-120 min";
}

function getCurrentWindowLabel(
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

function getWeatherStateCopy({
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

function getForecastHourLabel(time: string): string {
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

function getForecastConditionLabel(
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

function getVigilanceLabel(level: "vert" | "orange" | "rouge", fr: boolean): string {
  if (level === "rouge") {
    return fr ? "Élevée" : "High";
  }
  if (level === "orange") {
    return fr ? "À surveiller" : "Watch";
  }
  return fr ? "Faible" : "Low";
}

function getReportLabel(level: "vert" | "orange" | "rouge", fr: boolean): string {
  if (level === "rouge") {
    return fr ? "Oui, report recommandé" : "Yes, postpone";
  }
  if (level === "orange") {
    return fr ? "À confirmer selon le créneau" : "Confirm based on the slot";
  }
  return fr ? "Non" : "No";
}

function LightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2.15rem] border border-slate-200/80 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ConditionsPanel({
  currentRisk,
  weatherStatus,
  selectedLocation,
  locationQuery,
  setLocationQuery,
  locationSuggestions,
  locationSuggestionsError,
  isLocationSuggestionsLoading,
  selectLocation,
  forecastDays,
  selectedForecastDayIndex,
  setSelectedForecastDayIndex,
  windows,
  fr,
}: {
  currentRisk: ReturnType<typeof useWeatherData>["currentRisk"];
  weatherStatus: ReturnType<typeof useWeatherData>["weatherStatus"];
  selectedLocation: ReturnType<typeof useWeatherData>["selectedLocation"];
  locationQuery: string;
  setLocationQuery: (value: string) => void;
  locationSuggestions: ReturnType<typeof useWeatherData>["locationSuggestions"];
  locationSuggestionsError: ReturnType<typeof useWeatherData>["locationSuggestionsError"];
  isLocationSuggestionsLoading: boolean;
  selectLocation: ReturnType<typeof useWeatherData>["selectLocation"];
  forecastDays: ReturnType<typeof useWeatherData>["forecastDays"];
  selectedForecastDayIndex: number;
  setSelectedForecastDayIndex: (value: number) => void;
  windows: ReturnType<typeof useWeatherData>["windows"];
  fr: boolean;
}) {
  const isWeatherReady = weatherStatus === "ready" && currentRisk !== null;
  const checklist = [
    fr ? "Informer son binôme" : "Tell your buddy",
    fr ? "Nommer un référent sécurité" : "Name a safety lead",
    fr ? "Prévoir 1,5 L d’eau minimum" : "Bring at least 1.5 L of water",
    fr ? "Pauses toutes les 60 min" : "Breaks every 60 min",
    fr ? "Vérifier la météo avant le départ" : "Check the weather before leaving",
    fr ? "Trousse de premiers secours" : "First-aid kit",
    fr ? "Brief sécurité initial" : "Initial safety briefing",
    fr ? "Rappeler les règles de conduite" : "State the conduct rules",
  ];

  const equipment = isWeatherReady
    ? currentRisk!.equipment.slice(0, 4)
    : [fr ? "Gants" : "Gloves", fr ? "Sacs" : "Bags", fr ? "Pinces" : "Pliers", fr ? "Eau" : "Water"];
  const recommendedWindows = windows.recommended.slice(0, 3);
  const selectedDay = forecastDays[selectedForecastDayIndex] ?? forecastDays[0] ?? null;
  const selectedDayHours = isWeatherReady ? selectedDay?.hours.slice(0, 24) ?? [] : [];
  const weatherState = getWeatherStateCopy({
    weatherStatus,
    selectedZoneLabel: selectedLocation.label,
    fr,
  });
  const safetyConstraints = isWeatherReady
    ? currentRisk!.constraints
    : [
        fr ? "Évite les déchets dangereux" : "Avoid hazardous waste",
        fr ? "Garde les gants et l'eau à portée" : "Keep gloves and water nearby",
        fr ? "Privilégie un binôme" : "Work in pairs",
        fr ? "Respecte le site et les autres usagers" : "Respect the site and other users",
      ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.48fr_1fr]">
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

        <LightCard className="border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,251,240,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                {fr ? "Recommandations" : "Recommendations"}
              </p>
              <h3 className="text-xl font-black tracking-tight text-emerald-800">
                {isWeatherReady
                  ? fr
                    ? "Conditions météo stables"
                    : "Stable weather conditions"
                  : fr
                    ? "Prévision en attente"
                    : "Forecast pending"}
              </h3>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {!isWeatherReady ? (
              <SystemStateMeta variant="empty" label={fr ? "Météo" : "Weather"}>
                {fr
                  ? "Choisis une ville pour afficher des conseils météo exploitables."
                  : "Choose a city to display actionable weather advice."}
              </SystemStateMeta>
            ) : null}

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {fr ? "Équipement recommandé" : "Recommended gear"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {equipment.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 shadow-sm"
                  >
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {fr ? "Checklist sécurité" : "Safety checklist"}
              </p>
              <ul className="mt-3 space-y-2.5">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                      <CheckCircle2 size={11} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </LightCard>
      </div>

      <div className="space-y-6">
        {isWeatherReady ? (
          <LightCard className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  {fr ? "Prévisions horaires" : "Hourly forecast"}
                </p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                  {fr ? "7 jours par heure" : "7 days, hourly"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {fr
                    ? "Chaque jour est déplié en prévisions horaires pour la météo réelle du lieu sélectionné."
                    : "Each day is expanded into hourly forecasts for the real weather of the selected place."}
                </p>
              </div>
              <CalendarDays size={18} className="text-slate-400" />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50/80 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-emerald-800/80">
                  {fr ? "Créneau conseillé" : "Suggested slot"}
                </p>
                <p className="mt-2 text-sm font-semibold text-emerald-950">
                  {recommendedWindows[0]
                    ? getCurrentWindowLabel(recommendedWindows[0].from, recommendedWindows[0].to, fr ? "fr" : "en")
                    : fr
                      ? "Aucun créneau favorable à ce stade"
                      : "No favorable slot yet"}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-800/80">
                  {fr ? "Vigilance météo" : "Weather vigilance"}
                </p>
                <p className="mt-2 text-sm font-semibold text-amber-950">
                  {currentRisk ? getVigilanceLabel(currentRisk.level, fr) : fr ? "Non disponible" : "Unavailable"}
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50/80 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-rose-800/80">
                  {fr ? "Report recommandé" : "Postpone recommended"}
                </p>
                <p className="mt-2 text-sm font-semibold text-rose-950">
                  {currentRisk ? getReportLabel(currentRisk.level, fr) : fr ? "Non disponible" : "Unavailable"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {forecastDays.map((day, index) => {
                const isActive = index === selectedForecastDayIndex;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedForecastDayIndex(index)}
                    className={cn(
                      "rounded-[1.25rem] border px-4 py-3 text-left transition-all",
                      isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                  >
                    <span className="block text-xs font-black uppercase tracking-[0.22em]">
                      {day.label}
                    </span>
                    <span className="mt-1 block text-sm font-semibold">
                      {Math.round(day.min)}° / {Math.round(day.max)}°
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 overflow-x-auto pb-3">
              <div className="flex min-w-max snap-x snap-mandatory gap-3 pr-2">
                {selectedDayHours.length > 0 ? (
                  selectedDayHours.map((point, index) => {
                    const weather = getForecastConditionLabel(point, index);
                    const Icon = weather.icon;
                    const precipTone =
                      point.precipitationProbability >= 70 || point.rain >= 3
                        ? "text-rose-700"
                        : point.precipitationProbability >= 35 || point.rain >= 0.8
                          ? "text-amber-700"
                          : "text-emerald-700";
                    const cardTone =
                      point.precipitationProbability >= 70 || point.rain >= 3
                        ? "border-rose-200 bg-rose-50/70"
                        : point.precipitationProbability >= 35 || point.rain >= 0.8
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-slate-200 bg-white";

                    return (
                      <div
                        key={point.time}
                        className={cn(
                          "w-[148px] shrink-0 snap-start rounded-[1.35rem] border p-3.5 text-left shadow-sm",
                          cardTone,
                        )}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {getForecastHourLabel(point.time)}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-amber-500 shadow-sm">
                            <Icon size={24} />
                          </div>
                          <p className="text-2xl font-black tracking-tight text-slate-900">
                            {Math.round(point.temperature)}°C
                          </p>
                        </div>
                        <p className="mt-3 text-sm font-semibold text-slate-700">{weather.label}</p>
                        <div className="mt-3 space-y-1.5 text-[11px] font-medium text-slate-500">
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              <Droplets size={12} className={precipTone} />
                              Pluie
                            </span>
                            <span className="font-semibold text-slate-700">
                              {Math.round(point.precipitationProbability)}%
                            </span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              <CloudRain size={12} className="text-sky-600" />
                              Pluie prévue
                            </span>
                            <span className="font-semibold text-slate-700">{point.rain.toFixed(1)} mm</span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5">
                              <Wind size={12} className="text-emerald-600" />
                              Vent
                            </span>
                            <span className="font-semibold text-slate-700">{Math.round(point.wind)} km/h</span>
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/5 pt-2 text-[10px] font-semibold text-slate-500">
                          <span>Hum. {Math.round(point.humidity)}%</span>
                          <span>UV {Math.round(point.uv)}</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                    {fr ? "Aucune heure disponible." : "No hourly data available."}
                  </div>
                )}
              </div>
            </div>
          </LightCard>
        ) : (
          <SystemStateLayout variant={weatherStatus === "error" ? "error" : weatherStatus === "loading" ? "loading" : "empty"} className="max-w-none">
            <SystemStateIcon variant={weatherStatus === "error" ? "error" : weatherStatus === "loading" ? "loading" : "empty"}>
              <weatherState.icon size={28} className={weatherState.variant === "loading" ? "animate-spin" : undefined} />
            </SystemStateIcon>
            <SystemStateTitle variant={weatherStatus === "error" ? "error" : weatherStatus === "loading" ? "loading" : "empty"}>
              {weatherState.title}
            </SystemStateTitle>
            <SystemStateDescription
              variant={weatherStatus === "error" ? "error" : weatherStatus === "loading" ? "loading" : "empty"}
            >
              {weatherState.description}
            </SystemStateDescription>
            <SystemStateMeta
              variant={weatherStatus === "error" ? "error" : weatherStatus === "loading" ? "loading" : "empty"}
              label={fr ? "Lieu sélectionné" : "Selected place"}
            >
              {selectedLocation.label}
              <div className="mt-2">{weatherState.meta}</div>
            </SystemStateMeta>
            {weatherState.action ? <SystemStateAction>{weatherState.action}</SystemStateAction> : null}
          </SystemStateLayout>
        )}

      </div>

      <div className="space-y-6">
        <LightCard className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
              <Truck size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {fr ? "Préparation & logistique" : "Preparation & logistics"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Avant le départ" : "Before departure"}
              </h3>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {[
              {
                title: fr ? "Matériel essentiel" : "Essential gear",
                description: isWeatherReady
                  ? currentRisk!.equipment.slice(0, 4).join(", ")
                  : fr
                    ? "Gants, sacs, pinces, eau"
                    : "Gloves, bags, pliers, water",
                icon: Package,
              },
              {
                title: fr ? "Hydratation" : "Hydration",
                description: fr
                  ? "Prévoir 1,5 L d'eau par personne minimum."
                  : "Bring at least 1.5 L of water per person.",
                icon: Droplets,
              },
              {
                title: fr ? "Durée estimée" : "Estimated duration",
                description: isWeatherReady
                  ? fr
                    ? `${getDurationLabel(currentRisk!.level)} selon la météo.`
                    : `${getDurationLabel(currentRisk!.level)} based on weather.`
                  : fr
                    ? "À ajuster dès que la météo est chargée."
                    : "Adjust once weather is loaded.",
                icon: CalendarDays,
              },
              {
                title: fr ? "Vigilance terrain" : "Field vigilance",
                description: isWeatherReady
                  ? currentRisk!.level === "vert"
                    ? fr
                      ? "Sol sec, peu de relief. Aucune vigilance particulière."
                      : "Dry ground, little relief. No special vigilance."
                    : currentRisk!.level === "orange"
                      ? fr
                        ? "Rester attentif aux rafales et aux surfaces glissantes."
                        : "Watch for gusts and slippery surfaces."
                      : fr
                        ? "Intervention courte, binômes et pauses impératives."
                        : "Short intervention, pairs and breaks required."
                  : fr
                    ? "Reste vigilant sur le terrain, même sans détail météo."
                    : "Stay vigilant on the ground, even without detailed weather.",
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.description}</p>
                  </div>
                  <CheckCircle2 size={18} className="ml-auto mt-1 shrink-0 text-emerald-600" />
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <Leaf size={20} className="mt-0.5 text-emerald-700" />
              <p className="leading-relaxed">
                {fr
                  ? "Bon à savoir : éviter les heures les plus chaudes pour préserver votre énergie et la biodiversité."
                  : "Good to know: avoid the hottest hours to preserve your energy and the biodiversity."}
              </p>
            </div>
          </div>
        </LightCard>

        <LightCard className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                {fr ? "Sécurité" : "Safety"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Ce qu’il ne faut pas toucher" : "What not to touch"}
              </h3>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {safetyConstraints.map((constraint) => (
              <li
                key={constraint}
                className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
              >
                <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <CheckCircle2 size={11} />
                </span>
                <span>{constraint}</span>
              </li>
            ))}
          </ul>
        </LightCard>
      </div>
    </div>
  );
}

export function WeatherSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pathname = usePathname();
  const pageFamily = resolvePageFamily(pathname);

  const weather = useWeatherData();
  const kit = useKitData(fr);

  const recommendedWindow = weather.windows.recommended[0] ?? null;

  return (
    <SectionShell
      id="weather"
      hideHeader
    >
      <div className="space-y-10 pt-12 text-slate-900">
        <div className="space-y-6">
          <PageHero
            family={pageFamily}
            align="center"
            title={fr ? "Organiser une action" : "Organize an action"}
            subtitle={
              fr
                ? "Consultez la météo réelle du lieu puis préparez le terrain pour décider du bon créneau d’action."
                : "Check the real weather for the location, then prepare the field to choose the right action slot."
            }
            className="max-w-xl"
          />

          <div className="max-w-xl text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700/80">
              {fr ? "Lieu sélectionné" : "Selected place"}
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
              {weather.selectedLocation.label}
            </p>
            <p className="mt-1 text-sm text-slate-500">{weather.selectedLocation.subtitle}</p>
          </div>

        </div>

        <div className="space-y-8">
          <motion.div variants={itemVariants}>
            <ConditionsPanel
              currentRisk={weather.currentRisk}
              weatherStatus={weather.weatherStatus}
              selectedLocation={weather.selectedLocation}
              locationQuery={weather.locationQuery}
              setLocationQuery={weather.setLocationQuery}
              locationSuggestions={weather.locationSuggestions}
              locationSuggestionsError={weather.locationSuggestionsError}
              isLocationSuggestionsLoading={weather.isLocationSuggestionsLoading}
              selectLocation={weather.selectLocation}
              forecastDays={weather.forecastDays}
              selectedForecastDayIndex={weather.selectedForecastDayIndex}
              setSelectedForecastDayIndex={weather.setSelectedForecastDayIndex}
              windows={weather.windows}
              fr={fr}
            />
          </motion.div>

          <motion.div variants={itemVariants}>
            <PreparationPanel
              currentRisk={weather.currentRisk}
              weatherStatus={weather.weatherStatus}
              selectedLocationLabel={weather.selectedLocation.label}
              selectedLocationSubtitle={weather.selectedLocation.subtitle}
              recommendedWindow={recommendedWindow}
              prepProgress={kit.kitProgress}
              packItems={kit.packItems}
              fr={fr}
            />
          </motion.div>
        </div>
      </div>
    </SectionShell>
  );
}

