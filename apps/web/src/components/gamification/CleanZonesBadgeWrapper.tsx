"use client";

import React from "react";
import CleanZonesBadge from "./CleanZonesBadge";
import type { GemGrade } from "@/lib/gamification/types";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import { loadGamificationBadgesListClient } from "@/lib/gamification/badges/badge-list-client";

export default function CleanZonesBadgeWrapper() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cleanZonesData, setCleanZonesData] = React.useState<{
    current: number;
    grades: GemGrade[];
  } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await loadGamificationBadgesListClient();

        // Extract clean zones badges from response
        const cleanZonesBadges = data.badges?.filter(
          (b: any) => b.id?.startsWith("clean-zones-")
        ) || [];

        if (cleanZonesBadges.length === 0) {
          setCleanZonesData(null);
          return;
        }

        // Extract current clean zones count from progress
        const currentCount = cleanZonesBadges[0]?.progress?.current ?? 0;

        // Map badges to grades format
        const grades: GemGrade[] = cleanZonesBadges.map((badge: any) => ({
          id: badge.id,
          label: badge.name,
          threshold: badge.progress?.target ?? 1,
          iconVariant: badge.icon,
          visualVariant: badge.visualVariant,
          tooltip: badge.tooltip,
        }));

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
  }, []);

  // Empty state
  if (!isLoading && !cleanZonesData && !error) {
    return (
      <div
        style={{
          padding: 16,
          textAlign: "center",
          color: "var(--gray-500, #999)",
          fontSize: 14,
        }}
      >
        Aucune zone propre documentée pour le moment
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
