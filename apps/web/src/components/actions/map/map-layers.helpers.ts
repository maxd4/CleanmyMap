import type { ActionMapItem } from "@/lib/actions/types";
import { mapItemCigaretteButts, mapItemWasteKg } from "@/lib/actions/data-contract";
import { resolveItemPollutionScores } from "@/components/actions/map-marker-categories";
import type { PollutionScoreReferences } from "@/lib/actions/pollution-score";

export function formatNumber(value: number, suffix = ""): string {
  return `${value.toLocaleString("fr-FR")}${suffix}`;
}

export function formatThresholdScore(value: number): string {
  return `${value.toFixed(1)}/100`;
}

export function getInfrastructureReading(
  item: ActionMapItem,
  references?: PollutionScoreReferences | null,
) {
  const wasteKg = mapItemWasteKg(item) ?? 0;
  const butts = mapItemCigaretteButts(item) ?? 0;
  const pollutionScores = resolveItemPollutionScores(item, references);
  const wasteScore = pollutionScores.wasteScore;
  const buttsScore = pollutionScores.buttsScore;
  const needsBin = wasteScore >= 75;
  const needsAshtray = buttsScore >= 75;
  const needLabel =
    needsBin && needsAshtray
      ? "Combiné"
      : needsAshtray
        ? "Cendrier de rue"
        : "Bac de collecte";
  const priorityLabel = needsBin && needsAshtray ? "Double besoin" : "Critique";

  return {
    wasteKg,
    butts,
    wasteScore,
    buttsScore,
    needsBin,
    needsAshtray,
    needLabel,
    priorityLabel,
  };
}
