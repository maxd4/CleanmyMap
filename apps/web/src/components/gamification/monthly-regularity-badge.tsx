"use client";

import { useId } from "react";
import { CalendarDays } from "lucide-react";
import type { MonthlyRegularitySummary } from "@/lib/gamification/monthly-regularity";
import {
  GamificationBadgePanel,
  getGamificationBadgePanelStyleProps,
  getGamificationProgressLabel,
  getGamificationBadgeProgressProps,
  getGamificationProgressFooter,
  getGamificationBadgeState,
  getStandardGamificationCardTone,
} from "@/components/gamification/badge-ui";
import { useStandardGamificationBadgeCelebration } from "./use-gamification-badge-celebration";

type MonthlyRegularityBadgeProps = {
  summary: MonthlyRegularitySummary;
};

export function MonthlyRegularityBadge({ summary }: MonthlyRegularityBadgeProps) {
  const tooltipId = useId();
  const isCelebrating = useStandardGamificationBadgeCelebration({
    progressValue: summary.activeMonthsTotal,
    gradeId: summary.currentGrade.id,
    title: "Régularité mensuelle atteinte",
    message: `${summary.currentGrade.label} débloqué pour ${summary.activeMonthsTotal} mois actifs.`,
    icon: "calendar-days",
    source: "monthly-regularity",
    dedupeKey: `monthly-regularity:${summary.currentGrade.id}:${summary.activeMonthsTotal}`,
  });

  const palette = getStandardGamificationCardTone(summary.currentGrade.visualVariant);

  const remaining = summary.nextGrade
    ? Math.max(0, summary.nextGrade.threshold - summary.activeMonthsTotal)
    : 0;
  const progressFooter = getGamificationProgressFooter({
    currentLabel: summary.currentGrade.label,
    nextLabel: summary.nextLabel,
    remaining,
    remainingLabel: `mois actif${remaining > 1 ? "s" : ""}`,
  });
  const progressProps = getGamificationBadgeProgressProps({
    value: summary.activeMonthsTotal,
    nextThreshold: summary.nextGrade?.threshold,
    progressPercent: summary.progressPercent,
    footer: progressFooter,
  });
  const panelStyleProps = getGamificationBadgePanelStyleProps(palette, isCelebrating);
  const metrics = [
    { label: "Mois comptés", value: summary.activeMonthsTotal },
    { label: "Série actuelle", value: summary.currentStreakMonths },
    { label: "Meilleure série", value: summary.longestStreakMonths },
    { label: "Mois courant", value: summary.currentMonthHasEligibleAction ? "Compté" : "Série à 0" },
    { label: "Prochain palier", value: summary.nextLabel ?? "Infini" },
  ];

  return (
    <GamificationBadgePanel
      {...panelStyleProps}
      eyebrow={
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
          <CalendarDays size={13} />
          Régularité mensuelle
        </div>
      }
      description="Le badge progresse avec les mois actifs. La série courante attribue 1 XP, puis 2 XP, 3 XP, et ainsi de suite tant qu&apos;une action éligible est comptée chaque mois."
      summaryLabel={summary.currentGrade.label}
      summaryValue={summary.activeMonthsTotal}
      summaryUnit="mois actifs"
      state={getGamificationBadgeState(summary.activeMonthsTotal, summary.currentGrade.threshold)}
      metrics={metrics}
      progressLabel={getGamificationProgressLabel(summary.nextGrade?.label)}
      {...progressProps}
      tooltip={{
        id: tooltipId,
        label: "Détails du palier",
        content:
          "Les formulaires \"lieu propre\" et les actions rejetées ne comptent pas. Une action en attente est comptée provisoirement, puis retirée rétroactivement si elle est rejetée et qu'elle était la seule du mois.",
      }}
    />
  );
}
