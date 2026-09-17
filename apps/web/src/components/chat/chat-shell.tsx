"use client";

import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  getChatChannelDefinition,
  type ChatChannelType,
} from "@/lib/chat/channels";
import {
  getDiscussionTopic,
  getDiscussionTopics,
} from "./discussion-guidance";
import { TopicNetworkGraph } from "./topic-network-graph";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { ChatActionModeration } from "./chat-action-moderation";
import { ChatSidebar } from "./chat-sidebar";
import { DmInbox } from "./dm-inbox";
import { ChatContextSidebar } from "./chat-context-sidebar";
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
import type { ActionShareContactRequest, ChatUser } from "./chat-types";
import type { ChatTopicId } from "@/lib/chat/topics";
import {
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import type { SendChatMessageParams } from "./hooks/use-chat-data";
import { ChatMessageFeed } from "./ui/chat-message-feed";
import {
  CHANNEL_VISUALS,
  getChannelPlaceholder,
  getChannelTitle,
  getEmptyStateCopy,
  type ChatMetaItem,
} from "./chat-shell.utils";
import { useChatSearch } from "./hooks/use-chat-search";
import { formatBusinessDurationMinutes } from "@/lib/actions/time-contract";
import {
  getChatShellNavigationKey,
  type ChatShellNavigationState,
} from "./chat-navigation";

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
    () =>
      !messagerieMode ||
      initialChannelType !== "community" ||
      Boolean(initialTopicId || initialActionId || initialMessageId),
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

  const setActiveChannelType = useCallback(
    (nextValue: Parameters<typeof setActiveChannelTypeState>[0]) => {
      setActiveChannelTypeState((currentValue) => {
        const resolvedValue =
          typeof nextValue === "function" ? nextValue(currentValue) : nextValue;
        if (resolvedValue !== "dm") {
          setActiveFeedbackId(null);
        }
        return resolvedValue;
      });
    },
    [setActiveChannelTypeState],
  );

  const setSelectedRecipient = useCallback(
    (nextValue: Parameters<typeof setSelectedRecipientState>[0]) => {
      const resolvedValue =
        typeof nextValue === "function" ? nextValue(selectedRecipient) : nextValue;
      if (resolvedValue?.id !== initialRecipient?.id) {
        setActiveFeedbackId(null);
      }
      setSelectedRecipientState(nextValue);
    },
    [initialRecipient?.id, selectedRecipient, setSelectedRecipientState],
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
    selectedRecipientId: selectedRecipient?.id ?? null,
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
    selectedRecipientId: selectedRecipient?.id ?? null,
    effectiveZone,
    territoryFocus,
    showMentions,
    mentionQuery,
    recipientQuery,
    initialMessageId: targetMessageIdForScope,
    currentUserId: userId,
    canAccessProtectedChat: isLoaded && isSignedIn,
    supabase,
  });

  const actionDiscussions = useChatActionDiscussions(messagerieMode && isLoaded);

  const chatSearch = useChatSearch({
    activeChannelType,
    activeTopicId,
    selectedRecipientId: selectedRecipient?.id ?? null,
    effectiveZone,
    territoryFocus,
    query: searchQuery,
    enabled: messagerieMode && !isBugReportChannel && isLoaded && isSignedIn,
  });

  const {
    conversations,
    error: dmInboxError,
    isLoading: isDmInboxLoading,
    refreshInbox,
    markConversationRead,
  } = useDmInbox({
    enabled: messagerieMode && activeChannelType === "dm",
    currentUserId: userId,
    supabase,
  });
  const {
    requests: actionShareContactRequests,
    error: actionShareContactRequestsError,
    isLoading: actionShareContactRequestsLoading,
    respond: respondToActionShareContactRequest,
  } = useActionShareContactRequests({
    enabled: messagerieMode && activeChannelType === "dm" && isLoaded && isSignedIn,
    currentUserId: userId,
  });

  const {
    counts: chatNotificationUnreadCounts,
    markRead: markChatNotificationsRead,
  } = useChatNotificationUnreads({
    enabled: messagerieMode && isLoaded && isSignedIn,
    currentUserId: userId,
    supabase,
  });

  const sendChatMessageWithInboxRefresh = useCallback(
    async (params: SendChatMessageParams) => {
      const sentMessage = await sendChatMessage(params);
      if (params.body.feedbackId === activeFeedbackId) {
        setActiveFeedbackId(null);
        consumeFeedbackIdFromUrl();
      }
      if (params.body.channelType === "dm") {
        try {
          await refreshInbox();
        } catch {
          // The message was already accepted by the API; inbox refresh is best-effort.
        }
      }
      return sentMessage;
    },
    [activeFeedbackId, refreshInbox, sendChatMessage],
  );

  const {
    announcementTemplate,
    canSubmitMessage,
    composerMode,
    handleAnnouncementTemplateChange,
    handleComposerModeChange,
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

  const navigationStateKey = navigationState
    ? getChatShellNavigationKey(navigationState)
    : null;
  const appliedNavigationStateKeyRef = useRef<string | null>(null);
  const restoringNavigationRef = useRef(false);
  useEffect(() => {
    if (
      !navigationState ||
      !navigationStateKey ||
      appliedNavigationStateKeyRef.current === navigationStateKey
    ) {
      return;
    }

    if (appliedNavigationStateKeyRef.current !== null) {
      restoringNavigationRef.current = true;
    }
    appliedNavigationStateKeyRef.current = navigationStateKey;
    setActiveChannelType(navigationState.activeChannelType);
    setSelectedActionId(
      navigationState.activeChannelType === "action"
        ? navigationState.selectedActionId
        : null,
    );
    setActiveTopicId(navigationState.activeTopicId);
    setSelectedRecipient(navigationState.selectedRecipient);
    setSelectedZone(navigationState.selectedZone);
    setActiveFeedbackId(navigationState.feedbackId);
    if (navigationState.announcementTemplate) {
      handleAnnouncementTemplateChange(navigationState.announcementTemplate);
    } else if (announcementTemplate) {
      handleComposerModeChange("message");
    }
  }, [
    announcementTemplate,
    handleAnnouncementTemplateChange,
    handleComposerModeChange,
    navigationState,
    navigationStateKey,
    setActiveChannelType,
    setActiveTopicId,
    setSelectedActionId,
    setSelectedRecipient,
    setSelectedZone,
  ]);

  const navigationChangeRef = useRef(onNavigationChange);
  useEffect(() => {
    navigationChangeRef.current = onNavigationChange;
  }, [onNavigationChange]);
  useEffect(() => {
    if (restoringNavigationRef.current) {
      restoringNavigationRef.current = false;
      return;
    }
    navigationChangeRef.current?.({
      activeChannelType,
      activeTopicId,
      selectedActionId,
      selectedRecipient,
      selectedZone,
      territoryFocus,
      messageId: targetMessageIdForScope,
      feedbackId: activeFeedbackId,
      contactRequestId:
        selectedRecipient?.id === initialRecipient?.id
          ? initialContactRequestId
          : null,
      announcementTemplate,
      eventId:
        announcementTemplate && announcementTemplate === initialAnnouncementTemplate
          ? initialEventId
          : null,
    });
  }, [
    activeChannelType,
    activeFeedbackId,
    activeTopicId,
    announcementTemplate,
    initialAnnouncementTemplate,
    initialContactRequestId,
    initialEventId,
    initialRecipient?.id,
    selectedActionId,
    selectedRecipient,
    selectedZone,
    targetMessageIdForScope,
    territoryFocus,
  ]);

  const { handlePollVote, pollVoteStates } = useChatShellPollVoting({
    messages,
    mutateMessages,
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
    feedbackId:
      activeChannelType === "dm" &&
      selectedRecipient?.id === initialRecipient?.id
        ? activeFeedbackId
        : null,
    setMessage,
    setFile,
    setShowMentions,
    setPollOptions,
  });

  const territoryLabel = useMemo(
    () =>
      effectiveZone ||
      (territoryFocus ? `${territoryFocus}e arrondissement` : null),
    [effectiveZone, territoryFocus],
  );
  const recipientLabel = useMemo(
    () => selectedRecipient?.display_name ?? selectedRecipient?.handle ?? null,
    [selectedRecipient?.display_name, selectedRecipient?.handle],
  );
  const activeChannelDefinition = useMemo(
    () => getChatChannelDefinition(activeChannelType),
    [activeChannelType],
  );
  const activeAction = useMemo(
    () => actionDiscussions.items.find((item) => item.id === selectedActionId) ?? null,
    [actionDiscussions.items, selectedActionId],
  );
  const activeTopic = useMemo(
    () => getDiscussionTopic(activeChannelType, activeTopicId),
    [activeChannelType, activeTopicId],
  );
  const channelTopics = useMemo(
    () => getDiscussionTopics(activeChannelType),
    [activeChannelType],
  );
  const discussionGuidance = useMemo(
    () =>
      getEmptyStateCopy(
        activeChannelType,
        locale,
        recipientLabel,
        territoryLabel,
        activeTopicId,
      ),
    [activeChannelType, activeTopicId, locale, recipientLabel, territoryLabel],
  );
  const metaItems: ChatMetaItem[] = useMemo(
    () => [
      {
        label: locale === "fr" ? "Canal" : "Channel",
        value: activeAction ? "Actions" : getChannelTitle(activeChannelType),
      },
      ...(activeAction
        ? [
            { label: locale === "fr" ? "Date" : "Date", value: activeAction.action_date },
            { label: locale === "fr" ? "Lieu" : "Location", value: activeAction.location_label },
            { label: locale === "fr" ? "Organisateur" : "Organizer", value: activeAction.association_name || activeAction.actor_name || "—" },
            { label: locale === "fr" ? "Participants prévus" : "Planned participants", value: String(activeAction.contract?.metadata.preparationData?.volunteerParticipation?.participantsCount ?? activeAction.volunteers_count) },
            { label: locale === "fr" ? "Durée estimée" : "Estimated duration", value: formatBusinessDurationMinutes(activeAction.duration_minutes) },
          ]
        : []),
      ...(activeTopic
        ? [
            {
              label: locale === "fr" ? "Salon" : "Topic",
              value: activeTopic.label,
            },
          ]
        : []),
      {
        label: locale === "fr" ? "Audience" : "Audience",
        value: discussionGuidance.audienceLabel,
      },
      {
        label: locale === "fr" ? "Visibilité" : "Visibility",
        value: discussionGuidance.visibilityLabel,
      },
      {
        label: locale === "fr" ? "Statut" : "Status",
        value: isLive ? (locale === "fr" ? "Direct" : "Live") : "Polling",
      },
    ],
    [
      activeChannelType,
      activeTopic,
      discussionGuidance.audienceLabel,
      discussionGuidance.visibilityLabel,
      locale,
      isLive,
      activeAction,
    ],
  );

  const { highlightedMessageId, handleLoadPreviousMessages } =
    useChatShellFeedEffects({
      activeChannelType,
      selectedActionId,
      activeTopicId,
      selectedRecipientId: selectedRecipient?.id ?? null,
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
    async (
      request: ActionShareContactRequest,
      decision: "accept" | "reject" | "ignore",
    ) => {
      await respondToActionShareContactRequest(request.id, decision);
      if (decision === "accept") {
        await refreshInbox();
        handleSelectRecipient(request.sender);
      }
    },
    [handleSelectRecipient, refreshInbox, respondToActionShareContactRequest],
  );

  const activeChannelVisual = useMemo(
    () => CHANNEL_VISUALS[activeChannelType],
    [activeChannelType],
  );
  const ActiveChannelIcon = activeChannelVisual.icon;
  const activeChannelLabel = useMemo(
    () => activeAction ? activeAction.contract?.metadata.preparationData?.actionTitle?.trim() || activeAction.location_label : getChannelTitle(activeChannelType),
    [activeAction, activeChannelType],
  );
  const composerPlaceholder = useMemo(
    () => activeAction ? "Écrivez un message de coordination pour cette action." : getChannelPlaceholder(activeChannelType),
    [activeAction, activeChannelType],
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

  const isDmSurface = messagerieMode && activeChannelType === "dm";
  const showDmThreadOnMobile = !isDmSurface || Boolean(selectedRecipient) || isDmThreadOpen;
  const showPublicThreadOnMobile = !messagerieMode || isDmSurface || isPublicThreadOpen;
  const showThreadOnMobile = isDmSurface
    ? showDmThreadOnMobile
    : showPublicThreadOnMobile;

  const handleStarterPrompt = useCallback(
    (prompt: string) => {
      setMessage(prompt);
      setShowMentions(false);
      setSendError(null);
      if (activeChannelType === "dm" && !selectedRecipient) {
        setIsRecipientPickerOpen(true);
      }
    },
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
    <div className={`flex flex-col ${fullHeight ? "h-full min-h-0" : "h-[750px]"} overflow-hidden relative ${isLight ? "bg-rose-50/30" : "rounded-[3rem] shadow-2xl backdrop-blur-3xl border border-white/10 bg-slate-900/40"}`}>
      <div className={messagerieMode ? "flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row" : "flex min-h-0 flex-1 flex-row overflow-hidden"}>
        {isDmSurface ? (
          <DmInbox
            conversations={conversations}
            activePeerId={selectedRecipient?.id ?? null}
            isLoading={isDmInboxLoading}
            error={dmInboxError}
            onSelectConversation={handleSelectDmConversation}
            onStartConversation={handleStartDmConversation}
            onRetry={refreshInbox}
            notificationUnreadCount={chatNotificationUnreadCounts.dm}
            contactRequests={actionShareContactRequests}
            contactRequestsLoading={actionShareContactRequestsLoading}
            contactRequestsError={actionShareContactRequestsError}
            onRespondToContactRequest={handleRespondToActionShareContactRequest}
            recipientQuery={recipientQuery}
            isRecipientPickerOpen={isRecipientPickerOpen}
            dmSuggestions={dmSuggestions}
            onRecipientQueryChange={handleRecipientQueryChange}
            onSelectRecipient={handleSelectRecipient}
            tone={isLight ? "light" : "dark"}
            className={!showDmThreadOnMobile ? "flex" : "hidden md:flex"}
          />
        ) : (
          <ChatSidebar
            channels={sidebarChannels}
            currentChannelType={activeChannelType}
            onSelectChannel={handleSelectChannelForPresentation}
            onSelectTopic={handleSelectTopicForPresentation}
            topicSectionTitle={sidebarTopicSectionTitle}
            topicSectionDescription={sidebarTopicSectionDescription}
            topics={sidebarTopics}
            tone={isLight ? "light" : "dark"}
            presentation={messagerieMode ? "messagerie" : "default"}
            actionItems={actionDiscussions.items}
            activeActionId={selectedActionId}
            actionLoading={actionDiscussions.isLoading}
            actionError={actionDiscussions.error}
            onSelectAction={handleSelectAction}
            currentZone={effectiveZone}
            profileDefaultZone={profileDefaultZone}
            onSelectZone={setSelectedZone}
            className={!isDmSurface && !showPublicThreadOnMobile ? "flex" : "hidden md:flex"}
          />
        )}
        <div className={`min-h-0 min-w-0 flex-1 flex-col relative ${messagerieMode && !showThreadOnMobile ? "hidden md:flex" : "flex"} ${isLight ? "bg-white/60" : "bg-white/5 dark:bg-slate-950/20"}`}>
          <ChatHeader
            activeChannelType={activeChannelType}
            activeChannelLabel={activeChannelLabel}
            activeChannelDescription={activeAction
              ? `${activeAction.location_label} · ${activeAction.action_date} · ${activeAction.association_name || activeAction.actor_name || "Organisateur non renseigné"}`
              : discussionGuidance.cardSummary || activeChannelDefinition.description}
            activeChannelIcon={ActiveChannelIcon}
            activeChannelAccentClass={activeChannelVisual.accentClass}
            metaItems={metaItems}
            viewMode={viewMode}
            isBugReportChannel={isBugReportChannel}
            selectedRecipient={selectedRecipient}
            isEditingHandle={isEditingHandle}
            newHandle={newHandle}
            onViewModeChange={handleViewModeChange}
            onToggleHandleEditor={handleToggleHandleEditor}
            onHandleChange={handleHandleChange}
            onConfirmHandle={handleUpdateHandle}
            tone={isLight ? "light" : "dark"}
            showControls={!isLight}
            isLive={isLive}
            onBackToDmInbox={isDmSurface && showDmThreadOnMobile ? handleBackToDmInbox : undefined}
            onBackToContextList={messagerieMode && !isDmSurface && showPublicThreadOnMobile ? handleBackToPublicContextList : undefined}
            showSearch={messagerieMode && !isBugReportChannel && activeChannelType !== "action"}
            isSearchOpen={isSearchOpen}
            searchQuery={searchQuery}
            searchResults={chatSearch.results}
            searchIsLoading={chatSearch.isLoading}
            searchError={chatSearch.error}
            searchHasMore={chatSearch.hasMore}
            searchIsLoadingMore={chatSearch.isLoadingMore}
            searchLoadMoreError={chatSearch.loadMoreError}
            onToggleSearch={handleToggleSearch}
            onSearchQueryChange={setSearchQuery}
            onCloseSearch={handleCloseSearch}
            onSelectSearchResult={handleSelectSearchResult}
            onLoadMoreSearch={() => void chatSearch.loadMore()}
          />

          {activeChannelType === "action" && selectedActionId && messagerieMode ? (
            <ChatActionModeration actionId={selectedActionId} tone={isLight ? "light" : "dark"} />
          ) : null}

          {isBugReportChannel ? (
            <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${isLight ? "bg-white/40" : ""}`}>
              <FeedbackSection
                pagePath={pathname}
                source="feedback_discussion"
              />
            </div>
          ) : viewMode === "graph" ? (
            <div className="flex-1 overflow-hidden">
              <TopicNetworkGraph />
            </div>
          ) : (
            <>
              <ChatMessageFeed
                scrollRef={scrollRef}
                hasMoreMessages={hasMoreMessages}
                isLoadingPrevious={isLoadingPrevious}
                loadPreviousError={loadPreviousError}
                onLoadPreviousMessages={() => void handleLoadPreviousMessages()}
                targetMessageId={targetMessageId}
                targetStatus={targetStatus}
                feedState={feedState}
                onRetryMessages={() => void mutateMessages()}
                messages={messages}
                userId={userId}
                tone={isLight ? "light" : "dark"}
                onPollVote={handlePollVote}
                pollVoteStates={pollVoteStates}
                highlightedMessageId={highlightedMessageId}
                emptyState={discussionGuidance}
                activeChannelType={activeChannelType}
                selectedRecipientId={selectedRecipient?.id}
                onStarterPrompt={handleStarterPrompt}
                onOpenRecipientPicker={() => setIsRecipientPickerOpen(true)}
              />

              <ChatComposer
                activeChannelType={activeChannelType}
                composerPlaceholder={composerPlaceholder}
                tone={isLight ? "light" : "dark"}
                composerMode={composerMode}
                onComposerModeChange={handleComposerModeChange}
                announcementTemplate={announcementTemplate}
                onAnnouncementTemplateChange={handleAnnouncementTemplateChange}
                relatedEvent={relatedEvent}
                announcementEventRequested={announcementEventRequested}
                announcementEventLoading={announcementEventLoading}
                announcementEventError={announcementEventError}
                pollOptions={pollOptions}
                onPollOptionsChange={setPollOptions}
                showModeTabs={activeChannelType === "community" || activeChannelType === "admin_elu"}
                composerModes={
                  activeChannelType === "community"
                    ? ["message", "announcement", "poll"]
                    : activeChannelType === "admin_elu"
                      ? ["message", "poll"]
                      : ["message"]
                }
                userId={userId}
                message={message}
                onMessageChange={handleTextChange}
                file={file}
                onFileChange={setFile}
                fileInputRef={fileInputRef}
                isSending={isSending}
                isUploading={isUploading}
                sendError={sendError}
                selectedRecipient={selectedRecipient}
                showMentions={showMentions}
                mentionSuggestions={mentionSuggestions}
                onInsertMention={insertMention}
                onSubmit={handleSend}
                canSubmit={canSubmitMessage}
              />
            </>
          )}
        </div>
        {/* Right Context Sidebar */}
        {!messagerieMode && activeChannelType !== "dm" && activeChannelType !== "bug_report" ? (
          <ChatContextSidebar tone={isLight ? "light" : "dark"} />
        ) : null}
      </div>
    </div>
  );
}
