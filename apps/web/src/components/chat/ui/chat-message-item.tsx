"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  Download,
  FileText,
  MapPin,
  MessageSquare,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-3 group",
        isMe ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div className="mt-1 shrink-0 relative">
        <div className={`h-10 w-10 overflow-hidden rounded-2xl border-2 shadow-xl transition-transform group-hover:scale-105 ${isLight ? "border-rose-100 bg-white" : "border-white/10 bg-slate-800"}`}>
          <Image
            src={message.sender.avatar_url || `https://ui-avatars.com/api/?name=${message.sender.display_name}`}
            width={40}
            height={40}
            className="h-full w-full object-cover"
            alt={message.sender.display_name}
          />
        </div>
        {!isMe && (
          <div className="absolute -bottom-1 -right-1 z-20 h-3.5 w-3.5 rounded-full border-2 border-slate-900 bg-emerald-500 shadow-sm" />
        )}
      </div>

      <div className={cn("flex max-w-[75%] flex-col gap-1.5", isMe ? "items-end" : "items-start")}>
        <div className="flex items-center gap-2 px-1">
          <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            {message.sender.display_name}
          </span>
          <span className={`text-[10px] font-medium tabular-nums ${isLight ? "text-slate-400" : "text-slate-500"}`}>
            {format(new Date(message.created_at), "HH:mm", { locale: fr })}
          </span>
        </div>

        <div
          className={cn(
            "relative rounded-3xl px-5 py-3.5 transition-all duration-300 backdrop-blur-md",
            isMe
              ? isLight
                ? "rounded-tr-sm bg-rose-500 text-white shadow-lg shadow-rose-500/10"
                : "rounded-tr-sm bg-violet-600/20 border border-violet-500/30 text-white shadow-violet-500/5"
              : isLight
                ? "rounded-tl-sm bg-white border border-rose-100 text-slate-700 shadow-sm"
                : "rounded-tl-sm bg-white/5 border border-white/10 text-slate-200"
          )}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {isActionRelated && (
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border ${isLight ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"}`}>
                <Zap size={10} /> Action Terrain
              </div>
            )}
            {isQuestionRelated && (
              <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border ${isLight ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-amber-500/20 text-amber-400 border-amber-500/20"}`}>
                <MessageSquare size={10} /> Question
              </div>
            )}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
            {message.content}
          </p>

          {safeAttachmentUrl && (
            <div className="mt-4">
              {hasVisualAttachment ? (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="group/img relative overflow-hidden rounded-2xl shadow-2xl border border-white/10"
                >
                  <Image
                    src={safeAttachmentUrl}
                    alt="Pièce jointe"
                    width={400}
                    height={240}
                    className="max-h-64 w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 opacity-0 transition-opacity group-hover/img:opacity-100">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white">
                      <MapPin size={14} className="text-emerald-400" />
                      Localisation jointe
                    </div>
                  </div>
                  </motion.div>
              ) : (
                <a
                  href={safeAttachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${isLight ? "border-rose-100 bg-rose-50/70 hover:bg-white hover:border-rose-200" : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-violet-500/30"}`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner ${isLight ? "bg-rose-100 text-rose-500" : "bg-violet-500/20 text-violet-400"}`}>
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                      {attachmentLabel}
                    </p>
                    <p className={`truncate text-[10px] font-bold uppercase tracking-widest ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                      Document partagé
                    </p>
                  </div>
                  <Download size={18} className={isLight ? "text-rose-500" : "text-violet-400"} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
