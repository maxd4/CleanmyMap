import {
  isChatChannelType,
  type ChatChannelType,
} from "@/lib/chat/channels";
import { isChatMessageKind, type ChatMessageKind } from "@/lib/chat/announcements";
import { parseChatTopicIdForChannel, type ChatTopicId } from "@/lib/chat/topics";
import type { ActionPhase } from "@/lib/actions/types";

export type ChatNotificationPayload = {
  href?: string;
  requestId?: string;
  requestKind?: "action_share";
  channelType?: ChatChannelType;
  messageId?: string;
  commentId?: string;
  topicId?: ChatTopicId;
  messageKind?: ChatMessageKind;
  actionId?: string;
  actionPhase?: ActionPhase;
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

function readActionPhase(value: unknown): ActionPhase | undefined {
  const phase = readString(value);
  return phase === "pre_action" || phase === "post_action_draft" || phase === "post_action_complete"
    ? phase
    : undefined;
}

function readChannelType(value: unknown): ChatChannelType | undefined {
  const channelType = readString(value);
  return isChatChannelType(channelType) ? channelType : undefined;
}

function readMessageKind(value: unknown): ChatMessageKind | undefined {
  const messageKind = readString(value);
  return isChatMessageKind(messageKind) ? messageKind : undefined;
}

function readRequestKind(value: unknown): "action_share" | undefined {
  return readString(value) === "action_share" ? "action_share" : undefined;
}

function isAllowedChatHref(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return false;
  }

  try {
    const parsed = new URL(value, "https://cleanmymap.invalid");
    return (
      parsed.origin === "https://cleanmymap.invalid" &&
      (parsed.pathname === "/sections/messagerie" || parsed.pathname === "/sections/feedback")
    );
  } catch {
    return false;
  }
}

export function normalizeChatNotificationPayload(
  payload: unknown,
): ChatNotificationPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;
  const aliases = readNotificationAliases(raw);

  const channelType = readChannelType(raw["channelType"]);
  const topicId = channelType
    ? parseChatTopicIdForChannel(channelType, readString(raw["topicId"]))
    : null;

  return {
    href: (() => {
      const href = readString(raw["href"]);
      return href && isAllowedChatHref(href) ? href : undefined;
    })(),
    requestId: readString(raw["requestId"]) ?? undefined,
    requestKind: readRequestKind(raw["requestKind"]),
    channelType,
    messageId: readString(raw["messageId"]) ?? readString(raw["commentId"]) ?? undefined,
    commentId: readString(raw["commentId"]) ?? undefined,
    topicId: topicId ?? undefined,
    messageKind: readMessageKind(raw["messageKind"]),
    actionId: readString(raw["actionId"]) ?? undefined,
    actionPhase: readActionPhase(raw["actionPhase"]),
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

  if (normalized.messageId) {
    params.set("messageId", normalized.messageId);
  }

  if (normalized.channelType === "action" && normalized.actionId) {
    params.set("actionId", normalized.actionId);
  } else if (normalized.channelType === "action") {
    return null;
  }

  if (normalized.channelType === "dm") {
    appendDmNotificationParams(params, normalized);
  }

  if (normalized.channelType === "territory") {
    appendTerritoryNotificationParams(params, normalized);
  }

  if (
    (normalized.channelType === "community" ||
      normalized.channelType === "territory" ||
      normalized.channelType === "admin_elu") &&
    normalized.topicId
  ) {
    params.set("topicId", normalized.topicId);
  }

  const query = params.toString();
  return query.length > 0 ? `/sections/messagerie?${query}` : "/sections/messagerie";
}
