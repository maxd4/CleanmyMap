import type { ActionMapItem } from "@/lib/actions/types";
import {
  mapItemCigaretteButts,
  mapItemWasteKg,
} from "../../lib/actions/data-contract";
import {
  computeButtsContributionScore,
  computePollutionScore,
  computeWasteContributionScore,
} from "@/lib/actions/pollution-score";

export type MarkerCategory =
  | "yellow"
  | "violet"
  | "green"
  | "blue"
  | "ashtray"
  | "bin"
  | "combo";

export type InfrastructureNeed = "ashtray" | "bin" | "combo";
export const INFRASTRUCTURE_ALERT_THRESHOLD = 75;

export const SCORE_THRESHOLDS = {
  CRITICAL: 80,
  STRONG: 60,
  MEDIUM: 30,
};

export const COLOR_TOKENS = {
  VIOLET: { h: 262, s: 80, l: 50 }, // Critique
  RED: { h: 2, s: 82, l: 62 }, // Fort (rouge clair)
  ORANGE: { h: 35, s: 90, l: 50 }, // Moyen
  GREEN: { h: 142, s: 70, l: 45 },  // Faible (Standard)
};

export const DEFAULT_VISIBLE_CATEGORIES: Record<MarkerCategory, boolean> = {
  yellow: true,
  violet: true,
  green: true,
  blue: true,
  ashtray: true,
  bin: true,
  combo: true,
};

export function resolveDynamicOpacity(score: number): number {
  if (score >= SCORE_THRESHOLDS.CRITICAL) return 1.0;
  if (score >= SCORE_THRESHOLDS.STRONG) return 0.8;
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 0.6;
  return Math.max(0.3, Math.min(0.5, (score / SCORE_THRESHOLDS.MEDIUM) * 0.5));
}

export function resolveDynamicColor(score: number): string {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const opacity = resolveDynamicOpacity(score);

  if (score >= SCORE_THRESHOLDS.CRITICAL) {
    return `hsla(${COLOR_TOKENS.VIOLET.h}, ${COLOR_TOKENS.VIOLET.s}%, ${COLOR_TOKENS.VIOLET.l}%, ${opacity})`;
  }
  
  if (score >= SCORE_THRESHOLDS.STRONG) {
    const t = (score - SCORE_THRESHOLDS.STRONG) / (SCORE_THRESHOLDS.CRITICAL - SCORE_THRESHOLDS.STRONG);
    const h = lerp(COLOR_TOKENS.RED.h, COLOR_TOKENS.VIOLET.h, t);
    const s = lerp(COLOR_TOKENS.RED.s, COLOR_TOKENS.VIOLET.s, t);
    const l = lerp(COLOR_TOKENS.RED.l, COLOR_TOKENS.VIOLET.l, t);
    return `hsla(${h}, ${s}%, ${l}%, ${opacity})`;
  }

  if (score >= SCORE_THRESHOLDS.MEDIUM) {
    const t = (score - SCORE_THRESHOLDS.MEDIUM) / (SCORE_THRESHOLDS.STRONG - SCORE_THRESHOLDS.MEDIUM);
    const h = lerp(COLOR_TOKENS.ORANGE.h, COLOR_TOKENS.RED.h, t);
    const s = lerp(COLOR_TOKENS.ORANGE.s, COLOR_TOKENS.RED.s, t);
    const l = lerp(COLOR_TOKENS.ORANGE.l, COLOR_TOKENS.RED.l, t);
    return `hsla(${h}, ${s}%, ${l}%, ${opacity})`;
  }

  const t = Math.min(1, Math.max(0, score / SCORE_THRESHOLDS.MEDIUM));
  const h = lerp(COLOR_TOKENS.GREEN.h, COLOR_TOKENS.ORANGE.h, t);
  const s = lerp(COLOR_TOKENS.GREEN.s, COLOR_TOKENS.ORANGE.s, t);
  const l = lerp(COLOR_TOKENS.GREEN.l, COLOR_TOKENS.ORANGE.l, t);
  return `hsla(${h}, ${s}%, ${l}%, ${opacity})`;
}

export function classifyPollutionColor(
  item: ActionMapItem,
): Exclude<MarkerCategory, "ashtray" | "bin"> {
  const wasteKg = mapItemWasteKg(item);
  const butts = mapItemCigaretteButts(item);
  const score = computePollutionScore({
    wasteKg,
    cigaretteButts: butts,
  });

  if (score >= SCORE_THRESHOLDS.CRITICAL) return "violet";
  if (score >= SCORE_THRESHOLDS.MEDIUM) return "yellow";
  if ((wasteKg ?? 0) <= 0 && (butts ?? 0) <= 0) return "blue";
  return "green";
}

export function deriveMarkerCategories(item: ActionMapItem): MarkerCategory[] {
  const categories: MarkerCategory[] = [classifyPollutionColor(item)];
  const infrastructureNeed = resolveInfrastructureNeed(item);

  if (infrastructureNeed) {
    categories.push(infrastructureNeed);
  }

  return categories;
}

export function resolveInfrastructureNeed(
  item: ActionMapItem,
): InfrastructureNeed | null {
  const wasteScore = computeWasteContributionScore(mapItemWasteKg(item));
  const buttsScore = computeButtsContributionScore(mapItemCigaretteButts(item));
  const needsBin = wasteScore >= INFRASTRUCTURE_ALERT_THRESHOLD;
  const needsAshtray = buttsScore >= INFRASTRUCTURE_ALERT_THRESHOLD;

  if (needsBin && needsAshtray) {
    return "combo";
  }
  if (needsAshtray) {
    return "ashtray";
  }
  if (needsBin) {
    return "bin";
  }
  return null;
}

export function resolveInfrastructureEmoji(item: ActionMapItem): string | null {
  const need = resolveInfrastructureNeed(item);
  if (need === "combo") {
    return "💰";
  }
  if (need === "ashtray") {
    return "🚬";
  }
  if (need === "bin") {
    return "🗑️";
  }
  return null;
}

export function isVisibleWithCategoryFilter(
  item: ActionMapItem,
  visibleCategories: Record<MarkerCategory, boolean>,
): boolean {
  const categories = deriveMarkerCategories(item);
  return categories.some((category) => visibleCategories[category]);
}
