"use client";

import { AlertCircle, MessageCirclePlus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { memo, useState } from "react";
import type { DmConversation } from "./chat-types";
import type { ActionShareContactRequest } from "./chat-types";
import { ChatAvatar } from "./chat-avatar";
import { ChatActionReferenceCard } from "./ui/chat-action-reference-card";

type DmInboxProps = {
  conversations: DmConversation[];
  activePeerId: string | null;
  isLoading: boolean;
  error?: unknown;
  onSelectConversation: (conversation: DmConversation) => void;
  onStartConversation: () => void;
  onRetry: () => void;
  notificationUnreadCount?: number;
  tone?: "light" | "dark";
  className?: string;
  contactRequests?: readonly ActionShareContactRequest[];
  contactRequestsLoading?: boolean;
  contactRequestsError?: unknown;
  onRespondToContactRequest?: (
    request: ActionShareContactRequest,
    decision: "accept" | "reject" | "ignore",
  ) => Promise<void>;
};

function formatConversationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

export const DmInbox = memo(function DmInbox({
  conversations,
  activePeerId,
  isLoading,
  error,
  onSelectConversation,
  onStartConversation,
  onRetry,
  notificationUnreadCount = 0,
  tone = "light",
  className = "",
  contactRequests = [],
  contactRequestsLoading = false,
  contactRequestsError,
  onRespondToContactRequest,
}: DmInboxProps) {
  const isLight = tone === "light";
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);

  async function respondToRequest(
    request: ActionShareContactRequest,
    decision: "accept" | "reject" | "ignore",
  ) {
    if (!onRespondToContactRequest || respondingRequestId) return;
    setRespondingRequestId(request.id);
    try {
      await onRespondToContactRequest(request, decision);
    } finally {
      setRespondingRequestId(null);
    }
  }

  return (
    <aside
      aria-label="Conversations privées"
      className={`${className || "flex"} min-h-0 w-full shrink-0 flex-col border-b p-4 md:w-72 md:border-b-0 md:border-r ${isLight ? "border-rose-100/80 bg-rose-50/30" : "border-slate-800 bg-slate-900/60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`cmm-text-caption font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
            Messages privés
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className={`text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
              Conversations
            </h2>
            {notificationUnreadCount > 0 ? (
              <span
                className="inline-flex min-w-5 items-center justify-center rounded-full bg-fuchsia-600 px-1.5 py-0.5 cmm-text-caption font-black text-white"
                aria-label={`${notificationUnreadCount} notification${notificationUnreadCount > 1 ? "s" : ""} privée${notificationUnreadCount > 1 ? "s" : ""} non lue${notificationUnreadCount > 1 ? "s" : ""}`}
              >
                {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
              </span>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onStartConversation}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 cmm-text-caption font-black uppercase tracking-widest transition ${isLight ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700" : "bg-indigo-500 text-white hover:bg-indigo-400"}`}
        >
          <MessageCirclePlus size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Nouveau</span>
          <span className="sr-only sm:hidden">Démarrer une conversation</span>
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
        {contactRequestsLoading ? (
          <p className="mb-4 rounded-xl border border-dashed border-indigo-200 p-3 text-xs text-slate-500" role="status">
            Recherche de demandes de partage…
          </p>
        ) : null}
        {contactRequestsError ? (
          <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            Les demandes de partage sont momentanément indisponibles.
          </p>
        ) : null}
        {contactRequests.length > 0 ? (
          <section className="mb-4 space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-3" aria-label="Demandes de partage d’action">
            <div>
              <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-indigo-600">Nouvelles demandes</p>
              <p className="mt-1 text-xs text-slate-600">Acceptez pour ouvrir la conversation et recevoir le partage.</p>
            </div>
            {contactRequests.map((request) => (
              <article key={request.id} className="rounded-xl border border-indigo-100 bg-white p-3">
                <div className="flex items-center gap-2">
                  <ChatAvatar src={request.sender.avatar_url} name={request.sender.display_name} size="sm" tone="light" />
                  <p className="text-sm font-bold text-slate-900">{request.sender.display_name} souhaite vous partager une action</p>
                </div>
                <p className="mt-2 text-xs text-slate-600">{request.message}</p>
                <div className="mt-2">
                  <ChatActionReferenceCard actionId={request.action.id} tone="light" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={respondingRequestId !== null} onClick={() => void respondToRequest(request, "accept")} className="rounded-full bg-indigo-600 px-3 py-1.5 cmm-text-caption font-black uppercase tracking-wide text-white disabled:opacity-50">Accepter</button>
                  <button type="button" disabled={respondingRequestId !== null} onClick={() => void respondToRequest(request, "reject")} className="rounded-full border border-slate-200 px-3 py-1.5 cmm-text-caption font-black uppercase tracking-wide text-slate-600 disabled:opacity-50">Refuser</button>
                  <button type="button" disabled={respondingRequestId !== null} onClick={() => void respondToRequest(request, "ignore")} className="rounded-full border border-slate-200 px-3 py-1.5 cmm-text-caption font-black uppercase tracking-wide text-slate-600 disabled:opacity-50">Ignorer</button>
                </div>
              </article>
            ))}
          </section>
        ) : null}
        {isLoading ? (
          <div className="space-y-2" aria-label="Chargement des conversations" role="status">
            {[0, 1, 2].map((item) => (
              <div key={item} className={`h-[4.5rem] animate-pulse rounded-2xl ${isLight ? "bg-white/70" : "bg-white/5"}`} />
            ))}
          </div>
        ) : error ? (
          <div className={`rounded-2xl border p-4 ${isLight ? "border-rose-200 bg-white text-rose-700" : "border-rose-500/20 bg-rose-500/10 text-rose-200"}`}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-xs font-semibold">Impossible de charger les conversations.</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className={`mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 cmm-text-caption font-black uppercase tracking-widest ${isLight ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-white/10 text-white hover:bg-white/15"}`}
            >
              <RefreshCw size={13} aria-hidden="true" /> Réessayer
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className={`rounded-2xl border border-dashed p-5 text-center ${isLight ? "border-rose-200 bg-white/70" : "border-slate-700 bg-white/5"}`}>
            <p className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
              Aucune conversation privée
            </p>
            <p className={`mt-1 text-xs leading-relaxed ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Recherchez un membre pour démarrer un échange.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const isActive = conversation.peer.id === activePeerId;
              const hasUnread = conversation.unreadCount > 0;
              return (
                <button
                  key={conversation.peer.id}
                  type="button"
                  onClick={() => onSelectConversation(conversation)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${isActive ? (isLight ? "border-indigo-200 bg-indigo-50" : "border-indigo-400/40 bg-indigo-500/10") : isLight ? "border-transparent hover:border-rose-100 hover:bg-white" : "border-transparent hover:bg-white/5"}`}
                >
                  <ChatAvatar
                    src={conversation.peer.avatar_url}
                    name={conversation.peer.display_name}
                    size="sm"
                    tone={isLight ? "light" : "dark"}
                    className={isActive ? "bg-indigo-100 text-indigo-700" : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`break-words text-sm ${hasUnread || isActive ? "font-black" : "font-bold"} ${isLight ? "text-slate-900" : "text-white"}`}>
                        {conversation.peer.display_name}
                      </span>
                      <span className={`shrink-0 cmm-text-caption ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                        {formatConversationDate(conversation.lastMessage.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${hasUnread ? "font-bold" : "font-medium"} ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {conversation.lastMessage.direction === "sent" ? "Vous : " : ""}
                        {conversation.lastMessage.content}
                      </span>
                      {hasUnread ? (
                        <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 cmm-text-caption font-black text-white" aria-label={`${conversation.unreadCount} message${conversation.unreadCount > 1 ? "s" : ""} non lu${conversation.unreadCount > 1 ? "s" : ""}`}>
                          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
});
