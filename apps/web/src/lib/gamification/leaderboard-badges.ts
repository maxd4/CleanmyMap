import { findBadgeDefinition, findBadgeDefinitionByFamily } from "./badge-catalog";
import type { GamificationCatalogItem } from "./gamification-catalog";
import { CURRENT_INFINITE_PROGRESSIONS } from "./current-progressions";

export type CurrentLeaderboardBadgeCounts = {
  badgeTotal: number;
  gradeCount: number;
  oneShotCount: number;
};

function isPublicCurrentDefinition(item: GamificationCatalogItem): boolean {
  const definition = item.kind === "progression"
    ? findBadgeDefinitionByFamily(
        CURRENT_INFINITE_PROGRESSIONS.find((progression) => progression.id === item.id)?.badgeFamily ?? "",
      )
    : findBadgeDefinition(item.id);

  return Boolean(
    definition &&
      definition.status === "CURRENT" &&
      definition.visibility !== "authorized_moderation" &&
      definition.visibility !== "not_exposed",
  );
}

/** Counts only acquired, public CURRENT grades and one-shot milestones. */
export function countCurrentLeaderboardBadges(
  catalog: readonly GamificationCatalogItem[],
): CurrentLeaderboardBadgeCounts {
  const gradeIds = new Set<string>();
  const oneShotIds = new Set<string>();

  for (const item of catalog) {
    if (!isPublicCurrentDefinition(item)) continue;

    if (item.kind === "progression" && item.progression) {
      const tiers = [
        ...item.progression.previousTiers,
        item.progression.currentTier,
      ];

      for (const tier of tiers) {
        if (tier.threshold <= 0 || !tier.achieved) continue;
        gradeIds.add(`${item.id}:${tier.id}`);
      }
      continue;
    }

    if (item.kind === "milestone" && item.milestone?.achieved) {
      oneShotIds.add(item.id);
    }
  }

  const gradeCount = gradeIds.size;
  const oneShotCount = oneShotIds.size;
  return {
    badgeTotal: gradeCount + oneShotCount,
    gradeCount,
    oneShotCount,
  };
}
