"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import type { WeatherSafetyGuidanceProps } from "./weather-section.conditions.types";
import { LightCard } from "./weather-section.ui";

function buildFieldVigilance({ selectedForecastRisk, fr, isWeatherReady }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  if (!isWeatherReady || !selectedForecastRisk) {
    return fr
      ? "Aucune conclusion météo n'est calculée pour le jour sélectionné. Vérifiez le terrain sur place."
      : "No weather conclusion is calculated for the selected day. Check the site on arrival.";
  }
  return selectedForecastRisk.reasons.length > 0
    ? selectedForecastRisk.reasons.join(" · ")
    : fr ? "Aucun seuil de vigilance dépassé pour ce créneau." : "No vigilance threshold exceeded for this slot.";
}

function WeatherSafetyChecklist({ fr }: { fr: boolean }) {
  const items = [
    fr ? "Envisager un référent sécurité selon l’équipe" : "Consider a safety lead based on the team",
    fr ? "Prévoir des pauses selon la durée et les conditions" : "Plan breaks according to the duration and conditions",
    fr ? "Trousse de premiers secours à envisager" : "Consider a first-aid kit",
    fr ? "Prévoir un brief sécurité initial" : "Plan an initial safety briefing",
    fr ? "Rappeler les règles de conduite de l’équipe" : "Review the team conduct rules",
  ];
  return <div><p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-slate-500">{fr ? "Checklist sécurité" : "Safety checklist"}</p><ul className="mt-3 space-y-2.5">{items.map((item) => <li key={item} className="cmm-text-body flex items-start gap-3"><span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckCircle2 size={11} /></span><span>{item}</span></li>)}</ul></div>;
}

function WeatherSafetyConstraints({ selectedForecastRisk, fr, isWeatherReady }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  if (!isWeatherReady || !selectedForecastRisk) {
    return <p className="mt-5 cmm-text-body rounded-2xl border border-slate-200 bg-white px-4 py-3">{fr ? "Prévision indisponible : aucune consigne météo calculée." : "Forecast unavailable: no weather guidance calculated."}</p>;
  }
  return <ul className="mt-5 space-y-3">{selectedForecastRisk.constraints.map((constraint) => <li key={constraint} className="cmm-text-body flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3"><span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckCircle2 size={11} /></span><span>{constraint}</span></li>)}</ul>;
}

function WeatherPrudenceCard({ selectedForecastRisk, fr, isWeatherReady, weatherStatus }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  const fieldVigilance = buildFieldVigilance({ selectedForecastRisk, fr, isWeatherReady, weatherStatus });
  return (
    <LightCard className="border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,251,240,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck size={18} /></span><div><p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-emerald-700">{fr ? "Repères du jour sélectionné" : "Selected day guidance"}</p><h3 className="text-xl font-black tracking-tight text-emerald-800">{isWeatherReady ? fr ? "Prévision du créneau" : "Selected slot forecast" : fr ? "Prévision en attente" : "Forecast pending"}</h3></div></div>
      <div className="mt-6 space-y-5">
        {!isWeatherReady ? <p className="cmm-text-body rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3">{fr ? "Choisis une ville pour afficher des conseils météo exploitables." : "Choose a city to display actionable weather advice."}</p> : null}
        <WeatherSafetyChecklist fr={fr} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3"><p className="cmm-text-caption font-black uppercase tracking-[0.26em] text-amber-800/80">{fr ? "Vigilance terrain" : "Field vigilance"}</p><p className="cmm-text-body mt-2 text-amber-950">{fieldVigilance}</p></div>
      </div>
    </LightCard>
  );
}

function WeatherConstraintsCard({ selectedForecastRisk, fr, isWeatherReady, weatherStatus }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  return <LightCard className="p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck size={18} /></span><div><p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-emerald-700">{fr ? "Sécurité météo" : "Weather safety"}</p><h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">{fr ? "Consignes du créneau" : "Slot guidance"}</h3></div></div><WeatherSafetyConstraints selectedForecastRisk={selectedForecastRisk} fr={fr} isWeatherReady={isWeatherReady} weatherStatus={weatherStatus} /></LightCard>;
}

export function WeatherSafetyGuidance({ selectedForecastRisk, weatherStatus, fr }: WeatherSafetyGuidanceProps) {
  const isWeatherReady = weatherStatus === "ready" && selectedForecastRisk !== null;
  return <div className="space-y-6"><WeatherPrudenceCard selectedForecastRisk={selectedForecastRisk} fr={fr} isWeatherReady={isWeatherReady} weatherStatus={weatherStatus} /><WeatherConstraintsCard selectedForecastRisk={selectedForecastRisk} fr={fr} isWeatherReady={isWeatherReady} weatherStatus={weatherStatus} /></div>;
}
