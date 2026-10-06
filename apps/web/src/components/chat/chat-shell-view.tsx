"use client";

import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "@/lib/ui/preferences";
import type { ChatUser } from "./chat-types";
import { ChatShellLayout } from "./chat-shell.layout";
import { getChatShellPresentation } from "./chat-shell.presentation";
import { useChatShellContext } from "./hooks/use-chat-shell-context";
import { useChatShellComposer } from "./hooks/use-chat-shell-composer";
import { useChatSubmit } from "./hooks/use-chat-submit";
import { useChatShellPollVoting } from "./hooks/use-chat-shell-poll-voting";
import { useChatShellViewNavigation } from "./hooks/use-chat-shell-view-navigation";
import { useChatShellViewPresentation } from "./hooks/use-chat-shell-view-presentation";
import {
  buildChatShellDmInboxProps,
  buildChatShellSidebarProps,
  buildChatShellThreadProps,
} from "./chat-shell-view-props";

type ChatShellContext = ReturnType<typeof useChatShellContext>;
type ChatShellComposer = ReturnType<typeof useChatShellComposer>;
type ChatShellSubmit = Pick<ReturnType<typeof useChatSubmit>, "handleSend">;
type ChatShellPollVoting = ReturnType<typeof useChatShellPollVoting>;

type ChatShellViewProps = {
  context: ChatShellContext;
  composer: ChatShellComposer;
  submit: ChatShellSubmit;
  pollVoting: ChatShellPollVoting;
  pathname: string;
  locale: Locale;
  isLight: boolean;
  fullHeight: boolean;
  messagerieMode: boolean;
  initialRecipient?: ChatUser | null;
  announcementEventRequested: boolean;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
  isPublicThreadOpen: boolean;
  setIsPublicThreadOpen: Dispatch<SetStateAction<boolean>>;
};

export function ChatShellView({
  context,
  composer,
  submit,
  pollVoting,
  pathname,
  locale,
  isLight,
  fullHeight,
  messagerieMode,
  initialRecipient,
  announcementEventRequested,
  announcementEventLoading,
  announcementEventError,
  isPublicThreadOpen,
  setIsPublicThreadOpen,
}: ChatShellViewProps) {
  const channelTopics = getChatShellPresentation({
    activeChannelType: context.activeChannelType,
    activeTopicId: context.activeTopicId,
    selectedActionId: context.selectedActionId,
    selectedRecipient: context.selectedRecipient,
    effectiveZone: context.effectiveZone,
    territoryFocus: context.territoryFocus,
    locale,
    actionItems: context.actionDiscussions.items,
    isLive: context.isLive,
  }).channelTopics;
  const navigation = useChatShellViewNavigation({
    context,
    composer,
    locale,
    messagerieMode,
    channelTopics,
    initialRecipient,
    setIsPublicThreadOpen,
  });
  const presentation = useChatShellViewPresentation({
    context,
    locale,
    messagerieMode,
    isDmThreadOpen: navigation.dmNavigation.isDmThreadOpen,
    isPublicThreadOpen,
  });
  const dmInboxProps = buildChatShellDmInboxProps({ context, navigation });
  const sidebarProps = buildChatShellSidebarProps({ context, navigation });
  const threadProps = buildChatShellThreadProps({
    context,
    composer,
    pollVoting,
    submit,
    navigation,
    presentation,
    pathname,
    messagerieMode,
    announcementEventRequested,
    announcementEventLoading,
    announcementEventError,
  });

  return (
    <ChatShellLayout
      fullHeight={fullHeight}
      isLight={isLight}
      messagerieMode={messagerieMode}
      isDmSurface={presentation.mobile.isDmSurface}
      showDmThreadOnMobile={presentation.mobile.showDmThreadOnMobile}
      showPublicThreadOnMobile={presentation.mobile.showPublicThreadOnMobile}
      showThreadOnMobile={presentation.mobile.showThreadOnMobile}
      dmInboxProps={dmInboxProps}
      sidebarProps={sidebarProps}
      threadProps={threadProps}
    />
  );
}
