"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  MapPin,
  MessageSquare,
  Zap,
  Heart,
  MessageCircle,
  MoreHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { isSafeChatAttachmentUrl } from "@/lib/chat/chat-attachments";

import type { ChatMessage } from "../chat-types";

type ChatMessageItemProps = {
  message: ChatMessage;
  userId?: string;
  tone?: "light" | "dark";
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "svg"]);

function isVisualAttachment(message: ChatMessage): boolean {
  if (!isSafeChatAttachmentUrl(message.attachment_url)) {
    return false;
  }
  if (message.attachment_type?.startsWith("image/")) {
    return true;
  }
  if (!message.attachment_url) {
    return false;
  }
  try {
    const pathname = new URL(message.attachment_url).pathname;
    const extension = pathname.split(".").pop()?.toLowerCase() ?? "";
    return IMAGE_EXTENSIONS.has(extension);
  } catch {
    return false;
  }
}

export function ChatMessageItem({ message, userId, tone = "dark" }: ChatMessageItemProps) {
  const isLight = tone === "light";
  const isMe = message.sender_id === userId;
  const isActionRelated = /collecte|nettoyage|ramassage|déchets|pollution|bravo/i.test(message.content);
  const isQuestionRelated = /\?|comment|pourquoi|où/i.test(message.content);
  const safeAttachmentUrl = isSafeChatAttachmentUrl(message.attachment_url)
    ? message.attachment_url
    : null;
  const hasAttachment = Boolean(safeAttachmentUrl);
  const hasVisualAttachment = hasAttachment && isVisualAttachment(message);
  
  const attachmentLabel = message.attachment_type
    ? message.attachment_type
        .split("/")
        .pop()
        ?.replace(/\+xml$/i, "")
        .toUpperCase() ?? "FICHIER"
    : "FICHIER";

  // Simulate some reactions based on content length for mockup parity
  const hearts = (message.content.length % 5) + 2;
  const comments = (message.content.length % 3) + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full group mb-4"
    >
      <div 
        className={cn(
          "w-full rounded-[1.5rem] border p-4 transition-all duration-300",
          isLight 
            ? "bg-white border-indigo-100 shadow-sm" 
            : "bg-slate-800/80 border-slate-700 shadow-sm"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 shrink-0 overflow-hidden rounded-2xl ${isLight ? "bg-indigo-50" : "bg-slate-900"}`}>
              <Image
                src={message.sender.avatar_url || `https://ui-avatars.com/api/?name=${message.sender.display_name}`}
                width={40}
                height={40}
                unoptimized
                className="h-full w-full object-cover"
                alt={message.sender.display_name}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {message.sender.display_name}
                </span>
                {isMe && (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${isLight ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/20 text-indigo-300"}`}>
                    Moi
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {formatDistanceToNow(new Date(message.created_at), { locale: fr, addSuffix: true })}
              </span>
            </div>
          </div>
          <button className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? "text-slate-400 hover:bg-slate-100" : "text-slate-500 hover:bg-slate-700"}`}>
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="pl-[52px]">
          <p className={`whitespace-pre-wrap text-[13px] leading-relaxed mb-3 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            {message.content}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isActionRelated && (
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${isLight ? "bg-rose-50 text-rose-600" : "bg-rose-500/20 text-rose-300"}`}>
                <Zap size={10} /> Nettoyage
              </span>
            )}
            {isQuestionRelated && (
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold ${isLight ? "bg-sky-50 text-sky-600" : "bg-sky-500/20 text-sky-300"}`}>
                <MessageSquare size={10} /> Question
              </span>
            )}
          </div>

          {/* Attachments */}
          {safeAttachmentUrl && (
            <div className="mb-3">
              {hasVisualAttachment ? (
                <div className="group/img relative overflow-hidden rounded-xl border border-black/5 inline-block">
                  <Image
                    src={safeAttachmentUrl}
                    alt="Pièce jointe"
                    width={300}
                    height={200}
                    unoptimized
                    className="max-h-48 w-auto object-cover"
                  />
                </div>
              ) : (
                <a
                  href={safeAttachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-3 rounded-xl border p-3 transition-all ${isLight ? "border-indigo-100 bg-indigo-50/50 hover:bg-white" : "border-slate-700 bg-slate-800 hover:bg-slate-700"}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isLight ? "bg-indigo-100 text-indigo-500" : "bg-indigo-500/20 text-indigo-400"}`}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className={`truncate text-xs font-bold ${isLight ? "text-slate-800" : "text-white"}`}>
                      {attachmentLabel}
                    </p>
                    <p className={`text-[9px] font-bold uppercase tracking-widest ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Document
                    </p>
                  </div>
                  <Download size={14} className={isLight ? "text-indigo-500 ml-2" : "text-indigo-400 ml-2"} />
                </a>
              )}
            </div>
          )}

          {/* Footer (Reactions) */}
          <div className="flex items-center gap-4 mt-2">
            <button className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${isLight ? "text-slate-500 hover:text-rose-500" : "text-slate-400 hover:text-rose-400"}`}>
              <Heart size={14} className={isLight ? "text-rose-400" : "text-rose-400"} />
              {hearts}
            </button>
            <button className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${isLight ? "text-slate-500 hover:text-indigo-500" : "text-slate-400 hover:text-indigo-400"}`}>
              <MessageCircle size={14} />
              {comments}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
