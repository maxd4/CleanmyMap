import { getSupportedChatTerritoryOptions } from "@/lib/chat/channels";

export const COMMUNITY_SUBSCRIPTION_KINDS = ["territory", "topic"] as const;
export const COMMUNITY_SUBSCRIPTION_TOPIC_IDS = ["future_actions", "needs", "results"] as const;
export const COMMUNITY_SUBSCRIPTION_CADENCES = ["daily", "weekly"] as const;

export type CommunitySubscriptionKind = (typeof COMMUNITY_SUBSCRIPTION_KINDS)[number];
export type CommunitySubscriptionTopicId = (typeof COMMUNITY_SUBSCRIPTION_TOPIC_IDS)[number];
export type CommunitySubscriptionCadence = (typeof COMMUNITY_SUBSCRIPTION_CADENCES)[number];

export type CommunitySubscriptionRow = {
  id: string;
  user_id: string;
  kind: CommunitySubscriptionKind;
  territory_zone_name: string | null;
  topic_id: CommunitySubscriptionTopicId | null;
  cadence: CommunitySubscriptionCadence;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export function normalizeCommunityTerritory(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLocaleLowerCase("fr-FR");
  if (!normalized) return null;
  return getSupportedChatTerritoryOptions().find((option) =>
    option.value.toLocaleLowerCase("fr-FR") === normalized ||
    option.label.toLocaleLowerCase("fr-FR") === normalized,
  )?.value ?? null;
}

export function normalizeCommunitySubscriptionTarget(input: {
  kind: CommunitySubscriptionKind;
  territoryZoneName?: unknown;
  topicId?: unknown;
}):
  | { ok: true; kind: "territory"; territoryZoneName: string; topicId: null }
  | { ok: true; kind: "topic"; territoryZoneName: null; topicId: CommunitySubscriptionTopicId }
  | { ok: false; error: "invalid_target" } {
  if (input.kind === "territory") {
    const territoryZoneName = normalizeCommunityTerritory(input.territoryZoneName);
    return territoryZoneName && input.topicId == null
      ? { ok: true, kind: "territory", territoryZoneName, topicId: null }
      : { ok: false, error: "invalid_target" };
  }

  return COMMUNITY_SUBSCRIPTION_TOPIC_IDS.includes(input.topicId as CommunitySubscriptionTopicId) &&
    input.territoryZoneName == null
    ? { ok: true, kind: "topic", territoryZoneName: null, topicId: input.topicId as CommunitySubscriptionTopicId }
    : { ok: false, error: "invalid_target" };
}
