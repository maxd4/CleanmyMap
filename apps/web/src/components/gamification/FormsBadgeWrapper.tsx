"use client";

import React from "react";
import FormsBadge from "./FormsBadge";
import type { GemGrade } from "@/lib/gamification/types";
import { dispatchGamificationCelebration } from "@/lib/gamification/celebration";

type FormsGrade = GemGrade;

export default function FormsBadgeWrapper() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formsData, setFormsData] = React.useState<{
    current: number;
    grades: FormsGrade[];
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/gamification/badges/list");
        if (!res.ok) {
          if (res.status === 401) {
            setError("access_denied");
          } else {
            setError("fetch_failed");
          }
          setFormsData(null);
          return;
        }

        const data = await res.json();

        // Extract forms badges from response
        const formsBadges = data.badges?.filter(
          (b: any) => b.id?.startsWith("forms-")
        ) || [];

        if (formsBadges.length === 0) {
          setFormsData(null);
          return;
        }

        // Extract current eligible forms count from progress
        const currentCount = formsBadges[0]?.progress?.current ?? 0;

        // Map badges to grades format
        const grades: FormsGrade[] = formsBadges.map((badge: any) => ({
          id: badge.id,
          label: badge.name,
          threshold: badge.progress?.target ?? 1,
          iconVariant: badge.icon,
          visualVariant: badge.visualVariant,
          tooltip: badge.tooltip,
        }));

        setFormsData({
          current: currentCount,
          grades,
        });
      } catch (err) {
        console.error("Failed to fetch forms badge data:", err);
        setError("fetch_failed");
        setFormsData(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Empty state
  if (!isLoading && !formsData && !error) {
    return (
      <div
        style={{
          padding: 16,
          textAlign: "center",
          color: "var(--gray-500, #999)",
          fontSize: 14,
        }}
      >
        Aucune donnée de formulaires disponible
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          padding: 16,
          textAlign: "center",
          color: "var(--gray-600, #666)",
          fontSize: 14,
        }}
      >
        Chargement du badge...
      </div>
    );
  }

  // Access denied state
  if (error === "access_denied") {
    return (
      <div
        style={{
          padding: 16,
          textAlign: "center",
          color: "var(--gray-600, #666)",
          fontSize: 14,
        }}
      >
        Connectez-vous pour voir vos badges
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          padding: 16,
          textAlign: "center",
          color: "var(--red-600, #c33)",
          fontSize: 14,
        }}
      >
        Erreur lors du chargement du badge
      </div>
    );
  }

  // Render badge
  if (formsData) {
    return (
      <FormsBadge
        grades={formsData.grades}
        current={formsData.current}
        onGradeReached={(grade) => {
          dispatchGamificationCelebration({
            title: "Palier de formulaires atteint",
            message: `${grade.label} débloqué pour la création de formulaires.`,
            tone: "forms",
            icon: grade.iconVariant || "🌱",
            source: "forms-badge",
          });
        }}
      />
    );
  }

  return null;
}
