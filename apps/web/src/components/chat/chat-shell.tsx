"use client";

import Image from "next/image";
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
import { logFailure, logWarning } from "@/lib/logging/failure-log";

type ChatShellProps = {
  initialChannelType?: ChatChannelType;
  initialArrondissement?: number;
  initialZoneName?: string | null;
  initialRecipient?: ChatUser | null;
  initialMessage?: string;
  tone?: "light" | "dark";
};

export function ChatShell({
  initialChannelType = "community",
  initialArrondissement,
  initialZoneName,
  initialRecipient,
  initialMessage,
  tone = "dark",
}: ChatShellProps) {
  const isLight = tone === "light";
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

  const communityAnnouncementAvatars = useMemo(() => {
    if (activeChannelType !== "community") {
      return [];
    }

    const seen = new Set<string>();
    return messages
      .map((messageItem) => messageItem.sender)
      .filter((sender) => {
        if (seen.has(sender.handle)) {
          return false;
        }
        seen.add(sender.handle);
        return true;
      })
      .slice(0, 4);
  }, [activeChannelType, messages]);

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
    <div className={`flex flex-col h-[750px] rounded-[3rem] overflow-hidden shadow-2xl relative backdrop-blur-3xl ${isLight ? "border border-rose-100/80 bg-[linear-gradient(180deg,rgba(255,251,253,0.98)_0%,rgba(255,244,248,0.94)_100%)]" : "border border-white/10 bg-slate-900/40"}`}>
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
          {activeChannelType === "community" && isLight ? (
            <div className="px-4 pt-4 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-rose-100/70 bg-[linear-gradient(90deg,rgba(255,244,248,0.98)_0%,rgba(255,255,255,0.95)_100%)] px-5 py-4 shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <span className="text-xl">📣</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-500">
                      {activeTopic?.label ?? "Relais actif"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      {activeTopic?.description ?? "Une annonce est en cours de relai dans ce salon."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {communityAnnouncementAvatars.map((sender, index) => (
                    <div
                      key={sender.handle}
                      className={`h-8 w-8 overflow-hidden rounded-full border border-white shadow-sm ${index > 0 ? "-ml-2" : ""}`}
                      title={sender.display_name}
                    >
                      <Image
                        src={sender.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.display_name)}`}
                        alt={sender.display_name}
                        className="h-full w-full object-cover"
                        width={32}
                        height={32}
                      />
                    </div>
                  ))}
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 bg-white text-[10px] font-black text-rose-500 shadow-sm">
                    +{Math.max(0, messages.length - communityAnnouncementAvatars.length)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {activeChannelType === "community" ? (
            <div className={`border-b px-4 py-3 sm:px-5 ${isLight ? "border-rose-100/70 bg-transparent" : "border-emerald-200/12 bg-emerald-500/5"}`}>
              <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border px-4 py-3 ${isLight ? "border-rose-100 bg-white/90 shadow-sm" : "border-emerald-200/12 bg-[rgba(5,34,20,0.32)]"}`}>
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${isLight ? "text-rose-500" : "text-emerald-200/70"}`}>
                    Parrainage
                  </p>
                  <p className={`mt-1 text-sm font-semibold ${isLight ? "text-slate-600" : "text-white/90"}`}>
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

          {activeChannelType === "community" ? (
            <div className="px-6 pt-5">
              <div className={`rounded-[2rem] border p-5 shadow-sm ${isLight ? "border-rose-100 bg-white" : "border-rose-200/10 bg-rose-500/5"}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isLight ? "bg-rose-50 text-rose-500" : "bg-rose-500/10 text-rose-400"}`}>
                    <span className="text-xl">📣</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-black ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                      Annonce en cours de relai
                    </p>
                    <p className={`mt-1 text-sm leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                      {activeTopic?.starterPrompt ||
                        "Besoin de diffuser : appel à bénévoles pour le nettoyage des berges samedi 18 mai à 9h."}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleStarterPrompt(activeTopic?.starterPrompt || discussionGuidance.starterPrompts[0] || "")}
                      className={`mt-4 inline-flex items-center rounded-full border px-4 py-2 text-xs font-black uppercase tracking-widest transition ${isLight ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50" : "border-rose-300/20 bg-white/5 text-rose-300 hover:bg-white/10"}`}
                    >
                      Voir les détails
                    </button>
                  </div>
                </div>
              </div>
            </div>
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

              {feedState !== "degraded" && feedState !== "empty" ? (
                <div className="px-6 pb-4">
                  <div className={`flex items-center gap-3 rounded-[1.5rem] px-4 py-3 shadow-sm ${isLight ? "border border-rose-100 bg-white/90" : "border border-white/5 bg-white/5 dark:bg-slate-900/40"}`}>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${isLight ? "bg-rose-100 text-rose-600" : "bg-violet-500/20 text-violet-400"}`}>
                      {discussionGuidance.channelGoal}
                    </span>
                    <p className={`min-w-0 text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      {discussionGuidance.composerHint}
                    </p>
                    {isLive && (
                      <div className={`ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${isLight ? "bg-emerald-50 border-emerald-200" : "bg-emerald-500/10 border-emerald-500/20"}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? "text-emerald-600" : "text-emerald-500"}`}>
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
      </div>
    </div>
  );
}
