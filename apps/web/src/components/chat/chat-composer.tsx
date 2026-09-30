"use client";

import { memo, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, RefObject } from "react";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatUser } from "./chat-types";
import type { ChatRelatedEvent, CommunityAnnouncementTemplateKey } from "@/lib/chat/announcements";
import { ChatComposerModePanels } from "./chat-composer-mode-panels";
import { ChatComposerAttachmentPreview, ChatComposerGuestHint, ChatComposerInputBar, ChatComposerMentions, handleChatComposerFileSelection } from "./chat-composer-input";

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

export function selectChatComposerMode(mode: ChatComposerMode, onComposerModeChange: ((mode: ChatComposerMode) => void) | undefined, closeTools: () => void): void {
  onComposerModeChange?.(mode);
  closeTools();
}

export { getCurrentChatShareLink } from "./ui/chat-share-link-action";

function getChatComposerViewState({
  tone,
  composerMode,
  composerPlaceholder,
  userId,
  isSending,
  isUploading,
  showModeTabs,
  composerModes,
}: {
  tone: "light" | "dark";
  composerMode: ChatComposerMode;
  composerPlaceholder: string;
  userId?: string;
  isSending: boolean;
  isUploading: boolean;
  showModeTabs: boolean;
  composerModes: readonly ChatComposerMode[];
}) {
  return {
    isLight: tone === "light",
    placeholder: composerMode === "announcement" ? "Décrivez l'annonce ou le relais à diffuser..." : composerMode === "poll" ? "Formulez votre sondage ou votre question..." : composerPlaceholder,
    canAttach: Boolean(userId) && composerMode !== "poll" && !isSending && !isUploading,
    canChooseAnnouncement: showModeTabs && composerModes.includes("announcement"),
    canChoosePoll: showModeTabs && composerModes.includes("poll"),
  };
}

function handleChatComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, canSubmit: boolean) {
  if (event.key !== "Enter" || event.shiftKey) return;
  event.preventDefault();
  if (canSubmit) event.currentTarget.form?.requestSubmit();
}

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
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const { isLight, placeholder, canAttach, canChooseAnnouncement, canChoosePoll } = getChatComposerViewState({ tone, composerMode, composerPlaceholder, userId, isSending, isUploading, showModeTabs, composerModes });
  const selectComposerMode = (mode: ChatComposerMode) => selectChatComposerMode(mode, onComposerModeChange, () => setIsToolsOpen(false));

  return <form onSubmit={onSubmit} className={`p-6 border-t backdrop-blur-xl ${isLight ? "border-rose-100/70 bg-white/80" : "border-white/5 bg-white/5"}`}>
    {sendError ? <div className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-400 animate-in fade-in zoom-in-95">{sendError}</div> : null}
    {showMentions ? <ChatComposerMentions isLight={isLight} mentionSuggestions={mentionSuggestions} onInsertMention={onInsertMention} /> : null}
    {composerMode !== "poll" && file ? <ChatComposerAttachmentPreview file={file} isLight={isLight} onRemove={() => onFileChange(null)} /> : null}
    <ChatComposerModePanels isLight={isLight} showModeTabs={showModeTabs} composerModes={composerModes} composerMode={composerMode} pollOptions={pollOptions} onPollOptionsChange={onPollOptionsChange} announcementTemplate={announcementTemplate} onAnnouncementTemplateChange={onAnnouncementTemplateChange} relatedEvent={relatedEvent} announcementEventRequested={announcementEventRequested} announcementEventLoading={announcementEventLoading} announcementEventError={announcementEventError} />
    <ChatComposerInputBar activeChannelType={activeChannelType} canAttach={canAttach} canChooseAnnouncement={canChooseAnnouncement} canChoosePoll={canChoosePoll} composerMode={composerMode} fileInputRef={fileInputRef} isLight={isLight} isSending={isSending} isToolsOpen={isToolsOpen} isUploading={isUploading} message={message} onFileSelection={(event) => handleChatComposerFileSelection({ event, onFileChange, fileInputRef })} onInsertLink={onInsertLink} onKeyDown={(event) => handleChatComposerKeyDown(event, canSubmit)} onMessageChange={onMessageChange} onOpenFileInput={() => { setIsToolsOpen(false); fileInputRef.current?.click(); }} onSelectMode={selectComposerMode} onToggleTools={() => setIsToolsOpen(toggleChatComposerTools)} placeholder={placeholder} selectedRecipient={selectedRecipient} userId={userId} canSubmit={canSubmit} />
    {!userId ? <ChatComposerGuestHint isLight={isLight} activeChannelType={activeChannelType} /> : null}
  </form>;
});
