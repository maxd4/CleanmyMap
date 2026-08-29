"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatFeedState } from "../chat-feed-state";
import type { ChatUser, DmConversation } from "../chat-types";
import type { ChatNotificationReadScope } from "./use-chat-notification-unreads";

type UseChatShellNotificationEffectsParams = {
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  feedState: ChatFeedState;
  messagerieMode: boolean;
  selectedRecipient: ChatUser | null;
  conversations: DmConversation[];
  setSelectedRecipient: Dispatch<SetStateAction<ChatUser | null>>;
  markConversationRead: (peerId: string) => Promise<unknown>;
  markChatNotificationsRead: (scope: ChatNotificationReadScope) => Promise<unknown>;
  messages: { id: string }[];
};

export function useChatShellNotificationEffects({
  activeChannelType,
  activeTopicId,
  feedState,
  messagerieMode,
  selectedRecipient,
  conversations,
  setSelectedRecipient,
  markConversationRead,
  markChatNotificationsRead,
  messages,
}: UseChatShellNotificationEffectsParams) {
  useEffect(() => {
    if (activeChannelType !== "dm" || !selectedRecipient) {
      return;
    }

    const inboxConversation = conversations.find(
      (conversation) => conversation.peer.id === selectedRecipient.id,
    );
    if (
      inboxConversation &&
      (inboxConversation.peer.display_name !== selectedRecipient.display_name ||
        inboxConversation.peer.handle !== selectedRecipient.handle ||
        inboxConversation.peer.avatar_url !== selectedRecipient.avatar_url)
    ) {
      setSelectedRecipient(inboxConversation.peer);
    }
  }, [activeChannelType, conversations, selectedRecipient, setSelectedRecipient]);

  const latestMessageId = messages[messages.length - 1]?.id ?? "empty";
  const lastMarkedConversationRef = useRef<string | null>(null);
  const lastMarkedChatNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !messagerieMode ||
      activeChannelType !== "dm" ||
      !selectedRecipient ||
      feedState === "loading" ||
      feedState === "degraded"
    ) {
      return;
    }

    const markKey = `${selectedRecipient.id}:${latestMessageId}`;
    if (lastMarkedConversationRef.current === markKey) {
      return;
    }

    lastMarkedConversationRef.current = markKey;
    void Promise.all([
      markConversationRead(selectedRecipient.id),
      markChatNotificationsRead({
        channelType: "dm",
        peerId: selectedRecipient.id,
      }),
    ]).catch(() => {
      if (lastMarkedConversationRef.current === markKey) {
        lastMarkedConversationRef.current = null;
      }
    });
  }, [
    activeChannelType,
    feedState,
    latestMessageId,
    markChatNotificationsRead,
    markConversationRead,
    messagerieMode,
    selectedRecipient,
  ]);

  useEffect(() => {
    if (
      !messagerieMode ||
      (activeChannelType !== "community" && activeChannelType !== "territory") ||
      feedState === "loading" ||
      feedState === "degraded"
    ) {
      return;
    }

    const markKey = `${activeChannelType}:${activeTopicId ?? "global"}`;
    if (lastMarkedChatNotificationRef.current === markKey) {
      return;
    }

    lastMarkedChatNotificationRef.current = markKey;
    void markChatNotificationsRead({
      channelType: activeChannelType,
      topicId: activeTopicId,
    }).catch(() => {
      if (lastMarkedChatNotificationRef.current === markKey) {
        lastMarkedChatNotificationRef.current = null;
      }
    });
  }, [
    activeChannelType,
    activeTopicId,
    feedState,
    markChatNotificationsRead,
    messagerieMode,
  ]);
}
