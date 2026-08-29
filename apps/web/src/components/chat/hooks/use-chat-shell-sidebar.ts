"use client";

import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";

import {
  canAccessChatChannel,
  CHAT_CHANNEL_ORDER,
  type ChatChannelType,
} from "@/lib/chat/channels";
import type { ChatNotificationUnreadCounts } from "@/lib/chat/chat-notification-unreads";
import type { ChatTopicId } from "@/lib/chat/topics";
import {
  type CommunityAnnouncementTemplateKey,
  type ChatRelatedEvent,
} from "@/lib/chat/announcements";
import { createInitialChatPollOptionDraft } from "@/lib/chat/polls";
import type { ChatTopicDefinition } from "../discussion-guidance";
import { CHANNEL_VISUALS, getChannelTitle } from "../chat-shell.utils";

type UseChatShellSidebarParams = {
  activeChannelType: ChatChannelType;
  currentRoleLabel: string | null;
  hasArrondissement: boolean;
  hasGreaterParisZone: boolean;
  effectiveZone: string;
  territoryFocus: number | null;
  messagesCount: number;
  messagerieMode: boolean;
  chatNotificationUnreadCounts: ChatNotificationUnreadCounts;
  channelTopics: ChatTopicDefinition[];
  activeTopicId: ChatTopicId | null;
  locale: string;
  setComposerMode: Dispatch<SetStateAction<"message" | "announcement" | "poll">>;
  setAnnouncementTemplate: Dispatch<SetStateAction<CommunityAnnouncementTemplateKey | null>>;
  setRelatedEvent: Dispatch<SetStateAction<ChatRelatedEvent | null>>;
  setPollOptions: Dispatch<SetStateAction<string[]>>;
  setActiveTopicId: Dispatch<SetStateAction<ChatTopicId | null>>;
  setActiveChannelType: Dispatch<SetStateAction<ChatChannelType>>;
  setIsDmThreadOpen: Dispatch<SetStateAction<boolean>>;
};

export function useChatShellSidebar({
  activeChannelType,
  currentRoleLabel,
  hasArrondissement,
  hasGreaterParisZone,
  effectiveZone,
  territoryFocus,
  messagesCount,
  messagerieMode,
  chatNotificationUnreadCounts,
  channelTopics,
  activeTopicId,
  locale,
  setComposerMode,
  setAnnouncementTemplate,
  setRelatedEvent,
  setPollOptions,
  setActiveTopicId,
  setActiveChannelType,
  setIsDmThreadOpen,
}: UseChatShellSidebarParams) {
  const sidebarChannels = useMemo(
    () =>
      CHAT_CHANNEL_ORDER.map((channelType) => {
        const visual = CHANNEL_VISUALS[channelType];
        const isActive = activeChannelType === channelType;
        const isAvailable = canAccessChatChannel(channelType, {
          roleLabel: currentRoleLabel,
          hasArrondissement,
          hasGreaterParisZone,
          zoneContext: {
            zoneName: effectiveZone || null,
            arrondissementId: territoryFocus,
          },
        });

        return {
          channelType,
          active: isActive,
          disabled: !isAvailable,
          icon: visual.icon,
          label: getChannelTitle(channelType),
          description: "",
          count: messagerieMode ? undefined : isActive ? messagesCount : undefined,
          unreadCount:
            messagerieMode && channelType === "community"
              ? chatNotificationUnreadCounts.community || undefined
              : messagerieMode && channelType === "territory"
                ? chatNotificationUnreadCounts.territory || undefined
                : undefined,
          accentClass: visual.accentClass,
          chipClass: visual.chipClass,
          isLocked: !isAvailable,
        };
      }),
    [
      activeChannelType,
      currentRoleLabel,
      hasArrondissement,
      hasGreaterParisZone,
      effectiveZone,
      territoryFocus,
      messagesCount,
      messagerieMode,
      chatNotificationUnreadCounts.community,
      chatNotificationUnreadCounts.territory,
    ],
  );

  const handleSelectChannel = useCallback(
    (channelType: ChatChannelType) => {
      const isAvailable = canAccessChatChannel(channelType, {
        roleLabel: currentRoleLabel,
        hasArrondissement,
        hasGreaterParisZone,
        zoneContext: {
          zoneName: effectiveZone || null,
          arrondissementId: territoryFocus,
        },
      });
      if (!isAvailable) {
        return;
      }
      setComposerMode("message");
      setAnnouncementTemplate(null);
      setRelatedEvent(null);
      setPollOptions(createInitialChatPollOptionDraft());
      setActiveTopicId(null);
      setActiveChannelType(channelType);
      if (channelType !== "dm") {
        setIsDmThreadOpen(false);
      }
    },
    [
      currentRoleLabel,
      hasArrondissement,
      hasGreaterParisZone,
      effectiveZone,
      territoryFocus,
      setComposerMode,
      setAnnouncementTemplate,
      setRelatedEvent,
      setPollOptions,
      setActiveTopicId,
      setActiveChannelType,
      setIsDmThreadOpen,
    ],
  );

  const sidebarTopics = useMemo(
    () =>
      channelTopics.map((topic) => ({
        ...topic,
        active: topic.id === activeTopicId,
        unreadCount:
          activeChannelType === "community"
            ? chatNotificationUnreadCounts.communityByTopic[topic.id]
            : activeChannelType === "territory"
              ? chatNotificationUnreadCounts.territoryByTopic[topic.id]
              : undefined,
      })),
    [activeChannelType, activeTopicId, channelTopics, chatNotificationUnreadCounts],
  );

  const sidebarTopicSectionTitle = useMemo(() => {
    if (activeChannelType === "community") {
      return locale === "fr" ? "Salons proposés" : "Suggested rooms";
    }
    if (activeChannelType === "territory") {
      return locale === "fr" ? "Salons de zone" : "Area rooms";
    }
    return null;
  }, [activeChannelType, locale]);

  const sidebarTopicSectionDescription = useMemo(() => {
    if (activeChannelType === "community") {
      return locale === "fr"
        ? "Raccourcis thématiques sans créer de nouveau canal."
        : "Thematic shortcuts without creating new channels.";
    }
    if (activeChannelType === "territory") {
      return locale === "fr"
        ? "Points locaux et coordination de voisinage."
        : "Local points and nearby coordination.";
    }
    return null;
  }, [activeChannelType, locale]);

  return {
    sidebarChannels,
    sidebarTopics,
    sidebarTopicSectionTitle,
    sidebarTopicSectionDescription,
    handleSelectChannel,
  };
}
