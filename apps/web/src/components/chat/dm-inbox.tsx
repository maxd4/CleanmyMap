"use client";

import { AlertCircle, MessageCirclePlus, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { memo } from "react";
import type { DmConversation } from "./chat-types";
import { ChatAvatar } from "./chat-avatar";

type DmInboxProps = {
  conversations: DmConversation[];
  activePeerId: string | null;
  isLoading: boolean;
  error?: unknown;
  onSelectConversation: (conversation: DmConversation) => void;
  onStartConversation: () => void;
  onRetry: () => void;
  tone?: "light" | "dark";
  className?: string;
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
  tone = "light",
  className = "",
}: DmInboxProps) {
  const isLight = tone === "light";

  return (
    <aside
      aria-label="Conversations privées"
      className={`${className || "flex"} min-h-0 w-full shrink-0 flex-col border-b p-4 md:w-72 md:border-b-0 md:border-r ${isLight ? "border-rose-100/80 bg-rose-50/30" : "border-slate-800 bg-slate-900/60"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
            Messages privés
          </p>
          <h2 className={`mt-1 truncate text-base font-black ${isLight ? "text-slate-900" : "text-white"}`}>
            Conversations
          </h2>
        </div>
        <button
          type="button"
          onClick={onStartConversation}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${isLight ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700" : "bg-indigo-500 text-white hover:bg-indigo-400"}`}
        >
          <MessageCirclePlus size={15} aria-hidden="true" />
          <span className="hidden sm:inline">Nouveau</span>
          <span className="sr-only sm:hidden">Démarrer une conversation</span>
        </button>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto custom-scrollbar">
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
              className={`mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${isLight ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-white/10 text-white hover:bg-white/15"}`}
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
                      <span className={`truncate text-sm ${hasUnread || isActive ? "font-black" : "font-bold"} ${isLight ? "text-slate-900" : "text-white"}`}>
                        {conversation.peer.display_name}
                      </span>
                      <span className={`shrink-0 text-[10px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                        {formatConversationDate(conversation.lastMessage.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className={`truncate text-xs ${hasUnread ? "font-bold" : "font-medium"} ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                        {conversation.lastMessage.direction === "sent" ? "Vous : " : ""}
                        {conversation.lastMessage.content}
                      </span>
                      {hasUnread ? (
                        <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white" aria-label={`${conversation.unreadCount} message${conversation.unreadCount > 1 ? "s" : ""} non lu${conversation.unreadCount > 1 ? "s" : ""}`}>
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
