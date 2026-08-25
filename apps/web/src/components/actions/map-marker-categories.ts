import type { ActionMapItem } from"@/lib/actions/types";
import {
 mapItemCigaretteButts,
 mapItemObservedAt,
 mapItemPostActionPollutionScore,
 mapItemType,
 mapItemWasteKg,
} from"../../lib/actions/data-contract";
import {
  computePollutionScoresRelativeToReferences,
  computeButtsContributionScore,
  computeWasteContributionScore,
 type PollutionScoreReferences,
} from"@/lib/actions/pollution-score";
import { presentActionPollutionProjection } from "@/lib/actions/revisit-priority";

export type MarkerCategory =
 |"orange"
 |"red"
 |"violet"
 |"black"
 |"green"
 |"blue"
 |"ashtray"
 |"bin"
 |"combo";

export type InfrastructureNeed ="ashtray" |"bin" |"combo";
export const INFRASTRUCTURE_ALERT_THRESHOLD = 75;

export const SCORE_THRESHOLDS = {
 CRITICAL: 80,
 STRONG: 60,
 MEDIUM: 30,
};

export const ACTION_POLLUTION_COLOR_THRESHOLDS = {
 BLUE: 0,
 ORANGE: SCORE_THRESHOLDS.MEDIUM,
 RED: SCORE_THRESHOLDS.STRONG,
 VIOLET: SCORE_THRESHOLDS.CRITICAL,
 BLACK: 100,
} as const;

export const COLOR_TOKENS = {
 BLUE: { h: 199, s: 89, l: 48 }, // Faible
 VIOLET: { h: 262, s: 80, l: 50 }, // Critique
 RED: { h: 2, s: 82, l: 62 }, // Fort (rouge clair)
 ORANGE: { h: 35, s: 90, l: 50 }, // Moyen
 GREEN: { h: 142, s: 70, l: 45 }, // Lieu propre explicite
 BLACK: { h: 0, s: 0, l: 8 }, // Pollution extrême
};

export const ACTION_POLLUTION_COLOR_STOPS = [
 { key: "blue", label: "Bleu · pollution faible", threshold: ACTION_POLLUTION_COLOR_THRESHOLDS.BLUE, token: COLOR_TOKENS.BLUE },
 { key: "orange", label: "Orange · pollution moyenne", threshold: ACTION_POLLUTION_COLOR_THRESHOLDS.ORANGE, token: COLOR_TOKENS.ORANGE },
 { key: "red", label: "Rouge · pollution forte", threshold: ACTION_POLLUTION_COLOR_THRESHOLDS.RED, token: COLOR_TOKENS.RED },
 { key: "violet", label: "Violet · pollution critique", threshold: ACTION_POLLUTION_COLOR_THRESHOLDS.VIOLET, token: COLOR_TOKENS.VIOLET },
 { key: "black", label: "Noir · pollution extrême", threshold: ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK, token: COLOR_TOKENS.BLACK },
] as const;

export const DEFAULT_VISIBLE_CATEGORIES: Record<MarkerCategory, boolean> = {
 orange: true,
 red: true,
 violet: true,
 black: true,
 green: true,
 blue: true,
 ashtray: true,
 bin: true,
 combo: true,
};

export function resolveItemPollutionScores(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
): {
 wasteScore: number;
 buttsScore: number;
 severityScore: number;
} {
 if (references) {
 const pollutionScores = computePollutionScoresRelativeToReferences(
 {
 wasteKg: mapItemWasteKg(item),
 cigaretteButts: mapItemCigaretteButts(item),
 volunteersCount: item.contract?.metadata.volunteersCount,
 },
 references,
 );

 return pollutionScores;
 }

 const wasteScore =
 typeof item.waste_pollution_score === "number"
 ? item.waste_pollution_score
 : computeWasteContributionScore(mapItemWasteKg(item));
 const buttsScore =
 typeof item.cigarette_butts_pollution_score === "number"
 ? item.cigarette_butts_pollution_score
 : computeButtsContributionScore(mapItemCigaretteButts(item));

 return {
 wasteScore,
 buttsScore,
 severityScore: Math.max(wasteScore, buttsScore),
 };
}

export function resolveDynamicColor(score: number): string {
 const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
 const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0));
 const stops = ACTION_POLLUTION_COLOR_STOPS;
 const upperIndex = stops.findIndex((stop) => normalizedScore <= stop.threshold);
 const index = upperIndex <= 0 ? 1 : upperIndex;
 const lower = stops[index - 1];
 const upper = stops[index];
 const span = upper.threshold - lower.threshold;
 const t = span === 0 ? 1 : (normalizedScore - lower.threshold) / span;
 const h = lerp(lower.token.h, upper.token.h, t);
 const s = lerp(lower.token.s, upper.token.s, t);
 const l = lerp(lower.token.l, upper.token.l, t);
 return `hsl(${h}, ${s}%, ${l}%)`;
}

export const CLEAN_PLACE_COLOR = `hsl(${COLOR_TOKENS.GREEN.h}, ${COLOR_TOKENS.GREEN.s}%, ${COLOR_TOKENS.GREEN.l}%)`;

function resolveCategoryScore(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
 now: string | Date | number = new Date(),
): number {
 const observedScore = resolveItemPollutionScores(item, references).severityScore;
 return mapItemType(item) === "action"
  ? presentActionPollutionProjection(
      observedScore,
      mapItemObservedAt(item),
      now,
      { postActionScore: mapItemPostActionPollutionScore(item) },
    ).projectedPollutionScore
  : observedScore;
}

export function classifyPollutionColor(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
 now: string | Date | number = new Date(),
): Exclude<MarkerCategory,"ashtray" |"bin"> {
 const wasteKg = mapItemWasteKg(item);
 const butts = mapItemCigaretteButts(item);
 const score = resolveCategoryScore(item, references, now);

 if (mapItemType(item) === "clean_place") return"green";
 if (score >= ACTION_POLLUTION_COLOR_THRESHOLDS.BLACK) return"black";
 if (score >= ACTION_POLLUTION_COLOR_THRESHOLDS.VIOLET) return"violet";
 if (score >= ACTION_POLLUTION_COLOR_THRESHOLDS.RED) return"red";
 if (score >= ACTION_POLLUTION_COLOR_THRESHOLDS.ORANGE) return"orange";
 if ((wasteKg ?? 0) <= 0 && (butts ?? 0) <= 0) return"blue";
 return"blue";
}

export function deriveMarkerCategories(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
): MarkerCategory[] {
 const categories: MarkerCategory[] = [classifyPollutionColor(item, references)];
 const infrastructureNeed = resolveInfrastructureNeed(item, references);

 if (infrastructureNeed) {
 categories.push(infrastructureNeed);
 }

 return categories;
}

export function resolveInfrastructureNeed(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
): InfrastructureNeed | null {
 const pollutionScores = resolveItemPollutionScores(item, references);
 const wasteScore = pollutionScores.wasteScore;
 const buttsScore = pollutionScores.buttsScore;
 const needsBin = wasteScore >= INFRASTRUCTURE_ALERT_THRESHOLD;
 const needsAshtray = buttsScore >= INFRASTRUCTURE_ALERT_THRESHOLD;

 if (needsBin && needsAshtray) {
 return"combo";
 }
 if (needsAshtray) {
 return"ashtray";
 }
 if (needsBin) {
 return"bin";
 }
 return null;
}

export function resolveInfrastructureEmoji(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
): string | null {
 const need = resolveInfrastructureNeed(item, references);
 if (need ==="combo") {
 return"💰";
 }
 if (need ==="ashtray") {
 return"🚬";
 }
 if (need ==="bin") {
 return"🗑️";
 }
 return null;
}

export function isVisibleWithCategoryFilter(
 item: ActionMapItem,
 visibleCategories: Record<MarkerCategory, boolean>,
 references?: PollutionScoreReferences | null,
): boolean {
 const categories = deriveMarkerCategories(item, references);
 return categories.some((category) => visibleCategories[category]);
}
