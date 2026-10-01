import { buildChatNotificationHref } from "@/lib/chat/chat-notification-targets";
import { buildGamificationReconciliationHref } from "@/lib/gamification/gamification-notification-targets";

export function buildNotificationHref(payload: unknown, notificationId?: string): string | null {
  return buildChatNotificationHref(payload) ?? buildGamificationReconciliationHref(payload, notificationId);
}
