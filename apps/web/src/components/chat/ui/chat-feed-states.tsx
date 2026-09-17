import { MessageSquare } from "lucide-react";
import type { ChatEmptyStateCopy } from "../chat-shell.utils";
import type { ChatChannelType } from "@/lib/chat/channels";

type ChatLoadingStateProps = {
  count?: number;
  tone?: "light" | "dark";
};

export function ChatLoadingState({ count = 3, tone = "dark" }: ChatLoadingStateProps) {
  const isLight = tone === "light";
  return (
    <div className="space-y-8 p-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 animate-pulse">
          <div className={`h-10 w-10 rounded-2xl ${isLight ? "bg-rose-100" : "bg-pink-100 dark:bg-slate-800"}`} />
          <div className="flex-1 space-y-3">
            <div className={`h-3 w-32 rounded-full ${isLight ? "bg-rose-100" : "bg-pink-100 dark:bg-slate-800"}`} />
            <div className={`h-12 w-full rounded-[1.5rem] ${isLight ? "bg-white border border-rose-100" : "bg-pink-50 dark:bg-slate-900"}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

type ChatDegradedStateProps = {
  onRetry: () => void;
  tone?: "light" | "dark";
};

export function ChatDegradedState({ onRetry, tone = "dark" }: ChatDegradedStateProps) {
  const isLight = tone === "light";
  return (
    <div className="flex h-full items-center justify-center p-8" role="alert">
      <div className={`w-full max-w-md rounded-2xl border p-6 text-center ${isLight ? "border-rose-200 bg-rose-50" : "border-rose-200 bg-rose-50 dark:bg-rose-950/20"}`}>
        <p className={`text-sm font-black ${isLight ? "text-rose-700" : "text-rose-900 dark:text-rose-400"}`}>
          Impossible de charger les messages.
        </p>
        <p className={`mt-2 cmm-text-small ${isLight ? "text-rose-600" : "text-rose-600 dark:text-rose-400"}`}>
          Réessayez pour actualiser cette conversation.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className={`mt-4 inline-flex items-center rounded-full px-4 py-2 cmm-text-small font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${isLight ? "bg-rose-600 hover:bg-rose-700" : "bg-rose-700 hover:bg-rose-800"}`}
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

type ChatEmptyStateProps = {
  emptyState: ChatEmptyStateCopy;
  activeChannelType: ChatChannelType;
  selectedRecipientId?: string | null;
  onStarterPrompt: (prompt: string) => void;
  onOpenRecipientPicker: () => void;
  tone?: "light" | "dark";
};

export function ChatEmptyState({
  emptyState,
  activeChannelType,
  selectedRecipientId,
  onStarterPrompt,
  onOpenRecipientPicker,
  tone = "dark",
}: ChatEmptyStateProps) {
  const isLight = tone === "light";
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className={`w-full max-w-md text-center ${isLight ? "text-slate-900" : "cmm-text-primary"}`}>
        <MessageSquare
          size={36}
          className={`mx-auto ${isLight ? "text-rose-400" : "text-pink-400 dark:text-slate-500"}`}
        />
        <h4 className="mt-4 text-lg font-black">
          {emptyState.title}
        </h4>
        <p className={`mt-2 text-sm ${isLight ? "text-slate-500" : "cmm-text-secondary"}`}>
          {emptyState.description}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {emptyState.starterPrompts.slice(0, 3).map((prompt: string) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onStarterPrompt(prompt)}
              className={`rounded-full border px-3 py-2 cmm-text-small font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${isLight ? "border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800" : "border-pink-200/30 bg-pink-50 text-pink-700 hover:border-pink-300 hover:bg-pink-100 hover:text-pink-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-pink-900/60 dark:hover:bg-pink-950/30 dark:hover:text-pink-300"}`}
            >
              {prompt}
            </button>
          ))}
        </div>
        {activeChannelType === "dm" && !selectedRecipientId ? (
          <button
            type="button"
            onClick={onOpenRecipientPicker}
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 cmm-text-small font-black text-white shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${isLight ? "bg-rose-500 shadow-rose-500/20" : "bg-pink-600 shadow-pink-500/20"}`}
          >
            Choisir un membre
          </button>
        ) : null}
      </div>
    </div>
  );
}
