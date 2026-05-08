import { MessageSquare } from "lucide-react";
import type { ChatEmptyStateCopy } from "../chat-shell.utils";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { PostgrestError } from "@supabase/supabase-js";

type ChatLoadingStateProps = {
  count?: number;
};

export function ChatLoadingState({ count = 3 }: ChatLoadingStateProps) {
  return (
    <div className="space-y-8 p-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="flex items-start gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-2xl bg-pink-100 dark:bg-slate-800" />
          <div className="flex-1 space-y-3">
            <div className="h-3 w-32 bg-pink-100 dark:bg-slate-800 rounded-full" />
            <div className="h-12 w-full bg-pink-50 dark:bg-slate-900 rounded-[1.5rem]" />
          </div>
        </div>
      ))}
    </div>
  );
}

type ChatDegradedStateProps = {
  error: Error | PostgrestError | null;
};

export function ChatDegradedState({ error }: ChatDegradedStateProps) {
  return (
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
  );
}

type ChatEmptyStateProps = {
  emptyState: ChatEmptyStateCopy;
  locale: "fr" | "en";
  activeChannelType: ChatChannelType;
  selectedRecipientId?: string | null;
  onStarterPrompt: (prompt: string) => void;
  onOpenRecipientPicker: () => void;
};

export function ChatEmptyState({
  emptyState,
  locale,
  activeChannelType,
  selectedRecipientId,
  onStarterPrompt,
  onOpenRecipientPicker,
}: ChatEmptyStateProps) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="w-full max-w-lg rounded-[2rem] border border-pink-100/40 bg-pink-50/80 dark:border-slate-800 dark:bg-slate-900/60 p-6 text-center">
        <MessageSquare
          size={48}
          className="mx-auto text-pink-400 dark:text-slate-500"
        />
        <h4 className="mt-4 text-lg font-black cmm-text-primary">
          {emptyState.title}
        </h4>
        <p className="mt-2 text-sm cmm-text-secondary">
          {emptyState.description}
        </p>
        <div className="mt-4 rounded-2xl border border-pink-100/40 bg-[rgba(255,248,251,0.96)] p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600">
            {emptyState.starterTitle}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {emptyState.starterPrompts.map((prompt: string) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onStarterPrompt(prompt)}
                className="rounded-full border border-pink-200/30 bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-700 transition hover:border-pink-300 hover:bg-pink-100 hover:text-pink-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-pink-900/60 dark:hover:bg-pink-950/30 dark:hover:text-pink-300"
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-pink-100/40 bg-pink-50/80 p-4 text-left dark:border-slate-800 dark:bg-slate-950/70">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-pink-600">
              {locale === "fr" ? "Format recommandé" : "Recommended format"}
            </p>
            <p className="mt-2 text-sm font-semibold cmm-text-primary">
              {emptyState.messagePattern}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {emptyState.purposeTags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full border border-pink-200/30 bg-pink-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-pink-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs cmm-text-secondary">
            {emptyState.composerHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-pink-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-pink-700 dark:bg-slate-900 dark:text-slate-300">
              {emptyState.audienceLabel}
            </span>
            <span className="rounded-full bg-pink-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-pink-700 dark:bg-slate-900 dark:text-slate-300">
              {emptyState.visibilityLabel}
            </span>
            <span className="rounded-full bg-pink-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-pink-700 dark:bg-slate-900 dark:text-slate-300">
              {emptyState.channelGoal}
            </span>
          </div>
          {activeChannelType === "dm" && !selectedRecipientId ? (
            <button
              type="button"
              onClick={onOpenRecipientPicker}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-pink-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-pink-500/20"
            >
              Choisir un membre
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
