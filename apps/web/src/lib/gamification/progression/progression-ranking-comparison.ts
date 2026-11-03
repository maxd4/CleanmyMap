import type { IndividualLeaderboardItem, LeaderboardMetric } from "./progression-types";

function comparePublicLabels(left: string, right: string): number {
  return left.localeCompare(right, "fr-FR", { sensitivity: "base" }) || left.localeCompare(right);
}

export function compareLeaderboardItems(
  a: IndividualLeaderboardItem,
  b: IndividualLeaderboardItem,
  metric: LeaderboardMetric,
): number {
  if (metric === "xp") {
    return b.xpValidated - a.xpValidated || b.level - a.level || b.badgeTotal - a.badgeTotal || comparePublicLabels(a.publicLabel, b.publicLabel);
  }
  if (metric === "badges") {
    return b.badgeTotal - a.badgeTotal || b.gradeCount - a.gradeCount || b.oneShotCount - a.oneShotCount || b.xpValidated - a.xpValidated || b.level - a.level || comparePublicLabels(a.publicLabel, b.publicLabel);
  }
  return b.level - a.level || b.xpValidated - a.xpValidated || b.badgeTotal - a.badgeTotal || comparePublicLabels(a.publicLabel, b.publicLabel);
}
