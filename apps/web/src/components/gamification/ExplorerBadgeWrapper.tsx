"use client";
import React from "react";
import ExplorerBadge from "./ExplorerBadge";
import { dispatchGamificationCelebration } from "@/lib/gamification/celebration";
import { EXPLORER_TIERS } from "@/lib/gamification/badges/families";
import { loadGamificationBadgesListClient } from "@/lib/gamification/badges/badge-list-client";

export default function ExplorerBadgeWrapper({ userId }: { userId: string }) {
  const [tiers, setTiers] = React.useState<
    Array<{ id: string; title: string; icon: string; min: number; max: number; texture?: string }>
  >([]);
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    loadGamificationBadgesListClient()
      .then((body) => {
        if (!mounted) return;
        const explorerTiers = EXPLORER_TIERS.map((tier) => ({
          id: tier.id,
          title: tier.title,
          icon: tier.icon,
          min: tier.min,
          max: tier.max,
          texture: tier.texture,
        }));
        setTiers(explorerTiers);
        setCurrent(Number(body.summary?.currentPlaces ?? 0));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [userId]);

  return (
    <ExplorerBadge
      tiers={tiers}
      current={current}
      onTierReached={(tier) => {
        dispatchGamificationCelebration({
          title: "Palier d'exploration atteint",
          message: `${tier.title} débloqué sur les zones visitées.`,
          tone: "explorer",
          icon: tier.icon,
          source: "explorer-badge",
        });
      }}
    />
  );
}
