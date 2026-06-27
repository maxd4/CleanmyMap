"use client";

import React from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import FormsBadge from "./FormsBadge";
import type { GemGrade } from "@/lib/gamification/types";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import { loadGamificationCountersClient } from "@/lib/gamification/counters-client";
import { FORM_SUBMISSION_TIERS } from "@/lib/gamification/badges/families";

type FormsGrade = GemGrade;

function buildFormsGrades(): FormsGrade[] {
  return FORM_SUBMISSION_TIERS.map((tier) => ({
    id: tier.id,
    label: tier.label,
    threshold: tier.threshold,
    iconVariant: tier.iconVariant,
    visualVariant: tier.visualVariant,
    tooltip: tier.tooltip,
  }));
}

export default function FormsBadgeWrapper() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formsData, setFormsData] = React.useState<{
    current: number;
    grades: FormsGrade[];
  } | null>(null);

  React.useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn || !user?.id) {
      setIsLoading(false);
      setError("access_denied");
      return;
    }

    (async () => {
      try {
        setIsLoading(true);
        const data = await loadGamificationCountersClient(user.id, getToken);
        const currentCount = data.counters?.eligibleFormsCount ?? 0;
        const grades = buildFormsGrades();

        setFormsData({
          current: currentCount,
          grades,
        });
      } catch (err) {
        if (err instanceof Error && (err as { status?: number }).status === 401) {
          setError("access_denied");
        } else {
          setError("fetch_failed");
        }
        console.error("Failed to fetch forms badge data:", err);
        setFormsData(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [getToken, isLoaded, isSignedIn, user?.id]);

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
          announceGamificationGain({
            title: "Palier de formulaires atteint",
            message: `${grade.label} débloqué pour la création de formulaires.`,
            tone: "forms",
            icon: grade.iconVariant || "🌱",
            source: "forms-badge",
            dedupeKey: `forms:${grade.id}`,
          });
        }}
      />
    );
  }

  return null;
}
