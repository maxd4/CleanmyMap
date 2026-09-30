"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "@/lib/chat/topics";
import type { ChatFeedState } from "../chat-feed-state";
import type { ChatUser, DmConversation } from "../chat-types";
import type { ChatNotificationReadScope } from "./use-chat-notification-unreads";
import { getChatTopicIdsForPresentationScope } from "@/lib/chat/topic-presentation";

type UseChatShellNotificationEffectsParams = {
  activeChannelType: ChatChannelType;
  activeTopicId: ChatTopicId | null;
  selectedActionId?: string | null;
  feedState: ChatFeedState;
  messagerieMode: boolean;
  selectedRecipient: ChatUser | null;
  conversations: DmConversation[];
  setSelectedRecipient: Dispatch<SetStateAction<ChatUser | null>>;
  markConversationRead: (peerId: string) => Promise<unknown>;
  markChatNotificationsRead: (scope: ChatNotificationReadScope) => Promise<unknown>;
  messages: { id: string }[];
};

type ReadMarkerRef = { current: string | null };

function useSelectedRecipientSync({
  activeChannelType,
  conversations,
  selectedRecipient,
  setSelectedRecipient,
}: Pick<UseChatShellNotificationEffectsParams, "activeChannelType" | "conversations" | "selectedRecipient" | "setSelectedRecipient">) {
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
}

function useDirectMessageReadEffect({
  activeChannelType,
  feedState,
  messagerieMode,
  selectedRecipient,
  markConversationRead,
  markChatNotificationsRead,
  latestMessageId,
  markerRef,
}: Pick<UseChatShellNotificationEffectsParams, "activeChannelType" | "feedState" | "messagerieMode" | "selectedRecipient" | "markConversationRead" | "markChatNotificationsRead"> & { latestMessageId: string; markerRef: ReadMarkerRef }) {
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
    if (markerRef.current === markKey) {
      return;
    }

    markerRef.current = markKey;
    void Promise.all([
      markConversationRead(selectedRecipient.id),
      markChatNotificationsRead({
        channelType: "dm",
        peerId: selectedRecipient.id,
      }),
    ]).catch(() => {
      if (markerRef.current === markKey) {
        markerRef.current = null;
      }
    });
  }, [
    activeChannelType,
    feedState,
    latestMessageId,
    markChatNotificationsRead,
    markConversationRead,
    markerRef,
    messagerieMode,
    selectedRecipient,
  ]);
}

function useChannelReadEffect({
  activeChannelType,
  activeTopicId,
  activeTopicIds,
  feedState,
  messagerieMode,
  markChatNotificationsRead,
  markerRef,
}: Pick<UseChatShellNotificationEffectsParams, "activeChannelType" | "activeTopicId" | "feedState" | "messagerieMode" | "markChatNotificationsRead"> & { activeTopicIds: readonly ChatTopicId[] | null; markerRef: ReadMarkerRef }) {
  useEffect(() => {
    if (
      !messagerieMode ||
      (activeChannelType !== "community" &&
        activeChannelType !== "territory" &&
        activeChannelType !== "admin_elu") ||
      feedState === "loading" ||
      feedState === "degraded"
    ) {
      return;
    }

    const markKey = `${activeChannelType}:${activeTopicIds?.join(",") ?? activeTopicId ?? "global"}`;
    if (markerRef.current === markKey) {
      return;
    }

    markerRef.current = markKey;
    void markChatNotificationsRead({
      channelType: activeChannelType,
      topicId: activeTopicIds?.length === 1 ? activeTopicIds[0] : null,
      topicIds: activeTopicIds,
    }).catch(() => {
      if (markerRef.current === markKey) {
        markerRef.current = null;
      }
    });
  }, [
    activeChannelType,
    activeTopicId,
    activeTopicIds,
    feedState,
    markChatNotificationsRead,
    markerRef,
    messagerieMode,
  ]);
}

function useActionReadEffect({
  activeChannelType,
  feedState,
  latestMessageId,
  markChatNotificationsRead,
  messagerieMode,
  markerRef,
  selectedActionId,
}: Pick<UseChatShellNotificationEffectsParams, "activeChannelType" | "feedState" | "markChatNotificationsRead" | "messagerieMode" | "selectedActionId"> & { latestMessageId: string; markerRef: ReadMarkerRef }) {
  useEffect(() => {
    if (
      !messagerieMode ||
      activeChannelType !== "action" ||
      !selectedActionId ||
      feedState === "loading" ||
      feedState === "degraded"
    ) {
      return;
    }
    const markKey = `action:${selectedActionId}:${latestMessageId}`;
    if (markerRef.current === markKey) return;
    markerRef.current = markKey;
    void markChatNotificationsRead({ channelType: "action", actionId: selectedActionId }).catch(() => {
      if (markerRef.current === markKey) {
        markerRef.current = null;
      }
    });
  }, [
    activeChannelType,
    feedState,
    latestMessageId,
    markChatNotificationsRead,
    messagerieMode,
    markerRef,
    selectedActionId,
  ]);
}

export function useChatShellNotificationEffects({
  activeChannelType,
  activeTopicId,
  selectedActionId,
  feedState,
  messagerieMode,
  selectedRecipient,
  conversations,
  setSelectedRecipient,
  markConversationRead,
  markChatNotificationsRead,
  messages,
}: UseChatShellNotificationEffectsParams) {
  const activeTopicIds = getChatTopicIdsForPresentationScope(activeChannelType, activeTopicId);
  const latestMessageId = messages[messages.length - 1]?.id ?? "empty";
  const lastMarkedConversationRef = useRef<string | null>(null);
  const lastMarkedChatNotificationRef = useRef<string | null>(null);

  useSelectedRecipientSync({ activeChannelType, conversations, selectedRecipient, setSelectedRecipient });
  useDirectMessageReadEffect({
    activeChannelType,
    feedState,
    messagerieMode,
    selectedRecipient,
    markConversationRead,
    markChatNotificationsRead,
    latestMessageId,
    markerRef: lastMarkedConversationRef,
  });
  useChannelReadEffect({
    activeChannelType,
    activeTopicId,
    activeTopicIds,
    feedState,
    messagerieMode,
    markChatNotificationsRead,
    markerRef: lastMarkedChatNotificationRef,
  });
  useActionReadEffect({
    activeChannelType,
    feedState,
    latestMessageId,
    markChatNotificationsRead,
    messagerieMode,
    markerRef: lastMarkedChatNotificationRef,
    selectedActionId,
  });
}
