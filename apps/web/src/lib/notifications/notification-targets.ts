import { buildChatNotificationHref } from "@/lib/chat/chat-notification-targets";
import { buildGamificationReconciliationHref } from "@/lib/gamification/gamification-notification-targets";
import { buildJoinActionHref } from "@/lib/sections/join-action-routes";

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function isInternalNotificationHref(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return false;

  try {
    const url = new URL(href, "https://cleanmymap.invalid");
    return (
      url.origin === "https://cleanmymap.invalid" &&
      [
        "/actions/map",
        "/admin",
        "/dashboard",
        "/sections/gamification",
        "/sections/messagerie",
        "/sections/rejoindre-une-action",
        "/sections/trash-spotter",
        "/signalement",
      ].includes(url.pathname)
    );
  } catch {
    return false;
  }
}

function buildModerationNotificationHref(payload: Record<string, unknown>): string | null {
  const entityType = readString(payload.entityType);
  const id = readString(payload.id);
  if (!id) return null;

  if (entityType === "action") {
    return `/actions/map?actionId=${encodeURIComponent(id)}`;
  }

  if (entityType === "spot") {
    return `/sections/trash-spotter?spotId=${encodeURIComponent(id)}`;
  }

  return null;
}

function buildActionEventHref(payload: Record<string, unknown>): string | null {
  const eventType = readString(payload.eventType) ?? readString(payload.kind);
  if (eventType !== "action_event") return null;
  const actionId = readString(payload.actionId) ?? readString(payload.id);
  return actionId ? buildJoinActionHref(actionId) : null;
}

export function buildNotificationHref(payload: unknown, notificationId?: string): string | null {
  const chatHref = buildChatNotificationHref(payload);
  if (chatHref) return chatHref;

  const gamificationHref = buildGamificationReconciliationHref(payload, notificationId);
  if (gamificationHref) return gamificationHref;

  if (!payload || typeof payload !== "object") return null;
  const raw = payload as Record<string, unknown>;
  const explicitHref = readString(raw.href);
  if (explicitHref && isInternalNotificationHref(explicitHref)) return explicitHref;

  return buildModerationNotificationHref(raw) ?? buildActionEventHref(raw);
}
