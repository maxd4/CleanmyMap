"use client";

import React from "react";

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
  const activeGrade = grades.slice().reverse().find((g) => current >= g.threshold) || grades[0];

  React.useEffect(() => {
    if (onGradeReached) onGradeReached(activeGrade);
  }, [activeGrade.id]);

  // Find next tier
  const nextGrade = grades.find((g) => g.threshold > activeGrade.threshold);
  const remaining = nextGrade ? Math.max(0, nextGrade.threshold - current) : 0;

  // Progress bar logic
  const progressStart = activeGrade.threshold;
  const progressEnd = nextGrade?.threshold ?? activeGrade.threshold + 10;
  const progressCurrent = Math.min(current - progressStart, progressEnd - progressStart);
  const progressTarget = progressEnd - progressStart;
  const progressPercent = progressTarget > 0 ? Math.round((progressCurrent / progressTarget) * 100) : 100;

  // Atmospheric emoji mapping
  const atmosphericEmoji: Record<string, string> = {
    "breeze": "🌬️",
    "horizon": "🌅",
    "azure": "🔵",
    "dawn": "🌄",
    "zenith": "☀️",
    "stratosphere": "☁️",
    "ether": "✨",
    "helios": "🌟",
    "harmony": "🦋",
    "eden": "🌿",
  };

  const gradeType = activeGrade.id.replace("clean-zones-", "");
  const atmosphereIcon = atmosphericEmoji[gradeType] || "🌍";

  return (
    <div
      className="clean-zones-badge"
      style={{
        padding: 16,
        textAlign: "center",
        borderRadius: 12,
        background: `linear-gradient(135deg, var(--atmosphere-${gradeType}-light, #f5f5f5), var(--atmosphere-${gradeType}-dark, #e0e0e0))`,
        border: "2px solid var(--atmosphere-${gradeType}-border, #ccc)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      }}
    >
      {/* Atmospheric icon and grade label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <span style={{ fontSize: 32 }}>{atmosphereIcon}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--gray-800, #333)" }}>
            {activeGrade.label} — Zones propres et déclarées
          </div>
          <div style={{ fontSize: 12, color: "var(--gray-600, #666)" }}>
            Exploration positive & veille environnementale
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
              background: `var(--atmosphere-${gradeType}-progress, #7cb9e8)`,
              width: `${progressPercent}%`,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--gray-700, #555)", marginTop: 6 }}>
          {current} / {activeGrade.threshold} zones propres validées
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
  );
}
