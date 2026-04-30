"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Bug,
  Mail,
  MapPin,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Share2,
  Shield,
  Sparkles,
  User,
  Users,
  Lock,
  type LucideIcon,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import { getChatFeedState } from "./chat-feed-state";
import { RichMessageCard } from "./rich-message-card";
import { TopicNetworkGraph } from "./topic-network-graph";
import {
  canAccessChatChannel,
  getChatChannelDefinition,
  type ChatChannelType,
  CHAT_CHANNEL_ORDER,
} from "@/lib/chat/channels";

type ChatMessage = {
  id: string;
  sender_id: string;
  content: string;
  channel_type: ChatChannelType;
  attachment_url?: string;
  created_at: string;
  sender: {
    display_name: string;
    handle: string;
    avatar_url: string;
  };
};

type ChatUser = {
  id: string;
  display_name: string;
  handle: string;
  avatar_url: string | null;
};

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

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof payload?.hint === "string"
        ? payload.hint
        : typeof payload?.message === "string"
          ? payload.message
          : "Le service de discussion est momentanément indisponible. Nous tentons de rétablir la connexion.";
    throw new Error(message);
  }
  return payload;
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

  const [activeChannelType, setActiveChannelType] =
    useState<ChatChannelType>(initialChannelType);
  const [viewMode, setViewMode] = useState<"messages" | "graph">("messages");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<ChatUser | null>(
    null,
  );
  const [isRecipientPickerOpen, setIsRecipientPickerOpen] = useState(
    initialChannelType === "dm",
  );
  const isBugReportChannel = activeChannelType === "bug_report";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentRoleLabel = getClerkRoleLabel(user);
  const clerkArrondissement = getClerkArrondissement(user);
  const territoryFocus = initialArrondissement ?? clerkArrondissement;
  const hasArrondissement = territoryFocus !== null || clerkArrondissement !== null;

  const messagesKey =
    activeChannelType === "dm"
      ? selectedRecipient
        ? `/api/chat?channelType=dm&recipientId=${encodeURIComponent(selectedRecipient.id)}`
        : null
      : activeChannelType === "territory"
        ? territoryFocus
          ? `/api/chat?channelType=territory&arrondissementId=${territoryFocus}`
          : null
        : `/api/chat?channelType=${activeChannelType}`;

  const { data: mentionUsersData } = useSWR(
    showMentions && mentionQuery.trim().length > 0
      ? `/api/chat/users?q=${encodeURIComponent(mentionQuery.trim())}`
      : null,
    fetcher,
  );

  const { data: dmUsersData } = useSWR(
    activeChannelType === "dm"
      ? `/api/chat/users${
          recipientQuery.trim().length > 0
            ? `?q=${encodeURIComponent(recipientQuery.trim())}`
            : ""
        }`
      : null,
    fetcher,
  );

  const { data, error, isLoading, mutate } = useSWR(messagesKey, fetcher, {
    refreshInterval: 30000,
  });

  const messages: ChatMessage[] = data?.messages || [];
  const feedState = getChatFeedState({
    isLoading,
    hasMessages: messages.length > 0,
    hasError: Boolean(error),
  });

  const mentionSuggestions = ((mentionUsersData?.users ?? []) as ChatUser[]).filter(
    (candidate) => candidate.id !== userId,
  );

  const dmSuggestions = ((dmUsersData?.users ?? []) as ChatUser[]).filter(
    (candidate) => candidate.id !== userId,
  );

  useEffect(() => {
    if (scrollRef.current && viewMode === "messages") {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, viewMode]);

  useEffect(() => {
    if (activeChannelType === "dm") {
      setIsRecipientPickerOpen(true);
    } else {
      setIsRecipientPickerOpen(false);
    }
    setSendError(null);
  }, [activeChannelType]);

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);

    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@([a-z0-9_]*)$/i);

    if (match) {
      setShowMentions(true);
      setMentionQuery(match[1]);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (handle: string) => {
    const lastAt = message.lastIndexOf("@");
    const newText =
      message.slice(0, lastAt) +
      `@${handle} ` +
      message.slice(lastAt + mentionQuery.length + 1);
    setMessage(newText);
    setShowMentions(false);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setSendError("Connectez-vous pour envoyer un message.");
      return;
    }
    if ((!message.trim() && !file) || isSending || isUploading) return;

    if (activeChannelType === "dm" && !selectedRecipient) {
      setSendError("Choisissez un destinataire pour envoyer un message privé.");
      return;
    }

    if (activeChannelType === "territory" && territoryFocus === null) {
      setSendError("Ajoutez un arrondissement à votre profil avant d'écrire dans ce canal.");
      return;
    }

    setIsSending(true);
    let attachmentUrl = undefined;
    let attachmentType = undefined;

    try {
      if (file) {
        setIsUploading(true);
        const fileExt = file.name.split(".").pop();
        const fileName = `${userId}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `${activeChannelType}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("chat-attachments").getPublicUrl(filePath);

        attachmentUrl = publicUrl;
        attachmentType = file.type;
      }

      setSendError(null);

      const optimisticMsg: ChatMessage = {
        id: `opt-${Date.now()}`,
        sender_id: userId,
        content: message,
        channel_type: activeChannelType,
        attachment_url: attachmentUrl,
        created_at: new Date().toISOString(),
        sender: {
          display_name: user?.fullName || user?.username || "Moi",
          handle: user?.username || "moi",
          avatar_url: user?.imageUrl || "",
        },
      };

      mutate(
        { ...data, messages: [...(data?.messages || []), optimisticMsg] },
        { revalidate: false },
      );

      const currentMessage = message;
      setMessage("");
      setFile(null);
      setShowMentions(false);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelType: activeChannelType,
          content: currentMessage,
          recipientId:
            activeChannelType === "dm" ? selectedRecipient?.id : undefined,
          arrondissementId:
            activeChannelType === "territory" ? territoryFocus ?? undefined : undefined,
          attachmentUrl,
          attachmentType,
        }),
      });

      if (res.ok) {
        mutate();
      } else {
        const payload = await res.json().catch(() => ({}));
        const messageFromApi =
          typeof payload?.hint === "string"
            ? payload.hint
            : typeof payload?.message === "string"
              ? payload.message
              : "Envoi impossible pour le moment. Veuillez réessayer.";
        setSendError(messageFromApi);
      }
    } catch (err) {
      console.error("Failed to send message", err);
      setSendError(
        "Une erreur est survenue lors de l'envoi de votre message. Vérifiez votre connexion.",
      );
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
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
  const composerPlaceholder = getChannelPlaceholder(activeChannelType);
  const bugReportPagePath = pathname;
  const emptyState = getEmptyStateCopy(
    activeChannelType,
    selectedRecipient?.display_name ?? selectedRecipient?.handle ?? null,
    territoryFocus,
  );

  return (
    <div className="flex flex-col h-[700px] cmm-surface rounded-[2.5rem] border overflow-hidden shadow-2xl relative">
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative z-30">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-900 shadow-inner ${activeChannelVisual.accentClass}`}>
            <ActiveChannelIcon size={22} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-lg cmm-text-primary uppercase tracking-tighter">
                {activeChannelLabel}
              </h3>
              <div className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 text-[9px] font-black uppercase tracking-widest animate-pulse">
                Live
              </div>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles size={10} className={activeChannelVisual.accentClass} />
              {activeChannelDefinition.description}
            </p>
            {activeChannelType === "dm" && selectedRecipient ? (
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Conversation avec {selectedRecipient.display_name} @{selectedRecipient.handle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl flex gap-1">
            <button
              disabled={isBugReportChannel}
              onClick={() => setViewMode("messages")}
              aria-label="Afficher les messages"
              className={`p-2 rounded-lg transition-all ${
                isBugReportChannel
                  ? "opacity-40 cursor-not-allowed"
                  : viewMode === "messages"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-violet-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <MessageSquare size={18} />
            </button>
            <button
              disabled={isBugReportChannel}
              onClick={() => setViewMode("graph")}
              aria-label="Afficher le graphe"
              className={`p-2 rounded-lg transition-all ${
                isBugReportChannel
                  ? "opacity-40 cursor-not-allowed"
                  : viewMode === "graph"
                  ? "bg-white dark:bg-slate-700 shadow-sm text-violet-600"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Share2 size={18} />
            </button>
          </div>

          <button
            onClick={() => setIsEditingHandle(!isEditingHandle)}
            aria-label={isEditingHandle ? "Fermer la modification du pseudo" : "Modifier le pseudo"}
            className="w-10 h-10 rounded-xl cmm-surface-muted flex items-center justify-center cmm-text-muted hover:text-violet-500 hover:shadow-lg transition-all"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {isEditingHandle ? (
        <div className="p-5 bg-violet-50 dark:bg-violet-950/20 border-b border-violet-100 dark:border-violet-900/50 flex items-center gap-4 animate-in slide-in-from-top-4 relative z-20">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase text-violet-700 dark:text-violet-400 mb-2 tracking-widest">
              Identité Numérique
            </p>
            <input
              value={newHandle}
              onChange={(e) =>
                setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
              }
              placeholder="votre_pseudo_unique"
              className="w-full bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-2 cmm-text-small font-bold focus:ring-4 focus:ring-violet-500/10 outline-none"
            />
          </div>
          <button
            onClick={handleUpdateHandle}
            className="mt-6 px-6 py-2 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
          >
            Confirmer
          </button>
        </div>
      ) : null}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-24 md:w-72 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col p-3 space-y-3 overflow-y-auto">
          {CHAT_CHANNEL_ORDER.map((channelType) => {
            const definition = getChatChannelDefinition(channelType);
            const visual = CHANNEL_VISUALS[channelType];
            const isActive = activeChannelType === channelType;
            const isAvailable = canAccessChatChannel(channelType, {
              roleLabel: currentRoleLabel,
              hasArrondissement,
            });

            return (
              <ChannelButton
                key={channelType}
                active={isActive}
                disabled={!isAvailable}
                onClick={() => {
                  if (!isAvailable) return;
                  setActiveChannelType(channelType);
                }}
                icon={visual.icon}
                label={definition.label}
                description={definition.description}
                count={isActive ? messages.length : undefined}
                accentClass={visual.accentClass}
                chipClass={visual.chipClass}
                isLocked={!isAvailable}
              />
            );
          })}
        </div>

        <div className="flex-1 flex flex-col relative bg-white dark:bg-slate-950">
          {isBugReportChannel ? (
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <FeedbackSection
                pagePath={bugReportPagePath}
                source="feedback_discussion"
              />
            </div>
          ) : viewMode === "graph" ? (
            <TopicNetworkGraph />
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
                        {error?.message || "Erreur inconnue"}
                      </p>
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 opacity-80 italic">
                        {error?.message?.includes("profiles")
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
                  <RichMessageCard
                    key={msg.id}
                    message={msg}
                    isMe={msg.sender_id === userId}
                  />
                ))}
              </div>

              <form
                onSubmit={handleSend}
                className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md"
              >
                {sendError ? (
                  <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-400 animate-in fade-in zoom-in-95">
                    {sendError}
                  </div>
                ) : null}

                {activeChannelType === "dm" ? (
                  <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                          Destinataire
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Sélectionnez le membre avec qui ouvrir la conversation.
                        </p>
                      </div>
                      {selectedRecipient ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecipient(null);
                            setRecipientQuery("");
                            setIsRecipientPickerOpen(true);
                          }}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          Changer
                        </button>
                      ) : null}
                    </div>

                    {selectedRecipient ? (
                      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-3 py-3 dark:border-violet-900/40 dark:bg-slate-950/80">
                        <div className="h-10 w-10 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                          {selectedRecipient.avatar_url ? (
                            <img
                              src={selectedRecipient.avatar_url}
                              alt={selectedRecipient.display_name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black cmm-text-primary">
                            {selectedRecipient.display_name}
                          </p>
                          <p className="truncate text-xs cmm-text-muted">
                            @{selectedRecipient.handle}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 space-y-3">
                        <div className="relative">
                          <Search
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            value={recipientQuery}
                            onChange={(e) => {
                              setRecipientQuery(e.target.value);
                              setIsRecipientPickerOpen(true);
                            }}
                            onFocus={() => setIsRecipientPickerOpen(true)}
                            placeholder="Rechercher un membre"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-violet-500"
                          />
                        </div>

                        {isRecipientPickerOpen ? (
                          <div className="max-h-52 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                            {dmSuggestions.length > 0 ? (
                              dmSuggestions.map((candidate) => (
                                <button
                                  key={candidate.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecipient(candidate);
                                    setRecipientQuery("");
                                    setIsRecipientPickerOpen(false);
                                  }}
                                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                                >
                                  <div className="h-9 w-9 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                    {candidate.avatar_url ? (
                                      <img
                                        src={candidate.avatar_url}
                                        alt={candidate.display_name}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold cmm-text-primary">
                                      {candidate.display_name}
                                    </p>
                                    <p className="truncate text-xs cmm-text-muted">
                                      @{candidate.handle}
                                    </p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-4 text-sm cmm-text-muted">
                                Aucun membre trouvé.
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}

                {isBugReportChannel ? (
                  <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs font-medium text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
                    Ce canal me transmet directement vos signalements de bug. Gardez un ton factuel et ajoutez une pièce jointe si utile.
                  </div>
                ) : null}

                {showMentions && mentionSuggestions.length > 0 ? (
                  <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                    {mentionSuggestions.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => insertMention(candidate.handle)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="h-9 w-9 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                          {candidate.avatar_url ? (
                            <img
                              src={candidate.avatar_url}
                              alt={candidate.display_name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold cmm-text-primary">
                            {candidate.display_name}
                          </p>
                          <p className="truncate text-xs cmm-text-muted">
                            @{candidate.handle}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="relative flex items-end gap-3 bg-slate-50 dark:bg-slate-900/80 rounded-3xl p-3 border border-transparent focus-within:border-violet-500/30 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all duration-300 shadow-inner">
                  <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f && f.size > 2 * 1024 * 1024) {
                        alert("Fichier trop lourd (Max 2Mo)");
                        return;
                      }
                      setFile(f || null);
                    }}
                  />
                  <button
                    type="button"
                    disabled={!userId}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Joindre un fichier"
                    className="p-3 text-slate-400 hover:text-violet-500 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-30"
                  >
                    <Paperclip size={20} />
                  </button>
                  <textarea
                    rows={1}
                    value={message}
                    onChange={handleTextChange}
                    disabled={!userId}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-1 max-h-40 resize-none placeholder:text-slate-400"
                    placeholder={userId ? composerPlaceholder : "Connectez-vous pour participer"}
                  />
                  <button
                    disabled={
                      !userId ||
                      (!message.trim() && !file) ||
                      isSending ||
                      isUploading ||
                      (activeChannelType === "dm" && !selectedRecipient)
                    }
                    type="submit"
                    aria-label="Envoyer le message"
                    className="w-12 h-12 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center"
                  >
                    <Send size={20} />
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  label,
  description,
  count,
  accentClass,
  chipClass,
  isLocked,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  description: string;
  count?: number;
  accentClass: string;
  chipClass: string;
  isLocked: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`relative flex w-full items-start gap-3 rounded-[1.5rem] border p-3 text-left transition-all duration-300 group ${
        active
          ? "border-violet-200 bg-violet-600 text-white shadow-2xl shadow-violet-600/30 dark:border-violet-500/40"
          : "border-transparent bg-white/60 text-slate-600 hover:border-slate-200 hover:bg-white hover:shadow-lg dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${
          active ? "bg-white/15 text-white" : chipClass
        }`}
      >
        <Icon size={18} className={active ? "text-white" : accentClass} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-widest leading-none">
              {label}
            </span>
            <span
              className={`mt-1 block text-[10px] leading-tight ${
                active ? "text-white/75" : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {description}
            </span>
          </div>
          {count !== undefined ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                active
                  ? "bg-white/15 text-white"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {count}
            </span>
          ) : null}
        </div>
      </div>
      {active ? (
        <motion.div
          layoutId="active-channel"
          className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white"
        />
      ) : null}
      {isLocked ? (
        <div className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-1 text-white dark:bg-white/10">
          <Lock size={10} />
        </div>
      ) : null}
    </button>
  );
}
