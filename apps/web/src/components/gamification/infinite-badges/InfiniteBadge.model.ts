import {
  computeLevel,
  computeBadgeRank,
  computeActionCreationProgress,
  computeActionCreationRank,
  computeModerationBadgeProgress,
  BADGE_TIER_STYLES,
  nextThreshold,
  canonicalBadgeFamily,
  type BadgeFamily,
} from "./utils";
import {
  computeExplorerBadgeRank,
  computeExplorerProgression,
} from "@/lib/gamification/badges/families";
import { getGamificationBadgeState } from "@/components/gamification/badge-ui";

export type InfiniteBadgeModelInput = {
  icon: string;
  title: string;
  total: number;
  step: number;
  family?: BadgeFamily;
};

function resolveBadgeRank(family: BadgeFamily | undefined, level: number, total: number) {
  const canonicalFamily = canonicalBadgeFamily(family);
  if (canonicalFamily === "explorer") return computeExplorerBadgeRank(total);
  if (canonicalFamily === "organisation") return computeActionCreationRank(total);
  return computeBadgeRank(level);
}

function resolveDisplay(rank: ReturnType<typeof resolveBadgeRank>, family: BadgeFamily | undefined, title: string, icon: string) {
  const canonicalFamily = canonicalBadgeFamily(family);
  if ((canonicalFamily === "explorer" || canonicalFamily === "organisation") && "title" in rank && typeof rank.title === "string" && "icon" in rank && typeof rank.icon === "string") {
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

function resolveFamilyProgressions(canonicalFamily: string | undefined, total: number) {
  const explorerProgression = canonicalFamily === "explorer" ? computeExplorerProgression(total) : null;
  const actionProgression = canonicalFamily === "organisation" ? computeActionCreationProgress(total) : null;
  const moderationProgression = canonicalFamily === "moderation" ? computeModerationBadgeProgress(total) : null;
  return { explorerProgression, specialProgression: actionProgression ?? moderationProgression };
}

function resolveProgressionThresholds(
  explorerProgression: ReturnType<typeof resolveFamilyProgressions>["explorerProgression"],
  specialProgression: ReturnType<typeof resolveFamilyProgressions>["specialProgression"],
  total: number,
  step: number,
) {
  const level = specialProgression?.currentGrade.threshold ?? explorerProgression?.currentTier.min ?? computeLevel(total, step);
  return {
    level,
    next: specialProgression?.nextGrade?.threshold ?? explorerProgression?.nextTier?.min ?? nextThreshold(level, step),
  };
}

function resolveProgressionIdentity(
  canonicalFamily: string | undefined,
  explorerProgression: ReturnType<typeof resolveFamilyProgressions>["explorerProgression"],
  specialProgression: ReturnType<typeof resolveFamilyProgressions>["specialProgression"],
) {
  return {
    currentBadgeId: explorerProgression?.currentTier.id ?? specialProgression?.currentGrade.id ?? canonicalFamily ?? null,
    nextBadgeId: explorerProgression?.nextTier?.id ?? specialProgression?.nextGrade?.id ?? null,
    displayRank: specialProgression?.currentLabel ?? explorerProgression?.currentTier.title,
  };
}

function resolveProgressionMetrics(canonicalFamily: string | undefined, total: number, step: number) {
  const { explorerProgression, specialProgression } = resolveFamilyProgressions(canonicalFamily, total);
  const { level, next } = resolveProgressionThresholds(explorerProgression, specialProgression, total, step);
  const progress = explorerProgression
    ? explorerProgression.progressPercent * 0.01
    : calculateProgress(specialProgression, level, next, step, total);

  return {
    explorerProgression,
    specialProgression,
    level,
    next,
    progress,
    ...resolveProgressionIdentity(canonicalFamily, explorerProgression, specialProgression),
  };
}

export function buildInfiniteBadgeModel({ icon, title, total, step, family }: InfiniteBadgeModelInput) {
  const canonicalFamily = canonicalBadgeFamily(family);
  const progression = resolveProgressionMetrics(canonicalFamily, total, step);
  const rank = resolveBadgeRank(family, progression.level, total);
  const display = resolveDisplay(rank, family, title, icon);

  return {
    level: progression.level,
    currentBadgeId: progression.currentBadgeId,
    nextBadgeId: progression.nextBadgeId,
    rank,
    styles: BADGE_TIER_STYLES[rank.tier],
    state: getGamificationBadgeState(total, progression.specialProgression?.currentGrade.threshold ?? progression.level * step),
    displayTitle: display.title,
    displayIcon: display.icon,
    displayRank: progression.displayRank ?? `${rank.grade}${rank.subGrade ? ` ${rank.subGrade}` : ""}`.trim(),
    next: progression.next,
    progress: progression.progress,
  };
}
