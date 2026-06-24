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
  canAccessChatChannel,
  extractZoneContextFromMetadata,
  getChatChannelDefinition,
  type ChatChannelType,
  CHAT_CHANNEL_ORDER,
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
import { ChatContextSidebar } from "./chat-context-sidebar";
import { useChatData } from "./hooks/use-chat-data";
import { useChatState } from "./hooks/use-chat-state";
import { useChatSubmit } from "./hooks/use-chat-submit";
import type { ChatUser } from "./chat-types";
import { ChatMessageItem } from "./ui/chat-message-item";
import {
  ChatDegradedState,
  ChatEmptyState,
  ChatLoadingState,
} from "./ui/chat-feed-states";
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
import { logFailure } from "@/lib/logging/failure-log";

type ChatShellProps = {
  initialChannelType?: ChatChannelType;
  initialArrondissement?: number;
  initialZoneName?: string | null;
  initialRecipient?: ChatUser | null;
  initialMessage?: string;
  tone?: "light" | "dark";
  fullHeight?: boolean;
};

export function ChatShell({
  initialChannelType = "community",
  initialArrondissement,
  initialZoneName,
  initialRecipient,
  initialMessage,
  tone = "dark",
  fullHeight = false,
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
    messages,
    messagesError,
    feedState,
    mentionSuggestions,
    dmSuggestions,
    sendChatMessage,
    isLive,
  } = useChatData({
    activeChannelType,
    selectedRecipientId: selectedRecipient?.id ?? null,
    effectiveZone,
    territoryFocus,
    showMentions,
    mentionQuery,
    recipientQuery,
    currentUserId: userId,
    canAccessProtectedChat: isLoaded && isSignedIn,
    supabase,
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
    selectedRecipient,
    effectiveZone,
    territoryFocus,
    setIsSending,
    setSendError,
    setIsUploading,
    supabase,
    sendChatMessage,
    setMessage,
    setFile,
    setShowMentions,
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
  const [composerMode, setComposerMode] = useState<"message" | "announcement" | "poll">("message");

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

  useEffect(() => {
    if (scrollRef.current && viewMode === "messages") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, scrollRef, viewMode]);

  const handleUpdateHandle = useCallback(async () => {
    if (!newHandle.trim()) return;
    try {
      const res = await fetch("/api/users/profile/handle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: newHandle }),
      });
      if (res.ok) {
        setIsEditingHandle(false);
        location.reload();
      } else {
        const err = await res.json();
        alert(
          err.error ||
            "Impossible de mettre à jour votre profil. Veuillez réessayer.",
        );
      }
    } catch (err) {
      logFailure("ChatShell", "Handle update failed", err, {
        handle: newHandle,
      });
    }
  }, [newHandle, setIsEditingHandle]);

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
      activeChannelType,
      selectedRecipient,
      effectiveZone,
      territoryFocus,
    ],
  );

  const sidebarChannels = useMemo(
    () =>
      CHAT_CHANNEL_ORDER.map((channelType) => {
        const visual = CHANNEL_VISUALS[channelType];
        const isActive = activeChannelType === channelType;
        const isAvailable = canAccessChatChannel(channelType, {
          roleLabel: currentRoleLabel,
          hasArrondissement,
          hasGreaterParisZone,
          zoneContext: {
            zoneName: effectiveZone || null,
            arrondissementId: territoryFocus,
          },
        });

        return {
          channelType,
          active: isActive,
          disabled: !isAvailable,
          icon: visual.icon,
          label: getChannelTitle(channelType),
          description: "",
          count: isActive ? messages.length : undefined,
          accentClass: visual.accentClass,
          chipClass: visual.chipClass,
          isLocked: !isAvailable,
        };
      }),
    [
      activeChannelType,
      currentRoleLabel,
      hasArrondissement,
      hasGreaterParisZone,
      effectiveZone,
      territoryFocus,
      messages.length,
    ],
  );

  const handleSelectChannel = useCallback(
    (channelType: ChatChannelType) => {
      const isAvailable = canAccessChatChannel(channelType, {
        roleLabel: currentRoleLabel,
        hasArrondissement,
        hasGreaterParisZone,
        zoneContext: {
          zoneName: effectiveZone || null,
          arrondissementId: territoryFocus,
        },
      });
      if (!isAvailable) {
        return;
      }
      setComposerMode("message");
      setActiveChannelType(channelType);
    },
    [
      currentRoleLabel,
      hasArrondissement,
      hasGreaterParisZone,
      effectiveZone,
      territoryFocus,
      setComposerMode,
      setActiveChannelType,
    ],
  );

  const sidebarTopics = useMemo(
    () =>
      channelTopics.map((topic) => ({
        ...topic,
        active: topic.id === activeTopicId,
        onSelect: () => setActiveTopicId(topic.id),
      })),
    [activeTopicId, channelTopics, setActiveTopicId],
  );

  const sidebarTopicSectionTitle = useMemo(() => {
    if (activeChannelType === "community") {
      return locale === "fr" ? "Salons proposés" : "Suggested rooms";
    }
    if (activeChannelType === "territory") {
      return locale === "fr" ? "Salons de zone" : "Area rooms";
    }
    return null;
  }, [activeChannelType, locale]);

  const sidebarTopicSectionDescription = useMemo(() => {
    if (activeChannelType === "community") {
      return locale === "fr"
        ? "Raccourcis thématiques sans créer de nouveau canal."
        : "Thematic shortcuts without creating new channels.";
    }
    if (activeChannelType === "territory") {
      return locale === "fr"
        ? "Points locaux et coordination de voisinage."
        : "Local points and nearby coordination.";
    }
    return null;
  }, [activeChannelType, locale]);

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
    },
    [setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen],
  );

  const handleClearRecipient = useCallback(() => {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(true);
  }, [setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen]);

  const handleRecipientQueryChange = useCallback(
    (value: string) => {
      setRecipientQuery(value);
      setIsRecipientPickerOpen(true);
    },
    [setRecipientQuery, setIsRecipientPickerOpen],
  );

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
    <div className={`flex flex-col ${fullHeight ? "h-full" : "h-[750px]"} overflow-hidden relative ${isLight ? "bg-rose-50/30" : "rounded-[3rem] shadow-2xl backdrop-blur-3xl border border-white/10 bg-slate-900/40"}`}>
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          channels={sidebarChannels}
          currentChannelType={activeChannelType}
          onSelectChannel={handleSelectChannel}
          onSelectTopic={(topicId) => setActiveTopicId(topicId)}
          topicSectionTitle={sidebarTopicSectionTitle}
          topicSectionDescription={sidebarTopicSectionDescription}
          topics={sidebarTopics}
          tone={isLight ? "light" : "dark"}
        />
        <div className={`flex-1 flex flex-col relative ${isLight ? "bg-white/60" : "bg-white/5 dark:bg-slate-950/20"}`}>
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
              <div
                ref={scrollRef}
                className={`flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar ${isLight ? "bg-transparent" : ""}`}
              >
                {feedState === "loading" && <ChatLoadingState tone={isLight ? "light" : "dark"} />}
                {feedState === "degraded" && (
                  <ChatDegradedState error={messagesError} tone={isLight ? "light" : "dark"} />
                )}
                {feedState === "empty" && (
                  <ChatEmptyState
                    emptyState={discussionGuidance}
                    locale={locale}
                    activeChannelType={activeChannelType}
                    selectedRecipientId={selectedRecipient?.id}
                    onStarterPrompt={handleStarterPrompt}
                    onOpenRecipientPicker={() => setIsRecipientPickerOpen(true)}
                    tone={isLight ? "light" : "dark"}
                  />
                )}
                {messages.map((msg) => (
                  <ChatMessageItem key={msg.id} message={msg} userId={userId} tone={isLight ? "light" : "dark"} />
                ))}
              </div>

              <ChatComposer
                activeChannelType={activeChannelType}
                composerPlaceholder={composerPlaceholder}
                tone={isLight ? "light" : "dark"}
                composerMode={composerMode}
                onComposerModeChange={setComposerMode}
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
        {activeChannelType !== "dm" && activeChannelType !== "bug_report" ? (
          <ChatContextSidebar tone={isLight ? "light" : "dark"} />
        ) : null}
      </div>
    </div>
  );
}
