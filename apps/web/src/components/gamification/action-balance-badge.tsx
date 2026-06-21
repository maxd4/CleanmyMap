"use client";

import { useEffect, useRef, useState, useId } from "react";
import { SlidersHorizontal } from "lucide-react";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import type { ActionBalanceSummary } from "@/lib/gamification/action-balance";
import {
  GamificationBadgePanel,
  getGamificationBadgeState,
} from "@/components/gamification/badge-ui";

type ActionBalanceBadgeProps = {
  summary: ActionBalanceSummary;
};

const CONTEXT_LABELS: Record<"spontaneous" | "association" | "enterprise", string> = {
  spontaneous: "Spontanée",
  association: "Association",
  enterprise: "Entreprise",
};

const CONTEXT_LABELS_PLURAL: Record<"spontaneous" | "association" | "enterprise", string> = {
  spontaneous: "actions spontanées",
  association: "actions associatives",
  enterprise: "actions en entreprise",
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
  const tooltipId = useId();

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
      let resetTimeout: number | undefined;
      const celebrationTimeout = window.setTimeout(() => {
        setIsCelebrating(true);
        announceGamificationGain({
          title: "Équilibre des contextes atteint",
          message: `${summary.currentGrade.label} débloqué. +${summary.balancedCycles} XP sur le dernier cycle.`,
          tone: "actions",
          icon: "sliders-horizontal",
          source: "action-balance",
          dedupeKey: `action-balance:${summary.currentGrade.id}:${summary.balancedCycles}`,
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
  }, [summary.balancedCycles, summary.currentGrade.id, summary.currentGrade.label]);

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
  const missingEntries = (
    [
      ["spontaneous", summary.missingCounts.spontaneous],
      ["association", summary.missingCounts.association],
      ["enterprise", summary.missingCounts.enterprise],
    ] as const
  ).filter(([, value]) => value > 0);
  const missingSummary = missingEntries.length
    ? missingEntries
        .map(([key, value]) => `${value} ${CONTEXT_LABELS_PLURAL[key]}`)
        .join(", ")
    : "cycle complet";
  const tooltipText = `Pour débloquer +${summary.currentCycleXpReward} XP, il manque ${missingSummary}.`;
  return (
    <>
      <GamificationBadgePanel
        shellClassName={palette.shell}
        glowClassName={palette.glow}
        progressClassName={`${palette.progress} ${isCelebrating ? "cmm-gamification-progress" : ""}`}
        celebrating={isCelebrating}
        eyebrow={
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
            <SlidersHorizontal size={13} />
            Équilibre des contextes
          </div>
        }
        description="Récompense les cycles complets où les trois contextes avancent ensemble: spontané, association et entreprise."
        summaryLabel={summary.currentGrade.label}
        summaryValue={summary.balancedCycles}
        summaryUnit="cycles équilibrés"
        state={getGamificationBadgeState(summary.balancedCycles, summary.currentGrade.threshold)}
        metrics={[
          {
            label: CONTEXT_LABELS.spontaneous,
            value: summary.spontaneous,
            caption: "dans le cycle courant",
          },
          {
            label: CONTEXT_LABELS.association,
            value: summary.association,
            caption: "dans le cycle courant",
          },
          {
            label: CONTEXT_LABELS.enterprise,
            value: summary.enterprise,
            caption: "dans le cycle courant",
          },
        ]}
        progressLabel={`Cycle ${summary.balancedCycles + 1} à compléter`}
        progressValue={
          summary.currentCycleTarget
            ? `${summary.currentCycleProgress} / ${summary.currentCycleTarget} actions`
            : `${summary.currentCycleProgress} actions`
        }
        progressPercent={
          (summary.currentCycleProgress / Math.max(1, summary.currentCycleTarget)) * 100
        }
        progressFooterLeft={`Palier actuel: ${summary.currentGrade.label}${
          summary.nextLabel ? ` → ${summary.nextLabel}` : ""
        }`}
        progressFooterRight={
          summary.currentCycleXpReward > 0
            ? `+${summary.currentCycleXpReward} XP au prochain cycle`
            : "Palier atteint"
        }
        tooltip={{
          id: tooltipId,
          label: "Détails du palier",
          content: tooltipText,
        }}
      />
      {weakestLabel && summary.balancedCycles > 0 ? (
        <p className="mt-2 text-xs font-semibold text-cyan-100/80">
          À renforcer en priorité: {weakestLabel}.
        </p>
      ) : (
        <p className="mt-2 text-xs font-semibold text-cyan-100/70">
          Commence par obtenir un cycle complet avec les trois contextes.
        </p>
      )}
    </>
  );
}
