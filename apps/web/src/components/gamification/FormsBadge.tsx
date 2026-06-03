import React from "react";
import {
  GamificationBadgePanel,
  getGamificationBadgeState,
} from "@/components/gamification/badge-ui";

type GemGrade = {
  id: string;
  label: string;
  threshold: number;
  iconVariant?: string;
  visualVariant?: string;
  tooltip?: string;
};

export default function FormsBadge({
  grades,
  current,
  onGradeReached,
}: {
  grades: GemGrade[];
  current: number;
  onGradeReached?: (grade: GemGrade) => void;
}) {
  const activeGrade = grades.length ? (grades.slice().reverse().find((g) => current >= g.threshold) || grades[0]) : null;
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

    if (activeGrade && current > (previousCurrent ?? -1) && previousGradeId !== activeGrade.id) {
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

  // Plant growth emoji mapping
  const plantEmoji: Record<string, string> = {
    "seed": "🌱",
    "sprout": "🌿",
    "seedling": "🌱",
    "sapling": "🎋",
    "young-tree": "🌳",
    "mature-tree": "🌲",
    "grove": "🌴",
    "primary-forest": "🌳🌳",
  };

  const gradeType = activeGrade?.id.replace("forms-", "").replace(/forms-/, "") ?? "seed";
  const plantIcon = plantEmoji[gradeType] || "🌱";

  return activeGrade ? (
    <GamificationBadgePanel
      shellClassName={`forms-badge ${isCelebrating ? "cmm-gamification-celebrate" : ""}`}
      glowClassName=""
      shellStyle={{
        padding: 16,
        textAlign: "center",
        borderRadius: 12,
        background: `linear-gradient(135deg, var(--plant-${gradeType}-light, #f5f5f5), var(--plant-${gradeType}-dark, #e0e0e0))`,
        border: `2px solid var(--plant-${gradeType}-border, #ccc)`,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
      glowStyle={{
        background: `linear-gradient(135deg, var(--plant-${gradeType}-light, #f5f5f5), var(--plant-${gradeType}-dark, #e0e0e0))`,
      }}
      progressClassName={`cmm-gamification-progress`}
      celebrating={isCelebrating}
      eyebrow={
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/80">
          <span style={{ fontSize: 16 }}>{plantIcon}</span>
          Création de formulaires
        </div>
      }
      description={
        activeGrade.label === "Seed" ? "Graine" : "Progression des formulaires validés."
      }
      summaryLabel={activeGrade.label}
      summaryValue={current}
      summaryUnit="formulaires"
      state={getGamificationBadgeState(current, activeGrade.threshold)}
      metrics={[
        {
          label: "Formulaires comptés",
          value: current,
        },
        {
          label: "Prochain palier",
          value: nextGrade?.label || "Suivant",
        },
        {
          label: "Type",
          value: activeGrade.label === "Seed" ? "Graine" : "Actif",
        },
      ]}
      progressLabel={`Progression vers ${nextGrade?.label ?? "le prochain palier"}`}
      progressValue={`${current} / ${activeGrade.threshold}`}
      progressPercent={progressPercent}
      progressFooterLeft={`Palier actuel: ${activeGrade.label}${nextGrade ? ` → ${nextGrade.label}` : ""}`}
      progressFooterRight={remaining > 0 ? `+${remaining} formulaires` : "Palier atteint"}
      tooltip={{
        id: tooltipId,
        label: "Détails du palier",
        content: activeGrade.tooltip ?? "Les formulaires validés font progresser ce badge.",
      }}
    />
  ) : (
    <div
      className="forms-badge"
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
        Aucun palier de formulaires défini pour le moment.
      </div>
    </div>
  );
}
