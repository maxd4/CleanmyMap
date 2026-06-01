import React from "react";

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
  }, [activeGradeId, current, onGradeReached]);

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
    <div
      className={`forms-badge ${isCelebrating ? "cmm-gamification-celebrate" : ""}`}
      style={{
        padding: 16,
        textAlign: "center",
        borderRadius: 12,
        background: `linear-gradient(135deg, var(--plant-${gradeType}-light, #f5f5f5), var(--plant-${gradeType}-dark, #e0e0e0))`,
        border: "2px solid var(--plant-${gradeType}-border, #ccc)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      {/* Plant icon and grade label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 32 }}>{plantIcon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-800, #333)" }}>
          {activeGrade.label} — Création de formulaires
        </div>
        <div style={{ fontSize: 12, color: "var(--gray-600, #666)" }}>
          {activeGrade.label === 'Seed' ? 'Graine' : ''}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            height: 8,
            background: "rgba(0,0,0,0.1)",
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              height: "100%",
              background: `var(--plant-${gradeType}-progress, #9b59b6)`,
              width: `${progressPercent}%`,
              transition: "width 0.3s ease",
            }}
            className={isCelebrating ? "cmm-gamification-progress" : undefined}
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--gray-700, #555)", marginTop: 6 }}>
          {current} / {activeGrade.threshold} formulaires
          {remaining > 0 && (
            <span style={{ marginLeft: 8, color: "var(--gray-500, #999)" }}>
              (+{remaining} pour {nextGrade?.label || "suivant"})
            </span>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {activeGrade.tooltip && (
        <div
          style={{
            fontSize: 11,
            color: "var(--gray-600, #666)",
            marginTop: 8,
            fontStyle: "italic",
            lineHeight: 1.3,
          }}
        >
          {activeGrade.tooltip}
        </div>
      )}
    </div>
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
      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-700, #555)" }}>
        Aucun palier de formulaires disponible
      </div>
    </div>
  );
}
