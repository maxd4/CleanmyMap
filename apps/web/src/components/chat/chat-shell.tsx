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
  initialBuddyRequestId?: string | null;
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

function useChatShellNavigationEffects({
  navigationState,
  onNavigationChange,
  initialRecipient,
  initialContactRequestId,
  initialAnnouncementTemplate,
  initialEventId,
  controller,
  context,
  activeFeedbackId,
  setActiveFeedbackId,
}: {
  navigationState: ChatShellNavigationState | null;
  onNavigationChange?: (state: ChatShellNavigationState) => void;
  initialRecipient?: ChatUser | null;
  initialContactRequestId?: string | null;
  initialAnnouncementTemplate?: CommunityAnnouncementTemplateKey | null;
  initialEventId?: string | null;
  controller: ReturnType<typeof useChatShellController>;
  context: ReturnType<typeof useChatShellContext>;
  activeFeedbackId: string | null;
  setActiveFeedbackId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
  useChatShellNavigation({
    navigationState,
    onNavigationChange,
    initialRecipient,
    initialContactRequestId: initialContactRequestId ?? null,
    initialAnnouncementTemplate: initialAnnouncementTemplate ?? null,
    initialEventId: initialEventId ?? null,
    announcementTemplate: controller.composer.announcementTemplate,
    handleAnnouncementTemplateChange: controller.composer.handleAnnouncementTemplateChange,
    handleComposerModeChange: controller.composer.handleComposerModeChange,
    activeChannelType: context.activeChannelType,
    activeTopicId: context.activeTopicId,
    selectedActionId: context.selectedActionId,
    selectedRecipient: context.selectedRecipient,
    selectedZone: context.selectedZone,
    territoryFocus: context.territoryFocus,
    targetMessageIdForScope: context.targetMessageIdForScope,
    activeFeedbackId,
    setActiveChannelType: context.setActiveChannelType,
    setSelectedActionId: context.setSelectedActionId,
    setActiveTopicId: context.setActiveTopicId,
    setSelectedRecipient: context.setSelectedRecipient,
    setSelectedZone: context.setSelectedZone,
    setActiveFeedbackId,
  });
}

function ChatShellOutput(props: React.ComponentProps<typeof ChatShellView>) {
  return <ChatShellView {...props} />;
}

function usePublicThreadVisibility(params: {
  messagerieMode: boolean;
  initialChannelType: ChatChannelType;
  initialTopicId?: ChatTopicId | null;
  initialActionId?: string | null;
  initialMessageId?: string | null;
}) {
  return useState(() => shouldOpenPublicThreadOnMobile(params));
}

function useChatShellTone(tone: "light" | "dark"): boolean {
  return tone === "light";
}

function ChatShellRuntime({
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
  initialBuddyRequestId = null,
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
  const { locale } = useSitePreferences();
  const pathname = usePathname();
  const [activeFeedbackId, setActiveFeedbackId] = useState(initialFeedbackId);
  const [isPublicThreadOpen, setIsPublicThreadOpen] = usePublicThreadVisibility({ messagerieMode, initialChannelType, initialTopicId, initialActionId, initialMessageId });

  const chatContext = useChatShellContext({
    initialChannelType,
    initialArrondissement,
    initialZoneName,
    initialRecipient,
    initialTopicId,
    initialMessage,
    initialActionId,
    initialMessageId,
    initialBuddyRequestId,
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
  useChatShellNavigationEffects({
    navigationState,
    onNavigationChange,
    initialRecipient,
    initialContactRequestId,
    initialAnnouncementTemplate,
    initialEventId,
    controller,
    context: chatContext,
    activeFeedbackId,
    setActiveFeedbackId,
  });

  return <ChatShellOutput
    context={chatContext}
    composer={controller.composer}
    submit={controller.submit}
    pollVoting={controller.pollVoting}
    pathname={pathname}
    locale={locale}
    isLight={useChatShellTone(tone)}
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

export function ChatShell(props: ChatShellProps) {
  return <ChatShellRuntime {...props} />;
}
