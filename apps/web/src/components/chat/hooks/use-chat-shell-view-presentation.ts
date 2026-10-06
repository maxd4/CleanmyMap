import { getChatShellMobilePresentation, getChatShellPresentation } from "../chat-shell.presentation";
import type { Locale } from "@/lib/ui/preferences";
import { useChatShellFeedEffects } from "./use-chat-shell-feed-effects";
import { useChatShellProfileActions } from "./use-chat-shell-profile-actions";
import { useChatShellContext } from "./use-chat-shell-context";

type ChatShellContext = ReturnType<typeof useChatShellContext>;

export function useChatShellViewPresentation({
  context,
  locale,
  messagerieMode,
  isPublicThreadOpen,
  isDmThreadOpen,
}: {
  context: ChatShellContext;
  locale: Locale;
  messagerieMode: boolean;
  isPublicThreadOpen: boolean;
  isDmThreadOpen: boolean;
}) {
  const presentation = getChatShellPresentation({
    activeChannelType: context.activeChannelType,
    activeTopicId: context.activeTopicId,
    selectedActionId: context.selectedActionId,
    selectedRecipient: context.selectedRecipient,
    effectiveZone: context.effectiveZone,
    territoryFocus: context.territoryFocus,
    locale,
    actionItems: context.actionDiscussions.items,
    isLive: context.isLive,
  });
  const { highlightedMessageId, handleLoadPreviousMessages } = useChatShellFeedEffects({
    activeChannelType: context.activeChannelType,
    selectedActionId: context.selectedActionId,
    activeTopicId: context.activeTopicId,
    selectedRecipientId: context.selectedRecipientId,
    effectiveZone: context.effectiveZone,
    territoryFocus: context.territoryFocus,
    viewMode: context.viewMode,
    feedState: context.feedState,
    messages: context.messages,
    targetMessageId: context.targetMessageId,
    targetStatus: context.targetStatus,
    scrollRef: context.scrollRef,
    loadPreviousMessages: context.loadPreviousMessages,
    resetSearch: context.resetSearch,
  });
  const handleUpdateHandle = useChatShellProfileActions({
    newHandle: context.newHandle,
    setIsEditingHandle: context.setIsEditingHandle,
  });
  const mobile = getChatShellMobilePresentation({
    messagerieMode,
    activeChannelType: context.activeChannelType,
    selectedRecipient: context.selectedRecipient,
    isDmThreadOpen,
    isPublicThreadOpen,
  });
  return { presentation, highlightedMessageId, handleLoadPreviousMessages, handleUpdateHandle, mobile };
}
