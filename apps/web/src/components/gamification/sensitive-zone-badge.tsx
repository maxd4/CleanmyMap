"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { dispatchGamificationCelebration } from "@/lib/gamification/celebration";
import type { SensitiveZoneApaisementSummary } from "@/lib/gamification/sensitive-zone-badge";
import {
  GamificationBadgePanel,
  getGamificationBadgeState,
} from "@/components/gamification/badge-ui";

type SensitiveZoneBadgeProps = {
  summary: SensitiveZoneApaisementSummary;
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

export function SensitiveZoneBadge({ summary }: SensitiveZoneBadgeProps) {
  const [isCelebrating, setIsCelebrating] = useState(false);
  const didMountRef = useRef(false);
  const previousGradeIdRef = useRef<string | null>(null);
  const previousCountRef = useRef<number | null>(null);
  const tooltipId = useId();

  const tone = summary.currentGrade.visualVariant === "precious" ? "precious" : "stone";
  const palette = CARD_TONES[tone];

  useEffect(() => {
    const previousGradeId = previousGradeIdRef.current;
    const previousCount = previousCountRef.current;
    previousGradeIdRef.current = summary.currentGrade.id;
    previousCountRef.current = summary.eligibleValidatedActions;

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (
      summary.eligibleValidatedActions > (previousCount ?? -1) &&
      previousGradeId !== summary.currentGrade.id
    ) {
      let resetTimeout: number | undefined;
      const celebrationTimeout = window.setTimeout(() => {
        setIsCelebrating(true);
        dispatchGamificationCelebration({
          title: "Zone sensible apaisée",
          message: `${summary.currentGrade.label} débloqué par les validations en zone sensible.`,
          tone: "actions",
          icon: "shield-check",
          source: "sensitive-zone-badge",
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
  }, [summary.currentGrade.id, summary.currentGrade.label, summary.eligibleValidatedActions]);

  const remaining = summary.nextGrade
    ? Math.max(0, summary.nextGrade.threshold - summary.eligibleValidatedActions)
    : 0;
  const topSensitiveArea = summary.sensitiveAreas[0] ?? null;

  return (
    <GamificationBadgePanel
      shellClassName={palette.shell}
      glowClassName={palette.glow}
      progressClassName={`${palette.progress} ${isCelebrating ? "cmm-gamification-progress" : ""}`}
      celebrating={isCelebrating}
      eyebrow={
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
          <ShieldCheck size={13} />
          Zone sensible apaisée
        </div>
      }
      description="Compte les actions validées dans les zones critiques ou historiquement très sales. Chaque palier ajoute 1 XP aux seuils 1, 3, 5, 8, 10, 15, 20 puis continue."
      summaryLabel={summary.currentGrade.label}
      summaryValue={summary.eligibleValidatedActions}
      summaryUnit="actions validées"
      state={getGamificationBadgeState(summary.eligibleValidatedActions, summary.currentGrade.threshold)}
      metrics={[
        {
          label: "Zones sensibles",
          value: summary.sensitiveAreaCount,
        },
        {
          label: "Zone repère",
          value: topSensitiveArea ?? "Aucune",
        },
        {
          label: "Prochain palier",
          value: summary.nextLabel ?? "Infini",
        },
      ]}
      progressLabel={`Progression vers ${summary.nextGrade?.label ?? "le prochain palier"}`}
      progressValue={`${summary.eligibleValidatedActions}${
        summary.nextGrade ? ` / ${summary.nextGrade.threshold}` : ""
      }`}
      progressPercent={summary.progressPercent}
      progressFooterLeft={`Palier actuel: ${summary.currentGrade.label}${
        summary.nextLabel ? ` → ${summary.nextLabel}` : ""
      }`}
      progressFooterRight={
        remaining > 0
          ? `+${remaining} action${remaining > 1 ? "s" : ""} à apaiser`
          : "Palier atteint"
      }
      tooltip={{
        id: tooltipId,
        label: "Détails du palier",
        content:
          "Seules les actions validées comptent. Le badge récompense les contributions sur les zones que le pilotage identifie comme critiques ou historiquement très chargées.",
      }}
    />
  );
}
