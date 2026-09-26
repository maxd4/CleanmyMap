"use client";
import Link from "next/link";
import { BarChart3, Calendar, MapPin, Megaphone, Paperclip, Plus, Send, Trash2, X } from "lucide-react";
import { memo, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";

import type { ChatChannelType } from "@/lib/chat/channels";
import { CHAT_ATTACHMENT_ACCEPT, isSupportedChatAttachmentFile } from "@/lib/chat/chat-attachments";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { ChatAvatar } from "./chat-avatar";
import type { ChatUser } from "./chat-types";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  COMMUNITY_ANNOUNCEMENT_TEMPLATES,
  type ChatRelatedEvent,
  type CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import {
  CHAT_POLL_MAX_OPTIONS,
  getChatPollOptionsValidationError,
} from "@/lib/chat/polls";
import { ChatShareLinkAction } from "./ui/chat-share-link-action";

const MAX_ATTACHMENT_SIZE_BYTES = 8 * 1024 * 1024;
type ChatComposerMode = "message" | "announcement" | "poll";

type ChatComposerProps = {
  activeChannelType: ChatChannelType;
  composerPlaceholder: string;
  tone?: "light" | "dark";
  composerMode?: ChatComposerMode;
  onComposerModeChange?: (mode: ChatComposerMode) => void;
  announcementTemplate?: CommunityAnnouncementTemplateKey | null;
  onAnnouncementTemplateChange?: (template: CommunityAnnouncementTemplateKey) => void;
  relatedEvent?: ChatRelatedEvent | null;
  announcementEventRequested?: boolean;
  announcementEventLoading?: boolean;
  announcementEventError?: Error | null;
  pollOptions?: string[];
  onPollOptionsChange?: (options: string[]) => void;
  showModeTabs?: boolean;
  composerModes?: readonly ChatComposerMode[];
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
  showMentions: boolean;
  mentionSuggestions: ChatUser[];
  onInsertMention: (handle: string) => void;
  onInsertLink?: (url: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  canSubmit: boolean;
};

export function toggleChatComposerTools(isOpen: boolean): boolean {
  return !isOpen;
}

export function selectChatComposerMode(
  mode: ChatComposerMode,
  onComposerModeChange: ((mode: ChatComposerMode) => void) | undefined,
  closeTools: () => void,
): void {
  onComposerModeChange?.(mode);
  closeTools();
}

export { getCurrentChatShareLink } from "./ui/chat-share-link-action";

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
  showMentions,
  mentionSuggestions,
  onInsertMention,
  onInsertLink,
  onSubmit,
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
  composerModes = ["message", "announcement", "poll"],
}: ChatComposerProps) {
  const isLight = tone === "light";
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const placeholder =
    composerMode === "announcement"
      ? "Décrivez l'annonce ou le relais à diffuser..."
      : composerMode === "poll"
        ? "Formulez votre sondage ou votre question..."
        : composerPlaceholder;
  const pollOptionsError = getChatPollOptionsValidationError(pollOptions);
  const canAttach = Boolean(userId) && composerMode !== "poll" && !isSending && !isUploading;
  const canChooseAnnouncement = showModeTabs && composerModes.includes("announcement");
  const canChoosePoll = showModeTabs && composerModes.includes("poll");
  const selectComposerMode = (mode: ChatComposerMode) => {
    selectChatComposerMode(mode, onComposerModeChange, () => setIsToolsOpen(false));
  };
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
                <p className={`break-words text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  {candidate.display_name}
                </p>
                <p className={`cmm-text-caption break-words ${isLight ? "text-slate-500" : "text-slate-400"}`}>
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
            <p className={`font-semibold ${isLight ? "text-rose-600" : "text-violet-400"}`}>
              Pièce jointe
            </p>
            <p className={`break-words cmm-text-small font-medium ${isLight ? "text-slate-700" : "text-slate-200"}`}>
              {file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${isLight ? "border-rose-100 bg-white text-slate-600 hover:bg-rose-50" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
          >
            <X size={12} />
            Retirer
          </button>
        </div>
      ) : null}

      {showModeTabs && composerModes.includes("poll") && composerMode === "poll" ? (
        <div className={`mb-4 rounded-2xl border p-3 ${isLight ? "border-rose-100 bg-white/80" : "border-white/10 bg-white/5"}`}>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 size={15} className={isLight ? "text-rose-500" : "text-rose-300"} />
            <div>
              <p className={`text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                Question du sondage
              </p>
              <p className="cmm-text-caption text-slate-500">
                Les votes sont enregistrés et affichés sous forme agrégée.
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
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 cmm-text-caption font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-40 ${isLight ? "border-rose-100 text-rose-700 hover:bg-rose-50" : "border-white/10 text-slate-300 hover:bg-white/5"}`}
            >
              <Plus size={13} /> Ajouter une option
            </button>
            <span className="cmm-text-caption font-bold text-slate-400">{pollOptions.length}/{CHAT_POLL_MAX_OPTIONS}</span>
          </div>
          {pollOptionsError ? (
            <p className="mt-3 cmm-text-caption font-bold text-amber-600">{pollOptionsError}</p>
          ) : null}
        </div>
      ) : null}

      {showModeTabs && composerModes.includes("announcement") && composerMode === "announcement" ? (
        <div className={`mb-4 rounded-2xl border p-3 ${isLight ? "border-rose-100 bg-white/80" : "border-white/10 bg-white/5"}`}>
          <div className="mb-3 flex items-center gap-2">
            <Megaphone size={15} className={isLight ? "text-rose-500" : "text-rose-300"} />
            <div>
              <p className={`text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                Choisissez un modèle de relais
              </p>
              <p className="cmm-text-caption text-slate-500">
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
                  <span className="block cmm-text-caption font-semibold">
                    {template.label}
                  </span>
                  <span className="mt-1 block cmm-text-caption leading-tight text-slate-500">
                    {template.description}
                  </span>
                </button>
              );
            })}
          </div>
          {announcementTemplate ? null : (
            <p className="mt-3 cmm-text-caption font-bold text-amber-600">
              Sélectionnez un modèle avant de publier l&apos;annonce.
            </p>
          )}
          {announcementEventLoading ? (
            <p className="mt-3 cmm-text-caption font-bold text-slate-500">
              Chargement du cleanup associé…
            </p>
          ) : announcementEventError ? (
            <p className="mt-3 cmm-text-caption font-bold text-rose-600">
              Le cleanup associé n&apos;est plus disponible. L&apos;annonce ne peut pas être publiée avec ce lien.
            </p>
          ) : relatedEvent ? (
            <div className={`mt-3 rounded-xl border p-3 ${isLight ? "border-rose-100 bg-rose-50/60" : "border-rose-400/20 bg-rose-500/10"}`}>
              <p className="cmm-text-caption font-semibold text-rose-500">
                Cleanup associé
              </p>
              <p className={`mt-1 text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                {relatedEvent.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 cmm-text-caption font-bold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {formatEventDate(relatedEvent.event_date)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {relatedEvent.location_label}
                </span>
              </div>
            </div>
          ) : announcementEventRequested ? (
            <p className="mt-3 cmm-text-caption font-bold text-rose-600">
              Le cleanup indiqué dans le lien est introuvable ou inaccessible.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`relative flex items-end gap-3 rounded-3xl p-3 border transition-[border-color,background-color,box-shadow] duration-300 shadow-inner ${isLight ? "border-rose-100 bg-white/90 focus-within:border-rose-300 focus-within:bg-white" : "border-white/5 bg-white/5 focus-within:border-violet-500/30 focus-within:bg-white/10"}`}>
        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept={CHAT_ATTACHMENT_ACCEPT}
          onChange={handleFileSelection}
        />
        <button
          type="button"
          aria-label="Options d’écriture"
          aria-expanded={isToolsOpen}
          aria-controls="chat-composer-options"
          onClick={() => setIsToolsOpen(toggleChatComposerTools)}
          className={`p-3 rounded-2xl transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${isLight ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50" : "text-slate-400 hover:text-violet-400 hover:bg-white/5"}`}
        >
          <Plus size={20} aria-hidden="true" />
        </button>
        <textarea
          rows={1}
          value={message}
          onChange={onMessageChange}
          onKeyDown={handleComposerKeyDown}
          disabled={!userId || isSending || isUploading || (activeChannelType === "dm" && !selectedRecipient)}
          className={`flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-1 max-h-40 resize-none ${isLight ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-slate-500"}`}
          placeholder={!userId
            ? activeChannelType === "dm"
              ? "Connectez-vous pour envoyer un message"
              : "Connectez-vous pour participer à la discussion"
            : activeChannelType === "dm" && !selectedRecipient
              ? "Sélectionnez une conversation"
              : placeholder}
        />
        <CmmButton
          disabled={!canSubmit}
          type="submit"
          aria-label={composerMode === "poll" ? "Publier le sondage" : "Envoyer le message"}
          tone={isLight ? "primary" : "important"}
          className={`w-12 h-12 text-white rounded-2xl shadow-xl disabled:opacity-30 disabled:grayscale ${isLight ? "bg-rose-500 shadow-rose-500/20" : "bg-violet-600 shadow-violet-600/30"}`}
        >
          <Send size={20} />
        </CmmButton>
        {isToolsOpen ? (
          <div
            id="chat-composer-options"
            role="group"
            aria-label="Options d’écriture"
            className={`absolute bottom-full left-0 mb-2 min-w-56 rounded-2xl border p-2 shadow-xl ${isLight ? "border-rose-100 bg-white" : "border-white/10 bg-slate-900"}`}
          >
            {composerMode !== "message" ? (
              <button
                type="button"
                onClick={() => selectComposerMode("message")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left cmm-text-small font-semibold ${isLight ? "text-slate-700 hover:bg-rose-50" : "text-slate-200 hover:bg-white/5"}`}
              >
                Écrire un message
              </button>
            ) : null}
            {userId ? (
              <button
                type="button"
                disabled={!canAttach}
                onClick={() => {
                  setIsToolsOpen(false);
                  fileInputRef.current?.click();
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left cmm-text-small font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${isLight ? "text-slate-700 hover:bg-rose-50" : "text-slate-200 hover:bg-white/5"}`}
              >
                <Paperclip size={16} aria-hidden="true" /> Pièce jointe
              </button>
            ) : null}
            <ChatShareLinkAction
              isLight={isLight}
              onClose={() => setIsToolsOpen(false)}
              onInsertLink={onInsertLink}
            />
            {canChooseAnnouncement ? (
              <button
                type="button"
                onClick={() => selectComposerMode("announcement")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left cmm-text-small font-semibold ${isLight ? "text-slate-700 hover:bg-rose-50" : "text-slate-200 hover:bg-white/5"}`}
              >
                <Megaphone size={16} aria-hidden="true" /> Annonce / Relai
              </button>
            ) : null}
            {canChoosePoll ? (
              <button
                type="button"
                onClick={() => selectComposerMode("poll")}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left cmm-text-small font-semibold ${isLight ? "text-slate-700 hover:bg-rose-50" : "text-slate-200 hover:bg-white/5"}`}
              >
                <BarChart3 size={16} aria-hidden="true" /> Sondage
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {!userId ? (
        <p className={`mt-2 px-1 text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          {activeChannelType === "dm"
            ? "Vous consultez vos messages en mode invité. "
            : "Vous consultez cette discussion en mode invité. "}
          <Link href="/sign-in" className={isLight ? "font-semibold text-rose-600 underline underline-offset-2" : "font-semibold text-pink-300 underline underline-offset-2"}>
            Connectez-vous
          </Link>{" "}
          {activeChannelType === "dm" ? "pour envoyer un message." : "pour participer à la discussion."}
        </p>
      ) : null}
    </form>
  );
});
