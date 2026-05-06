"use client";

import Image from "next/image";
import { Paperclip, Search, Send, X } from "lucide-react";
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { ChatUser } from "./chat-types";

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

export function ChatComposer({
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
    if (selectedFile && selectedFile.size > 2 * 1024 * 1024) {
      notifyNetworkToast({
        title: "Pièce jointe trop volumineuse",
        message: "Ce fichier dépasse 2 Mo. Choisis une pièce jointe plus légère.",
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
      className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md"
    >
      {sendError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 px-4 py-3 text-xs font-bold text-rose-700 dark:text-rose-400 animate-in fade-in zoom-in-95">
          {sendError}
        </div>
      ) : null}

      {activeChannelType === "dm" ? (
        <div className="mb-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Destinataire
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sélectionnez le membre avec qui ouvrir la conversation.
              </p>
            </div>
            {selectedRecipient ? (
              <button
                type="button"
                onClick={onClearRecipient}
                className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Changer
              </button>
            ) : null}
          </div>

          {selectedRecipient ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-3 py-3 dark:border-violet-900/40 dark:bg-slate-950/80">
              <div className="h-10 w-10 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
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
                <p className="truncate text-sm font-black cmm-text-primary">
                  {selectedRecipient.display_name}
                </p>
                <p className="truncate text-xs cmm-text-muted">
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
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-3 text-sm font-medium outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-violet-500"
                />
              </div>

              {isRecipientPickerOpen ? (
                <div className="max-h-52 overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                  {dmSuggestions.length > 0 ? (
                    dmSuggestions.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => onSelectRecipient(candidate)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="h-9 w-9 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
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
                          <p className="truncate text-sm font-bold cmm-text-primary">
                            {candidate.display_name}
                          </p>
                          <p className="truncate text-xs cmm-text-muted">
                            @{candidate.handle}
                          </p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-4 text-sm cmm-text-muted">
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
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {mentionSuggestions.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onInsertMention(candidate.handle)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              <div className="h-9 w-9 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
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
                <p className="truncate text-sm font-bold cmm-text-primary">
                  {candidate.display_name}
                </p>
                <p className="truncate text-xs cmm-text-muted">
                  @{candidate.handle}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : null}

      {file ? (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-xs dark:border-violet-900/40 dark:bg-violet-950/20">
          <div className="min-w-0">
            <p className="font-black uppercase tracking-widest text-violet-700 dark:text-violet-300">
              Pièce jointe
            </p>
            <p className="truncate font-medium text-violet-900/80 dark:text-violet-100/80">
              {file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-200 bg-white px-3 py-1 font-black uppercase tracking-widest text-violet-700 transition hover:bg-violet-100 dark:border-violet-900/40 dark:bg-slate-950 dark:text-violet-300 dark:hover:bg-violet-950/40"
          >
            <X size={12} />
            Retirer
          </button>
        </div>
      ) : null}

      <div className="relative flex items-end gap-3 bg-slate-50 dark:bg-slate-900/80 rounded-3xl p-3 border border-transparent focus-within:border-violet-500/30 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all duration-300 shadow-inner">
        <input
          type="file"
          ref={fileInputRef}
          hidden
          onChange={handleFileSelection}
        />
        <button
          type="button"
          disabled={!userId || isSending || isUploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Joindre un fichier"
          className="p-3 text-slate-400 hover:text-violet-500 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all disabled:opacity-30"
        >
          <Paperclip size={20} />
        </button>
        <textarea
          rows={1}
          value={message}
          onChange={onMessageChange}
          onKeyDown={handleComposerKeyDown}
          disabled={!userId || isSending || isUploading}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-1 max-h-40 resize-none placeholder:text-slate-400"
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
}
