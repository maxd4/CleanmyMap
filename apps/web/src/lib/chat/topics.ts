import type { ChatChannelType } from "./channels";

/** Stable topic identifiers shared by the API, database and chat UI. */
export const CHAT_TOPIC_IDS = [
  "relais_associatif",
  "appel_aux_benevoles",
  "demande_diffusion",
  "besoin_ressources",
  "coordination_secteur",
  "mon_territoire",
  "territoires_voisins",
] as const;

export type ChatTopicId = (typeof CHAT_TOPIC_IDS)[number];

/** The only channel/topic combinations accepted by the chat contract. */
export const CHAT_TOPIC_IDS_BY_CHANNEL = {
  community: [
    "relais_associatif",
    "appel_aux_benevoles",
    "demande_diffusion",
    "besoin_ressources",
    "coordination_secteur",
  ],
  territory: ["mon_territoire", "territoires_voisins"],
} as const satisfies Partial<Record<ChatChannelType, readonly ChatTopicId[]>>;

export function isChatTopicId(value: string): value is ChatTopicId {
  return (CHAT_TOPIC_IDS as readonly string[]).includes(value);
}

export function isChatTopicAllowedForChannel(
  channelType: ChatChannelType,
  topicId: string | null | undefined,
): topicId is ChatTopicId {
  if (!topicId) {
    return false;
  }

  const allowedTopicIds = (
    CHAT_TOPIC_IDS_BY_CHANNEL as Partial<
      Record<ChatChannelType, readonly string[]>
    >
  )[channelType];
  return allowedTopicIds?.includes(topicId) ?? false;
}

export function parseChatTopicIdForChannel(
  channelType: ChatChannelType,
  topicId: string | null | undefined,
): ChatTopicId | null {
  return isChatTopicAllowedForChannel(channelType, topicId) ? topicId : null;
}
