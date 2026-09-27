"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { ChatChannelType } from "@/lib/chat/channels";
import { ChatShellLayout } from "./chat-shell.layout";
import { useChatData } from "./hooks/use-chat-data";
import { useChatActionDiscussions } from "./hooks/use-chat-action-discussions";
import { useDmInbox } from "./hooks/use-dm-inbox";
import { useActionShareContactRequests } from "./hooks/use-action-share-contact-requests";
import { useChatNotificationUnreads } from "./hooks/use-chat-notification-unreads";
import { useChatState } from "./hooks/use-chat-state";
import { useChatSubmit } from "./hooks/use-chat-submit";
import { useChatShellFeedEffects } from "./hooks/use-chat-shell-feed-effects";
import { useChatShellNotificationEffects } from "./hooks/use-chat-shell-notification-effects";
import { useChatShellProfileActions } from "./hooks/use-chat-shell-profile-actions";
import { useChatShellSearch } from "./hooks/use-chat-shell-search";
import { useChatShellSidebar } from "./hooks/use-chat-shell-sidebar";
import { useChatShellRuntimeContext } from "./hooks/use-chat-shell-runtime-context";
import { useChatShellComposer } from "./hooks/use-chat-shell-composer";
import { useChatShellPollVoting } from "./hooks/use-chat-shell-poll-voting";
import { useChatShellDmNavigation } from "./hooks/use-chat-shell-dm-navigation";
import { useChatShellNavigation } from "./hooks/use-chat-shell-navigation";
import type { ActionShareContactRequest, ChatUser } from "./chat-types";
import type { ChatTopicId } from "@/lib/chat/topics";
import {
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import type { SendChatMessageParams } from "./hooks/use-chat-data";
import {
  getChatShellMobilePresentation,
  getChatShellPresentation,
} from "./chat-shell.presentation";
import { useChatSearch } from "./hooks/use-chat-search";
import {
  type ChatShellNavigationState,
} from "./chat-navigation";
import {
  applyChatStarterPrompt,
  getChatShellFeatureFlags,
  getFeedbackIdForSubmit,
  respondToActionShareContactRequestAndOpenDm,
  resolveActiveChannelType,
  resolveSelectedRecipient,
  sendChatMessageAndRefreshInbox,
  shouldOpenPublicThreadOnMobile,
} from "./chat-shell.behavior";

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

function consumeFeedbackIdFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.delete("feedbackId");
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function isInitialRecipient(
  selectedRecipient: ChatUser | null,
  initialRecipient: ChatUser | null | undefined,
): boolean {
  return selectedRecipient?.id === initialRecipient?.id;
}

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

  const {
    activeChannelType,
    selectedActionId,
    setSelectedActionId,
    setActiveChannelType: setActiveChannelTypeState,
    viewMode,
    setViewMode,
    message,
    setMessage,
    isSending,
    setIsSending,
    showMentions,
    setShowMentions,
    mentionQuery,
    file,
    setFile,
    isUploading,
    setIsUploading,
    sendError,
    setSendError,
    isEditingHandle,
    setIsEditingHandle,
    newHandle,
    setNewHandle,
    recipientQuery,
    setRecipientQuery,
    selectedRecipient,
    setSelectedRecipient: setSelectedRecipientState,
    isRecipientPickerOpen,
    setIsRecipientPickerOpen,
    selectedZone,
    setSelectedZone,
    isBugReportChannel,
    activeTopicId,
    setActiveTopicId,
    fileInputRef,
    scrollRef,
    submitLockRef,
    handleTextChange,
    insertMention,
  } = useChatState({
    initialChannelType,
    initialArrondissement,
    initialZoneName,
    initialRecipient,
    initialTopicId,
    initialMessage,
    initialActionId,
  });

  const selectedRecipientId = selectedRecipient?.id ?? null;

  const setActiveChannelType = useCallback(
    (nextValue: Parameters<typeof setActiveChannelTypeState>[0]) => {
      setActiveChannelTypeState((currentValue) => resolveActiveChannelType({
        nextValue,
        currentValue,
        clearFeedback: () => setActiveFeedbackId(null),
      }));
    },
    [setActiveChannelTypeState],
  );

  const setSelectedRecipient = useCallback(
    (nextValue: Parameters<typeof setSelectedRecipientState>[0]) => {
      setSelectedRecipientState((currentValue) => resolveSelectedRecipient({
        nextValue,
        currentValue,
        initialRecipient,
        clearFeedback: () => setActiveFeedbackId(null),
      }));
    },
    [initialRecipient, setSelectedRecipientState],
  );
  const {
    currentRoleLabel,
    effectiveZone,
    profileDefaultZone,
    hasArrondissement,
    hasGreaterParisZone,
    isLoaded,
    isSignedIn,
    senderDisplayName,
    senderHandle,
    supabase,
    territoryFocus,
    user,
    userId,
  } = useChatShellRuntimeContext({
    selectedZone,
    initialArrondissement,
  });
  const featureFlags = getChatShellFeatureFlags({
    messagerieMode,
    activeChannelType,
    isBugReportChannel,
    isLoaded,
    isSignedIn,
  });
  const {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    targetMessageIdForScope,
    handleToggleSearch,
    handleCloseSearch,
    handleSelectSearchResult,
    resetSearch,
  } = useChatShellSearch({
    initialChannelType,
    initialTopicId,
    initialRecipient,
    initialMessageId,
    activeChannelType,
    activeTopicId,
    selectedRecipientId,
    setViewMode,
  });

  const {
    messages,
    hasMoreMessages,
    isLoadingPrevious,
    loadPreviousError,
    loadPreviousMessages,
    targetMessageId,
    targetStatus,
    feedState,
    mentionSuggestions,
    dmSuggestions,
    sendChatMessage,
    mutateMessages,
    isLive,
  } = useChatData({
    activeChannelType,
    activeActionId: selectedActionId,
    activeTopicId,
    selectedRecipientId,
    effectiveZone,
    territoryFocus,
    showMentions,
    mentionQuery,
    recipientQuery,
    initialMessageId: targetMessageIdForScope,
    currentUserId: userId,
    canAccessProtectedChat: featureFlags.canAccessProtectedChat,
    supabase,
  });

  const actionDiscussions = useChatActionDiscussions(featureFlags.actionDiscussionsEnabled);

  const chatSearch = useChatSearch({
    activeChannelType,
    activeTopicId,
    selectedRecipientId,
    effectiveZone,
    territoryFocus,
    query: searchQuery,
    enabled: featureFlags.chatSearchEnabled,
  });

  const {
    conversations,
    error: dmInboxError,
    isLoading: isDmInboxLoading,
    refreshInbox,
    markConversationRead,
  } = useDmInbox({
    enabled: featureFlags.dmInboxEnabled,
    currentUserId: userId,
    supabase,
  });
  const {
    requests: actionShareContactRequests,
    error: actionShareContactRequestsError,
    isLoading: actionShareContactRequestsLoading,
    respond: respondToActionShareContactRequest,
  } = useActionShareContactRequests({
    enabled: featureFlags.contactRequestsEnabled,
    currentUserId: userId,
  });

  const {
    counts: chatNotificationUnreadCounts,
    markRead: markChatNotificationsRead,
  } = useChatNotificationUnreads({
    enabled: featureFlags.notificationsEnabled,
    currentUserId: userId,
    supabase,
  });

  const sendChatMessageWithInboxRefresh = useCallback(
    (params: SendChatMessageParams) => sendChatMessageAndRefreshInbox({
      params,
      sendChatMessage,
      activeFeedbackId,
      setActiveFeedbackId,
      refreshInbox,
      consumeFeedbackId: consumeFeedbackIdFromUrl,
    }),
    [activeFeedbackId, refreshInbox, sendChatMessage],
  );

  const {
    announcementTemplate,
    canSubmitMessage,
    composerMode,
    handleAnnouncementTemplateChange,
    handleComposerModeChange,
    handleInsertLink,
    handleSelectTopic,
    pollOptions,
    relatedEvent,
    resetComposerForChannelChange,
    setPollOptions,
  } = useChatShellComposer({
    initialComposerMode,
    initialAnnouncementTemplate,
    initialRelatedEvent,
    announcementEventRequested,
    announcementEventLoading,
    announcementEventError,
    userId,
    isLoaded,
    isSignedIn,
    message,
    file,
    isSending,
    isUploading,
    activeChannelType,
    activeActionId: selectedActionId,
    selectedRecipient,
    effectiveZone,
    territoryFocus,
    setActiveTopicId,
    setFile,
    setMessage,
    setSendError,
  });

  useChatShellNavigation({
    navigationState,
    onNavigationChange,
    initialRecipient,
    initialContactRequestId,
    initialAnnouncementTemplate,
    initialEventId,
    announcementTemplate,
    handleAnnouncementTemplateChange,
    handleComposerModeChange,
    activeChannelType,
    activeTopicId,
    selectedActionId,
    selectedRecipient,
    selectedZone,
    territoryFocus,
    targetMessageIdForScope,
    activeFeedbackId,
    setActiveChannelType,
    setSelectedActionId,
    setActiveTopicId,
    setSelectedRecipient,
    setSelectedZone,
    setActiveFeedbackId,
  });

  const { handlePollVote, pollVoteStates } = useChatShellPollVoting({
    messages,
    mutateMessages,
  });

  const feedbackIdForSubmit =
    getFeedbackIdForSubmit({
      activeChannelType,
      selectedRecipient,
      initialRecipient,
      activeFeedbackId,
      isInitialRecipient,
    });

  const { handleSend } = useChatSubmit({
    submitLockRef,
    userId,
    user,
    senderDisplayName,
    senderHandle,
    message,
    file,
    isSending,
    isUploading,
    activeChannelType,
    activeActionId: selectedActionId,
    activeTopicId,
    messageKind: composerMode,
    pollOptions,
    relatedEvent,
    selectedRecipient,
    effectiveZone,
    territoryFocus,
    setIsSending,
    setSendError,
    setIsUploading,
    supabase,
    sendChatMessage: sendChatMessageWithInboxRefresh,
    feedbackId: feedbackIdForSubmit,
    setMessage,
    setFile,
    setShowMentions,
    setPollOptions,
  });

  const presentation = getChatShellPresentation({
    activeChannelType,
    activeTopicId,
    selectedActionId,
    selectedRecipient,
    effectiveZone,
    territoryFocus,
    locale,
    actionItems: actionDiscussions.items,
    isLive,
  });
  const {
    activeChannelLabel,
    activeChannelVisual,
    channelTopics,
    discussionGuidance,
    metaItems,
    composerPlaceholder,
  } = presentation;
  const ActiveChannelIcon = activeChannelVisual.icon;

  const { highlightedMessageId, handleLoadPreviousMessages } =
    useChatShellFeedEffects({
      activeChannelType,
      selectedActionId,
      activeTopicId,
       selectedRecipientId,
      effectiveZone,
      territoryFocus,
      viewMode,
      feedState,
      messages,
      targetMessageId,
      targetStatus,
      scrollRef,
      loadPreviousMessages,
      resetSearch,
    });

  const handleUpdateHandle = useChatShellProfileActions({
    newHandle,
    setIsEditingHandle,
  });

  const {
    handleBackToDmInbox,
    handleRecipientQueryChange,
    handleSelectDmConversation,
    handleSelectRecipient,
    handleStartDmConversation,
    isDmThreadOpen,
    setIsDmThreadOpen,
  } = useChatShellDmNavigation({
    initialRecipient,
    setActiveTopicId,
    setActiveChannelType,
    setSelectedRecipient,
    setRecipientQuery,
    setIsRecipientPickerOpen,
  });

  const handleRespondToActionShareContactRequest = useCallback(
    (
      request: ActionShareContactRequest,
      decision: "accept" | "reject" | "ignore",
    ) => respondToActionShareContactRequestAndOpenDm({
      request,
      decision,
      respond: respondToActionShareContactRequest,
      refreshInbox,
      selectRecipient: handleSelectRecipient,
    }),
    [handleSelectRecipient, refreshInbox, respondToActionShareContactRequest],
  );

  const {
    sidebarChannels,
    sidebarTopics,
    sidebarTopicSectionTitle,
    sidebarTopicSectionDescription,
    handleSelectChannel,
  } = useChatShellSidebar({
    activeChannelType,
    currentRoleLabel,
    hasArrondissement,
    hasGreaterParisZone,
    effectiveZone,
    territoryFocus,
    messagesCount: messages.length,
    messagerieMode,
    chatNotificationUnreadCounts,
    channelTopics,
    activeTopicId,
    locale,
    resetComposerForChannelChange,
    setActiveTopicId,
    setActiveChannelType,
    setIsDmThreadOpen,
  });

  const handleSelectAction = useCallback(
    (actionId: string) => {
      resetComposerForChannelChange();
      setActiveTopicId(null);
      setSelectedActionId(actionId);
      setActiveChannelType("action");
      setIsDmThreadOpen(false);
      setIsPublicThreadOpen(true);
    },
    [resetComposerForChannelChange, setActiveChannelType, setActiveTopicId, setIsDmThreadOpen, setIsPublicThreadOpen, setSelectedActionId],
  );

  const handleSelectChannelForPresentation = useCallback(
    (channelType: ChatChannelType) => {
      handleSelectChannel(channelType);
      setIsPublicThreadOpen(true);
    },
    [handleSelectChannel],
  );

  const handleSelectTopicForPresentation = useCallback(
    (topicId: ChatTopicId) => {
      handleSelectTopic(topicId);
      setIsPublicThreadOpen(true);
    },
    [handleSelectTopic],
  );

  const handleBackToPublicContextList = useCallback(() => {
    setIsPublicThreadOpen(false);
  }, []);

  const handleViewModeChange = useCallback(
    (mode: "messages" | "graph") => {
      setViewMode(mode);
    },
    [setViewMode],
  );

  const handleToggleHandleEditor = useCallback(() => {
    setIsEditingHandle((current) => !current);
  }, [setIsEditingHandle]);

  const handleHandleChange = useCallback(
    (value: string) => {
      setNewHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
    },
    [setNewHandle],
  );

  useChatShellNotificationEffects({
    activeChannelType,
    selectedActionId,
    activeTopicId,
    feedState,
    messagerieMode,
    selectedRecipient,
    conversations,
    setSelectedRecipient,
    markConversationRead,
    markChatNotificationsRead,
    messages,
  });

  const {
    isDmSurface,
    showDmThreadOnMobile,
    showPublicThreadOnMobile,
    showThreadOnMobile,
  } = getChatShellMobilePresentation({
    messagerieMode,
    activeChannelType,
    selectedRecipient,
    isDmThreadOpen,
    isPublicThreadOpen,
  });

  const handleStarterPrompt = useCallback(
    (prompt: string) => applyChatStarterPrompt({
      prompt,
      activeChannelType,
      selectedRecipient,
      setMessage,
      setShowMentions,
      setSendError,
      setIsRecipientPickerOpen,
    }),
    [
      setMessage,
      setShowMentions,
      setSendError,
      activeChannelType,
      selectedRecipient,
      setIsRecipientPickerOpen,
    ],
  );

  return (
    <ChatShellLayout
      fullHeight={fullHeight}
      isLight={isLight}
      messagerieMode={messagerieMode}
      isDmSurface={isDmSurface}
      showDmThreadOnMobile={showDmThreadOnMobile}
      showPublicThreadOnMobile={showPublicThreadOnMobile}
      showThreadOnMobile={showThreadOnMobile}
      dmInboxProps={{
        conversations,
        activePeerId: selectedRecipientId,
        isLoading: isDmInboxLoading,
        error: dmInboxError,
        onSelectConversation: handleSelectDmConversation,
        onStartConversation: handleStartDmConversation,
        onRetry: refreshInbox,
        notificationUnreadCount: chatNotificationUnreadCounts.dm,
        contactRequests: actionShareContactRequests,
        contactRequestsLoading: actionShareContactRequestsLoading,
        contactRequestsError: actionShareContactRequestsError,
        onRespondToContactRequest: handleRespondToActionShareContactRequest,
        recipientQuery,
        isRecipientPickerOpen,
        dmSuggestions,
        onRecipientQueryChange: handleRecipientQueryChange,
        onSelectRecipient: handleSelectRecipient,
      }}
      sidebarProps={{
        channels: sidebarChannels,
        currentChannelType: activeChannelType,
        onSelectChannel: handleSelectChannelForPresentation,
        onSelectTopic: handleSelectTopicForPresentation,
        topicSectionTitle: sidebarTopicSectionTitle,
        topicSectionDescription: sidebarTopicSectionDescription,
        topics: sidebarTopics,
        actionItems: actionDiscussions.items,
        activeActionId: selectedActionId,
        actionLoading: actionDiscussions.isLoading,
        actionError: actionDiscussions.error,
        onSelectAction: handleSelectAction,
        currentZone: effectiveZone,
        profileDefaultZone,
        onSelectZone: setSelectedZone,
      }}
      threadProps={{
        pagePath: pathname,
        messagerieMode,
        activeChannelType,
        activeChannelLabel,
        activeChannelDescription: presentation.activeChannelDescription,
        activeChannelIcon: ActiveChannelIcon,
        metaItems,
        viewMode,
        isBugReportChannel,
        selectedRecipient,
        isEditingHandle,
        newHandle,
        onViewModeChange: handleViewModeChange,
        onToggleHandleEditor: handleToggleHandleEditor,
        onHandleChange: handleHandleChange,
        onConfirmHandle: handleUpdateHandle,
        isLive,
        onBackToDmInbox: handleBackToDmInbox,
        onBackToContextList: handleBackToPublicContextList,
        showSearch: featureFlags.searchVisible,
        isSearchOpen,
        searchQuery,
        searchResults: chatSearch.results,
        searchIsLoading: chatSearch.isLoading,
        searchError: chatSearch.error,
        searchHasMore: chatSearch.hasMore,
        searchIsLoadingMore: chatSearch.isLoadingMore,
        searchLoadMoreError: chatSearch.loadMoreError,
        onToggleSearch: handleToggleSearch,
        onSearchQueryChange: setSearchQuery,
        onCloseSearch: handleCloseSearch,
        onSelectSearchResult: handleSelectSearchResult,
        onLoadMoreSearch: () => void chatSearch.loadMore(),
        selectedActionId,
        messages,
        scrollRef,
        hasMoreMessages,
        isLoadingPrevious,
        loadPreviousError,
        onLoadPreviousMessages: () => void handleLoadPreviousMessages(),
        targetMessageId,
        targetStatus,
        feedState,
        onRetryMessages: () => void mutateMessages(),
        userId,
        onPollVote: handlePollVote,
        pollVoteStates,
        highlightedMessageId,
        emptyState: discussionGuidance,
        selectedRecipientId,
        onStarterPrompt: handleStarterPrompt,
        isAuthenticated: Boolean(userId),
        composerPlaceholder,
        composerMode,
        onComposerModeChange: handleComposerModeChange,
        announcementTemplate,
        onAnnouncementTemplateChange: handleAnnouncementTemplateChange,
        relatedEvent,
        announcementEventRequested,
        announcementEventLoading,
        announcementEventError,
        pollOptions,
        onPollOptionsChange: setPollOptions,
        userMessage: message,
        onMessageChange: handleTextChange,
        file,
        onFileChange: setFile,
        fileInputRef,
        isSending,
        isUploading,
        sendError,
        showMentions,
        mentionSuggestions,
        onInsertMention: insertMention,
        onInsertLink: handleInsertLink,
        onSubmit: handleSend,
        canSubmit: canSubmitMessage,
      }}
    />
  );
}
