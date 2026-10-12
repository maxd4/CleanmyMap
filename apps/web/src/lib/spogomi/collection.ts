import { CURRENT_SPOGOMI_BADGE_DEFINITIONS } from "@/lib/gamification/badge-catalog";
import type { SpogomiSpecializedProgress } from "./progress";

export type SpogomiCollectionAwardStatus = "active" | "revoked" | "replaced";

export type SpogomiCollectionAward = {
  id: string;
  eventId: string;
  badgeTypeId: string;
  eventYear: number;
  eventLocalDate: string;
  awardedAt: string;
  proofReference?: string;
  certificationReference?: string;
  rankingVersion: string | null;
  status: SpogomiCollectionAwardStatus;
  eventName: string;
  eventSlug: string | null;
  eventState: string;
  eventPublic: boolean;
};

export type SpogomiCollection = {
  awards: SpogomiCollectionAward[];
  spogomiAwardCount: number;
  spogomiDistinctBadgeTypes: number;
  spogomiEventsParticipated: number;
  collectorProgress: SpogomiSpecializedProgress;
  refereeProgress: SpogomiSpecializedProgress;
};

export type SpogomiBadgePresentation = {
  label: string;
  family: "collector" | "referee" | "organizer" | "points" | "butts" | "double" | "other";
  roleOrRank: string;
  icon: "collector" | "referee" | "organizer" | "points" | "butts" | "double" | "badge";
  tone: "emerald" | "sky" | "amber" | "violet" | "rose" | "slate";
};

const BADGE_PRESENTATIONS: Record<string, Omit<SpogomiBadgePresentation, "label">> = {
  spogomi_collector: { family: "collector", roleOrRank: "Collecte terrain", icon: "collector", tone: "emerald" },
  spogomi_referee: { family: "referee", roleOrRank: "Arbitrage certifié", icon: "referee", tone: "sky" },
  spogomi_organizer: { family: "organizer", roleOrRank: "Organisation certifiée", icon: "organizer", tone: "violet" },
  spogomi_points_bronze: { family: "points", roleOrRank: "Podium points · 3e", icon: "points", tone: "amber" },
  spogomi_points_silver: { family: "points", roleOrRank: "Podium points · 2e", icon: "points", tone: "slate" },
  spogomi_points_gold: { family: "points", roleOrRank: "Podium points · 1er", icon: "points", tone: "amber" },
  spogomi_butts_bronze: { family: "butts", roleOrRank: "Podium mégots · 3e", icon: "butts", tone: "rose" },
  spogomi_butts_silver: { family: "butts", roleOrRank: "Podium mégots · 2e", icon: "butts", tone: "slate" },
  spogomi_butts_gold: { family: "butts", roleOrRank: "Podium mégots · 1er", icon: "butts", tone: "rose" },
  spogomi_double_podium: { family: "double", roleOrRank: "Double podium", icon: "double", tone: "violet" },
};

export function getSpogomiBadgePresentation(badgeTypeId: string): SpogomiBadgePresentation {
  const definition = CURRENT_SPOGOMI_BADGE_DEFINITIONS.find((candidate) => candidate.id === badgeTypeId);
  const presentation = BADGE_PRESENTATIONS[badgeTypeId] ?? {
    family: "other" as const,
    roleOrRank: "Distinction SPOGOMI",
    icon: "badge" as const,
    tone: "slate" as const,
  };
  return { label: definition?.label ?? badgeTypeId, ...presentation };
}

export function isActiveSpogomiAward(award: Pick<SpogomiCollectionAward, "status">): boolean {
  return award.status === "active";
}
