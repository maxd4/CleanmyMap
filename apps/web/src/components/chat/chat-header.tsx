"use client";

import { Sparkles, type LucideIcon, MessageSquare, Share2, User } from "lucide-react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatUser } from "./chat-types";

type ChatHeaderProps = {
  activeChannelType: ChatChannelType;
  activeChannelLabel: string;
  activeChannelDescription: string;
  activeChannelIcon: LucideIcon;
  activeChannelAccentClass: string;
  viewMode: "messages" | "graph";
  isBugReportChannel: boolean;
  selectedRecipient: ChatUser | null;
  isEditingHandle: boolean;
  newHandle: string;
  onViewModeChange: (viewMode: "messages" | "graph") => void;
  onToggleHandleEditor: () => void;
  onHandleChange: (value: string) => void;
  onConfirmHandle: () => Promise<void>;
};

export function ChatHeader({
  activeChannelType,
  activeChannelLabel,
  activeChannelDescription,
  activeChannelIcon: ActiveChannelIcon,
  activeChannelAccentClass,
  viewMode,
  isBugReportChannel,
  selectedRecipient,
  isEditingHandle,
  newHandle,
  onViewModeChange,
  onToggleHandleEditor,
  onHandleChange,
  onConfirmHandle,
}: ChatHeaderProps) {
  return (
    <>
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl relative z-30">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-900 shadow-inner ${activeChannelAccentClass}`}>
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
              <Sparkles size={10} className={activeChannelAccentClass} />
              {activeChannelDescription}
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
              onClick={() => onViewModeChange("messages")}
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
              onClick={() => onViewModeChange("graph")}
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
            onClick={onToggleHandleEditor}
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
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder="votre_pseudo_unique"
              className="w-full bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-2 cmm-text-small font-bold focus:ring-4 focus:ring-violet-500/10 outline-none"
            />
          </div>
          <button
            onClick={() => void onConfirmHandle()}
            className="mt-6 px-6 py-2 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
          >
            Confirmer
          </button>
        </div>
      ) : null}
    </>
  );
}
