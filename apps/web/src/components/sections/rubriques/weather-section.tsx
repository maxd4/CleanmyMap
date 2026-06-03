"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CloudRain,
  CloudSun,
  Droplets,
  Leaf,
  MapPin,
  Moon,
  Package,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Thermometer,
  Truck,
  Wind,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { formatDateTimeShort } from "@/components/sections/rubriques/helpers";
import { PageHero } from "@/components/ui/page-hero";
import { GuideOperationalPanel } from "./guide-section";
import { useWeatherData } from "./use-weather-data";
import { useKitData } from "./use-kit-data";
import { WeatherTabs } from "./weather-components";
import { resolvePageFamily } from "@/lib/ui/page-families";
import { cn } from "@/lib/utils";

type WeatherSectionTab = "conditions" | "preparation" | "protocol";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

function normalizeWeatherTab(value: string | null): WeatherSectionTab {
  if (value === "conditions" || value === "preparation" || value === "protocol") {
    return value;
  }

  if (value === "weather") {
    return "conditions";
  }

  if (value === "kit") {
    return "preparation";
  }

  if (value === "guide") {
    return "protocol";
  }

  return "conditions";
}

function getVolunteersRange(level: "vert" | "orange" | "rouge"): string {
  if (level === "rouge") return "2-4";
  if (level === "orange") return "3-6";
  return "4-8";
}

function getDurationLabel(level: "vert" | "orange" | "rouge"): string {
  if (level === "rouge") return "45 min max";
  if (level === "orange") return "60-90 min";
  return "90-120 min";
}

function getUvLabel(uv: number): string {
  if (uv >= 8) return "très fort";
  if (uv >= 6) return "fort";
  if (uv >= 3) return "modéré";
  return "faible";
}

function getHumidityLabel(humidity: number): string {
  if (humidity >= 75) return "humide";
  if (humidity >= 45) return "confortable";
  return "sec";
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

function getWindowDurationLabel(from: string, to: string): string {
  const minutes = Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} h ${String(mins).padStart(2, "0")}`;
}

function getForecastHourLabel(time: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  }).format(new Date(time));
}

function getForecastConditionLabel(
  point: { time: string; temperature: number; rain: number; wind: number },
  index: number,
): { label: string; icon: typeof SunMedium } {
  const hour = new Date(point.time).getHours();

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

function HeroStat({
  icon: Icon,
  value,
  label,
  tone = "emerald",
}: {
  icon: typeof Thermometer;
  value: string;
  label: string;
  tone?: "emerald" | "blue" | "sky" | "amber";
}) {
  const toneStyles = {
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    blue: "text-sky-700 bg-sky-50 border-sky-200",
    sky: "text-cyan-700 bg-cyan-50 border-cyan-200",
    amber: "text-amber-700 bg-amber-50 border-amber-200",
  } as const;

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl border", toneStyles[tone])}>
          <Icon size={18} />
        </span>
        <div>
          <p className="text-[1.45rem] font-black leading-none text-slate-900">{value}</p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function WeatherHeroCard({
  weatherData,
  currentRisk,
  selectedZoneLabel,
  fr,
}: {
  weatherData: ReturnType<typeof useWeatherData>["data"];
  currentRisk: ReturnType<typeof useWeatherData>["currentRisk"];
  selectedZoneLabel: string;
  fr: boolean;
}) {
  const temperature = Number(weatherData?.current?.temperature_2m ?? 0);
  const wind = Number(weatherData?.current?.wind_speed_10m ?? 0);
  const humidity = Number(weatherData?.current?.relative_humidity_2m ?? 0);
  const uv = Number(weatherData?.current?.uv_index ?? 0);

  const title =
    currentRisk.level === "rouge"
      ? fr
        ? "Conditions à éviter"
        : "Conditions to avoid"
      : currentRisk.level === "orange"
        ? fr
          ? "Conditions à surveiller"
          : "Conditions to watch"
        : fr
          ? "Conditions favorables"
          : "Favorable conditions";

  const tone =
    currentRisk.level === "rouge"
      ? "rose"
      : currentRisk.level === "orange"
        ? "amber"
        : "emerald";

  return (
    <LightCard className="min-h-[255px] border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,251,240,0.98)_0%,rgba(255,255,255,0.99)_100%)]">
      <div className="relative flex h-full flex-col justify-between p-8 lg:p-9">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.06),transparent_38%)]" />
        <div className="pointer-events-none absolute -right-6 top-6 h-24 w-24 rounded-full bg-amber-300/35 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-44 w-96 overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-24 rounded-tl-[4rem] bg-emerald-200/50 blur-[1px]" />
          <div className="absolute bottom-2 right-8 h-16 w-16 rounded-full bg-emerald-500/30 blur-2xl" />
          <div className="absolute bottom-0 right-16 h-10 w-10 rounded-full bg-emerald-600/20 blur-xl" />
          <div className="absolute bottom-8 right-20 h-24 w-24 rounded-full bg-emerald-300/60" />
          <div className="absolute bottom-8 right-5 h-16 w-16 rounded-full bg-lime-300/55" />
          <div className="absolute bottom-0 right-0 h-28 w-36 rounded-tl-[100%] bg-emerald-400/60" />
          <div className="absolute bottom-8 right-36 flex items-end gap-2">
            <span className="h-8 w-2 rounded-full bg-emerald-700/35" />
            <span className="h-10 w-2 rounded-full bg-emerald-700/25" />
            <span className="h-7 w-2 rounded-full bg-emerald-700/30" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-sm font-semibold text-slate-700">
              {fr ? "Prévisions terrain" : "Field forecast"} - {selectedZoneLabel}
            </p>
            <h2
              className={cn(
                "text-3xl font-black tracking-tight lg:text-[2.55rem]",
                tone === "rose"
                  ? "text-rose-700"
                  : tone === "amber"
                    ? "text-amber-700"
                    : "text-emerald-700",
              )}
            >
              {title}
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-slate-600 lg:text-base">
              {fr
                ? "Conditions météo stables et sûres pour votre cleanwalk."
                : "Stable and safe weather conditions for your cleanwalk."}
            </p>
          </div>

          <div
            className={cn(
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border shadow-[0_16px_40px_rgba(16,185,129,0.12)]",
              tone === "rose"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : tone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
            )}
          >
            <ShieldCheck size={30} />
          </div>
        </div>

        <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <HeroStat icon={Thermometer} value={`${Math.round(temperature)}°C`} label={fr ? "Température" : "Temperature"} />
          <HeroStat icon={Wind} value={`${Math.round(wind)} km/h`} label={fr ? "Vent léger" : "Light wind"} tone="emerald" />
          <HeroStat icon={Droplets} value={`${Math.round(humidity)}%`} label={fr ? `Humidité ${getHumidityLabel(humidity)}` : "Humidity"} tone="sky" />
          <HeroStat icon={SunMedium} value={`UV ${Math.round(uv)}`} label={fr ? getUvLabel(uv) : "UV index"} tone="amber" />
        </div>
      </div>
    </LightCard>
  );
}

function ConditionsPanel({
  currentRisk,
  weatherData,
  selectedZone,
  setZoneMode,
  setManualZoneId,
  zoneMode,
  nowcasting,
  windows,
  fr,
}: {
  currentRisk: ReturnType<typeof useWeatherData>["currentRisk"];
  weatherData: ReturnType<typeof useWeatherData>["data"];
  selectedZone: ReturnType<typeof useWeatherData>["selectedZone"];
  setZoneMode: (mode: "auto" | "manual") => void;
  setManualZoneId: (id: string) => void;
  zoneMode: "auto" | "manual";
  nowcasting: ReturnType<typeof useWeatherData>["nowcasting"];
  windows: ReturnType<typeof useWeatherData>["windows"];
  fr: boolean;
}) {
  const checklist = [
    fr ? "Informer son binôme" : "Tell your buddy",
    fr ? "Prévoir 1,5 L d’eau minimum" : "Bring at least 1.5 L of water",
    fr ? "Pauses toutes les 60 min" : "Breaks every 60 min",
    fr ? "Vérifier la météo avant le départ" : "Check the weather before leaving",
    fr ? "Trousse de premiers secours" : "First-aid kit",
    fr ? "Brief sécurité initial" : "Initial safety briefing",
  ];

  const equipment = currentRisk.equipment.slice(0, 4);
  const recommendedWindows = windows.recommended.slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.48fr_1fr]">
      <div className="space-y-6">
        <LightCard className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
              <MapPin size={18} />
            </span>
            <div>
              <h3 className="text-lg font-black tracking-tight text-slate-900">
                {fr ? "Périmètre géo" : "Geo perimeter"}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">
                {fr ? "Configuration zone" : "Zone configuration"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-slate-900">{selectedZone.label}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    {fr ? "Zone sélectionnée" : "Selected zone"}
                  </p>
                </div>
                <ChevronRight size={18} className="mt-1 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {selectedZone.coveredAreas.length > 0
                  ? `${fr ? "Secteurs couverts" : "Covered areas"}: ${selectedZone.coveredAreas.join(", ")}`
                  : fr
                    ? "Zone détectée automatiquement"
                    : "Automatically detected zone"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setZoneMode("auto")}
                className={cn(
                  "rounded-[1.25rem] border px-4 py-3 text-sm font-semibold transition-all",
                  zoneMode === "auto"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {fr ? "Auto-détection" : "Auto-detect"}
              </button>
              <button
                type="button"
                onClick={() => setZoneMode("manual")}
                className={cn(
                  "rounded-[1.25rem] border px-4 py-3 text-sm font-semibold transition-all",
                  zoneMode === "manual"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                )}
              >
                {fr ? "Saisie manuelle" : "Manual entry"}
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedZone.id}
                onChange={(event) => setManualZoneId(event.target.value)}
                disabled={zoneMode === "auto"}
                className="w-full appearance-none rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {selectedZone.coveredAreas.length === 0 && (
                  <option value={selectedZone.id}>{selectedZone.label}</option>
                )}
                {[
                  "centre",
                  "nord",
                  "est",
                  "sud",
                  "ouest",
                ].map((zoneId) => (
                  <option key={zoneId} value={zoneId}>
                    {zoneId === "centre"
                      ? "Paris centre"
                      : zoneId === "nord"
                        ? "Paris nord"
                        : zoneId === "est"
                          ? "Paris est"
                          : zoneId === "sud"
                            ? "Paris sud"
                            : "Paris ouest"}
                  </option>
                ))}
              </select>
              <MapPin
                size={14}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
              {fr
                ? "La zone est détectée automatiquement à votre position."
                : "The zone is detected automatically from your position."}
            </div>
          </div>
        </LightCard>

        <LightCard className="border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,251,240,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <ShieldCheck size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700">
                {fr ? "Recommandations" : "Recommendations"}
              </p>
              <h3 className="text-xl font-black tracking-tight text-emerald-800">
                {fr ? "Conditions météo stables" : "Stable weather conditions"}
              </h3>
            </div>
          </div>

          <div className="mt-6 space-y-5">
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
        <LightCard className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {fr ? "Prévisions horaires" : "Hourly forecast"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Prochaines heures" : "Next hours"}
              </h3>
            </div>
            <CalendarDays size={18} className="text-slate-400" />
          </div>

          <div className="relative mt-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {nowcasting.slice(0, 6).map((point, index) => {
                const weather = getForecastConditionLabel(point, index);
                const Icon = weather.icon;

                return (
                  <div
                    key={point.time}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-4 text-center shadow-sm"
                  >
                    <p className="text-sm font-semibold text-slate-500">{getForecastHourLabel(point.time)}</p>
                    <div className="mt-4 flex h-14 items-center justify-center text-amber-500">
                      <Icon size={34} />
                    </div>
                    <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
                      {Math.round(point.temperature)}°C
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{weather.label}</p>
                    <div className="mt-4 flex items-center justify-center gap-3 text-[11px] font-medium text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Wind size={12} className="text-emerald-600" />
                        {Math.round(point.wind)} km/h
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Droplets size={12} className="text-sky-600" />
                        {Math.max(0, Math.round(point.rain * 10))}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="absolute -right-2 top-1/2 hidden -translate-y-1/2 xl:flex">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-lg shadow-emerald-500/10"
                aria-label={fr ? "Voir plus d'heures" : "See more hours"}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </LightCard>

        <LightCard className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {fr ? "Fenêtres d’action optimales" : "Best action windows"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Prochaines fenêtres" : "Upcoming windows"}
              </h3>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {recommendedWindows.length > 0 ? (
              recommendedWindows.map((window) => {
                const isGood = window.level !== "rouge";

                return (
                  <div
                    key={`${window.from}-${window.to}`}
                    className="grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[1fr_auto]"
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={cn(
                          "hidden h-16 w-1.5 rounded-full xl:block",
                          isGood ? "bg-emerald-600" : "bg-rose-500",
                        )}
                      />
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <CalendarDays size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-black text-slate-900">
                          {getCurrentWindowLabel(window.from, window.to, fr ? "fr" : "en")}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {getWindowDurationLabel(window.from, window.to)}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Thermometer size={12} className="text-slate-500" />
                            {Math.round(Number(weatherData?.current?.temperature_2m ?? 0))}°C
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Wind size={12} className="text-emerald-600" />
                            {Math.round(Number(weatherData?.current?.wind_speed_10m ?? 0))} km/h
                          </span>
                          <span className="flex items-center gap-1.5">
                            <SunMedium size={12} className="text-amber-500" />
                            UV {Math.round(Number(weatherData?.current?.uv_index ?? 0))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 xl:flex-col xl:items-end xl:justify-center">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                        {fr ? "Fenêtre favorable" : "Favorable window"}
                      </span>
                      <button
                        type="button"
                        className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:-translate-y-0.5"
                      >
                        <Sparkles size={15} />
                        {fr ? "Planifier" : "Plan"}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                {fr ? "Aucune fenêtre claire détectée." : "No clear window detected."}
              </div>
            )}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 px-5 py-4 text-sm text-slate-600">
            <div className="flex items-start gap-3">
              <Leaf size={20} className="mt-0.5 text-emerald-700" />
              <p className="leading-relaxed">
                {fr
                  ? "Ces fenêtres offrent les meilleures conditions pour agir en toute sécurité et limiter votre impact environnemental."
                  : "These windows offer the best conditions to act safely and limit your environmental impact."}
              </p>
            </div>
          </div>
        </LightCard>
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
                description: fr
                  ? `${currentRisk.equipment.slice(0, 4).join(", ")}.`
                  : `${currentRisk.equipment.slice(0, 4).join(", ")}.`,
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
                description: fr
                  ? `${getDurationLabel(currentRisk.level)} selon la zone.`
                  : `${getDurationLabel(currentRisk.level)} depending on the area.`,
                icon: CalendarDays,
              },
              {
                title: fr ? "Vigilance terrain" : "Field vigilance",
                description:
                  currentRisk.level === "vert"
                    ? fr
                      ? "Sol sec, peu de relief. Aucune vigilance particulière."
                      : "Dry ground, little relief. No special vigilance."
                    : currentRisk.level === "orange"
                      ? fr
                        ? "Rester attentif aux rafales et aux surfaces glissantes."
                        : "Watch for gusts and slippery surfaces."
                      : fr
                        ? "Intervention courte, binômes et pauses impératives."
                        : "Short intervention, pairs and breaks required.",
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
            {currentRisk.constraints.map((constraint) => (
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

function PreparationPanel({
  currentRisk,
  selectedZoneLabel,
  selectedZoneAreas,
  recommendedWindow,
  prepProgress,
  packItems,
  fr,
}: {
  currentRisk: ReturnType<typeof useWeatherData>["currentRisk"];
  selectedZoneLabel: string;
  selectedZoneAreas: string[];
  recommendedWindow: { from: string; to: string } | null;
  prepProgress: number;
  packItems: string[];
  fr: boolean;
}) {
  const data = [
    {
      label: fr ? "Matériel conseillé" : "Recommended gear",
      value: currentRisk.equipment.join(" • "),
      tone: "emerald",
    },
    {
      label: fr ? "Nombre de bénévoles" : "Number of volunteers",
      value: getVolunteersRange(currentRisk.level),
      note: fr ? "fourchette recommandée" : "recommended range",
      tone: "amber",
    },
    {
      label: fr ? "Durée prévue" : "Planned duration",
      value: getDurationLabel(currentRisk.level),
      note: fr ? "selon météo et sécurité" : "based on weather and safety",
      tone: "blue",
    },
    {
      label: fr ? "Accessibilité" : "Accessibility",
      value: selectedZoneAreas.length > 0 ? selectedZoneAreas.join(", ") : selectedZoneLabel,
      note: fr ? "zone ciblée et accès terrain" : "target zone and field access",
      tone: "sky",
    },
    {
      label: fr ? "Sécurité" : "Safety",
      value: currentRisk.constraints.join(" • "),
      note: fr ? "priorité aux binômes et aux pauses" : "pairs and breaks first",
      tone: "rose",
    },
    {
      label: fr ? "Zone ciblée" : "Target zone",
      value: selectedZoneLabel,
      note: recommendedWindow
        ? `${fr ? "créneau conseillé" : "recommended slot"}: ${getCurrentWindowLabel(recommendedWindow.from, recommendedWindow.to, fr ? "fr" : "en")}`
        : fr
          ? "pas de créneau solide"
          : "no solid slot",
      tone: "cyan",
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.1fr_0.95fr]">
      <LightCard className="border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,248,234,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
            <Package size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">
              {fr ? "Kit terrain" : "Field kit"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {fr ? "Quoi emporter ?" : "What to bring?"}
            </h3>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {fr ? "Progression du kit" : "Kit progress"}
            </p>
            <p className="text-3xl font-black tracking-tight text-amber-700">{prepProgress}%</p>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-amber-100">
            <div className="h-full rounded-full bg-amber-600" style={{ width: `${prepProgress}%` }} />
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          {packItems.map((item) => (
            <div
              key={item}
              className="rounded-[1.15rem] border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
            >
              {item}
            </div>
          ))}
        </div>
      </LightCard>

      <LightCard className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
            <CalendarDays size={18} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              {fr ? "Préparation terrain" : "Field preparation"}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
              {fr ? "Avant l’action" : "Before the action"}
            </h3>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {data.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">
                {item.value}
              </p>
              {"note" in item && (
                <p className="mt-1 text-xs font-medium text-slate-500">{item.note}</p>
              )}
            </div>
          ))}
        </div>
      </LightCard>

      <LightCard className="border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,251,240,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-6">
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

        <div className="mt-6 space-y-3">
          {currentRisk.constraints.map((constraint) => (
            <div
              key={constraint}
              className="flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
            >
              <span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                <CheckCircle2 size={11} />
              </span>
              <span>{constraint}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-[1.35rem] border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <Leaf size={18} className="mt-0.5 text-emerald-700" />
            <p className="leading-relaxed">
              {fr
                ? "Gardez un rythme simple, des pauses régulières et des binômes."
                : "Keep a simple pace, regular breaks and pairs."}
            </p>
          </div>
        </div>
      </LightCard>
    </div>
  );
}

export function WeatherSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageFamily = resolvePageFamily(pathname);

  const activeTab = normalizeWeatherTab(searchParams.get("tab"));

  const weather = useWeatherData();
  const kit = useKitData(activeTab, fr);

  function handleTabChange(tab: WeatherSectionTab): void {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "conditions") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const recommendedWindow = weather.windows.recommended[0] ?? null;

  return (
    <SectionShell
      id="weather"
      hideHeader
    >
      <div className="space-y-10 pt-12 text-slate-900">
        <div className="grid gap-8 xl:grid-cols-[1.02fr_1.55fr]">
          <div className="space-y-6">
            <PageHero
              family={pageFamily}
              align="center"
              title={fr ? "Météo & Logistique" : "Weather & Logistics"}
              subtitle={
                fr
                  ? "Anticipez les conditions et préparez votre équipement pour une action sécurisée et réussie."
                  : "Anticipate the conditions and prepare your equipment for a safe and successful action."
              }
              className="max-w-xl"
            />

            <div className="max-w-xl">
              <WeatherTabs
                activeTab={activeTab}
                setActiveTab={handleTabChange}
                fr={fr}
              />
            </div>
          </div>

          <WeatherHeroCard
            weatherData={weather.data}
            currentRisk={weather.currentRisk}
            selectedZoneLabel={weather.selectedZone.label}
            fr={fr}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="min-h-[600px]"
          >
            {activeTab === "conditions" ? (
              <motion.div variants={itemVariants}>
                <ConditionsPanel
                  currentRisk={weather.currentRisk}
                  weatherData={weather.data}
                  selectedZone={weather.selectedZone}
                  setZoneMode={weather.setZoneMode}
                  setManualZoneId={weather.setManualZoneId}
                  zoneMode={weather.zoneMode}
                  nowcasting={weather.nowcasting}
                  windows={weather.windows}
                  fr={fr}
                />
              </motion.div>
            ) : activeTab === "preparation" ? (
              <motion.div variants={itemVariants}>
                <PreparationPanel
                  currentRisk={weather.currentRisk}
                  selectedZoneLabel={weather.selectedZone.label}
                  selectedZoneAreas={weather.selectedZone.coveredAreas}
                  recommendedWindow={recommendedWindow}
                  prepProgress={kit.kitProgress}
                  packItems={kit.packItems}
                  fr={fr}
                />
              </motion.div>
            ) : (
              <motion.div variants={itemVariants}>
                <GuideOperationalPanel />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </SectionShell>
  );
}
