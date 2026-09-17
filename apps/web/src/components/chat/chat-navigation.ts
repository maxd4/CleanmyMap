import type { CommunityAnnouncementTemplateKey } from "@/lib/chat/announcements";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatUser } from "./chat-types";

/**
 * UI navigation state exposed by a ChatShell without changing chat domain
 * contracts. The parent owns URL/history concerns; the shell owns its state.
 */
export type ChatShellNavigationState = {
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  selectedActionId: string | null;
  selectedRecipient: ChatUser | null;
  selectedZone: string;
  territoryFocus: number | null;
  messageId: string | null;
  feedbackId: string | null;
  contactRequestId: string | null;
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  eventId: string | null;
};

export function getChatShellNavigationKey(
  state: ChatShellNavigationState,
): string {
  return JSON.stringify([
    state.activeChannelType,
    state.activeTopicId,
    state.selectedActionId,
    state.selectedRecipient?.id ?? null,
    state.selectedZone,
    state.territoryFocus,
    state.messageId,
    state.feedbackId,
    state.contactRequestId,
    state.announcementTemplate,
    state.eventId,
  ]);
}
