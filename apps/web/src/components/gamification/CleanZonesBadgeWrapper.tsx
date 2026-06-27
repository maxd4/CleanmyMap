"use client";

import React from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import CleanZonesBadge from "./CleanZonesBadge";
import type { GemGrade } from "@/lib/gamification/types";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import { loadGamificationCountersClient } from "@/lib/gamification/counters-client";
import { CLEAN_ZONES_TIERS } from "@/lib/gamification/badges/families";

type CleanZonesGrade = GemGrade;

function buildCleanZonesGrades(): CleanZonesGrade[] {
  return CLEAN_ZONES_TIERS.map((tier) => ({
    id: tier.id,
    label: tier.label,
    threshold: tier.threshold,
    iconVariant: tier.iconVariant,
    visualVariant: tier.visualVariant,
    tooltip: tier.tooltip,
  }));
}

export default function CleanZonesBadgeWrapper() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cleanZonesData, setCleanZonesData] = React.useState<{
    current: number;
    grades: GemGrade[];
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
        const currentCount = data.counters?.visitedPlacesCount ?? 0;
        const grades = buildCleanZonesGrades();

        setCleanZonesData({
          current: currentCount,
          grades,
        });
      } catch (err) {
        if (err instanceof Error && (err as { status?: number }).status === 401) {
          setError("access_denied");
        } else {
          setError("fetch_failed");
        }
        console.error("Failed to fetch clean zones badge data:", err);
        setCleanZonesData(null);
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
  if (cleanZonesData) {
    return (
      <CleanZonesBadge
        grades={cleanZonesData.grades}
        current={cleanZonesData.current}
        onGradeReached={(grade) => {
          announceGamificationGain({
            title: "Palier zone propre atteint",
            message: `${grade.label} débloqué pour les zones propres validées.`,
            tone: "clean-zones",
            icon: grade.iconVariant || "🌍",
            source: "clean-zones-badge",
            dedupeKey: `clean-zones:${grade.id}`,
          });
        }}
      />
    );
  }

  return null;
}
