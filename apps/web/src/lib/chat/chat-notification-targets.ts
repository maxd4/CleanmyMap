import {
  isChatChannelType,
  type ChatChannelType,
} from "@/lib/chat/channels";
import { isChatMessageKind, type ChatMessageKind } from "@/lib/chat/announcements";
import { parseChatTopicIdForChannel, type ChatTopicId } from "@/lib/chat/topics";

export type ChatNotificationPayload = {
  href?: string;
  channelType?: ChatChannelType;
  messageId?: string;
  topicId?: ChatTopicId;
  messageKind?: ChatMessageKind;
  zoneName?: string | null;
  arrondissementId?: number | null;
  conversationPartnerId?: string;
  conversationPartnerLabel?: string;
  conversationPartnerHandle?: string;
  recipientId?: string;
  recipientLabel?: string;
  recipientHandle?: string;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function readNotificationAliases(raw: Record<string, unknown>): {
  conversationPartnerId?: string;
  conversationPartnerLabel?: string;
  conversationPartnerHandle?: string;
} {
  return {
    conversationPartnerId:
      readString(raw["conversationPartnerId"]) ?? readString(raw["recipientId"]) ?? undefined,
    conversationPartnerLabel:
      readString(raw["conversationPartnerLabel"]) ?? readString(raw["recipientLabel"]) ?? undefined,
    conversationPartnerHandle:
      readString(raw["conversationPartnerHandle"]) ?? readString(raw["recipientHandle"]) ?? undefined,
  };
}

export function normalizeChatNotificationPayload(
  payload: unknown,
): ChatNotificationPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const aliases = readNotificationAliases(raw);

  const channelTypeValue = readString(raw["channelType"]);
  const channelType = isChatChannelType(channelTypeValue)
    ? channelTypeValue
    : undefined;
  const messageKindValue = readString(raw["messageKind"]);
  const topicId = channelType
    ? parseChatTopicIdForChannel(channelType, readString(raw["topicId"]))
    : null;

  return {
    href: readString(raw["href"]) ?? undefined,
    channelType,
    messageId: readString(raw["messageId"]) ?? undefined,
    topicId: topicId ?? undefined,
    messageKind: isChatMessageKind(messageKindValue) ? messageKindValue : undefined,
    zoneName: readString(raw["zoneName"]),
    arrondissementId: readNumber(raw["arrondissementId"]),
    conversationPartnerId: aliases.conversationPartnerId,
    conversationPartnerLabel: aliases.conversationPartnerLabel,
    conversationPartnerHandle: aliases.conversationPartnerHandle,
    recipientId: readString(raw["recipientId"]) ?? undefined,
    recipientLabel: readString(raw["recipientLabel"]) ?? undefined,
    recipientHandle: readString(raw["recipientHandle"]) ?? undefined,
  };
}

function appendDmNotificationParams(
  params: URLSearchParams,
  normalized: NonNullable<ReturnType<typeof normalizeChatNotificationPayload>>,
): void {
  const conversationPartnerId =
    normalized.conversationPartnerId ?? normalized.recipientId ?? null;
  if (conversationPartnerId) {
    params.set("recipientId", conversationPartnerId);
  }

  const label = normalized.conversationPartnerLabel ?? normalized.recipientLabel;
  if (label) {
    params.set("recipientLabel", label);
  }

  const handle = normalized.conversationPartnerHandle ?? normalized.recipientHandle;
  if (handle) {
    params.set("recipientHandle", handle);
  }
}

function appendTerritoryNotificationParams(
  params: URLSearchParams,
  normalized: NonNullable<ReturnType<typeof normalizeChatNotificationPayload>>,
): void {
  if (normalized.zoneName) {
    params.set("zoneName", normalized.zoneName);
  }
  if (typeof normalized.arrondissementId === "number") {
    params.set("arrondissementId", String(normalized.arrondissementId));
  }
}

export function buildChatNotificationHref(payload: unknown): string | null {
  const normalized = normalizeChatNotificationPayload(payload);
  if (!normalized) {
    return null;
  }

  if (normalized.href) {
    return normalized.href;
  }

  if (!normalized.channelType) {
    return null;
  }

  if (normalized.channelType === "bug_report") {
    return "/sections/feedback";
  }

  const params = new URLSearchParams();
  params.set("channel", normalized.channelType);

  if (normalized.channelType === "dm") {
    appendDmNotificationParams(params, normalized);
  }

  if (normalized.channelType === "territory") {
    appendTerritoryNotificationParams(params, normalized);
  }

  if (
    (normalized.channelType === "community" || normalized.channelType === "territory") &&
    normalized.topicId
  ) {
    params.set("topicId", normalized.topicId);
  }

  const query = params.toString();
  return query.length > 0 ? `/sections/messagerie?${query}` : "/sections/messagerie";
}
