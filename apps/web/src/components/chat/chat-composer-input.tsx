"use client";

import Link from "next/link";
import { BarChart3, Megaphone, Paperclip, Plus, Send, X } from "lucide-react";
import type { ChangeEvent, KeyboardEvent, RefObject } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CHAT_ATTACHMENT_ACCEPT, getChatAttachmentSizeError, getChatAttachmentUnsupportedMessage, isChatImageFile, isSupportedChatAttachmentFile } from "@/lib/chat/chat-attachments";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { ChatAvatar } from "./chat-avatar";
import type { ChatUser } from "./chat-types";
import { ChatShareLinkAction } from "./ui/chat-share-link-action";

type ChatComposerMode = "message" | "announcement" | "poll";

export function handleChatComposerFileSelection({
  event,
  onFileChange,
  fileInputRef,
}: {
  event: ChangeEvent<HTMLInputElement>;
  onFileChange: (file: File | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}) {
  const selectedFile = event.target.files?.[0];
  if (selectedFile && !isSupportedChatAttachmentFile(selectedFile)) {
    onFileChange(null);
    notifyNetworkToast({ title: "Format de fichier non pris en charge", message: getChatAttachmentUnsupportedMessage(selectedFile) });
    event.target.value = "";
    return;
  }
  const sizeError = selectedFile && !isChatImageFile(selectedFile) ? getChatAttachmentSizeError(selectedFile) : null;
  if (sizeError) {
    onFileChange(null);
    notifyNetworkToast({ title: "Pièce jointe trop volumineuse", message: sizeError, retryLabel: "Choisir un autre fichier", onRetry: () => fileInputRef.current?.click() });
    event.target.value = "";
    return;
  }
  onFileChange(selectedFile || null);
}

export function ChatComposerMentions({
  isLight,
  mentionSuggestions,
  onInsertMention,
}: {
  isLight: boolean;
  mentionSuggestions: ChatUser[];
  onInsertMention: (handle: string) => void;
}) {
  if (mentionSuggestions.length === 0) return null;
  return <div className={`mb-3 rounded-2xl border p-2 shadow-2xl ${isLight ? "border-rose-100 bg-white" : "border-white/10 bg-slate-900"}`}>{mentionSuggestions.map((candidate) => <button key={candidate.id} type="button" onClick={() => onInsertMention(candidate.handle)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5"><ChatAvatar src={candidate.avatar_url} name={candidate.display_name} size="sm" tone={isLight ? "light" : "dark"} className={isLight ? "bg-rose-50 text-rose-700" : "bg-white/10 text-white"} /><div className="min-w-0"><p className={`break-words text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{candidate.display_name}</p><p className={`cmm-text-caption break-words ${isLight ? "text-slate-500" : "text-slate-400"}`}>@{candidate.handle}</p></div></button>)}</div>;
}

export function ChatComposerAttachmentPreview({
  file,
  isLight,
  onRemove,
}: {
  file: File;
  isLight: boolean;
  onRemove: () => void;
}) {
  return <div className={`mb-3 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${isLight ? "border-rose-100 bg-white" : "border-violet-500/20 bg-violet-500/10"}`}><div className="min-w-0"><p className={`font-semibold ${isLight ? "text-rose-600" : "text-violet-400"}`}>Pièce jointe</p><p className={`break-words cmm-text-small font-medium ${isLight ? "text-slate-700" : "text-slate-200"}`}>{file.name}</p></div><button type="button" onClick={onRemove} className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${isLight ? "border-rose-100 bg-white text-slate-600 hover:bg-rose-50" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}><X size={12} />Retirer</button></div>;
}

export function ChatComposerInputBar({
  activeChannelType,
  canAttach,
  canChooseAnnouncement,
  canChoosePoll,
  composerMode,
  fileInputRef,
  isLight,
  isSending,
  isToolsOpen,
  isUploading,
  message,
  onFileSelection,
  onInsertLink,
  onKeyDown,
  onMessageChange,
  onOpenFileInput,
  onSelectMode,
  onToggleTools,
  placeholder,
  selectedRecipient,
  userId,
  canSubmit,
}: {
  activeChannelType: string;
  canAttach: boolean;
  canChooseAnnouncement: boolean;
  canChoosePoll: boolean;
  composerMode: ChatComposerMode;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isLight: boolean;
  isSending: boolean;
  isToolsOpen: boolean;
  isUploading: boolean;
  message: string;
  onFileSelection: (event: ChangeEvent<HTMLInputElement>) => void;
  onInsertLink?: (url: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onMessageChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onOpenFileInput: () => void;
  onSelectMode: (mode: ChatComposerMode) => void;
  onToggleTools: () => void;
  placeholder: string;
  selectedRecipient: ChatUser | null;
  userId?: string;
  canSubmit: boolean;
}) {
  return <div className={`relative flex items-end gap-3 rounded-3xl p-3 border transition-[border-color,background-color,box-shadow] duration-300 shadow-inner ${isLight ? "border-rose-100 bg-white/90 focus-within:border-rose-300 focus-within:bg-white" : "border-white/5 bg-white/5 focus-within:border-violet-500/30 focus-within:bg-white/10"}`}>
    <input type="file" ref={fileInputRef} hidden accept={CHAT_ATTACHMENT_ACCEPT} onChange={onFileSelection} />
    <button type="button" aria-label="Options d’écriture" aria-expanded={isToolsOpen} aria-controls="chat-composer-options" onClick={onToggleTools} className={`p-3 rounded-2xl transition-[color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${isLight ? "text-slate-400 hover:text-rose-500 hover:bg-rose-50" : "text-slate-400 hover:text-violet-400 hover:bg-white/5"}`}><Plus size={20} aria-hidden="true" /></button>
    <textarea rows={1} value={message} onChange={onMessageChange} onKeyDown={onKeyDown} disabled={!userId || isSending || isUploading || (activeChannelType === "dm" && !selectedRecipient)} className={`flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium py-3 px-1 max-h-40 resize-none ${isLight ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-slate-500"}`} placeholder={!userId ? activeChannelType === "dm" ? "Connectez-vous pour envoyer un message" : "Connectez-vous pour participer à la discussion" : activeChannelType === "dm" && !selectedRecipient ? "Sélectionnez une conversation" : placeholder} />
    <CmmButton disabled={!canSubmit} type="submit" aria-label={composerMode === "poll" ? "Publier le sondage" : "Envoyer le message"} tone={isLight ? "primary" : "important"} className={`w-12 h-12 text-white rounded-2xl shadow-xl disabled:opacity-30 disabled:grayscale ${isLight ? "bg-rose-500 shadow-rose-500/20" : "bg-violet-600 shadow-violet-600/30"}`}><Send size={20} /></CmmButton>
    <ChatComposerTools isOpen={isToolsOpen} isLight={isLight} canAttach={canAttach} canChooseAnnouncement={canChooseAnnouncement} canChoosePoll={canChoosePoll} composerMode={composerMode} onClose={onToggleTools} onOpenFileInput={onOpenFileInput} onSelectMode={onSelectMode} onInsertLink={onInsertLink} userId={userId} />
  </div>;
}

function ChatComposerTools({
  isOpen,
  isLight,
  canAttach,
  canChooseAnnouncement,
  canChoosePoll,
  composerMode,
  onClose,
  onOpenFileInput,
  onSelectMode,
  onInsertLink,
  userId,
}: {
  isOpen: boolean;
  isLight: boolean;
  canAttach: boolean;
  canChooseAnnouncement: boolean;
  canChoosePoll: boolean;
  composerMode: ChatComposerMode;
  onClose: () => void;
  onOpenFileInput: () => void;
  onSelectMode: (mode: ChatComposerMode) => void;
  onInsertLink?: (url: string) => void;
  userId?: string;
}) {
  if (!isOpen) return null;
  const itemClass = `flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left cmm-text-small font-semibold ${isLight ? "text-slate-700 hover:bg-rose-50" : "text-slate-200 hover:bg-white/5"}`;
  return <div id="chat-composer-options" role="group" aria-label="Options d’écriture" className={`absolute bottom-full left-0 mb-2 min-w-56 rounded-2xl border p-2 shadow-xl ${isLight ? "border-rose-100 bg-white" : "border-white/10 bg-slate-900"}`}>
    {composerMode !== "message" ? <button type="button" onClick={() => onSelectMode("message")} className={itemClass}>Écrire un message</button> : null}
    {userId ? <button type="button" disabled={!canAttach} onClick={onOpenFileInput} className={`${itemClass} disabled:cursor-not-allowed disabled:opacity-40`}><Paperclip size={16} aria-hidden="true" /> Pièce jointe</button> : null}
    <ChatShareLinkAction canAttach={canAttach} isLight={isLight} onClose={onClose} onInsertLink={onInsertLink} />
    {canChooseAnnouncement ? <button type="button" onClick={() => onSelectMode("announcement")} className={itemClass}><Megaphone size={16} aria-hidden="true" /> Annonce / Relai</button> : null}
    {canChoosePoll ? <button type="button" onClick={() => onSelectMode("poll")} className={itemClass}><BarChart3 size={16} aria-hidden="true" /> Sondage</button> : null}
  </div>;
}

export function ChatComposerGuestHint({ isLight, activeChannelType }: { isLight: boolean; activeChannelType: string }) {
  return <p className={`mt-2 px-1 text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>{activeChannelType === "dm" ? "Vous consultez vos messages en mode invité. " : "Vous consultez cette discussion en mode invité. "}<Link href="/sign-in" className={isLight ? "font-semibold text-rose-600 underline underline-offset-2" : "font-semibold text-pink-300 underline underline-offset-2"}>Connectez-vous</Link>{" "}{activeChannelType === "dm" ? "pour envoyer un message." : "pour participer à la discussion."}</p>;
}
