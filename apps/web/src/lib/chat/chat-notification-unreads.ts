import { isChatChannelType } from "./channels";
import { parseChatTopicIdForChannel, type ChatTopicId } from "./topics";

export type ChatNotificationUnreadRow = {
  channel_type?: unknown;
  topic_id?: unknown;
  unread_count?: unknown;
};

export type ChatNotificationUnreadCounts = {
  community: number;
  communityByTopic: Partial<Record<ChatTopicId, number>>;
  territory: number;
  territoryByTopic: Partial<Record<ChatTopicId, number>>;
  admin_elu: number;
  adminEluByTopic: Partial<Record<ChatTopicId, number>>;
  dm: number;
  actions: number;
};

export function createEmptyChatNotificationUnreadCounts(): ChatNotificationUnreadCounts {
  return {
    community: 0,
    communityByTopic: {},
    territory: 0,
    territoryByTopic: {},
    admin_elu: 0,
    adminEluByTopic: {},
    dm: 0,
    actions: 0,
  };
}
function readNonNegativeCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function normalizeChatNotificationUnreadCounts(
  rows: readonly ChatNotificationUnreadRow[] | null | undefined,
): ChatNotificationUnreadCounts {
  const counts = createEmptyChatNotificationUnreadCounts();

  for (const row of rows ?? []) {
    const channelType =
      typeof row.channel_type === "string" && isChatChannelType(row.channel_type)
        ? row.channel_type
        : null;
    const unreadCount = readNonNegativeCount(row.unread_count);

    if (!channelType || unreadCount === 0) {
      continue;
    }

    if (channelType === "dm") {
      counts.dm += unreadCount;
      continue;
    }

    if (channelType === "action") {
      counts.actions += unreadCount;
      continue;
    }

    if (
      channelType !== "community" &&
      channelType !== "territory" &&
      channelType !== "admin_elu"
    ) {
      continue;
    }

    const topicId = parseChatTopicIdForChannel(
      channelType,
      typeof row.topic_id === "string" ? row.topic_id : null,
    );

    counts[channelType] += unreadCount;
    if (topicId) {
      const byTopic =
        channelType === "community"
          ? counts.communityByTopic
          : channelType === "territory"
            ? counts.territoryByTopic
            : counts.adminEluByTopic;
      byTopic[topicId] = (byTopic[topicId] ?? 0) + unreadCount;
    }
  }

  return counts;
}
