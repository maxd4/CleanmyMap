import type { ChatShellLayoutProps } from "./chat-shell.layout";
import type { useChatShellContext } from "./hooks/use-chat-shell-context";
import type { useChatShellComposer } from "./hooks/use-chat-shell-composer";
import type { useChatShellPollVoting } from "./hooks/use-chat-shell-poll-voting";
import type { useChatSubmit } from "./hooks/use-chat-submit";
import type { useChatShellViewNavigation } from "./hooks/use-chat-shell-view-navigation";
import type { useChatShellViewPresentation } from "./hooks/use-chat-shell-view-presentation";

type ChatShellContext = ReturnType<typeof useChatShellContext>;
type ChatShellComposer = ReturnType<typeof useChatShellComposer>;
type ChatShellPollVoting = ReturnType<typeof useChatShellPollVoting>;
type ChatShellSubmit = Pick<ReturnType<typeof useChatSubmit>, "handleSend">;
type ChatShellNavigation = ReturnType<typeof useChatShellViewNavigation>;
type ChatShellPresentation = ReturnType<typeof useChatShellViewPresentation>;

export function buildChatShellDmInboxProps({
  context,
  navigation,
}: {
  context: ChatShellContext;
  navigation: ChatShellNavigation;
}): ChatShellLayoutProps["dmInboxProps"] {
  return {
    conversations: context.conversations,
    activePeerId: context.selectedRecipientId,
    isLoading: context.isDmInboxLoading,
    error: context.dmInboxError,
    onSelectConversation: navigation.dmNavigation.handleSelectDmConversation,
    onStartConversation: navigation.dmNavigation.handleStartDmConversation,
    onRetry: context.refreshInbox,
    notificationUnreadCount: context.chatNotificationUnreadCounts.dm,
    contactRequests: context.actionShareContactRequests,
    contactRequestsLoading: context.actionShareContactRequestsLoading,
    contactRequestsError: context.actionShareContactRequestsError,
    onRespondToContactRequest: navigation.handleRespondToActionShareContactRequest,
    recipientQuery: context.recipientQuery,
    isRecipientPickerOpen: context.isRecipientPickerOpen,
    dmSuggestions: context.dmSuggestions,
    onRecipientQueryChange: navigation.dmNavigation.handleRecipientQueryChange,
    onSelectRecipient: navigation.dmNavigation.handleSelectRecipient,
  };
}

export function buildChatShellSidebarProps({
  context,
  navigation,
}: {
  context: ChatShellContext;
  navigation: ChatShellNavigation;
}): ChatShellLayoutProps["sidebarProps"] {
  return {
    channels: navigation.sidebar.sidebarChannels,
    currentChannelType: context.activeChannelType,
    onSelectChannel: navigation.selection.handleSelectChannelForPresentation,
    onSelectTopic: navigation.selection.handleSelectTopicForPresentation,
    topicSectionTitle: navigation.sidebar.sidebarTopicSectionTitle,
    topicSectionDescription: navigation.sidebar.sidebarTopicSectionDescription,
    topics: navigation.sidebar.sidebarTopics,
    actionItems: context.actionDiscussions.items,
    activeActionId: context.selectedActionId,
    actionLoading: context.actionDiscussions.isLoading,
    actionError: context.actionDiscussions.error,
    onSelectAction: navigation.selection.handleSelectAction,
    currentZone: context.effectiveZone,
    profileDefaultZone: context.profileDefaultZone,
    onSelectZone: context.setSelectedZone,
  };
}

export function buildChatShellThreadProps({
  context,
  composer,
  pollVoting,
  submit,
  navigation,
  presentation,
  pathname,
  announcementEventRequested,
  announcementEventLoading,
  announcementEventError,
  messagerieMode,
}: {
  context: ChatShellContext;
  composer: ChatShellComposer;
  pollVoting: ChatShellPollVoting;
  submit: ChatShellSubmit;
  navigation: ChatShellNavigation;
  presentation: ChatShellPresentation;
  pathname: string;
  announcementEventRequested: boolean;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
  messagerieMode: boolean;
}): ChatShellLayoutProps["threadProps"] {
  const activeChannelPresentation = presentation.presentation;
  return {
    pagePath: pathname,
    messagerieMode,
    activeChannelType: context.activeChannelType,
    activeChannelLabel: activeChannelPresentation.activeChannelLabel,
    activeChannelDescription: activeChannelPresentation.activeChannelDescription,
    activeChannelIcon: activeChannelPresentation.activeChannelVisual.icon,
    metaItems: activeChannelPresentation.metaItems,
    viewMode: context.viewMode,
    isBugReportChannel: context.isBugReportChannel,
    selectedRecipient: context.selectedRecipient,
    isEditingHandle: context.isEditingHandle,
    newHandle: context.newHandle,
    onViewModeChange: navigation.selection.handleViewModeChange,
    onToggleHandleEditor: navigation.selection.handleToggleHandleEditor,
    onHandleChange: navigation.selection.handleHandleChange,
    onConfirmHandle: presentation.handleUpdateHandle,
    isLive: context.isLive,
    onBackToDmInbox: navigation.dmNavigation.handleBackToDmInbox,
    onBackToContextList: navigation.selection.handleBackToPublicContextList,
    showSearch: context.featureFlags.searchVisible,
    isSearchOpen: context.isSearchOpen,
    searchQuery: context.searchQuery,
    searchResults: context.chatSearch.results,
    searchIsLoading: context.chatSearch.isLoading,
    searchError: context.chatSearch.error,
    searchHasMore: context.chatSearch.hasMore,
    searchIsLoadingMore: context.chatSearch.isLoadingMore,
    searchLoadMoreError: context.chatSearch.loadMoreError,
    onToggleSearch: context.handleToggleSearch,
    onSearchQueryChange: context.setSearchQuery,
    onCloseSearch: context.handleCloseSearch,
    onSelectSearchResult: context.handleSelectSearchResult,
    onLoadMoreSearch: () => void context.chatSearch.loadMore(),
    selectedActionId: context.selectedActionId,
    messages: context.messages,
    scrollRef: context.scrollRef,
    hasMoreMessages: context.hasMoreMessages,
    isLoadingPrevious: context.isLoadingPrevious,
    loadPreviousError: context.loadPreviousError,
    onLoadPreviousMessages: () => void presentation.handleLoadPreviousMessages(),
    targetMessageId: context.targetMessageId,
    targetStatus: context.targetStatus,
    feedState: context.feedState,
    onRetryMessages: () => void context.mutateMessages(),
    userId: context.userId,
    onPollVote: pollVoting.handlePollVote,
    pollVoteStates: pollVoting.pollVoteStates,
    highlightedMessageId: presentation.highlightedMessageId,
    emptyState: activeChannelPresentation.discussionGuidance,
    selectedRecipientId: context.selectedRecipientId,
    onStarterPrompt: navigation.selection.handleStarterPrompt,
    isAuthenticated: Boolean(context.userId),
    composerPlaceholder: activeChannelPresentation.composerPlaceholder,
    composerMode: composer.composerMode,
    onComposerModeChange: composer.handleComposerModeChange,
    announcementTemplate: composer.announcementTemplate,
    onAnnouncementTemplateChange: composer.handleAnnouncementTemplateChange,
    relatedEvent: composer.relatedEvent,
    announcementEventRequested,
    announcementEventLoading,
    announcementEventError,
    pollOptions: composer.pollOptions,
    onPollOptionsChange: composer.setPollOptions,
    userMessage: context.message,
    onMessageChange: context.handleTextChange,
    file: context.file,
    onFileChange: context.setFile,
    fileInputRef: context.fileInputRef,
    isSending: context.isSending,
    isUploading: context.isUploading,
    sendError: context.sendError,
    showMentions: context.showMentions,
    mentionSuggestions: context.mentionSuggestions,
    onInsertMention: context.insertMention,
    onInsertLink: composer.handleInsertLink,
    onSubmit: submit.handleSend,
    canSubmit: composer.canSubmitMessage,
  };
}
