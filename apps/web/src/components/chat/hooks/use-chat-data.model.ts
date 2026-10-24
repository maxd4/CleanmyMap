import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import { sortByCreatedAtAsc } from "@/lib/chat/postgrest";
import type { ChatMessage } from "../chat-types";

type MessageKeyParams = {
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  activeTopicId: ChatTopicId | null;
  activeTopicIds?: readonly ChatTopicId[] | null;
  selectedRecipientId: string | null;
  effectiveZone: string;
  territoryFocus: number | null;
  initialMessageId?: string | null;
};

export type ChatRefreshContext = {
  activeChannelType: ChatChannelType;
  realtimeEnabled: boolean;
  isVisible: boolean;
  isOnline: boolean;
  surfaceActive?: boolean;
};

export type ChatMessageChange = {
  channel_type?: string;
  sender_id?: string;
  recipient_id?: string | null;
  zone_name?: string | null;
  arrondissement_id?: number | null;
  topic_id?: string | null;
  conversation_id?: string | null;
  action_id?: string | null;
};

const CHAT_REFRESH_INTERVALS_MS: Record<
  ChatChannelType,
  { realtime: number; fallback: number }
> = {
  community: { realtime: 300_000, fallback: 900_000 },
  dm: { realtime: 180_000, fallback: 600_000 },
  admin_elu: { realtime: 300_000, fallback: 900_000 },
  territory: { realtime: 240_000, fallback: 720_000 },
  bug_report: { realtime: 180_000, fallback: 600_000 },
  action: { realtime: 180_000, fallback: 600_000 },
};

export function getChatRefreshIntervalMs({
  activeChannelType,
  realtimeEnabled,
  isVisible,
  isOnline,
  surfaceActive = true,
}: ChatRefreshContext): number {
  if (!surfaceActive || !isOnline || !isVisible) {
    return 0;
  }

  const interval = CHAT_REFRESH_INTERVALS_MS[activeChannelType];
  return realtimeEnabled ? interval.realtime : interval.fallback;
}

export function buildMessagesKey({
  activeChannelType,
  activeActionId,
  activeTopicId,
  activeTopicIds,
  selectedRecipientId,
  effectiveZone,
  territoryFocus,
  initialMessageId,
}: MessageKeyParams): string | null {
  const effectiveTopicIds = activeTopicIds?.length
    ? activeTopicIds
    : activeTopicId
      ? [activeTopicId]
      : null;
  const topicParam = effectiveTopicIds
    ? effectiveTopicIds.length === 1
      ? `&topicId=${encodeURIComponent(effectiveTopicIds[0])}`
      : `&topicIds=${encodeURIComponent(effectiveTopicIds.join(","))}`
    : "";
  const messageParam = initialMessageId
    ? `&messageId=${encodeURIComponent(initialMessageId)}`
    : "";

  if (activeChannelType === "dm") {
    return selectedRecipientId
      ? `/api/chat?channelType=dm&recipientId=${encodeURIComponent(selectedRecipientId)}${messageParam}`
      : null;
  }

  if (activeChannelType === "action") {
    return activeActionId
      ? `/api/chat?channelType=action&actionId=${encodeURIComponent(activeActionId)}${messageParam}`
      : null;
  }

  if (activeChannelType === "territory") {
    if (effectiveZone) {
      return `/api/chat?channelType=territory&zoneName=${encodeURIComponent(effectiveZone)}${topicParam}${messageParam}`;
    }

    return territoryFocus
      ? `/api/chat?channelType=territory&arrondissementId=${territoryFocus}${topicParam}${messageParam}`
      : null;
  }

  return `/api/chat?channelType=${activeChannelType}${topicParam}${messageParam}`;
}

export function mergeChatMessages(groups: ChatMessage[][]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of groups.flat()) {
    byId.set(message.id, message);
  }
  return sortByCreatedAtAsc([...byId.values()]);
}

export function getRecentMessagesKey(messagesKey: string): string {
  const url = new URL(messagesKey, "https://chat.local");
  url.searchParams.delete("messageId");
  url.searchParams.delete("beforeCreatedAt");
  url.searchParams.delete("beforeId");
  return `${url.pathname}${url.search}`;
}

export type ChatRealtimeScope = {
  activeChannelType: ChatChannelType;
  activeActionId?: string | null;
  activeTopicIds?: readonly ChatTopicId[] | null;
  selectedRecipientId: string | null;
  currentUserId?: string;
  effectiveZone: string;
  territoryFocus: number | null;
};

export function isRelevantChatMessageChange(
  change: ChatMessageChange,
  scope: ChatRealtimeScope,
): boolean {
  if (change.channel_type !== scope.activeChannelType) {
    return false;
  }

  if (scope.activeChannelType === "dm") {
    return Boolean(
      (change.sender_id === scope.currentUserId && change.recipient_id === scope.selectedRecipientId) ||
        (change.sender_id === scope.selectedRecipientId && change.recipient_id === scope.currentUserId),
    );
  }

  if (scope.activeChannelType === "community" || scope.activeChannelType === "admin_elu") {
    return !scope.activeTopicIds?.length || scope.activeTopicIds.includes(change.topic_id as ChatTopicId);
  }

  if (scope.activeChannelType === "territory") {
    return Boolean(
      (change.zone_name && change.zone_name === scope.effectiveZone) ||
        (change.arrondissement_id && change.arrondissement_id === scope.territoryFocus),
    );
  }

  if (scope.activeChannelType === "action") {
    return change.conversation_id === scope.activeActionId;
  }

  return true;
}

export function isRelevantChatPollVoteChange(activeChannelType: ChatChannelType): boolean {
  return ["community", "admin_elu", "territory", "action", "dm"].includes(activeChannelType);
}
