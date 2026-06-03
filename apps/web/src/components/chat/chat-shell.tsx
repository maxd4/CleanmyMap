"use client";

import { useEffect, useMemo, useCallback, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, UserPlus } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
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
  toMetadataRecord,
} from "./chat-shell.utils";
import { logFailure, logWarning } from "@/lib/logging/failure-log";

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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { locale } = useSitePreferences();
  const pathname = usePathname();
  const userId = user?.id;
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [currentAccountIdentity, setCurrentAccountIdentity] =
    useState<CurrentAccountIdentity | null>(null);

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

  useEffect(() => {
    let cancelled = false;

    try {
      const client = getSupabaseBrowserClient(() => getToken());
      if (!cancelled) {
        setSupabase(client);
      }
    } catch (error) {
      if (!cancelled) {
        if (process.env.NODE_ENV !== "production") {
          logWarning("ChatShell", "Supabase browser client unavailable", {
            reason: error instanceof Error ? error.message : String(error),
          });
        }
        setSupabase(null);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [getToken]);

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

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setCurrentAccountIdentity(null);
      return () => {
        cancelled = true;
      };
    }

    fetchCurrentAccountIdentity()
      .then((identity) => {
        if (!cancelled) {
          setCurrentAccountIdentity(identity);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCurrentAccountIdentity(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
  const discussionGuidance = useMemo(
    () =>
      getEmptyStateCopy(
        activeChannelType,
        locale,
        recipientLabel,
        territoryLabel,
      ),
    [activeChannelType, locale, recipientLabel, territoryLabel],
  );

  const lastMessageAt = messages[messages.length - 1]?.created_at ?? null;
  const metaItems: ChatMetaItem[] = useMemo(
    () => [
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
        label: locale === "fr" ? "Statut" : "Status",
        value: isLive ? (locale === "fr" ? "Direct" : "Live") : "Polling",
      },
    ],
    [
      activeChannelType,
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
      setActiveChannelType(channelType);
    },
    [
      currentRoleLabel,
      hasArrondissement,
      hasGreaterParisZone,
      effectiveZone,
      territoryFocus,
      setActiveChannelType,
    ],
  );

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
    <div className="flex flex-col h-[750px] rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative bg-slate-900/40 backdrop-blur-3xl">
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          channels={sidebarChannels}
          currentChannelType={activeChannelType}
          onSelectChannel={handleSelectChannel}
        />
        <div className="flex-1 flex flex-col relative bg-white/5 dark:bg-slate-950/20">
          {activeChannelType === "community" ? (
            <div className="border-b border-emerald-200/12 bg-emerald-500/5 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-emerald-200/12 bg-[rgba(5,34,20,0.32)] px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200/70">
                    Parrainage
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white/90">
                    Invitez un ami depuis votre profil et conservez la chaîne de
                    filiation.
                  </p>
                </div>
                <CmmButton
                  href="/profil#parrainage"
                  tone="secondary"
                  variant="pill"
                  className="h-10 shrink-0 gap-2 px-4 text-[11px] font-black transition-transform hover:-translate-y-0.5"
                >
                  <UserPlus size={14} />
                  Inviter un ami
                  <ArrowRight size={13} />
                </CmmButton>
              </div>
            </div>
          ) : null}
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
                className="flex-1 p-6 overflow-y-auto space-y-4 custom-scrollbar"
              >
                {feedState === "loading" && <ChatLoadingState />}
                {feedState === "degraded" && (
                  <ChatDegradedState error={messagesError} />
                )}
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
                  <ChatMessageItem key={msg.id} message={msg} userId={userId} />
                ))}
              </div>

              {feedState !== "degraded" && feedState !== "empty" ? (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-3 rounded-[1.5rem] border border-white/5 bg-white/5 px-4 py-3 shadow-sm dark:bg-slate-900/40">
                    <span className="rounded-full bg-violet-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-400">
                      {discussionGuidance.channelGoal}
                    </span>
                    <p className="min-w-0 text-xs text-slate-400">
                      {discussionGuidance.composerHint}
                    </p>
                    {isLive && (
                      <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">
                          Live
                        </span>
                      </div>
                    )}
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
