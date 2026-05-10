"use client";

import Image from "next/image";
import { Paperclip, Search, Send, X } from "lucide-react";
import { memo } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import {
  CHAT_ATTACHMENT_ACCEPT,
  isSupportedChatAttachmentFile,
} from "@/lib/chat/chat-attachments";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { ChatUser } from "./chat-types";

const MAX_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024;

type ChatComposerProps = {
  activeChannelType: ChatChannelType;
  composerPlaceholder: string;
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
}: ChatComposerProps) {
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
      className="p-6 border-t border-white/5 bg-white/5 backdrop-blur-xl"
    >
      {sendError ? (
        <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400 animate-in fade-in zoom-in-95">
          {sendError}
        </div>
      ) : null}

      {activeChannelType === "dm" ? (
        <div className="mb-4 rounded-3xl border border-white/5 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Destinataire
              </p>
              <p className="text-xs text-slate-500">
                Sélectionnez le membre avec qui ouvrir la conversation.
              </p>
            </div>
            {selectedRecipient ? (
              <button
                type="button"
                onClick={onClearRecipient}
                className="rounded-full border border-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5"
              >
                Changer
              </button>
            ) : null}
          </div>

          {selectedRecipient ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 px-3 py-3">
              <div className="h-10 w-10 overflow-hidden rounded-2xl bg-white/10">
                {selectedRecipient.avatar_url ? (
                  <Image
                    src={selectedRecipient.avatar_url}
                    alt={selectedRecipient.display_name}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {selectedRecipient.display_name}
                </p>
                <p className="truncate text-xs text-slate-400">
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
                    onRecipientQueryChange(e.target.value);
                    onRecipientPickerOpenChange(true);
                  }}
                  onFocus={() => onRecipientPickerOpenChange(true)}
                  placeholder="Rechercher un membre"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-10 py-3 text-sm font-medium text-white outline-none transition focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              {isRecipientPickerOpen ? (
                <div className="max-h-52 overflow-auto rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                  {dmSuggestions.length > 0 ? (
                    dmSuggestions.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => onSelectRecipient(candidate)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
                      >
                        <div className="h-9 w-9 overflow-hidden rounded-xl bg-white/10">
                          {candidate.avatar_url ? (
                            <Image
                              src={candidate.avatar_url}
                              alt={candidate.display_name}
                              width={36}
                              height={36}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-white">
                            {candidate.display_name}
                          </p>
                          <p className="truncate text-xs text-slate-400">
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
        <div className="mb-3 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
          {mentionSuggestions.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onInsertMention(candidate.handle)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"
            >
              <div className="h-9 w-9 overflow-hidden rounded-xl bg-white/10">
                {candidate.avatar_url ? (
                  <Image
                    src={candidate.avatar_url}
                    alt={candidate.display_name}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {candidate.display_name}
                </p>
                <p className="truncate text-xs text-slate-400">
                  @{candidate.handle}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {file ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-xs">
          <div className="min-w-0">
            <p className="font-black uppercase tracking-widest text-violet-400">
              Pièce jointe
            </p>
            <p className="truncate font-medium text-slate-200">
              {file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-black uppercase tracking-widest text-slate-300 transition hover:bg-white/10"
          >
            <X size={12} />
            Retirer
          </button>
        </div>
      ) : null}

      <div className="relative flex items-end gap-3 bg-white/5 rounded-3xl p-3 border border-white/5 focus-within:border-violet-500/30 focus-within:bg-white/10 transition-all duration-300 shadow-inner">
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
          className="p-3 text-slate-400 hover:text-violet-400 hover:bg-white/5 rounded-2xl transition-all disabled:opacity-30"
        >
          <Paperclip size={20} />
        </button>
        <textarea
          rows={1}
          value={message}
          onChange={onMessageChange}
          onKeyDown={handleComposerKeyDown}
          disabled={!userId || isSending || isUploading}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-1 max-h-40 resize-none text-white placeholder:text-slate-500"
          placeholder={userId ? composerPlaceholder : "Connectez-vous pour participer"}
        />
        <button
          disabled={!canSubmit}
          type="submit"
          aria-label="Envoyer le message"
          className="w-12 h-12 bg-violet-600 text-white rounded-2xl shadow-xl shadow-violet-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center"
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
});
