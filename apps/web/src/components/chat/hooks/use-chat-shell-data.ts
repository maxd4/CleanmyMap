"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatUser } from "../chat-types";
import type { SendChatMessageParams } from "./use-chat-data";
import { useChatData } from "./use-chat-data";
import { useChatActionDiscussions } from "./use-chat-action-discussions";
import { useDmInbox } from "./use-dm-inbox";
import { useActionShareContactRequests } from "./use-action-share-contact-requests";
import { useChatNotificationUnreads } from "./use-chat-notification-unreads";
import { useChatShellRuntimeContext } from "./use-chat-shell-runtime-context";
import { useChatShellSearch } from "./use-chat-shell-search";
import { useChatSearch } from "./use-chat-search";
import {
  getChatShellFeatureFlags,
  getFeedbackIdForSubmit,
  sendChatMessageAndRefreshInbox,
} from "../chat-shell.behavior";
import { useChatState } from "./use-chat-state";

type UseChatShellDataParams = {
  state: ReturnType<typeof useChatState>;
  runtime: ReturnType<typeof useChatShellRuntimeContext>;
  featureFlags: ReturnType<typeof getChatShellFeatureFlags>;
  initialChannelType: ChatChannelType;
  initialTopicId?: ChatTopicId | null;
  initialRecipient?: ChatUser | null;
  initialMessageId: string | null;
  activeFeedbackId: string | null;
  setActiveFeedbackId: Dispatch<SetStateAction<string | null>>;
};

function consumeFeedbackIdFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("feedbackId");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function useChatShellData({
  state,
  runtime,
  featureFlags,
  initialChannelType,
  initialTopicId,
  initialRecipient,
  initialMessageId,
  activeFeedbackId,
  setActiveFeedbackId,
}: UseChatShellDataParams) {
  const selectedRecipientId = state.selectedRecipient?.id ?? null;
  const search = useChatShellSearch({
    initialChannelType,
    initialTopicId,
    initialRecipient,
    initialMessageId,
    activeChannelType: state.activeChannelType,
    activeTopicId: state.activeTopicId,
    selectedRecipientId,
    setViewMode: state.setViewMode,
  });
  const data = useChatData({
    activeChannelType: state.activeChannelType,
    activeActionId: state.selectedActionId,
    activeTopicId: state.activeTopicId,
    selectedRecipientId,
    effectiveZone: runtime.effectiveZone,
    territoryFocus: runtime.territoryFocus,
    showMentions: state.showMentions,
    mentionQuery: state.mentionQuery,
    recipientQuery: state.recipientQuery,
    initialMessageId: search.targetMessageIdForScope,
    currentUserId: runtime.userId,
    canAccessProtectedChat: featureFlags.canAccessProtectedChat,
    supabase: runtime.supabase,
  });
  const actionDiscussions = useChatActionDiscussions(featureFlags.actionDiscussionsEnabled);
  const chatSearch = useChatSearch({
    activeChannelType: state.activeChannelType,
    activeTopicId: state.activeTopicId,
    selectedRecipientId,
    effectiveZone: runtime.effectiveZone,
    territoryFocus: runtime.territoryFocus,
    query: search.searchQuery,
    enabled: featureFlags.chatSearchEnabled,
  });
  const dmInbox = useDmInbox({ enabled: featureFlags.dmInboxEnabled, currentUserId: runtime.userId, supabase: runtime.supabase });
  const contactRequests = useActionShareContactRequests({ enabled: featureFlags.contactRequestsEnabled, currentUserId: runtime.userId });
  const notifications = useChatNotificationUnreads({ enabled: featureFlags.notificationsEnabled, currentUserId: runtime.userId, supabase: runtime.supabase });
  const sendChatMessageWithInboxRefresh = useCallback(
    (params: SendChatMessageParams) => sendChatMessageAndRefreshInbox({
      params,
      sendChatMessage: data.sendChatMessage,
      activeFeedbackId,
      setActiveFeedbackId,
      refreshInbox: dmInbox.refreshInbox,
      consumeFeedbackId: consumeFeedbackIdFromUrl,
    }),
    [activeFeedbackId, data.sendChatMessage, dmInbox.refreshInbox, setActiveFeedbackId],
  );
  const feedbackIdForSubmit = getFeedbackIdForSubmit({
    activeChannelType: state.activeChannelType,
    selectedRecipient: state.selectedRecipient,
    initialRecipient,
    activeFeedbackId,
    isInitialRecipient: (selected, initial) => selected?.id === initial?.id,
  });
  return {
    ...search,
    ...data,
    actionDiscussions,
    chatSearch,
    ...dmInbox,
    dmInboxError: dmInbox.error,
    isDmInboxLoading: dmInbox.isLoading,
    ...contactRequests,
    actionShareContactRequests: contactRequests.requests,
    actionShareContactRequestsError: contactRequests.error,
    actionShareContactRequestsLoading: contactRequests.isLoading,
    respondToActionShareContactRequest: contactRequests.respond,
    chatNotificationUnreadCounts: notifications.counts,
    markChatNotificationsRead: notifications.markRead,
    selectedRecipientId,
    sendChatMessageWithInboxRefresh,
    feedbackIdForSubmit,
  };
}
