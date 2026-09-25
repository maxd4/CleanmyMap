"use client";

import { useId } from "react";
import { ShieldCheck } from "lucide-react";
import type { SensitiveZoneApaisementSummary } from "@/lib/gamification/sensitive-zone-badge";
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

type SensitiveZoneBadgeProps = {
  summary: SensitiveZoneApaisementSummary;
};

export function SensitiveZoneBadge({ summary }: SensitiveZoneBadgeProps) {
  const tooltipId = useId();
  const isCelebrating = useStandardGamificationBadgeCelebration({
    progressValue: summary.eligibleValidatedActions,
    gradeId: summary.currentGrade.id,
    title: "Zone sensible apaisée",
    message: `${summary.currentGrade.label} débloqué par les validations en zone sensible.`,
    icon: "shield-check",
    source: "sensitive-zone-badge",
    dedupeKey: `sensitive-zone:${summary.currentGrade.id}:${summary.eligibleValidatedActions}`,
  });

  const palette = getStandardGamificationCardTone(summary.currentGrade.visualVariant);

  const remaining = summary.nextGrade
    ? Math.max(0, summary.nextGrade.threshold - summary.eligibleValidatedActions)
    : 0;
  const progressFooter = getGamificationProgressFooter({
    currentLabel: summary.currentGrade.label,
    nextLabel: summary.nextLabel,
    remaining,
    remainingLabel: `action${remaining > 1 ? "s" : ""} à apaiser`,
  });
  const progressProps = getGamificationBadgeProgressProps({
    value: summary.eligibleValidatedActions,
    nextThreshold: summary.nextGrade?.threshold,
    progressPercent: summary.progressPercent,
    footer: progressFooter,
  });
  const topSensitiveArea = summary.sensitiveAreas[0] ?? null;
  const panelStyleProps = getGamificationBadgePanelStyleProps(palette, isCelebrating);
  const metrics = [
    { label: "Zones sensibles", value: summary.sensitiveAreaCount },
    { label: "Zone repère", value: topSensitiveArea ?? "Aucune" },
    { label: "Prochain palier", value: summary.nextLabel ?? "Infini" },
  ];

  return (
    <GamificationBadgePanel
      {...panelStyleProps}
      eyebrow={
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
          <ShieldCheck size={13} />
          Zone sensible apaisée
        </div>
      }
      description="Compte les actions validées dans les zones critiques ou historiquement très sales. Chaque palier ajoute 1 XP aux seuils 1, 3, 5, 8, 10, 15, 20 puis continue."
      summaryLabel={summary.currentGrade.label}
      summaryValue={summary.eligibleValidatedActions}
      summaryUnit="actions validées"
      state={getGamificationBadgeState(summary.eligibleValidatedActions, summary.currentGrade.threshold)}
      metrics={metrics}
      progressLabel={getGamificationProgressLabel(summary.nextGrade?.label)}
      {...progressProps}
      tooltip={{
        id: tooltipId,
        label: "Détails du palier",
        content:
          "Seules les actions validées comptent. Le badge récompense les contributions sur les zones que le pilotage identifie comme critiques ou historiquement très chargées.",
      }}
    />
  );
}
