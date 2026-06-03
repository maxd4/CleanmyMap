"use client";

import { AnimatedCounter } from "@/components/gamification/animated-counter";
import type { MeResponse } from "./gamification-types";
import { ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

type ProgressionVisiblePanelProps = {
  progression: MeResponse["progression"] | undefined;
  progressToNext: number;
  loading: boolean;
  error: unknown;
  locale: string;
};

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
}

export function ProgressionVisiblePanel({
  progression,
  progressToNext,
  loading,
  error,
  locale,
}: ProgressionVisiblePanelProps) {
  const fr = locale === "fr";

  if (loading) {
    return (
      <div className="rounded-[3rem] border border-white/5 bg-slate-900/40 p-8 backdrop-blur-3xl shadow-2xl">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 w-44 rounded-full bg-white/5" />
          <div className="h-10 w-64 rounded-full bg-white/5" />
          <div className="h-32 rounded-[2rem] bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !progression) {
    return (
      <div className="rounded-[3rem] border border-white/5 bg-slate-900/40 p-8 backdrop-blur-3xl shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-red-400">
            <ShieldCheck size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              {fr ? "Progression visible" : "Visible progression"}
            </p>
            <p className="text-sm font-semibold text-white">
              {fr
                ? "Le moteur de progression n'est pas disponible pour le moment."
                : "The progression engine is not available right now."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalXpTracked = progression.xpValidated + progression.xpPending;
  const validatedShare = totalXpTracked > 0 ? (progression.xpValidated / totalXpTracked) * 100 : 0;
  const monthlyMilestone = progression.monthlyMilestone;
  const missingRequirements = progression.nextLevel.requirements.missing;
  const badgeCount = progression.badges.length;

  return (
    <div className="rounded-[3rem] border border-white/5 bg-slate-900/40 p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
      <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-red-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400/80">
            {fr ? "Progression visible" : "Visible progression"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            {fr
              ? "Niveaux, paliers et jauges en un seul regard."
              : "Levels, thresholds and gauges at a glance."}
          </p>
        </div>
        <div className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.25em] text-red-300">
          {progression.currentLevel} → {progression.nextLevel.level}
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-white/5 bg-slate-950/40 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                {fr ? "Niveau actuel" : "Current level"}
              </p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-4xl font-black tracking-tighter text-white">
                  {progression.currentLevel}
                </span>
                {progression.potentialLevel > progression.currentLevel ? (
                  <span className="text-[10px] font-bold text-red-400/80 italic">
                    {fr ? "Potentiel" : "Potential"} {progression.potentialLevel}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
              <TrendingUp size={13} />
              {formatPercent(progressToNext)}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              <span>
                {fr ? "Vers le prochain palier" : "Towards next threshold"}
              </span>
              <span>
                {progression.nextLevel.xpRequired - progression.nextLevel.xpRemaining} /{" "}
                {progression.nextLevel.xpRequired} XP
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.03] border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {fr ? "XP restantes" : "XP remaining"}:{" "}
              <span className="text-white">{progression.nextLevel.xpRemaining}</span>
            </p>
          </div>
        </section>

        <section className="grid gap-3">
          <div className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/60">
              {fr ? "XP validée" : "Validated XP"}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tighter text-red-300">
              <AnimatedCounter value={progression.xpValidated} direction="up" />
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.03]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-300 transition-all duration-700"
                style={{ width: `${validatedShare}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">
              {fr ? "Part des XP déjà confirmées" : "Share of XP already confirmed"}
            </p>
          </div>

          <div className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/60">
              {fr ? "XP en attente" : "Pending XP"}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tighter text-red-300">
              <AnimatedCounter value={progression.xpPending} direction="up" />
            </p>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">
              {fr ? "Pas encore comptées dans le niveau" : "Not yet counted in the level"}
            </p>
          </div>

          <div className="rounded-[2rem] border border-red-500/10 bg-red-500/[0.02] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-red-400/60">
              {fr ? "Badges visibles" : "Visible badges"}
            </p>
            <p className="mt-2 text-3xl font-black tracking-tighter text-red-300">
              <AnimatedCounter value={badgeCount} direction="up" />
            </p>
            <p className="mt-2 text-[10px] font-semibold text-slate-500">
              {fr ? "Distinctions déjà débloquées" : "Already unlocked distinctions"}
            </p>
          </div>
        </section>
      </div>

      {monthlyMilestone ? (
        <div className="relative z-10 mt-4 rounded-[2rem] border border-white/5 bg-slate-950/55 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                {fr ? "Jauge mensuelle" : "Monthly gauge"}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {monthlyMilestone.label}
              </p>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-300">
              {monthlyMilestone.progressPercent}%
            </span>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.03] border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
              style={{ width: `${monthlyMilestone.progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-500">
            {monthlyMilestone.currentValue} / {monthlyMilestone.targetValue} {monthlyMilestone.unit}
          </p>
        </div>
      ) : null}

      {missingRequirements.length > 0 ? (
        <div className="relative z-10 mt-4 flex flex-wrap gap-2">
          {missingRequirements.map((requirement) => (
            <span
              key={requirement}
              className="rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-red-200"
            >
              {requirement}
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative z-10 mt-4 flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-500">
        <span>
          {fr ? "Paliers visibles et lisibles" : "Visible and readable thresholds"}
        </span>
        {progression.nextLevel.frozen ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
            <ShieldCheck size={12} />
            {fr ? "Palier bloqué" : "Threshold locked"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-red-500/15 bg-red-500/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-red-300">
            <Sparkles size={12} />
            {fr ? "Progression active" : "Active progression"}
          </span>
        )}
      </div>
    </div>
  );
}
