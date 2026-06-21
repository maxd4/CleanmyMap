"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import type { MonthlyRegularitySummary } from "@/lib/gamification/monthly-regularity";
import {
  GamificationBadgePanel,
  getGamificationBadgeState,
} from "@/components/gamification/badge-ui";

type MonthlyRegularityBadgeProps = {
  summary: MonthlyRegularitySummary;
};

const CARD_TONES: Record<
  "stone" | "precious",
  { shell: string; glow: string; progress: string; chip: string }
> = {
  stone: {
    shell: "border-slate-500/20 bg-gradient-to-br from-slate-950 via-stone-900 to-emerald-950/80",
    glow: "bg-emerald-400/10",
    progress: "bg-gradient-to-r from-emerald-400 via-lime-300 to-teal-300",
    chip: "border-slate-300/10 bg-white/5 text-slate-100",
  },
  precious: {
    shell: "border-cyan-300/20 bg-gradient-to-br from-slate-950 via-cyan-950/50 to-fuchsia-950/70",
    glow: "bg-cyan-400/15",
    progress: "bg-gradient-to-r from-cyan-400 via-teal-300 to-fuchsia-400",
    chip: "border-cyan-300/10 bg-cyan-500/10 text-cyan-50",
  },
};

export function MonthlyRegularityBadge({ summary }: MonthlyRegularityBadgeProps) {
  const [isCelebrating, setIsCelebrating] = useState(false);
  const didMountRef = useRef(false);
  const previousGradeIdRef = useRef<string | null>(null);
  const previousStreakRef = useRef<number | null>(null);
  const tooltipId = useId();

  const tone = summary.currentGrade.visualVariant === "precious" ? "precious" : "stone";
  const palette = CARD_TONES[tone];

  useEffect(() => {
    const previousGradeId = previousGradeIdRef.current;
    const previousStreak = previousStreakRef.current;
    previousGradeIdRef.current = summary.currentGrade.id;
    previousStreakRef.current = summary.currentStreak;

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (
      summary.currentStreak > (previousStreak ?? -1) &&
      previousGradeId !== summary.currentGrade.id
    ) {
      let resetTimeout: number | undefined;
      const celebrationTimeout = window.setTimeout(() => {
        setIsCelebrating(true);
        announceGamificationGain({
          title: "Régularité mensuelle atteinte",
          message: `${summary.currentGrade.label} débloqué pour la série mensuelle.`,
          tone: "actions",
          icon: "calendar-days",
          source: "monthly-regularity",
          dedupeKey: `monthly-regularity:${summary.currentGrade.id}:${summary.currentStreak}`,
        });

        resetTimeout = window.setTimeout(() => setIsCelebrating(false), 900);
      }, 0);

      return () => {
        window.clearTimeout(celebrationTimeout);
        if (resetTimeout !== undefined) {
          window.clearTimeout(resetTimeout);
        }
      };
    }

    return undefined;
  }, [summary.currentGrade.id, summary.currentGrade.label, summary.currentStreak]);

  const remaining = summary.nextGrade
    ? Math.max(0, summary.nextGrade.threshold - summary.currentStreak)
    : 0;

  return (
    <GamificationBadgePanel
      shellClassName={palette.shell}
      glowClassName={palette.glow}
      progressClassName={`${palette.progress} ${isCelebrating ? "cmm-gamification-progress" : ""}`}
      celebrating={isCelebrating}
      eyebrow={
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
          <CalendarDays size={13} />
          Régularité mensuelle
        </div>
      }
      description="1 XP au premier mois consécutif, puis 2 XP, 3 XP, et ainsi de suite tant qu&apos;au moins une action éligible est comptée chaque mois."
      summaryLabel={summary.currentGrade.label}
      summaryValue={summary.currentStreak}
      summaryUnit="mois consécutifs"
      state={getGamificationBadgeState(summary.currentStreak, summary.currentGrade.threshold)}
      metrics={[
        {
          label: "Mois comptés",
          value: summary.eligibleMonths,
        },
        {
          label: "Mois courant",
          value: summary.currentMonthHasEligibleAction ? "Compté" : "Série à 0",
        },
        {
          label: "Prochain palier",
          value: summary.nextLabel ?? "Infini",
        },
      ]}
      progressLabel={`Progression vers ${summary.nextGrade?.label ?? "le prochain palier"}`}
      progressValue={`${summary.currentStreak}${summary.nextGrade ? ` / ${summary.nextGrade.threshold}` : ""}`}
      progressPercent={summary.progressPercent}
      progressFooterLeft={`Palier actuel: ${summary.currentGrade.label}${
        summary.nextLabel ? ` → ${summary.nextLabel}` : ""
      }`}
      progressFooterRight={
        remaining > 0
          ? `+${remaining} mois consécutif${remaining > 1 ? "s" : ""}`
          : "Palier atteint"
      }
      tooltip={{
        id: tooltipId,
        label: "Détails du palier",
        content:
          "Les formulaires \"lieu propre\" et les actions rejetées ne comptent pas. Une action en attente est comptée provisoirement, puis retirée rétroactivement si elle est rejetée et qu'elle était la seule du mois.",
      }}
    />
  );
}
