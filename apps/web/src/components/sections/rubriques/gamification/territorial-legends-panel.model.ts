import {
  TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS,
} from "@/lib/gamification/territorial-legends/rewards";
import {
  TERRITORIAL_LEGEND_LEVELS,
  type TerritorialLegendLevel,
} from "@/lib/gamification/territorial-legends/types";
import type { TerritorialLegendOverviewItem } from "@/lib/gamification/territorial-legends/overview";

export type TerritorialRewardStep = {
  id: "conquest" | "season_end" | `longevity:${number}`;
  awardKind: "conquest" | "longevity" | "season_end";
  thresholdDays: number;
  label: string;
  description: string;
};

export const TERRITORIAL_LEVEL_LABELS: Record<TerritorialLegendLevel, string> = {
  arrondissement: "Arrondissement municipal",
  commune: "Commune",
  department: "Département ou équivalent",
  region: "Région ou équivalent",
  country: "France entière",
};

export const TERRITORIAL_REWARD_STEPS: TerritorialRewardStep[] = [
  {
    id: "conquest",
    awardKind: "conquest",
    thresholdDays: 0,
    label: "Première conquête",
    description: "Devenir détenteur confirmé d’un territoire.",
  },
  ...TERRITORIAL_LEGEND_LONGEVITY_THRESHOLDS.map((thresholdDays) => ({
    id: `longevity:${thresholdDays}` as const,
    awardKind: "longevity" as const,
    thresholdDays,
    label: `${thresholdDays} jours de détention`,
    description: "Détention confirmée sans interruption par la réconciliation quotidienne.",
  })),
  {
    id: "season_end",
    awardKind: "season_end",
    thresholdDays: 0,
    label: "Fin de saison",
    description: "Détenteur confirmé au 31 décembre, récompense remise après la clôture civile.",
  },
];

export type TerritorialRewardStatus = "acquis" | "en_cours" | "non_acquis";

export function getTerritorialLevelLabel(level: TerritorialLegendLevel): string {
  return TERRITORIAL_LEVEL_LABELS[level];
}

export function getTerritorialRewardStatus(
  territory: TerritorialLegendOverviewItem,
  step: TerritorialRewardStep,
): TerritorialRewardStatus {
  const acquired = territory.rewards.some((reward) =>
    reward.validityStatus === "active" &&
    reward.awardKind === step.awardKind &&
    reward.thresholdDays === step.thresholdDays,
  );
  if (acquired) return "acquis";

  if (step.awardKind === "conquest") {
    return territory.currentHold || (territory.private?.score ?? 0) > 0 ? "en_cours" : "non_acquis";
  }

  if (territory.currentHold && step.awardKind === "longevity") {
    return territory.currentHold.days < step.thresholdDays ? "en_cours" : "non_acquis";
  }
  if (territory.currentHold && step.awardKind === "season_end") return "en_cours";
  return "non_acquis";
}

export function getConquestStatus(
  territories: TerritorialLegendOverviewItem[],
  level: TerritorialLegendLevel,
): TerritorialRewardStatus {
  const scoped = territories.filter((territory) => territory.level === level);
  if (scoped.some((territory) => getTerritorialRewardStatus(territory, TERRITORIAL_REWARD_STEPS[0]) === "acquis")) {
    return "acquis";
  }
  return scoped.some((territory) => getTerritorialRewardStatus(territory, TERRITORIAL_REWARD_STEPS[0]) === "en_cours")
    ? "en_cours"
    : "non_acquis";
}

export function getTerritorialStatusLabel(status: TerritorialRewardStatus): string {
  if (status === "acquis") return "Acquis";
  if (status === "en_cours") return "En cours";
  return "Non acquis";
}

export function isTerritorialLegendLevel(value: unknown): value is TerritorialLegendLevel {
  return typeof value === "string" && (TERRITORIAL_LEGEND_LEVELS as readonly string[]).includes(value);
}
