"use client";

import { useEffect, type FormEvent } from "react";
import {
  Bug,
  Mail,
  MapPin,
  MessageSquare,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { compressImageFile } from "@/lib/media/image-compression";
import { isAppError, toAppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import { TopicNetworkGraph } from "./topic-network-graph";
import { ChatComposer } from "./chat-composer";
import { ChatHeader } from "./chat-header";
import { ChatSidebar } from "./chat-sidebar";
import { useChatData } from "./hooks/use-chat-data";
import { useChatState } from "./hooks/use-chat-state";
import type { ChatMessage, ChatUser } from "./chat-types";
import {
  canAccessChatChannel,
  getChatChannelDefinition,
  extractZoneContextFromMetadata,
  type ChatChannelType,
  CHAT_CHANNEL_ORDER,
} from "@/lib/chat/channels";
import { findZoneWithNeighbors } from "@/lib/geo/paris-neighborhood";
import { ChatMessageItem } from "./ui/chat-message-item";

type ChatShellProps = {
  initialChannelType?: ChatChannelType;
  initialArrondissement?: number;
};

type ChannelVisual = {
  icon: LucideIcon;
  accentClass: string;
  chipClass: string;
};

const CHANNEL_VISUALS: Record<ChatChannelType, ChannelVisual> = {
  community: {
    icon: Users,
    accentClass: "text-emerald-500",
    chipClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  dm: {
    icon: Mail,
    accentClass: "text-sky-500",
    chipClass: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  },
  admin_elu: {
    icon: Shield,
    accentClass: "text-violet-500",
    chipClass: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  },
  territory: {
    icon: MapPin,
    accentClass: "text-amber-500",
    chipClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  },
  bug_report: {
    icon: Bug,
    accentClass: "text-rose-500",
    chipClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  },
};

function readMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  if (!metadata) {
    return null;
  }
  const value = metadata[key];
  return typeof value === "string" ? value.trim() : null;
}

function parseArrondissement(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
    return null;
  }

  return parsed;
}

function getClerkRoleLabel(user: ReturnType<typeof useUser>["user"]): string {
  const publicRole = readMetadataString(
    user?.publicMetadata as Record<string, unknown> | null | undefined,
    "role",
  );
  return (publicRole ?? "benevole").toLowerCase();
}

function getClerkArrondissement(user: ReturnType<typeof useUser>["user"]): number | null {
  const publicArrondissement = parseArrondissement(
    (user?.publicMetadata as Record<string, unknown> | null | undefined)?.parisArrondissement,
  );
  return publicArrondissement;
}

function getChannelPlaceholder(channelType: ChatChannelType): string {
  switch (channelType) {
    case "community":
      return "Partagez une actualité, une coordination ou un point d'avancement.";
    case "dm":
      return "Choisissez un destinataire puis rédigez votre message privé.";
    case "admin_elu":
      return "Partagez un point de pilotage ou une décision à trancher.";
    case "territory":
      return "Partagez une information liée à votre arrondissement ou à son voisinage.";
    case "bug_report":
      return "Ouvrez le panneau feedback pour signaler un bug, proposer une amélioration ou une collaboration.";
    default:
      return "Écrivez votre message ici.";
  }
}

function getEmptyStateCopy(
  channelType: ChatChannelType,
  recipientLabel?: string | null,
  territoryFocus?: number | null,
  territoryZone?: string | null,
): { title: string; description: string } {
  switch (channelType) {
    case "community":
      return {
        title: "Aucun message communautaire pour le moment",
        description: "Ouvrez l'échange avec un premier message visible par tous les membres connectés.",
      };
    case "dm":
      return recipientLabel
        ? {
            title: `Aucun message privé avec ${recipientLabel}`,
            description: "Votre conversation démarre ici. Envoyez un premier message pour lancer l'échange.",
          }
        : {
            title: "Choisissez un destinataire",
            description: "Sélectionnez d'abord un membre pour ouvrir la conversation privée.",
          };
    case "admin_elu":
      return {
        title: "Aucun message dans l'espace admin & élus",
        description: "Cet espace sert aux arbitrages, aux priorités et aux échanges de pilotage.",
      };
    case "territory":
      const zoneLabel = territoryZone || (territoryFocus ? `${territoryFocus}e arrondissement` : null);
      return {
        title: zoneLabel
          ? `Aucun message pour le territoire ${zoneLabel}`
          : "Aucun territoire sélectionné",
        description: zoneLabel
          ? "Partagez ici les sujets liés à votre zone et aux zones limitrophes."
          : "Sélectionnez une zone (arrondissement ou commune) pour accéder au canal territoire.",
      };
    case "dm":
      return recipientLabel
        ? {
            title: `Aucun message privé avec ${recipientLabel}`,
            description: "Votre conversation démarre ici. Envoyez un premier message pour lancer l'échange.",
          }
        : {
            title: "Choisissez un destinataire",
            description: "Sélectionnez d'abord un membre pour ouvrir la conversation privée.",
          };
    case "admin_elu":
      return {
        title: "Aucun message dans l'espace admin & élus",
        description: "Cet espace sert aux arbitrages, aux priorités et aux échanges de pilotage.",
      };
    case "territory":
      return {
        title: territoryFocus
          ? `Aucun message pour le territoire ${territoryFocus}`
          : "Aucun message de territoire",
        description: "Partagez ici les sujets liés à l'arrondissement et aux zones limitrophes.",
      };
    case "bug_report":
      return {
        title: "Aucun retour feedback enregistré",
        description: "Utilisez le panneau feedback pour envoyer un bug, une amélioration ou une collaboration.",
      };
    default:
      return {
        title: "Aucun message",
        description: "Commencez la discussion avec un premier message.",
      };
  }
}

function getChannelTitle(channelType: ChatChannelType): string {
  return getChatChannelDefinition(channelType).label;
}

export function ChatShell({
  initialChannelType = "community",
  initialArrondissement,
}: ChatShellProps) {
  const { user } = useUser();
  const pathname = usePathname();
  const userId = user?.id;
  const supabase = getSupabaseBrowserClient();
  const chatState = useChatState({ initialChannelType, initialArrondissement });
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
  } = chatState;

  const currentRoleLabel = getClerkRoleLabel(user);
  const clerkArrondissement = getClerkArrondissement(user);
  const clerkZoneContext = extractZoneContextFromMetadata(user?.publicMetadata as Record<string, unknown> | null | undefined);

  const effectiveZone = selectedZone || clerkZoneContext.zoneName || (clerkArrondissement ? `${clerkArrondissement}e arrondissement` : "");
  const territoryFocus = initialArrondissement ?? clerkArrondissement;
  const hasArrondissement = territoryFocus !== null || clerkArrondissement !== null;
  const hasGreaterParisZone = effectiveZone !== "" && findZoneWithNeighbors(effectiveZone) !== null;
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

  useEffect(() => {
    if (scrollRef.current && viewMode === "messages") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, scrollRef, viewMode]);

  const submitChatMessage = async () => {
    if (submitLockRef.current) {
      return;
    }

    const currentMessage = message.trim();

    if (!userId) {
      setSendError("Connectez-vous pour envoyer un message.");
      return;
    }

    if ((!currentMessage && !file) || isSending || isUploading) {
      return;
    }

    if (activeChannelType === "dm" && !selectedRecipient) {
      setSendError("Choisissez un destinataire pour envoyer un message privé.");
      return;
    }

    if (activeChannelType === "territory" && !effectiveZone && territoryFocus === null) {
      setSendError(
        "Ajoutez une zone (arrondissement ou commune) à votre profil avant d'écrire dans ce canal.",
      );
      return;
    }

    submitLockRef.current = true;
    setIsSending(true);
    setSendError(null);

    let attachmentUrl: string | undefined;
    let attachmentType: string | undefined;

    try {
      if (file) {
        setIsUploading(true);

        try {
          const preparedFile = file.type.startsWith("image/")
            ? await compressImageFile(file, {
                maxWidth: 1600,
                maxHeight: 1600,
                quality: 0.8,
              })
            : file;
          const fileExt = preparedFile.name.split(".").pop() || "jpg";
          const fileName = `${userId}-${Math.random().toString(36).slice(2)}.${fileExt}`;
          const filePath = `${activeChannelType}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(filePath, preparedFile);

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

          attachmentUrl = publicUrl;
          attachmentType = preparedFile.type || file.type;
        } catch (uploadError) {
          const appError = isAppError(uploadError)
            ? uploadError
            : toAppError(uploadError, {
                kind: "network",
                message:
                  "L'ajout de la pièce jointe a échoué. Vérifie la connexion puis réessaie.",
              });

          setSendError(appError.message);
          notifyNetworkToast({
            title: "Pièce jointe indisponible",
            message: appError.message,
            retryLabel: "Réessayer l'upload",
            onRetry: () => void submitChatMessage(),
            refreshLabel: "Rafraîchir",
            onRefresh: () => window.location.reload(),
          });
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const optimisticMsg: ChatMessage = {
        id: `opt-${Date.now()}`,
        sender_id: userId,
        content: currentMessage,
        channel_type: activeChannelType,
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString(),
        sender: {
          display_name: user?.fullName || user?.username || "Moi",
          handle: user?.username || "moi",
          avatar_url: user?.imageUrl || "",
        },
      };

      await sendChatMessage({
        optimisticMessage: optimisticMsg,
        body: {
          channelType: activeChannelType,
          content: currentMessage,
          recipientId:
            activeChannelType === "dm" ? selectedRecipient?.id : undefined,
          arrondissementId:
            activeChannelType === "territory" && !effectiveZone
              ? territoryFocus ?? undefined
              : undefined,
          zoneName:
            activeChannelType === "territory" && effectiveZone
              ? effectiveZone
              : undefined,
          attachmentUrl,
          attachmentType,
        },
      });

      setMessage("");
      setFile(null);
      setShowMentions(false);
      setSendError(null);
    } catch (err) {
      const appError = isAppError(err)
        ? err
        : toAppError(err, {
            kind: "server",
            message:
              "Une erreur est survenue lors de l'envoi de votre message. Réessaye dans un instant.",
          });

      setSendError(appError.message);

      if (appError.kind === "network") {
        notifyNetworkToast({
          title: "Connexion perdue",
          message: appError.message,
          retryLabel: "Réessayer maintenant",
          onRetry: () => void submitChatMessage(),
          refreshLabel: "Rafraîchir",
          onRefresh: () => window.location.reload(),
        });
      }
    } finally {
      setIsSending(false);
      submitLockRef.current = false;
    }
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    void submitChatMessage();
  };

  const handleUpdateHandle = async () => {
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
  };

  const activeChannelDefinition = getChatChannelDefinition(activeChannelType);
  const activeChannelVisual = CHANNEL_VISUALS[activeChannelType];
  const ActiveChannelIcon = activeChannelVisual.icon;
  const activeChannelLabel = getChannelTitle(activeChannelType);
  const activeChannelDescription = activeChannelDefinition.description;
  const composerPlaceholder = getChannelPlaceholder(activeChannelType);
  const canSubmitMessage = Boolean(
    userId &&
      (message.trim().length > 0 || file) &&
      !isSending &&
      !isUploading &&
      !(activeChannelType === "dm" && !selectedRecipient) &&
      !(activeChannelType === "territory" && !effectiveZone && territoryFocus === null),
  );
  const bugReportPagePath = pathname;
  const emptyState = getEmptyStateCopy(
    activeChannelType,
    selectedRecipient?.display_name ?? selectedRecipient?.handle ?? null,
    territoryFocus,
    effectiveZone || null,
  );
  const sidebarChannels = CHAT_CHANNEL_ORDER.map((channelType) => {
    const definition = getChatChannelDefinition(channelType);
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
      label: definition.label,
      description: definition.description,
      count: isActive ? messages.length : undefined,
      accentClass: visual.accentClass,
      chipClass: visual.chipClass,
      isLocked: !isAvailable,
    };
  });

  const handleSelectChannel = (channelType: ChatChannelType) => {
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
  };

  const handleViewModeChange = (mode: "messages" | "graph") => {
    setViewMode(mode);
  };

  const handleToggleHandleEditor = () => {
    setIsEditingHandle((current) => !current);
  };

  const handleHandleChange = (value: string) => {
    setNewHandle(value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
  };

  const handleSelectRecipient = (recipient: ChatUser) => {
    setSelectedRecipient(recipient);
    setRecipientQuery("");
    setIsRecipientPickerOpen(false);
  };

  const handleClearRecipient = () => {
    setSelectedRecipient(null);
    setRecipientQuery("");
    setIsRecipientPickerOpen(true);
  };

  const handleRecipientQueryChange = (value: string) => {
    setRecipientQuery(value);
    setIsRecipientPickerOpen(true);
  };

  return (
    <div className="flex flex-col h-[700px] cmm-surface rounded-[2.5rem] border overflow-hidden shadow-2xl relative">
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          channels={sidebarChannels}
          currentChannelType={activeChannelType}
          onSelectChannel={handleSelectChannel}
        />
        <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-950">
          <ChatHeader
            activeChannelType={activeChannelType}
            activeChannelLabel={activeChannelLabel}
            activeChannelDescription={activeChannelDescription}
            activeChannelIcon={ActiveChannelIcon}
            activeChannelAccentClass={activeChannelVisual.accentClass}
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
                pagePath={bugReportPagePath}
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
                {feedState === "loading" && (
                  <div className="space-y-8 p-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-start gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                        <div className="flex-1 space-y-3">
                          <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded-full" />
                          <div className="h-12 w-full bg-slate-50 dark:bg-slate-900 rounded-[1.5rem]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {feedState === "degraded" && (
                  <div className="h-full flex items-center p-8">
                    <div className="w-full rounded-[2rem] border border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-6 text-center">
                      <p className="text-sm font-black text-rose-900 dark:text-rose-400 uppercase tracking-widest mb-2">
                        Erreur de Flux
                      </p>
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-500 mb-1">
                        {messagesError?.message || "Erreur inconnue"}
                      </p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 opacity-80 italic">
                        {messagesError?.message?.includes("profiles")
                          ? "Vérifiez que la migration des profils et de la messagerie a bien été appliquée."
                          : "Vérifiez votre console (F12) et assurez-vous que votre profil est synchronisé."}
                      </p>
                    </div>
                  </div>
                )}

                {feedState === "empty" && (
                  <div className="h-full flex items-center justify-center p-8">
                    <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-6 text-center">
                      <MessageSquare
                        size={48}
                        className="mx-auto text-slate-400 dark:text-slate-500"
                      />
                      <h4 className="mt-4 text-lg font-black cmm-text-primary">
                        {emptyState.title}
                      </h4>
                      <p className="mt-2 text-sm cmm-text-secondary">
                        {emptyState.description}
                      </p>
                      {activeChannelType === "dm" && !selectedRecipient ? (
                        <button
                          type="button"
                          onClick={() => setIsRecipientPickerOpen(true)}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/20"
                        >
                          Choisir un membre
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {messages.map((msg) => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    userId={userId}
                  />
                ))}
              </div>

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
