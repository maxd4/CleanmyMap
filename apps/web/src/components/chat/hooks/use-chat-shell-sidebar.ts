"use client";

import { useCallback, useMemo, type Dispatch, type SetStateAction } from "react";

import {
  canAccessChatChannel,
  CHAT_CHANNEL_ORDER,
  type ChatChannelType,
} from "@/lib/chat/channels";
import type { ChatNotificationUnreadCounts } from "@/lib/chat/chat-notification-unreads";
import type { ChatTopicId } from "@/lib/chat/topics";
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
  resetComposerForChannelChange: () => void;
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
  resetComposerForChannelChange,
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
                : messagerieMode && channelType === "admin_elu"
                  ? chatNotificationUnreadCounts.admin_elu || undefined
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
      chatNotificationUnreadCounts.admin_elu,
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
      resetComposerForChannelChange();
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
      resetComposerForChannelChange,
      setActiveTopicId,
      setActiveChannelType,
      setIsDmThreadOpen,
    ],
  );

  const sidebarTopics = useMemo(
    () =>
      channelTopics.map((topic) => ({
        ...topic,
        label: locale === "en" ? topic.labelEn ?? topic.label : topic.label,
        description:
          locale === "en"
            ? topic.descriptionEn ?? topic.description
            : topic.description,
        starterPrompt:
          locale === "en"
            ? topic.starterPromptEn ?? topic.starterPrompt
            : topic.starterPrompt,
        active: topic.id === activeTopicId,
        unreadCount:
          activeChannelType === "community"
            ? chatNotificationUnreadCounts.communityByTopic[topic.id]
            : activeChannelType === "territory"
              ? chatNotificationUnreadCounts.territoryByTopic[topic.id]
              : activeChannelType === "admin_elu"
                ? chatNotificationUnreadCounts.adminEluByTopic[topic.id]
                : undefined,
      })),
    [activeChannelType, activeTopicId, channelTopics, chatNotificationUnreadCounts, locale],
  );

  const sidebarTopicSectionTitle = useMemo(() => {
    if (activeChannelType === "community") {
      return locale === "fr" ? "Salons proposés" : "Suggested rooms";
    }
    if (activeChannelType === "territory") {
      return locale === "fr" ? "Salons de zone" : "Area rooms";
    }
    if (activeChannelType === "admin_elu") {
      return locale === "fr" ? "Sujets Admin & élus" : "Admin & elected topics";
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
    if (activeChannelType === "admin_elu") {
      return locale === "fr"
        ? "Arbitrages, priorités, suivi et coordination institutionnelle."
        : "Trade-offs, priorities, follow-up and institutional coordination.";
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
