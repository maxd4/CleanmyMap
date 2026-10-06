"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { ChatChannelType } from "@/lib/chat/channels";
import { useChatShellContext } from "./hooks/use-chat-shell-context";
import { useChatShellController } from "./hooks/use-chat-shell-controller";
import { useChatShellNavigation } from "./hooks/use-chat-shell-navigation";
import { ChatShellView } from "./chat-shell-view";
import type { ChatUser } from "./chat-types";
import type { ChatTopicId } from "@/lib/chat/topics";
import {
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import {
  type ChatShellNavigationState,
} from "./chat-navigation";
import { shouldOpenPublicThreadOnMobile } from "./chat-shell.behavior";

export type ChatShellProps = {
  initialChannelType?: ChatChannelType;
  initialArrondissement?: number | null;
  initialZoneName?: string | null;
  initialRecipient?: ChatUser | null;
  initialFeedbackId?: string | null;
  initialMessageId?: string | null;
  initialActionId?: string | null;
  initialTopicId?: ChatTopicId | null;
  initialComposerMode?: "message" | "announcement" | "poll";
  initialAnnouncementTemplate?: CommunityAnnouncementTemplateKey | null;
  initialEventId?: string | null;
  initialContactRequestId?: string | null;
  initialRelatedEvent?: ChatRelatedEvent | null;
  announcementEventRequested?: boolean;
  announcementEventLoading?: boolean;
  announcementEventError?: Error | null;
  initialMessage?: string;
  tone?: "light" | "dark";
  fullHeight?: boolean;
  messagerieMode?: boolean;
  navigationState?: ChatShellNavigationState | null;
  onNavigationChange?: (state: ChatShellNavigationState) => void;
};

export function ChatShell({
  initialChannelType = "community",
  initialArrondissement,
  initialZoneName,
  initialRecipient,
  initialFeedbackId = null,
  initialMessageId = null,
  initialActionId = null,
  initialTopicId,
  initialComposerMode = "message",
  initialAnnouncementTemplate = null,
  initialEventId = null,
  initialContactRequestId = null,
  initialRelatedEvent = null,
  announcementEventRequested = false,
  announcementEventLoading = false,
  announcementEventError = null,
  initialMessage,
  tone = "dark",
  fullHeight = false,
  messagerieMode = false,
  navigationState = null,
  onNavigationChange,
}: ChatShellProps) {
  const isLight = tone === "light";
  const { locale } = useSitePreferences();
  const pathname = usePathname();
  const [activeFeedbackId, setActiveFeedbackId] = useState(initialFeedbackId);
  const [isPublicThreadOpen, setIsPublicThreadOpen] = useState(
    () => shouldOpenPublicThreadOnMobile({
      messagerieMode,
      initialChannelType,
      initialTopicId,
      initialActionId,
      initialMessageId,
    }),
  );

  const chatContext = useChatShellContext({
    initialChannelType,
    initialArrondissement,
    initialZoneName,
    initialRecipient,
    initialTopicId,
    initialMessage,
    initialActionId,
    initialMessageId,
    messagerieMode,
    activeFeedbackId,
    setActiveFeedbackId,
  });
  const controller = useChatShellController({
    context: chatContext,
    initialComposerMode,
    initialAnnouncementTemplate,
    initialRelatedEvent,
    announcementEventRequested,
    announcementEventLoading,
    announcementEventError,
  });
  useChatShellNavigation({
    navigationState,
    onNavigationChange,
    initialRecipient,
    initialContactRequestId,
    initialAnnouncementTemplate,
    initialEventId,
    announcementTemplate: controller.composer.announcementTemplate,
    handleAnnouncementTemplateChange: controller.composer.handleAnnouncementTemplateChange,
    handleComposerModeChange: controller.composer.handleComposerModeChange,
    activeChannelType: chatContext.activeChannelType,
    activeTopicId: chatContext.activeTopicId,
    selectedActionId: chatContext.selectedActionId,
    selectedRecipient: chatContext.selectedRecipient,
    selectedZone: chatContext.selectedZone,
    territoryFocus: chatContext.territoryFocus,
    targetMessageIdForScope: chatContext.targetMessageIdForScope,
    activeFeedbackId,
    setActiveChannelType: chatContext.setActiveChannelType,
    setSelectedActionId: chatContext.setSelectedActionId,
    setActiveTopicId: chatContext.setActiveTopicId,
    setSelectedRecipient: chatContext.setSelectedRecipient,
    setSelectedZone: chatContext.setSelectedZone,
    setActiveFeedbackId,
  });

  return <ChatShellView
    context={chatContext}
    composer={controller.composer}
    submit={controller.submit}
    pollVoting={controller.pollVoting}
    pathname={pathname}
    locale={locale}
    isLight={isLight}
    fullHeight={fullHeight}
    messagerieMode={messagerieMode}
    initialRecipient={initialRecipient}
    announcementEventRequested={announcementEventRequested}
    announcementEventLoading={announcementEventLoading}
    announcementEventError={announcementEventError}
    isPublicThreadOpen={isPublicThreadOpen}
    setIsPublicThreadOpen={setIsPublicThreadOpen}
  />;
}
