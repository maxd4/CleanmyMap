"use client";
import { BarChart3, Calendar, MapPin, Megaphone, Paperclip, Plus, Search, Send, Trash2, X } from "lucide-react";
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
import {
  COMMUNITY_ANNOUNCEMENT_TEMPLATES,
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import {
  CHAT_POLL_MAX_OPTIONS,
  getChatPollOptionsValidationError,
} from "@/lib/chat/polls";

const MAX_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024;

type ChatComposerProps = {
  activeChannelType: ChatChannelType;
  composerPlaceholder: string;
  tone?: "light" | "dark";
  composerMode?: "message" | "announcement" | "poll";
  onComposerModeChange?: (mode: "message" | "announcement" | "poll") => void;
  announcementTemplate?: CommunityAnnouncementTemplateKey | null;
  onAnnouncementTemplateChange?: (template: CommunityAnnouncementTemplateKey) => void;
  relatedEvent?: ChatRelatedEvent | null;
  announcementEventRequested?: boolean;
  announcementEventLoading?: boolean;
  announcementEventError?: Error | null;
  pollOptions?: string[];
  onPollOptionsChange?: (options: string[]) => void;
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
  announcementTemplate = null,
  onAnnouncementTemplateChange,
  relatedEvent = null,
  announcementEventRequested = false,
  announcementEventLoading = false,
  announcementEventError = null,
  pollOptions = ["", ""],
  onPollOptionsChange,
  showModeTabs = false,
}: ChatComposerProps) {
  const isLight = tone === "light";
  const placeholder =
    composerMode === "announcement"
      ? "Décrivez l'annonce ou le relais à diffuser..."
      : composerMode === "poll"
        ? "Formulez votre sondage ou votre question..."
        : composerPlaceholder;
  const pollOptionsError = getChatPollOptionsValidationError(pollOptions);
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

  const formatEventDate = (value: string) => {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? value
      : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
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

      {composerMode !== "poll" && file ? (
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

      {showModeTabs && composerMode === "poll" ? (
        <div className={`mb-4 rounded-2xl border p-3 ${isLight ? "border-rose-100 bg-white/80" : "border-white/10 bg-white/5"}`}>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={15} className={isLight ? "text-rose-500" : "text-rose-300"} />
            <div>
              <p className={`text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                Question du sondage
              </p>
              <p className="text-[10px] text-slate-500">
                Les votes seront ajoutés dans un lot ultérieur.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {pollOptions.map((option, index) => (
              <div key={`poll-option-${index}`} className="flex items-center gap-2">
                <span className="w-5 text-center text-xs font-black text-slate-400">{index + 1}</span>
                <input
                  value={option}
                  onChange={(event) => {
                    const nextOptions = [...pollOptions];
                    nextOptions[index] = event.target.value;
                    onPollOptionsChange?.(nextOptions);
                  }}
                  maxLength={200}
                  aria-label={`Option ${index + 1}`}
                  placeholder={`Option ${index + 1}`}
                  className={`min-w-0 flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${isLight ? "border-rose-100 bg-white text-slate-900 focus:border-rose-300" : "border-white/10 bg-white/5 text-white focus:border-pink-400/50"}`}
                />
                <button
                  type="button"
                  onClick={() => onPollOptionsChange?.(pollOptions.filter((_, optionIndex) => optionIndex !== index))}
                  disabled={pollOptions.length <= 2}
                  aria-label={`Supprimer l'option ${index + 1}`}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onPollOptionsChange?.([...pollOptions, ""])}
              disabled={pollOptions.length >= CHAT_POLL_MAX_OPTIONS}
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-40 ${isLight ? "border-rose-100 text-rose-700 hover:bg-rose-50" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
            >
              <Plus size={13} /> Ajouter une option
            </button>
            <span className="text-[10px] font-bold text-slate-400">{pollOptions.length}/{CHAT_POLL_MAX_OPTIONS}</span>
          </div>
          {pollOptionsError ? (
            <p className="mt-3 text-[10px] font-bold text-amber-600">{pollOptionsError}</p>
          ) : null}
        </div>
      ) : null}

      {showModeTabs && composerMode === "announcement" ? (
        <div className={`mb-4 rounded-2xl border p-3 ${isLight ? "border-rose-100 bg-white/80" : "border-white/10 bg-white/5"}`}>
          <div className="mb-3 flex items-center gap-2">
            <Megaphone size={15} className={isLight ? "text-rose-500" : "text-rose-300"} />
            <div>
              <p className={`text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                Choisissez un modèle de relais
              </p>
              <p className="text-[10px] text-slate-500">
                Le modèle prépare un brouillon éditable et son salon canonique.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {COMMUNITY_ANNOUNCEMENT_TEMPLATES.map((template) => {
              const isActive = announcementTemplate === template.key;
              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => onAnnouncementTemplateChange?.(template.key)}
                  aria-pressed={isActive}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    isActive
                      ? isLight
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-rose-400/50 bg-rose-500/15 text-rose-200"
                      : isLight
                        ? "border-rose-100 bg-white text-slate-600 hover:bg-rose-50"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <span className="block text-[10px] font-black uppercase tracking-wider">
                    {template.label}
                  </span>
                  <span className="mt-1 block text-[10px] leading-tight text-slate-500">
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>
          {announcementTemplate ? null : (
            <p className="mt-3 text-[10px] font-bold text-amber-600">
              Sélectionnez un modèle avant de publier l&apos;annonce.
            </p>
          )}
          {announcementEventLoading ? (
            <p className="mt-3 text-[10px] font-bold text-slate-500">
              Chargement du cleanup associé…
            </p>
          ) : announcementEventError ? (
            <p className="mt-3 text-[10px] font-bold text-rose-600">
              Le cleanup associé n&apos;est plus disponible. L&apos;annonce ne peut pas être publiée avec ce lien.
            </p>
          ) : relatedEvent ? (
            <div className={`mt-3 rounded-xl border p-3 ${isLight ? "border-rose-100 bg-rose-50/60" : "border-rose-400/20 bg-rose-500/10"}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">
                Cleanup associé
              </p>
              <p className={`mt-1 text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                {relatedEvent.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {formatEventDate(relatedEvent.event_date)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {relatedEvent.location_label}
                </span>
              </div>
            </div>
          ) : announcementEventRequested ? (
            <p className="mt-3 text-[10px] font-bold text-rose-600">
              Le cleanup indiqué dans le lien est introuvable ou inaccessible.
            </p>
          ) : null}
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
          disabled={composerMode === "poll" || !userId || isSending || isUploading}
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
          aria-label={composerMode === "poll" ? "Publier le sondage" : "Envoyer le message"}
          className={`w-12 h-12 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale flex items-center justify-center ${isLight ? "bg-rose-500 shadow-rose-500/20" : "bg-violet-600 shadow-violet-600/30"}`}
        >
          <Send size={20} />
        </button>
      </div>
    </form>
  );
});
