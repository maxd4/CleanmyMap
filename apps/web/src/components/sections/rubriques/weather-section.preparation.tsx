"use client";

import { CalendarDays, CheckCircle2, CloudRain, MapPin, Thermometer, TriangleAlert, Wind } from "lucide-react";
import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { ActionPreparationContext, PreparationSelection } from "@/lib/actions/action-preparation-context";
import type { resolvePreparationSelection } from "@/lib/actions/action-preparation-context";
import { ACTION_PREPARATION_CHECKLIST_DEFAULTS, type ActionPreparationChecklistItem } from "@/lib/actions/preparation-contract";
import type { useWeatherData } from "./use-weather-data";
import { WeatherLocationPicker } from "./weather-location-picker";
import { getCurrentWindowLabel, getForecastLocalClockTime, getVigilanceLabel, getWeatherStateCopy } from "./weather-section.helpers";
import { PreparationChecklist, PreparationMaterials, type PreparationContextUpdate } from "./weather-section.preparation-controls";

type WeatherData = ReturnType<typeof useWeatherData>;

function copyChecklist(context: ActionPreparationContext | undefined): ActionPreparationChecklistItem[] {
  return (context?.preparationChecklist ?? ACTION_PREPARATION_CHECKLIST_DEFAULTS).map((item) => ({ ...item }));
}

function formatMetric(value: number | null | undefined, suffix = ""): string {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}${suffix}` : "—";
}

export function PreparationLocationBlock({
  actionLocation,
  actionDate,
  weather,
  fr,
}: {
  actionLocation: string;
  actionDate: string;
  weather: Pick<WeatherData, "weatherStatus" | "locationResolution" | "selectedLocation" | "locationQuery" | "setLocationQuery" | "locationSuggestions" | "locationSuggestionsError" | "isLocationSuggestionsLoading" | "selectLocation">;
  fr: boolean;
}) {
  const weatherState = getWeatherStateCopy({
    weatherStatus: weather.weatherStatus,
    locationResolution: weather.locationResolution,
    selectedZoneLabel: weather.selectedLocation.label,
    fr,
  });
  const StateIcon = weatherState.icon;
  const locationDiffers = Boolean(actionLocation && weather.selectedLocation.label && actionLocation.toLocaleLowerCase() !== weather.selectedLocation.label.toLocaleLowerCase());

  return (
    <CmmCard tone="emerald" variant="outlined" size="md" className="space-y-4" data-testid="preparation-location-block">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MapPin size={18} aria-hidden="true" /></span>
        <div><h3 className="text-lg font-black text-emerald-950">{fr ? "Lieu et date" : "Place and date"}</h3><p className="mt-1 cmm-text-body cmm-text-primary">{fr ? "La météo est analysée pour le lieu affiché. Changez-le ici si nécessaire." : "Weather is analyzed for the displayed place. Change it here if needed."}</p></div>
      </div>
      <WeatherLocationPicker
        query={weather.locationQuery}
        onQueryChange={weather.setLocationQuery}
        suggestions={weather.locationSuggestions}
        isLoading={weather.isLocationSuggestionsLoading}
        errorMessage={weather.locationSuggestionsError ? (fr ? "La recherche de lieux est momentanément indisponible." : "Place search is temporarily unavailable.") : null}
        selectedLocation={weather.selectedLocation}
        onSelectLocation={weather.selectLocation}
        label={fr ? "Rechercher ou changer le lieu" : "Search or change the place"}
        currentLocationLabel={fr ? "Lieu analysé" : "Analyzed place"}
        helperText={fr ? "Sélectionnez une commune ou un lieu géocodé pour obtenir une prévision associée." : "Select a geocoded town or place to obtain an associated forecast."}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"><p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-slate-500">{fr ? "Date de l’action" : "Action date"}</p><p className="mt-1 text-sm font-bold text-slate-900">{actionDate || (fr ? "À préciser dans le pré-formulaire" : "To be specified in the pre-form")}</p></div>
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700" role={weatherState.variant === "error" ? "alert" : undefined}><StateIcon size={16} className={weatherState.variant === "loading" ? "mt-0.5 animate-spin text-emerald-600" : "mt-0.5 text-emerald-700"} aria-hidden="true" /><span><strong className="font-bold text-slate-900">{weatherState.title}</strong><span className="mt-0.5 block text-xs text-slate-600">{weatherState.description}</span></span></div>
      </div>
      {locationDiffers ? <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">{fr ? `Lieu météo différent du lieu de l’action : « ${weather.selectedLocation.label} » au lieu de « ${actionLocation} ».` : `Weather place differs from the action place: “${weather.selectedLocation.label}” instead of “${actionLocation}”.`}</p> : null}
    </CmmCard>
  );
}

function ForecastDayButtons({
  forecastDays,
  selectedForecastDayIndex,
  setSelectedForecastDayIndex,
}: Pick<WeatherData, "forecastDays" | "selectedForecastDayIndex" | "setSelectedForecastDayIndex">) {
  return <div className="flex flex-wrap gap-2" aria-label="Jours de prévision">{forecastDays.map((day, index) => <button key={day.date} type="button" aria-pressed={index === selectedForecastDayIndex} onClick={() => setSelectedForecastDayIndex(index)} className={`rounded-xl border px-3 py-2 text-left text-sm ${index === selectedForecastDayIndex ? "border-emerald-500 bg-emerald-50 font-bold text-emerald-950" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300"}`}><span className="block font-semibold">{day.label}</span><span className="text-xs text-slate-500">{formatMetric(day.min, "°")} / {formatMetric(day.max, "°")}</span></button>)}</div>;
}

function ForecastSelectionActions({
  selectedDay,
  recommendedWindow,
  onPreparationSelection,
  fr,
}: {
  selectedDay: WeatherData["selectedForecastDay"];
  recommendedWindow: WeatherData["windows"]["recommended"][number] | null;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  fr: boolean;
}) {
  const [pendingSelection, setPendingSelection] = useState<PreparationSelection | null>(null);
  if (!selectedDay || !onPreparationSelection) return null;
  const applySelection = (selection: PreparationSelection) => {
    const result = onPreparationSelection(selection);
    if (result?.status === "conflict") setPendingSelection(selection);
    else setPendingSelection(null);
  };
  const departureTime = recommendedWindow ? getForecastLocalClockTime(recommendedWindow.from) : null;

  return <div className="space-y-3"><p className="text-sm text-slate-700">{fr ? "La consultation ne modifie pas l’action. Confirmez le report souhaité." : "Consulting the forecast does not change the action. Confirm what to carry over."}</p><div className="flex flex-wrap gap-2"><CmmButton type="button" size="sm" tone="secondary" variant="pill" onClick={() => applySelection({ actionDate: selectedDay.date, source: "weather-date" })}>{fr ? "Utiliser cette date" : "Use this date"}</CmmButton>{departureTime ? <CmmButton type="button" size="sm" tone="primary" variant="pill" onClick={() => applySelection({ actionDate: selectedDay.date, departureTime, source: "weather-slot" })}>{fr ? "Retenir ce créneau" : "Keep this slot"}</CmmButton> : null}</div>{pendingSelection ? <div role="alert" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p>{fr ? "Une date ou une heure est déjà renseignée. Que souhaitez-vous conserver ?" : "A date or time is already entered. What would you like to keep?"}</p><div className="flex flex-wrap gap-2"><CmmButton type="button" size="sm" tone="tertiary" variant="pill" onClick={() => { onPreparationSelection(pendingSelection, "preserve"); setPendingSelection(null); }}>{fr ? "Garder la saisie" : "Keep existing value"}</CmmButton><CmmButton type="button" size="sm" tone="primary" variant="pill" onClick={() => { onPreparationSelection(pendingSelection, "replace"); setPendingSelection(null); }}>{fr ? "Utiliser le choix météo" : "Use weather choice"}</CmmButton></div></div> : null}</div>;
}

function getSelectedRiskLabel(weather: Pick<WeatherData, "forecastSelectionStatus" | "selectedForecastRisk">, fr: boolean): string {
  if (weather.forecastSelectionStatus === "unavailable") return fr ? "Prévision indisponible pour cette date" : "Forecast unavailable for this date";
  if (weather.selectedForecastRisk) return getVigilanceLabel(weather.selectedForecastRisk.level, fr);
  return fr ? "Non disponible" : "Unavailable";
}

function ForecastMetrics({ selectedDay, riskLabel, fr }: { selectedDay: WeatherData["selectedForecastDay"]; riskLabel: string; fr: boolean }) {
  return <div className="grid gap-2 sm:grid-cols-4"><Metric icon={Thermometer} label={fr ? "Température" : "Temperature"} value={selectedDay ? `${formatMetric(selectedDay.min, "°")} / ${formatMetric(selectedDay.max, "°")}` : "—"} /><Metric icon={CloudRain} label={fr ? "Pluie prévue" : "Expected rain"} value={selectedDay ? formatMetric(selectedDay.rain, " mm") : "—"} /><Metric icon={Wind} label={fr ? "Vent maximal" : "Maximum wind"} value={selectedDay ? formatMetric(selectedDay.wind, " km/h") : "—"} /><Metric icon={TriangleAlert} label={fr ? "Vigilance du jour" : "Selected-day vigilance"} value={riskLabel} /></div>;
}

function CurrentWeatherNote({ currentRisk, selectedDay, actionDate, fr }: { currentRisk: WeatherData["currentRisk"]; selectedDay: WeatherData["selectedForecastDay"]; actionDate: string; fr: boolean }) {
  const context = selectedDay
    ? (fr ? `Prévision consultée : ${selectedDay.label}.` : `Forecast viewed: ${selectedDay.label}.`)
    : actionDate
      ? (fr ? "La date de l’action dépasse l’horizon prévisionnel ou reste indisponible." : "The action date is beyond the forecast horizon or unavailable.")
      : (fr ? "Aucune date de prévision sélectionnée." : "No forecast date selected.");
  return <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm"><p className="font-semibold text-slate-900">{fr ? "Météo actuelle" : "Current weather"}: <span className="font-normal">{currentRisk ? getVigilanceLabel(currentRisk.level, fr) : (fr ? "Non disponible" : "Unavailable")}</span></p><p className="mt-1 text-xs text-slate-600">{context}</p></div>;
}

function RecommendedWindowNote({ window, fr }: { window: WeatherData["windows"]["recommended"][number] | null; fr: boolean }) {
  if (!window) return null;
  return <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-950"><span className="block cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-700">{fr ? "Créneau favorable selon les heures disponibles" : "Favorable slot from available hours"}</span><span className="mt-1 block">{getCurrentWindowLabel(window.from, window.to, fr ? "fr" : "en")}</span></div>;
}

export function PreparationForecastBlock({
  weather,
  actionDate,
  onPreparationSelection,
  fr,
}: {
  weather: Pick<WeatherData, "weatherStatus" | "currentRisk" | "selectedForecastRisk" | "forecastDays" | "forecastSelectionStatus" | "selectedForecastDay" | "selectedForecastDayIndex" | "setSelectedForecastDayIndex" | "windows">;
  actionDate: string;
  onPreparationSelection?: (selection: PreparationSelection, decision?: "ask" | "replace" | "preserve") => ReturnType<typeof resolvePreparationSelection>;
  fr: boolean;
}) {
  const selectedDay = weather.selectedForecastDay;
  const recommendedWindow = weather.windows.recommended[0] ?? null;
  const selectedRiskLabel = getSelectedRiskLabel(weather, fr);

  return (
    <CmmCard tone="emerald" variant="outlined" size="md" className="space-y-4" data-testid="preparation-forecast-block">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays size={18} aria-hidden="true" /></span><div><h3 className="text-lg font-black text-emerald-950">{fr ? "Prévisions et créneau conseillé" : "Forecast and suggested slot"}</h3><p className="mt-1 cmm-text-body cmm-text-primary">{fr ? "La météo actuelle et la prévision du jour sélectionné restent séparées." : "Current weather and the selected day's forecast remain separate."}</p></div></div>
      {weather.weatherStatus === "ready" && weather.forecastDays.length > 0 ? <ForecastDayButtons forecastDays={weather.forecastDays} selectedForecastDayIndex={weather.selectedForecastDayIndex} setSelectedForecastDayIndex={weather.setSelectedForecastDayIndex} /> : null}
      <ForecastMetrics selectedDay={selectedDay} riskLabel={selectedRiskLabel} fr={fr} />
      <CurrentWeatherNote currentRisk={weather.currentRisk} selectedDay={selectedDay} actionDate={actionDate} fr={fr} />
      <RecommendedWindowNote window={selectedDay ? recommendedWindow : null} fr={fr} />
      <ForecastSelectionActions selectedDay={selectedDay} recommendedWindow={recommendedWindow} onPreparationSelection={onPreparationSelection} fr={fr} />
    </CmmCard>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Thermometer; label: string; value: string }) {
  return <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3"><div className="flex items-center gap-1.5 text-xs font-bold text-slate-600"><Icon size={14} className="text-emerald-700" aria-hidden="true" />{label}</div><p className="mt-1 truncate text-sm font-black text-slate-900" title={value}>{value}</p></div>;
}

export function PreparationPanel({
  selectedForecastRisk,
  weatherStatus,
  preparationContext,
  fr,
  onPreparationValidated,
  onPreparationContextChange,
}: {
  selectedForecastRisk: WeatherData["selectedForecastRisk"];
  weatherStatus: WeatherData["weatherStatus"];
  preparationContext?: ActionPreparationContext;
  fr: boolean;
  onPreparationValidated?: (validated: boolean) => void;
  onPreparationContextChange?: (update: PreparationContextUpdate) => void;
}) {
  const checklistItems = copyChecklist(preparationContext);
  const updateChecklist = (key: string, checked: boolean) => {
    const next = checklistItems.map((item) => item.key === key ? { ...item, checked } : item);
    onPreparationContextChange?.({ preparationChecklist: next });
    onPreparationValidated?.(next.length > 0 && next.every((item) => item.checked));
  };
  const criticalWarnings = selectedForecastRisk && selectedForecastRisk.level !== "vert" ? selectedForecastRisk.constraints : [];

  return (
    <CmmCard tone="emerald" variant="outlined" size="md" className="space-y-4" data-testid="preparation-safety-block">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CheckCircle2 size={18} aria-hidden="true" /></span><div><h3 className="text-lg font-black text-emerald-950">{fr ? "Matériel et sécurité" : "Equipment and safety"}</h3><p className="mt-1 cmm-text-body cmm-text-primary">{fr ? "Une seule checklist pour préparer l’action ; elle ne constitue pas une certification." : "One checklist for preparing the action; it is not a certification."}</p></div></div>
      {criticalWarnings.length > 0 ? <div role={selectedForecastRisk?.level === "rouge" ? "alert" : "note"} className={`rounded-xl border px-3 py-3 ${selectedForecastRisk?.level === "rouge" ? "border-rose-300 bg-rose-50 text-rose-950" : "border-amber-300 bg-amber-50 text-amber-950"}`}><p className="text-sm font-black">{fr ? "Consignes météo prioritaires du jour sélectionné" : "Priority weather guidance for the selected day"}</p><ul className="mt-2 space-y-1 text-sm">{criticalWarnings.map((warning) => <li key={warning} className="flex items-start gap-2"><TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{warning}</span></li>)}</ul></div> : <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">{weatherStatus === "ready" ? (fr ? "Aucune consigne météo prioritaire calculée pour le jour sélectionné." : "No priority weather guidance calculated for the selected day.") : (fr ? "Aucune recommandation météo affichée tant que les données ne sont pas disponibles." : "No weather recommendation is shown while data is unavailable.")}</p>}
      <PreparationChecklist items={checklistItems} fr={fr} onChange={updateChecklist} compact />
      <div className="border-t border-slate-200 pt-4"><PreparationMaterials context={preparationContext} fr={fr} onChange={(update) => onPreparationContextChange?.(update)} compact /></div>
    </CmmCard>
  );
}
