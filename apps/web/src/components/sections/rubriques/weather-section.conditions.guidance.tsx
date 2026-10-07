"use client";

import { CheckCircle2, Leaf, ShieldCheck } from "lucide-react";
import type { WeatherSafetyGuidanceProps } from "./weather-section.conditions.types";
import { LightCard } from "./weather-section.ui";

function buildFieldVigilance({ currentRisk, fr, isWeatherReady }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  if (!isWeatherReady || !currentRisk) return fr ? "Reste vigilant sur le terrain, même sans détail météo." : "Stay vigilant on the ground, even without detailed weather.";
  if (currentRisk.level === "vert") return fr ? "Sol sec, peu de relief. Aucune vigilance particulière." : "Dry ground, little relief. No special vigilance.";
  if (currentRisk.level === "orange") return fr ? "Rester attentif aux rafales et aux surfaces glissantes." : "Watch for gusts and slippery surfaces.";
  return fr ? "Conseil de prudence : intervention courte, binôme et pauses à envisager selon les conditions." : "Prudence guidance: consider a short intervention, a buddy and breaks based on conditions.";
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

function WeatherSafetyConstraints({ currentRisk, fr, isWeatherReady }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  const constraints = isWeatherReady && currentRisk
    ? currentRisk.constraints
    : [
        fr ? "Déchets dangereux : ne pas toucher et signaler" : "Hazardous waste: do not touch and report it",
        fr ? "Gants et eau à garder à portée" : "Keep gloves and water nearby",
        fr ? "Binôme à envisager selon les conditions" : "Consider working with a buddy based on conditions",
        fr ? "Respect du site et des autres usagers" : "Respect for the site and other users",
      ];
  return <ul className="mt-5 space-y-3">{constraints.map((constraint) => <li key={constraint} className="cmm-text-body flex items-start gap-3 rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3"><span className="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckCircle2 size={11} /></span><span>{constraint}</span></li>)}</ul>;
}

function WeatherPrudenceCard({ currentRisk, fr, isWeatherReady, weatherStatus }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  const fieldVigilance = buildFieldVigilance({ currentRisk, fr, isWeatherReady, weatherStatus });
  return (
    <LightCard className="border-emerald-200/70 bg-[linear-gradient(180deg,rgba(244,251,240,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck size={18} /></span><div><p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-emerald-700">{fr ? "Repères de prudence" : "Prudence guidance"}</p><h3 className="text-xl font-black tracking-tight text-emerald-800">{isWeatherReady ? fr ? "Conditions météo stables" : "Stable weather conditions" : fr ? "Prévision en attente" : "Forecast pending"}</h3></div></div>
      <div className="mt-6 space-y-5">
        {!isWeatherReady ? <p className="cmm-text-body rounded-2xl border border-emerald-100 bg-white/80 px-4 py-3">{fr ? "Choisis une ville pour afficher des conseils météo exploitables." : "Choose a city to display actionable weather advice."}</p> : null}
        <WeatherSafetyChecklist fr={fr} />
        <div className="cmm-text-body rounded-[1.5rem] border border-emerald-200 bg-emerald-50/80 px-5 py-4"><div className="flex items-start gap-3"><Leaf size={20} className="mt-0.5 text-emerald-700" /><p className="leading-relaxed">{fr ? "Bon à savoir : éviter les heures les plus chaudes pour préserver votre énergie et la biodiversité." : "Good to know: avoid the hottest hours to preserve your energy and the biodiversity."}</p></div></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3"><p className="cmm-text-caption font-black uppercase tracking-[0.26em] text-amber-800/80">{fr ? "Vigilance terrain" : "Field vigilance"}</p><p className="cmm-text-body mt-2 text-amber-950">{fieldVigilance}</p></div>
      </div>
    </LightCard>
  );
}

function WeatherConstraintsCard({ currentRisk, fr, isWeatherReady, weatherStatus }: WeatherSafetyGuidanceProps & { isWeatherReady: boolean }) {
  return <LightCard className="p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700"><ShieldCheck size={18} /></span><div><p className="cmm-text-caption font-black uppercase tracking-[0.3em] text-emerald-700">{fr ? "Sécurité" : "Safety"}</p><h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">{fr ? "Ce qu’il ne faut pas toucher" : "What not to touch"}</h3></div></div><WeatherSafetyConstraints currentRisk={currentRisk} fr={fr} isWeatherReady={isWeatherReady} weatherStatus={weatherStatus} /></LightCard>;
}

export function WeatherSafetyGuidance({ currentRisk, weatherStatus, fr }: WeatherSafetyGuidanceProps) {
  const isWeatherReady = weatherStatus === "ready" && currentRisk !== null;
  return <div className="space-y-6"><WeatherPrudenceCard currentRisk={currentRisk} fr={fr} isWeatherReady={isWeatherReady} weatherStatus={weatherStatus} /><WeatherConstraintsCard currentRisk={currentRisk} fr={fr} isWeatherReady={isWeatherReady} weatherStatus={weatherStatus} /></div>;
}
