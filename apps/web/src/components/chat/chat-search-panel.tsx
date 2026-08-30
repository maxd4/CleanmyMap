"use client";

import { Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import { CmmFeedback } from "@/components/ui/cmm-feedback";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import type { ChatSearchResult } from "@/lib/chat/chat-search";
import { getDiscussionTopic } from "./discussion-guidance";

type ChatSearchPanelProps = {
  query: string;
  results: ChatSearchResult[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelectResult: (result: ChatSearchResult) => void;
  onLoadMore: () => void;
  tone: "light" | "dark";
};

export function ChatSearchPanel({
  query,
  results,
  isLoading,
  error,
  hasMore,
  isLoadingMore,
  loadMoreError,
  onQueryChange,
  onClose,
  onSelectResult,
  onLoadMore,
  tone,
}: ChatSearchPanelProps) {
  const isLight = tone === "light";
  const hasMinimumQuery = query.trim().length >= 2;

  return (
    <div
      role="search"
      aria-label="Rechercher dans les messages"
      className={`border-b px-5 py-3 ${isLight ? "border-rose-100/60 bg-white/80" : "border-pink-100/70 bg-slate-950/30"}`}
    >
      <div className="flex items-center gap-2">
        <Search size={16} className={isLight ? "text-rose-500" : "text-pink-300"} aria-hidden="true" />
        <label htmlFor="chat-message-search" className="sr-only">
          Rechercher dans les messages
        </label>
        <input
          id="chat-message-search"
          autoFocus
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Rechercher dans ce fil…"
          className={`min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2 ${isLight ? "border-rose-200 bg-white text-slate-900 focus-visible:ring-rose-400" : "border-white/10 bg-white/5 text-white focus-visible:ring-pink-400"}`}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la recherche"
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 ${isLight ? "text-slate-500 hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-rose-400" : "text-slate-400 hover:bg-white/10 hover:text-white focus-visible:ring-pink-400"}`}
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>

      {hasMinimumQuery ? (
        <div className="mt-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs" role="status">
              <CmmSkeleton variant="circular" animation="pulse" className="h-4 w-4" aria-hidden="true" />
              <span>Recherche en cours…</span>
            </div>
          ) : error ? (
            <CmmFeedback tone="error">{error.message}</CmmFeedback>
          ) : results.length === 0 ? (
            <CmmFeedback tone="info">Aucun message trouvé dans ce fil.</CmmFeedback>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto" aria-live="polite">
              {results.map((result) => {
                const topic = getDiscussionTopic(result.channelType, result.topicId);
                return (
                  <button
                    key={result.messageId}
                    type="button"
                    onClick={() => onSelectResult(result)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 ${isLight ? "border-transparent hover:border-rose-200 hover:bg-rose-50 focus-visible:ring-rose-400" : "border-transparent hover:border-white/10 hover:bg-white/5 focus-visible:ring-pink-400"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`truncate text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                        {result.author.displayName} <span className="font-normal text-slate-500">@{result.author.handle}</span>
                      </span>
                      <time className="shrink-0 text-[10px] text-slate-500" dateTime={result.createdAt}>
                        {formatDistanceToNow(new Date(result.createdAt), { locale: fr, addSuffix: true })}
                      </time>
                    </div>
                    <p className={`mt-1 line-clamp-2 text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      {result.excerpt}
                    </p>
                    {topic ? <span className="mt-1 inline-flex text-[10px] font-semibold text-rose-600">{topic.label}</span> : null}
                  </button>
                );
              })}
              {hasMore ? (
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={isLoadingMore}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 ${isLight ? "text-rose-700 hover:bg-rose-50 focus-visible:ring-rose-400" : "text-pink-300 hover:bg-white/5 focus-visible:ring-pink-400"}`}
                >
                  {isLoadingMore ? "Chargement…" : "Charger plus de résultats"}
                </button>
              ) : null}
              {loadMoreError ? <CmmFeedback tone="error">{loadMoreError}</CmmFeedback> : null}
            </div>
          )}
        </div>
      ) : (
        <CmmFeedback tone="info" className="mt-2">
          Saisissez au moins 2 caractères.
        </CmmFeedback>
      )}
    </div>
  );
}
