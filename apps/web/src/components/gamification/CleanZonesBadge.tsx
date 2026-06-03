"use client";

import React from "react";
import {
  GamificationBadgePanel,
  getGamificationBadgeState,
} from "@/components/gamification/badge-ui";

type AtmosphericGrade = {
  id: string;
  label: string;
  threshold: number;
  iconVariant?: string;
  visualVariant?: string;
  tooltip?: string;
};

export default function CleanZonesBadge({
  grades,
  current,
  onGradeReached,
}: {
  grades: AtmosphericGrade[];
  current: number;
  onGradeReached?: (grade: AtmosphericGrade) => void;
}) {
  const activeGrade = grades.length
    ? grades.slice().reverse().find((g) => current >= g.threshold) || grades[0]
    : null;
  const activeGradeId = activeGrade?.id ?? "none";
  const tooltipId = React.useId();
  const didMountRef = React.useRef(false);
  const previousGradeIdRef = React.useRef<string | null>(null);
  const previousCurrentRef = React.useRef<number | null>(null);
  const [isCelebrating, setIsCelebrating] = React.useState(false);

  React.useEffect(() => {
    const previousGradeId = previousGradeIdRef.current;
    const previousCurrent = previousCurrentRef.current;
    previousGradeIdRef.current = activeGrade?.id ?? null;
    previousCurrentRef.current = current;

    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (!activeGrade) {
      return;
    }

    if (current > (previousCurrent ?? -1) && previousGradeId !== activeGrade.id) {
      onGradeReached?.(activeGrade);
      setIsCelebrating(true);
      const timeout = window.setTimeout(() => setIsCelebrating(false), 900);
      return () => window.clearTimeout(timeout);
    }

    return undefined;
  }, [activeGrade, activeGradeId, current, onGradeReached]);

  // Find next tier
  const nextGrade = activeGrade ? grades.find((g) => g.threshold > activeGrade.threshold) : null;
  const remaining = nextGrade ? Math.max(0, nextGrade.threshold - current) : 0;

  // Progress bar logic
  const progressStart = activeGrade?.threshold ?? 0;
  const progressEnd = nextGrade?.threshold ?? progressStart + 10;
  const progressCurrent = Math.min(current - progressStart, progressEnd - progressStart);
  const progressTarget = progressEnd - progressStart;
  const progressPercent = progressTarget > 0 ? Math.round((progressCurrent / progressTarget) * 100) : 100;

  // Atmospheric emoji mapping
  const atmosphericEmoji: Record<string, string> = {
    breeze: "🌬️",
    horizon: "🌅",
    azure: "🔵",
    dawn: "🌄",
    zenith: "☀️",
    stratosphere: "☁️",
    ether: "✨",
    helios: "🌟",
    harmony: "🦋",
    eden: "🌿",
  };

  const gradeType = activeGrade?.id.replace("clean-zones-", "") ?? "breeze";
  const atmosphereIcon = atmosphericEmoji[gradeType] || "🌍";

  return activeGrade ? (
    <GamificationBadgePanel
      shellClassName={`clean-zones-badge ${isCelebrating ? "cmm-gamification-celebrate" : ""}`}
      glowClassName=""
      shellStyle={{
        padding: 16,
        textAlign: "center",
        borderRadius: 12,
        background: `linear-gradient(135deg, var(--atmosphere-${gradeType}-light, #f5f5f5), var(--atmosphere-${gradeType}-dark, #e0e0e0))`,
        border: `2px solid var(--atmosphere-${gradeType}-border, #ccc)`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
      glowStyle={{
        background: `linear-gradient(135deg, var(--atmosphere-${gradeType}-light, #f5f5f5), var(--atmosphere-${gradeType}-dark, #e0e0e0))`,
      }}
      progressClassName={isCelebrating ? "cmm-gamification-progress" : ""}
      celebrating={isCelebrating}
      eyebrow={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontSize: 32 }}>{atmosphereIcon}</span>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-800, #333)" }}>
              {activeGrade.label} — Zones propres et déclarées
            </div>
            <div style={{ fontSize: 12, color: "var(--gray-600, #666)" }}>
              Exploration positive & veille environnementale
            </div>
          </div>
        </div>
      }
      description="Les zones propres validées alimentent une progression lisible, avec un palier suivant toujours affiché."
      summaryLabel={activeGrade.label}
      summaryValue={current}
      summaryUnit="zones propres"
      state={getGamificationBadgeState(current, activeGrade.threshold)}
      metrics={[
        {
          label: "Zones propres",
          value: current,
        },
        {
          label: "Zone active",
          value: activeGrade.label,
        },
        {
          label: "Prochain palier",
          value: nextGrade?.label || "Suivant",
        },
      ]}
      progressLabel={`Progression vers ${nextGrade?.label ?? "le prochain palier"}`}
      progressValue={`${current} / ${activeGrade.threshold}`}
      progressPercent={progressPercent}
      progressFooterLeft={`Palier actuel: ${activeGrade.label}${nextGrade ? ` → ${nextGrade.label}` : ""}`}
      progressFooterRight={remaining > 0 ? `+${remaining} zones propres` : "Palier atteint"}
      tooltip={{
        id: tooltipId,
        label: "Détails du palier",
        content: activeGrade.tooltip ?? "Les zones propres validées font progresser ce badge.",
      }}
    />
  ) : (
    <div
      className="clean-zones-badge"
      style={{
        padding: 16,
        textAlign: "center",
        borderRadius: 12,
        background: "#f5f5f5",
        border: "2px solid #ccc",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-700, #555)" }}>Observateur</div>
      <div style={{ fontSize: 12, color: "var(--gray-600, #666)", marginTop: 6 }}>
        Aucune zone propre disponible pour le moment.
      </div>
    </div>
  );
}
