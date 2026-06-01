"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { dispatchGamificationCelebration } from "@/lib/gamification/celebration";
import type { ActionBalanceSummary } from "@/lib/gamification/action-balance";

type ActionBalanceBadgeProps = {
  summary: ActionBalanceSummary;
};

const CONTEXT_LABELS: Record<"spontaneous" | "association" | "enterprise", string> = {
  spontaneous: "Spontanée",
  association: "Association",
  enterprise: "Entreprise",
};

const CARD_TONES: Record<"stone" | "precious", { shell: string; glow: string; progress: string; chip: string }> = {
  stone: {
    shell: "border-slate-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/80",
    glow: "bg-emerald-400/10",
    progress: "bg-gradient-to-r from-emerald-400 via-cyan-300 to-teal-300",
    chip: "border-slate-300/10 bg-white/5 text-slate-100",
  },
  precious: {
    shell: "border-cyan-300/20 bg-gradient-to-br from-slate-950 via-cyan-950/50 to-fuchsia-950/70",
    glow: "bg-cyan-400/15",
    progress: "bg-gradient-to-r from-cyan-400 via-teal-300 to-fuchsia-400",
    chip: "border-cyan-300/10 bg-cyan-500/10 text-cyan-50",
  },
};

export function ActionBalanceBadge({ summary }: ActionBalanceBadgeProps) {
  const [isCelebrating, setIsCelebrating] = useState(false);
  const didMountRef = useRef(false);
  const previousGradeIdRef = useRef<string | null>(null);
  const previousCyclesRef = useRef<number | null>(null);

  const tone = summary.currentGrade.visualVariant === "precious" ? "precious" : "stone";
  const palette = CARD_TONES[tone];

  useEffect(() => {
    const previousGradeId = previousGradeIdRef.current;
    const previousCycles = previousCyclesRef.current;
    previousGradeIdRef.current = summary.currentGrade.id;
    previousCyclesRef.current = summary.balancedCycles;

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (
      summary.balancedCycles > (previousCycles ?? -1) &&
      previousGradeId !== summary.currentGrade.id
    ) {
      setIsCelebrating(true);
      dispatchGamificationCelebration({
        title: "Équilibre des contextes atteint",
        message: `${summary.currentGrade.label} débloqué pour la variété des actions.`,
        tone: "actions",
        icon: "sliders-horizontal",
        source: "action-balance",
      });

      const timeout = window.setTimeout(() => setIsCelebrating(false), 900);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [summary.balancedCycles, summary.currentGrade.id, summary.currentGrade.label]);

  const progressStart = summary.currentGrade.threshold;
  const progressEnd = summary.nextGrade?.threshold ?? progressStart + 5;
  const progressSpan = Math.max(1, progressEnd - progressStart);
  const progressCurrent = Math.max(
    0,
    Math.min(summary.balancedCycles - progressStart, progressSpan),
  );
  const remaining = summary.nextGrade
    ? Math.max(0, summary.nextGrade.threshold - summary.balancedCycles)
    : 0;
  const weakestContext =
    Object.entries({
      spontaneous: summary.spontaneous,
      association: summary.association,
      enterprise: summary.enterprise,
    }).sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))[0]?.[0] as
      | "spontaneous"
      | "association"
      | "enterprise"
      | undefined;
  const weakestLabel = weakestContext ? CONTEXT_LABELS[weakestContext] : null;

  return (
    <section
      className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-2xl transition-all duration-300 ${palette.shell} ${isCelebrating ? "cmm-gamification-celebrate" : ""}`}
    >
      <div className={`absolute inset-0 rounded-[2rem] ${palette.glow} blur-3xl opacity-80`} />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
              <SlidersHorizontal size={13} />
              Équilibre des contextes
            </div>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-slate-100/80">
              Encourage la variété entre actions spontanées, actions avec association et actions avec entreprise.
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {summary.currentGrade.label}
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight text-white">
              {summary.balancedCycles}
            </p>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
              cycles équilibrés
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {(
            [
              ["spontaneous", summary.spontaneous],
              ["association", summary.association],
              ["enterprise", summary.enterprise],
            ] as const
          ).map(([key, value]) => (
            <div
              key={key}
              className={`rounded-2xl border px-3 py-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] ${palette.chip}`}
            >
              <div className="text-[9px] text-white/45">{CONTEXT_LABELS[key]}</div>
              <div className="mt-1 text-base font-black text-white">{value}</div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
            <span>Progression vers {summary.nextGrade?.label ?? "le prochain palier"}</span>
            <span>
              {summary.balancedCycles}
              {summary.nextGrade ? ` / ${summary.nextGrade.threshold}` : ""}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-black/30 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${palette.progress} ${isCelebrating ? "cmm-gamification-progress" : ""}`}
              style={{ width: `${Math.round((progressCurrent / progressSpan) * 100)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-white/70">
            <span>
              {summary.currentGrade.label}
              {summary.nextLabel ? ` → ${summary.nextLabel}` : ""}
            </span>
            <span>
              {remaining > 0
                ? `+${remaining} cycle${remaining > 1 ? "s" : ""} équilibré${remaining > 1 ? "s" : ""}`
                : "Palier atteint"}
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/60">
          Le contexte le moins représenté dirige la progression. Tant qu un des trois blocs reste en retard, le badge n avance pas.
        </p>

        {weakestLabel && summary.balancedCycles > 0 ? (
          <p className="mt-2 text-xs font-semibold text-cyan-100/80">
            À renforcer en priorité: {weakestLabel}.
          </p>
        ) : (
          <p className="mt-2 text-xs font-semibold text-cyan-100/70">
            Commence par obtenir un cycle complet avec les trois contextes.
          </p>
        )}
      </div>
    </section>
  );
}
