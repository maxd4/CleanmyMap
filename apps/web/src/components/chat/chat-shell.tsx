"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { buildClerkSupabaseAccessTokenProvider } from "@/lib/clerk-supabase-token";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchCurrentAccountIdentity,
  type CurrentAccountIdentity,
} from "@/lib/account/current-account-identity";
import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  extractZoneContextFromMetadata,
  getChatChannelDefinition,
  type ChatChannelType,
} from "@/lib/chat/channels";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
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
import type { ChatUser, DmConversation } from "./chat-types";
import type { ChatTopicId } from "@/lib/chat/topics";
import {
  buildAnnouncementDraft,
  getAnnouncementTopicId,
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import {
  createInitialChatPollOptionDraft,
  getChatPollOptionsValidationError,
} from "@/lib/chat/polls";
import {
  applyChatPollVoteSummary,
  applyOptimisticChatPollVote,
  normalizeChatPollVoteResponse,
} from "@/lib/chat/poll-votes";
import type { SendChatMessageParams } from "./hooks/use-chat-data";
import { ChatMessageFeed } from "./ui/chat-message-feed";
import {
  CHANNEL_VISUALS,
  getChannelPlaceholder,
  getChannelTitle,
  getClerkArrondissement,
  getClerkRoleLabel,
  getEmptyStateCopy,
  type ChatMetaItem,
  toMetadataRecord,
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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const pathname = usePathname();
  const userId = user?.id;
  const supabase = useMemo(() => {
    try {
      return getSupabaseBrowserClient(
        buildClerkSupabaseAccessTokenProvider(getToken),
      );
    } catch {
      return null;
    }
  }, [getToken]);

  const { data: currentAccountIdentity = null } = useSWR<CurrentAccountIdentity | null>(
    userId ? ["current-account-identity", userId] : null,
    fetchCurrentAccountIdentity,
  );

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

  const currentRoleLabel = useMemo(() => getClerkRoleLabel(user), [user]);
  const clerkArrondissement = useMemo(
    () => getClerkArrondissement(user),
    [user],
  );
  const publicMetadata = useMemo(
    () => toMetadataRecord(user?.publicMetadata),
    [user?.publicMetadata],
  );
  const clerkZoneContext = useMemo(
    () => extractZoneContextFromMetadata(publicMetadata),
    [publicMetadata],
  );

  const effectiveZone = useMemo(
    () =>
      selectedZone ||
      clerkZoneContext.zoneName ||
      (clerkArrondissement ? `${clerkArrondissement}e arrondissement` : ""),
    [selectedZone, clerkZoneContext.zoneName, clerkArrondissement],
  );

  const territoryFocus = useMemo(
    () => initialArrondissement ?? clerkArrondissement,
    [initialArrondissement, clerkArrondissement],
  );

  const hasArrondissement = useMemo(
    () => territoryFocus !== null || clerkArrondissement !== null,
    [territoryFocus, clerkArrondissement],
  );

  const hasGreaterParisZone = useMemo(
    () => effectiveZone !== "" && findZoneWithNeighbors(effectiveZone) !== null,
    [effectiveZone],
  );

  const senderDisplayName =
    currentAccountIdentity?.displayName ||
    user?.fullName ||
    user?.username ||
    "Moi";
  const senderHandle =
    currentAccountIdentity?.handle || user?.username || "moi";
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

  const [composerMode, setComposerMode] = useState<"message" | "announcement" | "poll">(
    initialComposerMode,
  );
  const [announcementTemplate, setAnnouncementTemplate] =
    useState<CommunityAnnouncementTemplateKey | null>(initialAnnouncementTemplate);
  const [relatedEvent, setRelatedEvent] = useState<ChatRelatedEvent | null>(
    initialRelatedEvent,
  );
  const [pollOptions, setPollOptions] = useState<string[]>(
    createInitialChatPollOptionDraft,
  );
  const [pollVoteStates, setPollVoteStates] = useState<
    Record<string, { pending: boolean; error: string | null }>
  >({});
  const announcementMode = composerMode === "announcement";

  useEffect(() => {
    setRelatedEvent(initialRelatedEvent);
  }, [initialRelatedEvent]);

  const handleComposerModeChange = useCallback(
    (mode: "message" | "announcement" | "poll") => {
      setComposerMode(mode);
      if (mode === "poll") {
        setAnnouncementTemplate(null);
        setRelatedEvent(null);
        setFile(null);
        setPollOptions((current) =>
          current.length >= 2 ? current : createInitialChatPollOptionDraft(),
        );
      } else if (mode === "message") {
        setAnnouncementTemplate(null);
        setRelatedEvent(null);
      } else if (mode === "announcement" && !announcementTemplate) {
        setActiveTopicId(null);
      }
    },
    [announcementTemplate, setActiveTopicId, setFile, setPollOptions],
  );

  const handleAnnouncementTemplateChange = useCallback(
    (template: CommunityAnnouncementTemplateKey) => {
      setAnnouncementTemplate(template);
      setActiveTopicId(getAnnouncementTopicId(template));
      setMessage(buildAnnouncementDraft(template));
      setSendError(null);
    },
    [setActiveTopicId, setMessage, setSendError],
  );

  const handleSelectTopic = useCallback(
    (topicId: ChatTopicId) => {
      setActiveTopicId(topicId);
      if (announcementMode) {
        setComposerMode("message");
        setAnnouncementTemplate(null);
        setRelatedEvent(null);
      }
    },
    [announcementMode, setActiveTopicId],
  );

  const sendChatMessageWithInboxRefresh = useCallback(
    async (params: SendChatMessageParams) => {
      await sendChatMessage(params);
      if (params.body.channelType === "dm") {
        await refreshInbox();
      }
    },
    [refreshInbox, sendChatMessage],
  );

  const handlePollVote = useCallback(
    async (messageId: string, optionId: string | null) => {
      const currentMessage = messages.find((candidate) => candidate.id === messageId);
      if (!currentMessage || currentMessage.message_kind !== "poll") {
        return;
      }

      const currentState = pollVoteStates[messageId];
      if (currentState?.pending || currentMessage.selectedOptionId === optionId) {
        return;
      }

      setPollVoteStates((states) => ({
        ...states,
        [messageId]: { pending: true, error: null },
      }));
      await mutateMessages(
        (data) => ({
          ...(data ?? { previousCursor: null, hasMore: false }),
          messages: (data?.messages ?? []).map((message) =>
            message.id === messageId
              ? applyOptimisticChatPollVote(message, optionId)
              : message,
          ),
        }),
        { revalidate: false },
      );

      try {
        const response = await fetch(`/api/chat/polls/${encodeURIComponent(messageId)}/vote`, {
          method: optionId ? "PUT" : "DELETE",
          headers: optionId ? { "Content-Type": "application/json" } : undefined,
          body: optionId ? JSON.stringify({ optionId }) : undefined,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const errorPayload = payload as { hint?: unknown; error?: unknown } | null;
          throw new Error(
            typeof errorPayload?.hint === "string"
              ? errorPayload.hint
              : typeof errorPayload?.error === "string"
                ? errorPayload.error
                : "Votre vote n'a pas pu être enregistré.",
          );
        }

        const summary = normalizeChatPollVoteResponse(payload);
        if (!summary) {
          throw new Error("La réponse du sondage est invalide.");
        }

        await mutateMessages(
          (data) => ({
            ...(data ?? { previousCursor: null, hasMore: false }),
            messages: (data?.messages ?? []).map((message) =>
              message.id === messageId
                ? applyChatPollVoteSummary(message, summary)
                : message,
            ),
          }),
          { revalidate: false },
        );
        setPollVoteStates((states) => ({
          ...states,
          [messageId]: { pending: false, error: null },
        }));
      } catch (error) {
        await mutateMessages(
          (data) => ({
            ...(data ?? { previousCursor: null, hasMore: false }),
            messages: (data?.messages ?? []).map((message) =>
              message.id === messageId ? currentMessage : message,
            ),
          }),
          { revalidate: false },
        );
        setPollVoteStates((states) => ({
          ...states,
          [messageId]: {
            pending: false,
            error: error instanceof Error ? error.message : "Vote indisponible.",
          },
        }));
      }
    },
    [messages, mutateMessages, pollVoteStates],
  );

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
  const [isDmThreadOpen, setIsDmThreadOpen] = useState(Boolean(initialRecipient));

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
  const canSubmitMessage = useMemo(
    () =>
      Boolean(
        userId &&
        isLoaded &&
        isSignedIn &&
        (message.trim().length > 0 || file) &&
        !isSending &&
        !isUploading &&
        (composerMode !== "poll" || !getChatPollOptionsValidationError(pollOptions)) &&
        (!announcementMode || Boolean(announcementTemplate)) &&
        (!announcementMode || !announcementEventRequested || Boolean(relatedEvent)) &&
        (!announcementMode || !announcementEventLoading) &&
        (!announcementMode || !announcementEventError) &&
        !(activeChannelType === "dm" && !selectedRecipient) &&
        !(
          activeChannelType === "territory" &&
          !effectiveZone &&
          territoryFocus === null
        ),
      ),
    [
      userId,
      isLoaded,
      isSignedIn,
      message,
      file,
      isSending,
      isUploading,
      composerMode,
      pollOptions,
      announcementMode,
      announcementTemplate,
      announcementEventRequested,
      relatedEvent,
      announcementEventLoading,
      announcementEventError,
      activeChannelType,
      selectedRecipient,
      effectiveZone,
      territoryFocus,
    ],
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
    setComposerMode,
    setAnnouncementTemplate,
    setRelatedEvent,
    setPollOptions,
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

  const handleSelectRecipient = useCallback(
    (recipient: ChatUser) => {
      setSelectedRecipient(recipient);
      setRecipientQuery("");
      setIsRecipientPickerOpen(false);
      setIsDmThreadOpen(true);
    },
    [setIsDmThreadOpen, setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen],
  );

  const handleClearRecipient = useCallback(() => {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(true);
    setIsDmThreadOpen(true);
  }, [setIsDmThreadOpen, setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen]);

  const handleSelectDmConversation = useCallback(
    (conversation: DmConversation) => {
      setActiveTopicId(null);
      setActiveChannelType("dm");
      setSelectedRecipient(conversation.peer);
      setRecipientQuery("");
      setIsRecipientPickerOpen(false);
      setIsDmThreadOpen(true);
    },
    [setActiveChannelType, setActiveTopicId, setIsDmThreadOpen, setIsRecipientPickerOpen, setRecipientQuery, setSelectedRecipient],
  );

  const handleStartDmConversation = useCallback(() => {
    setActiveTopicId(null);
    setActiveChannelType("dm");
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(true);
    setIsDmThreadOpen(true);
  }, [setActiveChannelType, setActiveTopicId, setIsDmThreadOpen, setIsRecipientPickerOpen, setRecipientQuery, setSelectedRecipient]);

  const handleBackToDmInbox = useCallback(() => {
    setActiveTopicId(null);
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(false);
    setIsDmThreadOpen(false);
  }, [setActiveTopicId, setIsDmThreadOpen, setIsRecipientPickerOpen, setRecipientQuery, setSelectedRecipient]);

  const handleRecipientQueryChange = useCallback(
    (value: string) => {
      setRecipientQuery(value);
      setIsRecipientPickerOpen(true);
    },
    [setRecipientQuery, setIsRecipientPickerOpen],
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
