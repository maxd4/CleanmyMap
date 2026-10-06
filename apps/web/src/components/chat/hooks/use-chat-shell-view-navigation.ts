import type { Dispatch, SetStateAction } from "react";
import type { Locale } from "@/lib/ui/preferences";
import type { ActionShareContactRequest, ChatUser } from "../chat-types";
import type { ChatShellPresentation } from "../chat-shell.presentation";
import { respondToActionShareContactRequestAndOpenDm } from "../chat-shell.behavior";
import { useChatShellNotificationEffects } from "./use-chat-shell-notification-effects";
import { useChatShellSidebar } from "./use-chat-shell-sidebar";
import { useChatShellDmNavigation } from "./use-chat-shell-dm-navigation";
import { useChatShellSelection } from "./use-chat-shell-selection";
import { useChatShellContext } from "./use-chat-shell-context";
import { useChatShellComposer } from "./use-chat-shell-composer";

type ChatShellContext = ReturnType<typeof useChatShellContext>;
type ChatShellComposer = ReturnType<typeof useChatShellComposer>;

export function useChatShellViewNavigation({
  context,
  composer,
  locale,
  messagerieMode,
  channelTopics,
  initialRecipient,
  setIsPublicThreadOpen,
}: {
  context: ChatShellContext;
  composer: ChatShellComposer;
  locale: Locale;
  messagerieMode: boolean;
  channelTopics: ChatShellPresentation["channelTopics"];
  initialRecipient?: ChatUser | null;
  setIsPublicThreadOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const dmNavigation = useChatShellDmNavigation({
    initialRecipient,
    setActiveTopicId: context.setActiveTopicId,
    setActiveChannelType: context.setActiveChannelType,
    setSelectedRecipient: context.setSelectedRecipient,
    setRecipientQuery: context.setRecipientQuery,
    setIsRecipientPickerOpen: context.setIsRecipientPickerOpen,
  });
  const handleRespondToActionShareContactRequest = (
    request: ActionShareContactRequest,
    decision: "accept" | "reject" | "ignore",
  ) => respondToActionShareContactRequestAndOpenDm({
    request,
    decision,
    respond: context.respondToActionShareContactRequest,
    refreshInbox: context.refreshInbox,
    selectRecipient: dmNavigation.handleSelectRecipient,
  });
  const sidebar = useChatShellSidebar({
    activeChannelType: context.activeChannelType,
    currentRoleLabel: context.currentRoleLabel,
    hasArrondissement: context.hasArrondissement,
    hasGreaterParisZone: context.hasGreaterParisZone,
    effectiveZone: context.effectiveZone,
    territoryFocus: context.territoryFocus,
    messagesCount: context.messages.length,
    messagerieMode,
    chatNotificationUnreadCounts: context.chatNotificationUnreadCounts,
    channelTopics,
    activeTopicId: context.activeTopicId,
    locale,
    resetComposerForChannelChange: composer.resetComposerForChannelChange,
    setActiveTopicId: context.setActiveTopicId,
    setActiveChannelType: context.setActiveChannelType,
    setIsDmThreadOpen: dmNavigation.setIsDmThreadOpen,
  });
  const selection = useChatShellSelection({
    resetComposerForChannelChange: composer.resetComposerForChannelChange,
    setActiveTopicId: context.setActiveTopicId,
    setSelectedActionId: context.setSelectedActionId,
    setActiveChannelType: context.setActiveChannelType,
    setIsDmThreadOpen: dmNavigation.setIsDmThreadOpen,
    setIsPublicThreadOpen,
    handleSelectChannel: sidebar.handleSelectChannel,
    handleSelectTopic: composer.handleSelectTopic,
    setViewMode: context.setViewMode,
    setIsEditingHandle: context.setIsEditingHandle,
    setNewHandle: context.setNewHandle,
    activeChannelType: context.activeChannelType,
    selectedRecipient: context.selectedRecipient,
    setMessage: context.setMessage,
    setShowMentions: context.setShowMentions,
    setSendError: context.setSendError,
    setIsRecipientPickerOpen: context.setIsRecipientPickerOpen,
  });
  useChatShellNotificationEffects({
    activeChannelType: context.activeChannelType,
    selectedActionId: context.selectedActionId,
    activeTopicId: context.activeTopicId,
    feedState: context.feedState,
    messagerieMode,
    selectedRecipient: context.selectedRecipient,
    conversations: context.conversations,
    setSelectedRecipient: context.setSelectedRecipient,
    markConversationRead: context.markConversationRead,
    markChatNotificationsRead: context.markChatNotificationsRead,
    messages: context.messages,
  });
  return { dmNavigation, sidebar, selection, handleRespondToActionShareContactRequest };
}
