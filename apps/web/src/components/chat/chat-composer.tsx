"use client";
import { Paperclip, Search, Send, X } from "lucide-react";
import { memo } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import {
  CHAT_ATTACHMENT_ACCEPT,
  isSupportedChatAttachmentFile,
} from "@/lib/chat/chat-attachments";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { ChatAvatar } from "./chat-avatar";
import type { ChatUser } from "./chat-types";

const MAX_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024;

type ChatComposerProps = {
  activeChannelType: ChatChannelType;
  composerPlaceholder: string;
  tone?: "light" | "dark";
  composerMode?: "message" | "announcement" | "poll";
  onComposerModeChange?: (mode: "message" | "announcement" | "poll") => void;
  showModeTabs?: boolean;
  userId?: string;
  message: string;
  onMessageChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSending: boolean;
  isUploading: boolean;
  sendError: string | null;
  selectedRecipient: ChatUser | null;
  recipientQuery: string;
  onRecipientQueryChange: (value: string) => void;
  isRecipientPickerOpen: boolean;
  onRecipientPickerOpenChange: (isOpen: boolean) => void;
  dmSuggestions: ChatUser[];
  showMentions: boolean;
  mentionSuggestions: ChatUser[];
  onInsertMention: (handle: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onSelectRecipient: (recipient: ChatUser) => void;
  onClearRecipient: () => void;
  canSubmit: boolean;
};

export const ChatComposer = memo(function ChatComposer({
  activeChannelType,
  composerPlaceholder,
  userId,
  message,
  onMessageChange,
  file,
  onFileChange,
  fileInputRef,
  isSending,
  isUploading,
  sendError,
  selectedRecipient,
  recipientQuery,
  onRecipientQueryChange,
  isRecipientPickerOpen,
  onRecipientPickerOpenChange,
  dmSuggestions,
  showMentions,
  mentionSuggestions,
  onInsertMention,
  onSubmit,
  onSelectRecipient,
  onClearRecipient,
  canSubmit,
  tone = "dark",
  composerMode = "message",
  onComposerModeChange,
  showModeTabs = false,
}: ChatComposerProps) {
  const isLight = tone === "light";
  const placeholder =
    composerMode === "announcement"
      ? "Décrivez l'annonce ou le relais à diffuser..."
      : composerMode === "poll"
        ? "Formulez votre sondage ou votre question..."
        : composerPlaceholder;
  const handleFileSelection = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && !isSupportedChatAttachmentFile(selectedFile)) {
      onFileChange(null);
      notifyNetworkToast({
        title: "Format de fichier non pris en charge",
        message:
          "Ce type de fichier n'est pas autorisé ici. Utilise une image, un PDF ou un document courant.",
      });
      e.target.value = "";
      return;
    }
    if (selectedFile && selectedFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
      onFileChange(null);
      notifyNetworkToast({
        title: "Pièce jointe trop volumineuse",
        message: "Ce fichier dépasse 8 Mo. Choisis une pièce jointe plus légère.",
        retryLabel: "Choisir un autre fichier",
        onRetry: () => fileInputRef.current?.click(),
      });
      e.target.value = "";
      return;
    }
    onFileChange(selectedFile || null);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    event.currentTarget.form?.requestSubmit();
  };

  return (
    <form
      onSubmit={onSubmit}
      className={`p-6 border-t backdrop-blur-xl ${isLight ? "border-rose-100/70 bg-white/80" : "border-white/5 bg-white/5"}`}
    >
      {sendError ? (
        <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400 animate-in fade-in zoom-in-95">
          {sendError}
        </div>
      ) : null}

      {activeChannelType === "dm" ? (
        <div className={`mb-4 rounded-3xl border p-4 ${isLight ? "border-rose-100/70 bg-white/85" : "border-white/5 bg-white/5"}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Destinataire
              </p>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                Sélectionnez le membre avec qui ouvrir la conversation.
              </p>
            </div>
            {selectedRecipient ? (
              <button
                type="button"
                onClick={onClearRecipient}
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${isLight ? "border-rose-200 text-rose-700 hover:bg-rose-50" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
              >
                Changer
              </button>
            ) : null}
          </div>

          {selectedRecipient ? (
            <div className={`mt-3 flex items-center gap-3 rounded-2xl border px-3 py-3 ${isLight ? "border-rose-100 bg-white" : "border-violet-500/20 bg-violet-500/5"}`}>
              <ChatAvatar
                src={selectedRecipient.avatar_url}
                name={selectedRecipient.display_name}
                tone={isLight ? "light" : "dark"}
                className={isLight ? "bg-rose-50 text-rose-700" : "bg-white/10 text-white"}
              />
              <div className="min-w-0">
                <p className={`truncate text-sm font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                  {selectedRecipient.display_name}
                </p>
                <p className={`truncate text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  @{selectedRecipient.handle}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="relative">
                <Search
                  size={16}
                  className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? "text-slate-400" : "text-slate-400"}`}
                />
                <input
                  value={recipientQuery}
                  onChange={(e) => {
                    onRecipientQueryChange(e.target.value);
                    onRecipientPickerOpenChange(true);
                  }}
                  onFocus={() => onRecipientPickerOpenChange(true)}
                  placeholder="Rechercher un membre"
                  className={`w-full rounded-2xl border px-10 py-3 text-sm font-medium outline-none transition ${isLight ? "border-rose-100 bg-white text-slate-900 focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10" : "border-white/10 bg-white/5 text-white focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"}`}
                />
              </div>

              {isRecipientPickerOpen ? (
                <div className={`max-h-52 overflow-auto rounded-2xl border p-2 shadow-2xl ${isLight ? "border-rose-100 bg-white" : "border-white/10 bg-slate-900"}`}>
                  {dmSuggestions.length > 0 ? (
                    dmSuggestions.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => onSelectRecipient(candidate)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
                      >
                        <ChatAvatar
                          src={candidate.avatar_url}
                          name={candidate.display_name}
                          size="sm"
                          tone={isLight ? "light" : "dark"}
                          className={isLight ? "bg-rose-50 text-rose-700" : "bg-white/10 text-white"}
                        />
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                            {candidate.display_name}
                          </p>
                          <p className={`truncate text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                            @{candidate.handle}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm text-slate-500">
                      Aucun membre trouvé.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {showMentions && mentionSuggestions.length > 0 ? (
        <div className={`mb-3 rounded-2xl border p-2 shadow-2xl ${isLight ? "border-rose-100 bg-white" : "border-white/10 bg-slate-900"}`}>
          {mentionSuggestions.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onInsertMention(candidate.handle)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
            >
              <ChatAvatar
                src={candidate.avatar_url}
                name={candidate.display_name}
                size="sm"
                tone={isLight ? "light" : "dark"}
                className={isLight ? "bg-rose-50 text-rose-700" : "bg-white/10 text-white"}
              />
              <div className="min-w-0">
                <p className={`truncate text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  {candidate.display_name}
                </p>
                <p className={`truncate text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  @{candidate.handle}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {file ? (
        <div className={`mb-3 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${isLight ? "border-rose-100 bg-white" : "border-violet-500/20 bg-violet-500/10"}`}>
          <div className="min-w-0">
            <p className={`font-black uppercase tracking-widest ${isLight ? "text-rose-600" : "text-violet-400"}`}>
              Pièce jointe
            </p>
            <p className={`truncate font-medium ${isLight ? "text-slate-700" : "text-slate-200"}`}>
              {file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 font-black uppercase tracking-widest transition ${isLight ? "border-rose-100 bg-white text-slate-600 hover:bg-rose-50" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
          >
            <X size={12} />
            Retirer
          </button>
        </div>
      ) : null}

      {showModeTabs ? (
        <div className={`mb-3 inline-flex rounded-2xl border p-1 ${isLight ? "border-rose-100 bg-white/85" : "border-white/5 bg-white/5"}`}>
          {[
            { id: "message", label: "Message" },
            { id: "announcement", label: "Annonce / Relai" },
            { id: "poll", label: "Sondage" },
          ].map((tab) => {
            const isActive = composerMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onComposerModeChange?.(tab.id as "message" | "announcement" | "poll")}
                className={`rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition ${isActive ? (isLight ? "bg-rose-500 text-white" : "bg-pink-500 text-white") : (isLight ? "text-slate-500 hover:bg-rose-50" : "text-slate-400 hover:bg-white/5")}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className={`relative flex items-end gap-3 rounded-3xl p-3 border transition-all duration-300 shadow-inner ${isLight ? "border-rose-100 bg-white/90 focus-within:border-rose-300 focus-within:bg-white" : "border-white/5 bg-white/5 focus-within:border-violet-500/30 focus-within:bg-white/10"}`}>
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept={CHAT_ATTACHMENT_ACCEPT}
          onChange={handleFileSelection}
        />
        <button
          type="button"
          disabled={!userId || isSending || isUploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Joindre un fichier"
          className={`p-3 rounded-2xl transition-all disabled:opacity-30 ${isLight ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50" : "text-slate-400 hover:text-violet-400 hover:bg-white/5"}`}
        >
          <Paperclip size={20} />
        </button>
        <textarea
          rows={1}
          value={message}
          onChange={onMessageChange}
          onKeyDown={handleComposerKeyDown}
          disabled={!userId || isSending || isUploading}
          className={`flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-1 max-h-40 resize-none ${isLight ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-slate-500"}`}
          placeholder={userId ? placeholder : "Connectez-vous pour participer"}
        />
        <button
          disabled={!canSubmit}
          type="submit"
          aria-label="Envoyer le message"
          className={`w-12 h-12 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center ${isLight ? "bg-rose-500 shadow-rose-500/20" : "bg-violet-600 shadow-violet-600/30"}`}
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
});
