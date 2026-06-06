import { MessageSquare } from "lucide-react";
import type { ChatEmptyStateCopy } from "../chat-shell.utils";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { PostgrestError } from "@supabase/supabase-js";

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
          <div className={`w-10 h-10 rounded-2xl ${isLight ? "bg-rose-100" : "bg-pink-100 dark:bg-slate-800"}`} />
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
  error: Error | PostgrestError | null;
  tone?: "light" | "dark";
};

export function ChatDegradedState({ error, tone = "dark" }: ChatDegradedStateProps) {
  const isLight = tone === "light";
  return (
    <div className="h-full flex items-center p-8">
      <div className={`w-full rounded-[2rem] border p-6 text-center ${isLight ? "border-rose-200 bg-rose-50" : "border-rose-200 bg-rose-50 dark:bg-rose-950/20"}`}>
        <p className={`text-sm font-black uppercase tracking-widest mb-2 ${isLight ? "text-rose-700" : "text-rose-900 dark:text-rose-400"}`}>
          Erreur de Flux
        </p>
        <p className={`text-xs font-bold mb-1 ${isLight ? "text-rose-700" : "text-rose-700 dark:text-rose-500"}`}>
          {error?.message || "Erreur inconnue"}
        </p>
        <p className={`text-[10px] opacity-80 italic ${isLight ? "text-rose-600" : "text-rose-600 dark:text-rose-400"}`}>
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
  tone?: "light" | "dark";
};

export function ChatEmptyState({
  emptyState,
  locale,
  activeChannelType,
  selectedRecipientId,
  onStarterPrompt,
  onOpenRecipientPicker,
  tone = "dark",
}: ChatEmptyStateProps) {
  const isLight = tone === "light";
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className={`w-full max-w-lg rounded-[2rem] border p-6 text-center ${isLight ? "border-rose-100/70 bg-white/90" : "border-pink-100/40 bg-pink-50/80 dark:border-slate-800 dark:bg-slate-900/60"}`}>
        <MessageSquare
          size={48}
          className={`mx-auto ${isLight ? "text-rose-400" : "text-pink-400 dark:text-slate-500"}`}
        />
        <h4 className={`mt-4 text-lg font-black ${isLight ? "text-slate-900" : "cmm-text-primary"}`}>
          {emptyState.title}
        </h4>
        <p className={`mt-2 text-sm ${isLight ? "text-slate-500" : "cmm-text-secondary"}`}>
          {emptyState.description}
        </p>
        <div className={`mt-4 rounded-2xl border p-4 text-left shadow-sm ${isLight ? "border-rose-100/70 bg-rose-50/50" : "border-pink-100/40 bg-[rgba(255,248,251,0.96)] dark:border-slate-800 dark:bg-slate-950/80"}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-600" : "text-pink-600"}`}>
            {emptyState.starterTitle}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {emptyState.starterPrompts.map((prompt: string) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onStarterPrompt(prompt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${isLight ? "border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800" : "border-pink-200/30 bg-pink-50 text-pink-700 hover:border-pink-300 hover:bg-pink-100 hover:text-pink-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-pink-900/60 dark:hover:bg-pink-950/30 dark:hover:text-pink-300"}`}
              >
                {prompt}
              </button>
            ))}
          </div>
          <div className={`mt-4 rounded-2xl border p-4 text-left ${isLight ? "border-rose-100/70 bg-white/90" : "border-pink-100/40 bg-pink-50/80 dark:border-slate-800 dark:bg-slate-950/70"}`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-600" : "text-pink-600"}`}>
              {locale === "fr" ? "Format recommandé" : "Recommended format"}
            </p>
            <p className={`mt-2 text-sm font-semibold ${isLight ? "text-slate-800" : "cmm-text-primary"}`}>
              {emptyState.messagePattern}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {emptyState.purposeTags.map((tag: string) => (
                <span
                  key={tag}
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${isLight ? "border-rose-200 bg-white text-rose-700" : "border-pink-200/30 bg-pink-50 text-pink-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <p className={`mt-3 text-xs ${isLight ? "text-slate-500" : "cmm-text-secondary"}`}>
            {emptyState.composerHint}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isLight ? "bg-rose-100 text-rose-700" : "bg-pink-100 text-pink-700 dark:bg-slate-900 dark:text-slate-300"}`}>
              {emptyState.audienceLabel}
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isLight ? "bg-rose-100 text-rose-700" : "bg-pink-100 text-pink-700 dark:bg-slate-900 dark:text-slate-300"}`}>
              {emptyState.visibilityLabel}
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${isLight ? "bg-rose-100 text-rose-700" : "bg-pink-100 text-pink-700 dark:bg-slate-900 dark:text-slate-300"}`}>
              {emptyState.channelGoal}
            </span>
          </div>
          {activeChannelType === "dm" && !selectedRecipientId ? (
            <button
              type="button"
              onClick={onOpenRecipientPicker}
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg ${isLight ? "bg-rose-500 shadow-rose-500/20" : "bg-pink-600 shadow-pink-500/20"}`}
            >
              Choisir un membre
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
