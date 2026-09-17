import type { ActionMapItem } from"@/lib/actions/types";
import type { ActionDataContract } from "@/lib/actions/contracts/contract-model";
import {
 mapItemCigaretteButts,
 mapItemType,
 mapItemWasteKg,
} from"../../lib/actions/data-contract";
import type { PollutionScoreReferences, PollutionScoreScope } from"@/lib/actions/pollution/pollution-score";
import type {
 CurrentPlaceState,
 CurrentPlaceStateMode,
} from "@/lib/actions/pollution/current-place-state";
import { resolveActionPollutionScore } from "./map/pollution-score-scope";

export type MarkerCategory =
 |"orange"
 |"red"
 |"violet"
 |"black"
 |"green"
 |"blue"
 |"unavailable"
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
 BLUE: { h: 199, s: 89, l: 48 }, // Premier seuil de pollution
 VIOLET: { h: 262, s: 80, l: 50 }, // Critique
 RED: { h: 2, s: 82, l: 62 }, // Fort (rouge clair)
 ORANGE: { h: 35, s: 90, l: 50 }, // Moyen
 GREEN: { h: 142, s: 70, l: 45 }, // Lieu propre explicite
 BLACK: { h: 0, s: 0, l: 8 }, // Pollution extrême
};

export const ACTION_POLLUTION_COLOR_STOPS = [
 { key: "blue", label: "Bleu · premier seuil de pollution", threshold: ACTION_POLLUTION_COLOR_THRESHOLDS.BLUE, token: COLOR_TOKENS.BLUE },
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
 unavailable: true,
 ashtray: true,
 bin: true,
 combo: true,
};

export function resolveItemPollutionScores(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
): {
 wasteScore: number | null;
 buttsScore: number | null;
 severityScore: number | null;
} {
 const score = resolveActionPollutionScore(item, references, {
   scope: "global",
 });

 return {
   wasteScore: score.wasteScore,
   buttsScore: score.buttsScore,
   severityScore: score.score,
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
export const TRASH_SPOTTER_NEUTRAL_COLOR = "#64748b";

export type MarkerCategoryResolutionOptions = {
 displayMode?: CurrentPlaceStateMode;
 scoreScope?: PollutionScoreScope;
 now?: string | Date | number;
 currentPlaceState?: CurrentPlaceState | null;
};

function resolveCategoryScore(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
 options: MarkerCategoryResolutionOptions = {},
): number | null {
 const itemType = mapItemType(item);
 if (itemType === "clean_place") {
   return null;
 }

 if (itemType === "spot") {
   const contractScore = (item.contract as unknown as ActionDataContract | undefined)
     ?.metadata.observedPollutionScore;
   return typeof contractScore === "number" && Number.isFinite(contractScore)
     ? contractScore
     : null;
 }

 return resolveActionPollutionScore(item, references, {
   scope: options.scoreScope ?? "global",
   now: options.now ?? new Date(),
   displayMode: options.displayMode ?? "projected_today",
   currentPlaceState: options.currentPlaceState ?? null,
 }).score;
}

export function classifyPollutionColor(
 item: ActionMapItem,
 references?: PollutionScoreReferences | null,
 options: MarkerCategoryResolutionOptions = {},
): Exclude<MarkerCategory,"ashtray" |"bin" | "combo"> {
 const wasteKg = mapItemWasteKg(item);
 const butts = mapItemCigaretteButts(item);
 const score = resolveCategoryScore(item, references, options);

 if (mapItemType(item) === "clean_place") return"green";
 if (score === null) return"unavailable";
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
 options: MarkerCategoryResolutionOptions = {},
): MarkerCategory[] {
 const categories: MarkerCategory[] = [classifyPollutionColor(item, references, options)];
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
 const needsBin = wasteScore !== null && wasteScore >= INFRASTRUCTURE_ALERT_THRESHOLD;
 const needsAshtray = buttsScore !== null && buttsScore >= INFRASTRUCTURE_ALERT_THRESHOLD;

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
 options: MarkerCategoryResolutionOptions = {},
): boolean {
 const categories = deriveMarkerCategories(item, references, options);
 return categories.some((category) => visibleCategories[category]);
}
