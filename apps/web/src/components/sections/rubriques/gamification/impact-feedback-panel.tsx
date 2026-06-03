"use client";

import { memo } from "react";
import { Droplets, MapPin, Ruler, ShieldCheck, Sparkles, Wind } from "lucide-react";
import { AnimatedCounter } from "@/components/gamification/animated-counter";
import type { MeResponse } from "./gamification-types";

type ImpactFeedbackPanelProps = {
  progression: MeResponse["progression"] | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
};

function countUniqueZones(
  mapPoints: MeResponse["progression"]["history"]["mapPoints"] | undefined,
): number {
  if (!mapPoints || mapPoints.length === 0) {
    return 0;
  }

  return new Set(
    mapPoints
      .map((point) => point.locationLabel.trim())
      .filter((label) => label.length > 0),
  ).size;
}

function roundValue(value: number): number {
  return Math.round(value * 10) / 10;
}

export const ImpactFeedbackPanel = memo(function ImpactFeedbackPanel({
  progression,
  loading,
  error,
  locale,
}: ImpactFeedbackPanelProps) {
  const fr = locale === "fr";

  if (loading) {
    return (
      <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-48 rounded-full bg-white/5" />
          <div className="h-8 w-72 rounded-full bg-white/5" />
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 rounded-[2rem] bg-white/[0.03]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !progression) {
    return (
      <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-300">
            <ShieldCheck size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
              {fr ? "Feedback d&apos;impact" : "Impact feedback"}
            </p>
            <p className="text-sm font-semibold text-white">
              {fr
                ? "Le retour d'impact n'est pas disponible pour le moment."
                : "Impact feedback is not available right now."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const impact = progression.impact;
  const zonesCount = countUniqueZones(progression.history.mapPoints);
  const wasteKg = roundValue(impact.wasteKg);

  return (
    <section className="rounded-[3rem] border border-white/5 bg-slate-950/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
            {fr ? "Feedback d&apos;impact" : "Impact feedback"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {fr
              ? "Le retour d'impact montre ce que vos contributions validées ont produit."
              : "Impact feedback shows what your validated contributions have produced."}
          </p>
        </div>
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
          {fr ? "Impact séparé du XP" : "Impact separate from XP"}
        </div>
      </div>

      <div className="relative z-10 mt-6 rounded-[2rem] border border-red-500/10 bg-red-500/[0.03] p-5">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
          <Sparkles size={12} />
          {fr ? "Synthèse visible" : "Visible summary"}
        </div>
        <p className="mt-3 text-lg font-bold text-white leading-relaxed">
          {fr ? (
            <>
              Vos contributions validées représentent environ{" "}
              <span className="text-red-300">{wasteKg} kg</span> de déchets retirés,
              <span className="text-red-300"> {impact.cigaretteButts}</span> mégots
              récupérés et une couverture d&apos;environ{" "}
              <span className="text-red-300">{zonesCount}</span> zones distinctes.
            </>
          ) : (
            <>
              Your validated contributions represent about{" "}
              <span className="text-red-300">{wasteKg} kg</span> of removed waste,
              <span className="text-red-300"> {impact.cigaretteButts}</span> collected
              cigarette butts and coverage across{" "}
              <span className="text-red-300">{zonesCount}</span> distinct zones.
            </>
          )}
        </p>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
            <Droplets size={12} />
            {fr ? "Eau préservée" : "Water saved"}
          </div>
          <p className="mt-3 text-3xl font-black tracking-tighter text-white">
            <AnimatedCounter value={impact.waterSavedLiters} direction="up" />
          </p>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {fr ? "litres estimés" : "estimated liters"}
          </p>
        </article>

        <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
            <Wind size={12} />
            {fr ? "CO2 évité" : "CO2 avoided"}
          </div>
          <p className="mt-3 text-3xl font-black tracking-tighter text-white">
            <AnimatedCounter value={impact.co2AvoidedKg} direction="up" />
          </p>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {fr ? "kg équivalent estimé" : "estimated kg equivalent"}
          </p>
        </article>

        <article className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70">
            <Ruler size={12} />
            {fr ? "Surface couverte" : "Covered surface"}
          </div>
          <p className="mt-3 text-3xl font-black tracking-tighter text-white">
            <AnimatedCounter value={impact.surfaceCleanedM2} direction="up" />
          </p>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {fr ? "m² estimés" : "estimated m²"}
          </p>
        </article>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300">
          <MapPin size={12} className="text-red-300" />
          {fr ? `${zonesCount} zones distinctes` : `${zonesCount} distinct zones`}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3 py-1 text-slate-300">
          <ShieldCheck size={12} className="text-red-300" />
          {fr ? "Mesures validées par la modération" : "Measures validated by moderation"}
        </span>
      </div>
    </section>
  );
});
