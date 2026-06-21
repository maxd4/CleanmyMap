"use client";

import { memo, useState } from "react";
import { Sparkles, type LucideIcon, MessageSquare, Share2, User, Info } from "lucide-react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatUser } from "./chat-types";

type ChatHeaderProps = {
  activeChannelType: ChatChannelType;
  activeChannelLabel: string;
  activeChannelDescription: string;
  activeChannelIcon: LucideIcon;
  activeChannelAccentClass: string;
  metaItems: Array<{ label: string; value: string }>;
  viewMode: "messages" | "graph";
  isBugReportChannel: boolean;
  selectedRecipient: ChatUser | null;
  isEditingHandle: boolean;
  newHandle: string;
  onViewModeChange: (viewMode: "messages" | "graph") => void;
  onToggleHandleEditor: () => void;
  onHandleChange: (value: string) => void;
  onConfirmHandle: () => Promise<void>;
  tone?: "light" | "dark";
  showControls?: boolean;
};

export const ChatHeader = memo(function ChatHeader({
  activeChannelType,
  activeChannelLabel,
  activeChannelDescription,
  activeChannelIcon: ActiveChannelIcon,
  activeChannelAccentClass,
  metaItems,
  viewMode,
  isBugReportChannel,
  selectedRecipient,
  isEditingHandle,
  newHandle,
  onViewModeChange,
  onToggleHandleEditor,
  onHandleChange,
  onConfirmHandle,
  tone = "dark",
  showControls = true,
}: ChatHeaderProps) {
  const isLight = tone === "light";
  const [showMeta, setShowMeta] = useState(false);
  return (
    <>
      <div className={`p-5 flex items-center justify-between backdrop-blur-xl relative z-30 border-b ${isLight ? "border-rose-100/60 bg-white/70" : "border-pink-100/70 dark:border-slate-800 bg-[rgba(255,248,251,0.9)] dark:bg-slate-900/50"}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isLight ? "bg-rose-50 text-rose-500" : `bg-pink-50 dark:bg-slate-900 ${activeChannelAccentClass}`}`}>
            <ActiveChannelIcon size={22} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-black text-lg uppercase tracking-tighter ${isLight ? "text-slate-900" : "cmm-text-primary"}`}>
                {activeChannelLabel}
              </h3>
              <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse ${isLight ? "bg-rose-100 text-rose-600" : "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300"}`}>
                Live
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${isLight ? "text-indigo-500" : "text-indigo-500"}`}>
                <Sparkles size={10} className={activeChannelAccentClass} />
                {activeChannelDescription}
              </p>
            </div>
            {/* Thèmes actifs mock */}
            {activeChannelType === "community" && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? "text-slate-800" : "text-slate-200"}`}>Thèmes actifs :</span>
                {["coordination", "bénévoles", "diffusion"].map(theme => (
                  <span key={theme} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isLight ? "bg-rose-100 text-rose-700" : "bg-rose-500/20 text-rose-300"}`}>
                    {theme}
                  </span>
                ))}
                <button className={`flex items-center justify-center w-5 h-5 rounded-full ${isLight ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                  +
                </button>
              </div>
            )}
            {activeChannelType === "dm" && selectedRecipient ? (
              <p className="text-[10px] font-semibold text-indigo-500 dark:text-slate-400">
                Conversation avec {selectedRecipient.display_name} @{selectedRecipient.handle}
              </p>
            ) : null}
          </div>
        </div>

        {showControls ? (
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-xl flex gap-1 ${isLight ? "bg-white/80 border border-rose-100/70" : "bg-pink-100/70 dark:bg-slate-800/80"}`}>
            <button
              disabled={isBugReportChannel}
              onClick={() => onViewModeChange("messages")}
              aria-label="Afficher les messages"
              className={`p-2 rounded-lg transition-all ${
                isBugReportChannel
                  ? "opacity-40 cursor-not-allowed"
                  : viewMode === "messages"
                  ? isLight
                    ? "bg-rose-50 shadow-sm text-rose-600"
                    : "bg-white dark:bg-slate-700 shadow-sm text-pink-600"
                  : isLight
                    ? "text-slate-400 hover:text-rose-500"
                    : "text-slate-400 hover:text-pink-500"
              }`}
            >
              <MessageSquare size={18} />
            </button>
            <button
              disabled={isBugReportChannel}
              onClick={() => onViewModeChange("graph")}
              aria-label="Afficher le graphe"
              className={`p-2 rounded-lg transition-all ${
                isBugReportChannel
                  ? "opacity-40 cursor-not-allowed"
                  : viewMode === "graph"
                  ? isLight
                    ? "bg-rose-50 shadow-sm text-rose-600"
                    : "bg-white dark:bg-slate-700 shadow-sm text-pink-600"
                  : isLight
                    ? "text-slate-400 hover:text-rose-500"
                    : "text-slate-400 hover:text-pink-500"
              }`}
            >
              <Share2 size={18} />
            </button>
          </div>

          <button
            onClick={onToggleHandleEditor}
            aria-label={isEditingHandle ? "Fermer la modification du pseudo" : "Modifier le pseudo"}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isLight ? "bg-white/80 text-slate-500 hover:text-rose-500 shadow-sm" : "cmm-surface-muted cmm-text-muted hover:text-pink-500 hover:shadow-lg"}`}
          >
            <User size={18} />
          </button>
        </div>
        ) : null}
      </div>

      {isEditingHandle ? (
        <div className={`p-5 border-b flex items-center gap-4 animate-in slide-in-from-top-4 relative z-20 ${isLight ? "bg-rose-50/80 border-rose-100" : "bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/50"}`}>
          <div className="flex-1">
            <p className={`text-[10px] font-black uppercase mb-2 tracking-widest ${isLight ? "text-rose-700" : "text-pink-700 dark:text-pink-400"}`}>
              Identité Numérique
            </p>
            <input
              value={newHandle}
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder="votre_pseudo_unique"
              className={`w-full rounded-xl px-4 py-2 cmm-text-small font-bold focus:ring-4 outline-none ${isLight ? "bg-white border border-rose-200 text-slate-900 focus:ring-rose-500/10" : "bg-white dark:bg-slate-900 border border-pink-200 dark:border-pink-800 focus:ring-pink-500/10"}`}
            />
          </div>
          <button
            onClick={() => void onConfirmHandle()}
            className={`mt-6 px-6 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all ${isLight ? "bg-rose-500 shadow-rose-500/20" : "bg-pink-600 shadow-pink-500/20"}`}
          >
            Confirmer
          </button>
        </div>
      ) : null}
    </>
  );
});
