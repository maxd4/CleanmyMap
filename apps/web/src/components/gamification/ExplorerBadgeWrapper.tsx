"use client";
import React from "react";
import { useAuth } from "@clerk/nextjs";
import ExplorerBadge from "./ExplorerBadge";
import { announceGamificationGain } from "@/lib/gamification/announcements";
import { EXPLORER_TIERS } from "@/lib/gamification/badges/families";
import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ExplorerBadgeWrapper({ userId }: { userId: string }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const tiers = React.useMemo(
    () =>
      EXPLORER_TIERS.map((tier) => ({
        id: tier.id,
        title: tier.title,
        icon: tier.icon,
        min: tier.min,
        max: tier.max,
        texture: tier.texture,
      })),
    [],
  );
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;

    async function loadExplorerCount() {
      if (!isLoaded || !isSignedIn || !userId) {
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient(
          buildClerkSupabaseAccessTokenProvider(getToken),
        );

        const { count } = await supabase
          .from("user_visited_places")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (!mounted) {
          return;
        }

        setCurrent(Number(count ?? 0));
      } catch {
        if (mounted) {
          setCurrent(0);
        }
      }
    }

    void loadExplorerCount();

    return () => {
      mounted = false;
    };
  }, [getToken, isLoaded, isSignedIn, userId]);

  return (
      <ExplorerBadge
      tiers={tiers}
      current={current}
      onTierReached={(tier) => {
        announceGamificationGain({
          title: "Palier d'exploration atteint",
          message: `${tier.title} débloqué sur les zones visitées.`,
          tone: "explorer",
          icon: tier.icon,
          source: "explorer-badge",
          dedupeKey: `explorer:${tier.id}`,
        });
      }}
    />
  );
}
