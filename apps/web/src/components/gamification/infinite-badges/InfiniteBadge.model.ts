import {
  computeLevel,
  computeBadgeRank,
  computePlacesRank,
  computeActionCreationProgress,
  computeActionCreationRank,
  computeModerationBadgeProgress,
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
  specialProgression:
    | ReturnType<typeof computeActionCreationProgress>
    | ReturnType<typeof computeModerationBadgeProgress>
    | null,
  level: number,
  next: number,
  step: number,
  total: number,
) {
  // The badge ring consumes a 0–1 fraction; progressPercent is an internal 0–100 value.
  if (specialProgression) return specialProgression.progressPercent * 0.01;
  const base = level * step;
  if (next <= base) return 0;
  return Math.max(0, Math.min(1, (Math.max(0, total) - base) / (next - base)));
}

export function buildInfiniteBadgeModel({ icon, title, total, step, family }: InfiniteBadgeModelInput) {
  const actionProgression = family === "actions" ? computeActionCreationProgress(total) : null;
  const moderationProgression = family === "moderation" ? computeModerationBadgeProgress(total) : null;
  const specialProgression = actionProgression ?? moderationProgression;
  const genericLevel = computeLevel(total, step);
  const level = specialProgression?.currentGrade.threshold ?? genericLevel;
  const rank = resolveBadgeRank(family, level, total);
  const display = resolveDisplay(rank, family, title, icon);
  const next = specialProgression?.nextGrade?.threshold ?? nextThreshold(level, step);
  const progress = calculateProgress(specialProgression, level, next, step, total);

  return {
    level,
    rank,
    styles: BADGE_TIER_STYLES[rank.tier],
    state: getGamificationBadgeState(total, specialProgression?.currentGrade.threshold ?? level * step),
    displayTitle: display.title,
    displayIcon: display.icon,
    displayRank: specialProgression?.currentLabel ?? `${rank.grade}${rank.subGrade ? ` ${rank.subGrade}` : ""}`.trim(),
    next,
    progress,
  };
}
