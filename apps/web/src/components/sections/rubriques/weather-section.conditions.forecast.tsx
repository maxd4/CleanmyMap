"use client";

import { CalendarDays, CloudRain, Droplets, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WeatherForecastProps } from "./weather-section.conditions.types";
import {
  getCurrentWindowLabel,
  getForecastConditionLabel,
  getForecastHourLabel,
  getReportLabel,
  getVigilanceLabel,
} from "./weather-section.helpers";
import { LightCard } from "./weather-section.ui";

type ForecastDay = WeatherForecastProps["forecastDays"][number];
type ForecastPoint = ForecastDay["hours"][number];

function WeatherForecastSummary({
  currentRisk,
  recommendedWindows,
  fr,
}: {
  currentRisk: WeatherForecastProps["currentRisk"];
  recommendedWindows: WeatherForecastProps["windows"]["recommended"];
  fr: boolean;
}) {
  return (
    <div className="mt-5 grid gap-3 md:grid-cols-3">
      <div className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50/80 px-4 py-4">
        <p className="cmm-text-caption font-black uppercase tracking-[0.26em] text-emerald-800/80">{fr ? "Créneau favorable selon les données" : "Favorable slot based on the data"}</p>
        <p className="mt-2 text-sm font-semibold text-emerald-950">{recommendedWindows[0] ? getCurrentWindowLabel(recommendedWindows[0].from, recommendedWindows[0].to, fr ? "fr" : "en") : fr ? "Aucun créneau favorable à ce stade" : "No favorable slot yet"}</p>
      </div>
      <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50/80 px-4 py-4">
        <p className="cmm-text-caption font-black uppercase tracking-[0.26em] text-amber-800/80">{fr ? "Vigilance météo" : "Weather vigilance"}</p>
        <p className="mt-2 text-sm font-semibold text-amber-950">{currentRisk ? getVigilanceLabel(currentRisk.level, fr) : fr ? "Non disponible" : "Unavailable"}</p>
      </div>
      <div className="rounded-[1.35rem] border border-rose-200 bg-rose-50/80 px-4 py-4">
        <p className="cmm-text-caption font-black uppercase tracking-[0.26em] text-rose-800/80">{fr ? "Décision selon les conditions" : "Decision based on conditions"}</p>
        <p className="mt-2 text-sm font-semibold text-rose-950">{currentRisk ? getReportLabel(currentRisk.level, fr) : fr ? "Non disponible" : "Unavailable"}</p>
      </div>
    </div>
  );
}

function WeatherForecastDayButtons({
  forecastDays,
  selectedForecastDayIndex,
  setSelectedForecastDayIndex,
}: Pick<WeatherForecastProps, "forecastDays" | "selectedForecastDayIndex" | "setSelectedForecastDayIndex">) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      {forecastDays.map((day, index) => {
        const isActive = index === selectedForecastDayIndex;
        return (
          <button key={day.date} type="button" onClick={() => setSelectedForecastDayIndex(index)} className={cn("rounded-[1.25rem] border px-4 py-3 text-left transition-all", isActive ? "border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
            <span className="block text-xs font-black uppercase tracking-[0.22em]">{day.label}</span>
            <span className="mt-1 block text-sm font-semibold">{Math.round(day.min)}° / {Math.round(day.max)}°</span>
          </button>
        );
      })}
    </div>
  );
}

function WeatherForecastHourlyCards({ forecastHours, fr }: { forecastHours: ForecastPoint[]; fr: boolean }) {
  return (
    <div className="mt-6 overflow-x-auto pb-3">
      <div className="flex min-w-max snap-x snap-mandatory gap-3 pr-2">
        {forecastHours.length > 0 ? forecastHours.map((point, index) => <WeatherForecastHourCard key={point.time} point={point} index={index} />) : <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">{fr ? "Aucune heure disponible." : "No hourly data available."}</div>}
      </div>
    </div>
  );
}

function WeatherForecastHourCard({ point, index }: { point: ForecastPoint; index: number }) {
  const weather = getForecastConditionLabel(point, index);
  const Icon = weather.icon;
  const isHeavyWeather = point.precipitationProbability >= 70 || point.rain >= 3;
  const isModerateWeather = point.precipitationProbability >= 35 || point.rain >= 0.8;
  const precipTone = isHeavyWeather ? "text-rose-700" : isModerateWeather ? "text-amber-700" : "text-emerald-700";
  const cardTone = isHeavyWeather ? "border-rose-200 bg-rose-50/70" : isModerateWeather ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-white";

  return (
    <div className={cn("w-[148px] shrink-0 snap-start rounded-[1.35rem] border p-3.5 text-left shadow-sm", cardTone)}>
      <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-slate-500">{getForecastHourLabel(point.time)}</p>
      <div className="mt-3 flex items-center justify-between gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-amber-500 shadow-sm"><Icon size={24} /></div><p className="text-2xl font-black tracking-tight text-slate-900">{Math.round(point.temperature)}°C</p></div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{weather.label}</p>
      <div className="mt-3 space-y-1.5 cmm-text-small font-medium text-slate-500">
        <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><Droplets size={12} className={precipTone} />Pluie</span><span className="font-semibold text-slate-700">{Math.round(point.precipitationProbability)}%</span></span>
        <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><CloudRain size={12} className="text-sky-600" />Pluie prévue</span><span className="font-semibold text-slate-700">{point.rain.toFixed(1)} mm</span></span>
        <span className="flex items-center justify-between gap-2"><span className="flex items-center gap-1.5"><Wind size={12} className="text-emerald-600" />Vent</span><span className="font-semibold text-slate-700">{Math.round(point.wind)} km/h</span></span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-black/5 pt-2 cmm-text-caption font-semibold text-slate-500"><span>Hum. {Math.round(point.humidity)}%</span><span>UV {Math.round(point.uv)}</span></div>
    </div>
  );
}

export function WeatherForecasts({
  currentRisk,
  weatherStatus,
  forecastDays,
  selectedForecastDayIndex,
  setSelectedForecastDayIndex,
  windows,
  fr,
}: WeatherForecastProps) {
  const isWeatherReady = weatherStatus === "ready" && currentRisk !== null;
  if (!isWeatherReady) return null;
  const selectedDay = forecastDays[selectedForecastDayIndex] ?? forecastDays[0] ?? null;

  return (
    <LightCard className="p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Prévisions horaires" : "Hourly forecast"}</p><h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">{fr ? "7 jours par heure" : "7 days, hourly"}</h3><p className="cmm-text-body mt-2">{fr ? "Chaque jour est déplié en prévisions horaires pour la météo réelle du lieu sélectionné." : "Each day is expanded into hourly forecasts for the real weather of the selected place."}</p></div><CalendarDays size={18} className="text-slate-400" /></div>
      <WeatherForecastSummary currentRisk={currentRisk} recommendedWindows={windows.recommended.slice(0, 3)} fr={fr} />
      <WeatherForecastDayButtons forecastDays={forecastDays} selectedForecastDayIndex={selectedForecastDayIndex} setSelectedForecastDayIndex={setSelectedForecastDayIndex} />
      <WeatherForecastHourlyCards forecastHours={selectedDay?.hours.slice(0, 24) ?? []} fr={fr} />
    </LightCard>
  );
}
