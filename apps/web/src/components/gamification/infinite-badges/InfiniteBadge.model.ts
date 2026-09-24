import {
  computeLevel,
  computeBadgeRank,
  computePlacesRank,
  computeActionCreationProgress,
  computeActionCreationRank,
  BADGE_TIER_STYLES,
  nextThreshold,
  type BadgeFamily,
} from "./utils";
import { getGamificationBadgeState } from "@/components/gamification/badge-ui";

export type InfiniteBadgeModelInput = {
  icon: string;
  title: string;
  total: number;
  step: number;
  family?: BadgeFamily;
};

function resolveBadgeRank(family: BadgeFamily | undefined, level: number, total: number) {
  if (family === "lieux") return computePlacesRank(level);
  if (family === "actions") return computeActionCreationRank(total);
  return computeBadgeRank(level);
}

function resolveDisplay(rank: ReturnType<typeof resolveBadgeRank>, family: BadgeFamily | undefined, title: string, icon: string) {
  if ((family === "lieux" || family === "actions") && "title" in rank && typeof rank.title === "string" && "icon" in rank && typeof rank.icon === "string") {
    return { title: rank.title, icon: rank.icon };
  }
  return { title, icon };
}

function calculateProgress(
  actionProgression: ReturnType<typeof computeActionCreationProgress> | null,
  level: number,
  next: number,
  step: number,
  total: number,
) {
  if (actionProgression) return actionProgression.progressPercent / 100;
  const base = level * step;
  if (next <= base) return 0;
  return Math.max(0, Math.min(1, (Math.max(0, total) - base) / (next - base)));
}

export function buildInfiniteBadgeModel({ icon, title, total, step, family }: InfiniteBadgeModelInput) {
  const actionProgression = family === "actions" ? computeActionCreationProgress(total) : null;
  const genericLevel = computeLevel(total, step);
  const level = actionProgression?.currentGrade.threshold ?? genericLevel;
  const rank = resolveBadgeRank(family, level, total);
  const display = resolveDisplay(rank, family, title, icon);
  const next = actionProgression?.nextGrade?.threshold ?? nextThreshold(level, step);
  const progress = calculateProgress(actionProgression, level, next, step, total);

  return {
    level,
    rank,
    styles: BADGE_TIER_STYLES[rank.tier],
    state: getGamificationBadgeState(total, actionProgression?.currentGrade.threshold ?? level * step),
    displayTitle: display.title,
    displayIcon: display.icon,
    displayRank: `${rank.grade}${rank.subGrade ? ` ${rank.subGrade}` : ""}`.trim(),
    next,
    progress,
  };
}
