"use client";

import { useMemo, useCallback } from "react";
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
import { ChatSidebar } from "./chat-sidebar";
import { DmInbox } from "./dm-inbox";
import { ChatContextSidebar } from "./chat-context-sidebar";
import { useChatData } from "./hooks/use-chat-data";
import { useDmInbox } from "./hooks/use-dm-inbox";
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
import type { ChatUser } from "./chat-types";
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

export type ChatShellProps = {
  initialChannelType?: ChatChannelType;
  initialArrondissement?: number;
  initialZoneName?: string | null;
  initialRecipient?: ChatUser | null;
  initialMessageId?: string | null;
  initialTopicId?: ChatTopicId | null;
  initialComposerMode?: "message" | "announcement" | "poll";
  initialAnnouncementTemplate?: CommunityAnnouncementTemplateKey | null;
  initialRelatedEvent?: ChatRelatedEvent | null;
  announcementEventRequested?: boolean;
  announcementEventLoading?: boolean;
  announcementEventError?: Error | null;
  initialMessage?: string;
  tone?: "light" | "dark";
  fullHeight?: boolean;
  messagerieMode?: boolean;
};

export function ChatShell({
  initialChannelType = "community",
  initialArrondissement,
  initialZoneName,
  initialRecipient,
  initialMessageId = null,
  initialTopicId,
  initialComposerMode = "message",
  initialAnnouncementTemplate = null,
  initialRelatedEvent = null,
  announcementEventRequested = false,
  announcementEventLoading = false,
  announcementEventError = null,
  initialMessage,
  tone = "dark",
  fullHeight = false,
  messagerieMode = false,
}: ChatShellProps) {
  const isLight = tone === "light";
  const { locale } = useSitePreferences();
  const pathname = usePathname();

  const {
    activeChannelType,
    setActiveChannelType,
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
    setSelectedRecipient,
    isRecipientPickerOpen,
    setIsRecipientPickerOpen,
    selectedZone,
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
  });
  const {
    currentRoleLabel,
    effectiveZone,
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
    messagesError,
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
    counts: chatNotificationUnreadCounts,
    markRead: markChatNotificationsRead,
  } = useChatNotificationUnreads({
    enabled: messagerieMode && isLoaded && isSignedIn,
    currentUserId: userId,
    supabase,
  });

  const sendChatMessageWithInboxRefresh = useCallback(
    async (params: SendChatMessageParams) => {
      await sendChatMessage(params);
      if (params.body.channelType === "dm") {
        await refreshInbox();
      }
    },
    [refreshInbox, sendChatMessage],
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
    selectedRecipient,
    effectiveZone,
    territoryFocus,
    setActiveTopicId,
    setFile,
    setMessage,
    setSendError,
  });

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
        value: getChannelTitle(activeChannelType),
      },
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
    ],
  );

  const { highlightedMessageId, handleLoadPreviousMessages } =
    useChatShellFeedEffects({
      activeChannelType,
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
    handleClearRecipient,
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

  const activeChannelVisual = useMemo(
    () => CHANNEL_VISUALS[activeChannelType],
    [activeChannelType],
  );
  const ActiveChannelIcon = activeChannelVisual.icon;
  const activeChannelLabel = useMemo(
    () => getChannelTitle(activeChannelType),
    [activeChannelType],
  );
  const composerPlaceholder = useMemo(
    () => getChannelPlaceholder(activeChannelType),
    [activeChannelType],
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
            tone={isLight ? "light" : "dark"}
            className={!showDmThreadOnMobile ? "flex" : "hidden md:flex"}
          />
        ) : (
          <ChatSidebar
            channels={sidebarChannels}
            currentChannelType={activeChannelType}
            onSelectChannel={handleSelectChannel}
            onSelectTopic={handleSelectTopic}
            topicSectionTitle={sidebarTopicSectionTitle}
            topicSectionDescription={sidebarTopicSectionDescription}
            topics={sidebarTopics}
            tone={isLight ? "light" : "dark"}
            presentation={messagerieMode ? "messagerie" : "default"}
          />
        )}
        <div className={`min-h-0 min-w-0 flex-1 flex-col relative ${isDmSurface && !showDmThreadOnMobile ? "hidden md:flex" : "flex"} ${isLight ? "bg-white/60" : "bg-white/5 dark:bg-slate-950/20"}`}>
          <ChatHeader
            activeChannelType={activeChannelType}
            activeChannelLabel={activeChannelLabel}
            activeChannelDescription={discussionGuidance.cardSummary || activeChannelDefinition.description}
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
            showSearch={messagerieMode && !isBugReportChannel}
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
                messagesError={messagesError}
                messages={messages}
                userId={userId}
                tone={isLight ? "light" : "dark"}
                onPollVote={handlePollVote}
                pollVoteStates={pollVoteStates}
                highlightedMessageId={highlightedMessageId}
                emptyState={discussionGuidance}
                locale={locale}
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
                showModeTabs={activeChannelType === "community"}
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
                recipientQuery={recipientQuery}
                onRecipientQueryChange={handleRecipientQueryChange}
                isRecipientPickerOpen={isRecipientPickerOpen}
                onRecipientPickerOpenChange={setIsRecipientPickerOpen}
                dmSuggestions={dmSuggestions}
                showMentions={showMentions}
                mentionSuggestions={mentionSuggestions}
                onInsertMention={insertMention}
                onSubmit={handleSend}
                onSelectRecipient={handleSelectRecipient}
                onClearRecipient={handleClearRecipient}
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
