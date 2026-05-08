"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import {
  canAccessChatChannel,
  extractZoneContextFromMetadata,
  type ChatChannelType,
  CHAT_CHANNEL_ORDER,
} from "@/lib/chat/channels";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import { TopicNetworkGraph } from "./topic-network-graph";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { ChatSidebar } from "./chat-sidebar";
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
  formatRecentActivityLabel,
  getChannelPlaceholder,
  getChannelTitle,
  getClerkArrondissement,
  getClerkRoleLabel,
  getEmptyStateCopy,
  type ChatMetaItem,
} from "./chat-shell.utils";

type ChatShellProps = {
  initialChannelType?: ChatChannelType;
  initialArrondissement?: number;
  initialZoneName?: string | null;
  initialRecipient?: ChatUser | null;
  initialMessage?: string;
};

export function ChatShell({
  initialChannelType = "community",
  initialArrondissement,
  initialZoneName,
  initialRecipient,
  initialMessage,
}: ChatShellProps) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const pathname = usePathname();
  const userId = user?.id;
  const supabase = useMemo(() => getSupabaseBrowserClient(() => getToken()), [getToken]);

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
  const clerkArrondissement = useMemo(() => getClerkArrondissement(user), [user]);
  const clerkZoneContext = useMemo(
    () => extractZoneContextFromMetadata(user?.publicMetadata as Record<string, unknown> | null | undefined),
    [user?.publicMetadata]
  );

  const effectiveZone = useMemo(
    () => selectedZone || clerkZoneContext.zoneName || (clerkArrondissement ? `${clerkArrondissement}e arrondissement` : ""),
    [selectedZone, clerkZoneContext.zoneName, clerkArrondissement]
  );
  
  const territoryFocus = useMemo(
    () => initialArrondissement ?? clerkArrondissement,
    [initialArrondissement, clerkArrondissement]
  );

  const hasArrondissement = useMemo(
    () => territoryFocus !== null || clerkArrondissement !== null,
    [territoryFocus, clerkArrondissement]
  );

  const hasGreaterParisZone = useMemo(
    () => effectiveZone !== "" && findZoneWithNeighbors(effectiveZone) !== null,
    [effectiveZone]
  );

  const {
    messages,
    messagesError,
    feedState,
    mentionSuggestions,
    dmSuggestions,
    sendChatMessage,
  } = useChatData({
    activeChannelType,
    selectedRecipientId: selectedRecipient?.id ?? null,
    effectiveZone,
    territoryFocus,
    showMentions,
    mentionQuery,
    recipientQuery,
    currentUserId: userId,
  });

  const { handleSend } = useChatSubmit({
    submitLockRef,
    userId,
    user,
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
    () => effectiveZone || (territoryFocus ? `${territoryFocus}e arrondissement` : null),
    [effectiveZone, territoryFocus]
  );
  const recipientLabel = useMemo(
    () => selectedRecipient?.display_name ?? selectedRecipient?.handle ?? null,
    [selectedRecipient?.display_name, selectedRecipient?.handle]
  );
  const discussionGuidance = useMemo(
    () => getEmptyStateCopy(activeChannelType, locale, recipientLabel, territoryLabel),
    [activeChannelType, locale, recipientLabel, territoryLabel]
  );

  const lastMessageAt = messages[messages.length - 1]?.created_at ?? null;
  const metaItems: ChatMetaItem[] = useMemo(() => [
    {
      label: locale === "fr" ? "Canal" : "Channel",
      value: getChannelTitle(activeChannelType),
    },
    {
      label: locale === "fr" ? "Audience" : "Audience",
      value: discussionGuidance.audienceLabel,
    },
    {
      label: locale === "fr" ? "Visibilité" : "Visibility",
      value: discussionGuidance.visibilityLabel,
    },
    {
      label: locale === "fr" ? "Activité" : "Activity",
      value: formatRecentActivityLabel(locale, lastMessageAt),
    },
  ], [activeChannelType, discussionGuidance.audienceLabel, discussionGuidance.visibilityLabel, locale, lastMessageAt]);

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
      console.error(err);
    }
  }, [newHandle, setIsEditingHandle]);

  const activeChannelVisual = useMemo(() => CHANNEL_VISUALS[activeChannelType], [activeChannelType]);
  const ActiveChannelIcon = activeChannelVisual.icon;
  const activeChannelLabel = useMemo(() => getChannelTitle(activeChannelType), [activeChannelType]);
  const composerPlaceholder = useMemo(() => getChannelPlaceholder(activeChannelType), [activeChannelType]);
  
  const canSubmitMessage = useMemo(() => Boolean(
    userId &&
      (message.trim().length > 0 || file) &&
      !isSending &&
      !isUploading &&
      !(activeChannelType === "dm" && !selectedRecipient) &&
      !(activeChannelType === "territory" && !effectiveZone && territoryFocus === null)
  ), [userId, message, file, isSending, isUploading, activeChannelType, selectedRecipient, effectiveZone, territoryFocus]);

  const sidebarChannels = useMemo(() => CHAT_CHANNEL_ORDER.map((channelType) => {
    const visual = CHANNEL_VISUALS[channelType];
    const isActive = activeChannelType === channelType;
    const isAvailable = canAccessChatChannel(channelType, {
      roleLabel: currentRoleLabel,
      hasArrondissement,
      hasGreaterParisZone,
      zoneContext: { zoneName: effectiveZone || null, arrondissementId: territoryFocus },
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
  }), [activeChannelType, currentRoleLabel, hasArrondissement, hasGreaterParisZone, effectiveZone, territoryFocus, messages.length]);

  const handleSelectChannel = useCallback((channelType: ChatChannelType) => {
    const isAvailable = canAccessChatChannel(channelType, {
      roleLabel: currentRoleLabel,
      hasArrondissement,
      hasGreaterParisZone,
      zoneContext: { zoneName: effectiveZone || null, arrondissementId: territoryFocus },
    });
    if (!isAvailable) {
      return;
    }
    setActiveChannelType(channelType);
  }, [currentRoleLabel, hasArrondissement, hasGreaterParisZone, effectiveZone, territoryFocus, setActiveChannelType]);

  const handleViewModeChange = useCallback((mode: "messages" | "graph") => {
    setViewMode(mode);
  }, [setViewMode]);

  const handleToggleHandleEditor = useCallback(() => {
    setIsEditingHandle((current) => !current);
  }, [setIsEditingHandle]);

  const handleHandleChange = useCallback((value: string) => {
    setNewHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  }, [setNewHandle]);

  const handleSelectRecipient = useCallback((recipient: ChatUser) => {
    setSelectedRecipient(recipient);
    setRecipientQuery("");
    setIsRecipientPickerOpen(false);
  }, [setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen]);

  const handleClearRecipient = useCallback(() => {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(true);
  }, [setSelectedRecipient, setRecipientQuery, setIsRecipientPickerOpen]);

  const handleRecipientQueryChange = useCallback((value: string) => {
    setRecipientQuery(value);
    setIsRecipientPickerOpen(true);
  }, [setRecipientQuery, setIsRecipientPickerOpen]);

  const handleStarterPrompt = useCallback((prompt: string) => {
    setMessage(prompt);
    setShowMentions(false);
    setSendError(null);
    if (activeChannelType === "dm" && !selectedRecipient) {
      setIsRecipientPickerOpen(true);
    }
  }, [setMessage, setShowMentions, setSendError, activeChannelType, selectedRecipient, setIsRecipientPickerOpen]);

  return (
    <div className="flex flex-col h-[700px] rounded-[2.5rem] border border-pink-200/20 overflow-hidden shadow-2xl relative bg-[linear-gradient(180deg,rgba(73,27,56,0.98),rgba(39,16,31,0.98))]">
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          channels={sidebarChannels}
          currentChannelType={activeChannelType}
          onSelectChannel={handleSelectChannel}
        />
        <div className="flex-1 flex flex-col relative bg-[rgba(255,248,251,0.96)] dark:bg-slate-950">
          <ChatHeader
            activeChannelType={activeChannelType}
            activeChannelLabel={activeChannelLabel}
            activeChannelDescription=""
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
          />

          {isBugReportChannel ? (
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                className="flex-1 p-6 overflow-y-auto space-y-2 custom-scrollbar"
              >
                {feedState === "loading" && <ChatLoadingState />}
                {feedState === "degraded" && <ChatDegradedState error={messagesError} />}
                {feedState === "empty" && (
                  <ChatEmptyState
                    emptyState={discussionGuidance}
                    locale={locale}
                    activeChannelType={activeChannelType}
                    selectedRecipientId={selectedRecipient?.id}
                    onStarterPrompt={handleStarterPrompt}
                    onOpenRecipientPicker={() => setIsRecipientPickerOpen(true)}
                  />
                )}
                {messages.map((msg) => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    userId={userId}
                  />
                ))}
              </div>

              {feedState !== "degraded" && feedState !== "empty" ? (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-3 rounded-[1.5rem] border border-pink-100/40 bg-[rgba(255,248,251,0.92)] px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                    <span className="rounded-full bg-pink-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-pink-700 dark:bg-slate-900 dark:text-slate-300">
                      {discussionGuidance.channelGoal}
                    </span>
                    <p className="min-w-0 text-xs cmm-text-secondary">
                      {discussionGuidance.composerHint}
                    </p>
                  </div>
                </div>
              ) : null}

              <ChatComposer
                activeChannelType={activeChannelType}
                composerPlaceholder={composerPlaceholder}
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
      </div>
    </div>
  );
}
