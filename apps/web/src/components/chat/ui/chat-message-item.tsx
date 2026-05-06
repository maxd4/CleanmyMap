"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MessageSquare, Zap, Image as ImageIcon, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

import type { ChatMessage } from "../chat-types";

type ChatMessageItemProps = {
  message: ChatMessage;
  userId?: string;
};

export function ChatMessageItem({ message, userId }: ChatMessageItemProps) {
  const isMe = message.sender_id === userId;
  const isActionRelated = /collecte|nettoyage|ramassage|déchets|pollution|bravo/i.test(message.content);
  const isQuestionRelated = /\?|comment|pourquoi|où/i.test(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, x: isMe ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 mb-6 ${isMe ? "flex-row-reverse" : "flex-row"}`}
    >
      <div className="relative shrink-0">
        <div
          className={`absolute -inset-1 rounded-2xl blur-sm opacity-20 ${
            isMe ? "bg-violet-500" : "bg-emerald-500"
          }`}
        />
        <Image
          src={message.sender.avatar_url || `https://ui-avatars.com/api/?name=${message.sender.display_name}`}
          width={40}
          height={40}
          className="relative z-10 h-10 w-10 rounded-2xl border-2 border-white shadow-xl dark:border-slate-800"
          alt={`Avatar de ${message.sender.display_name}`}
        />
        <div
          className={`absolute -bottom-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white dark:border-slate-800 ${
            isMe ? "bg-violet-500" : "bg-emerald-500"
          }`}
        >
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
        </div>
      </div>

      <div className={`flex max-w-[85%] flex-col sm:max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
        <div className={`mb-1 flex items-center gap-2 px-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[11px] font-black uppercase tracking-tight cmm-text-primary">
            {message.sender.display_name}
          </span>
          <span className="text-[10px] font-bold lowercase text-violet-500/60">
            @{message.sender.handle}
          </span>
          <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}
          </span>
        </div>

        <div
          className={`group relative rounded-[2rem] p-4 shadow-lg transition-all duration-300 ${
            isMe
              ? "rounded-tr-none bg-violet-600 text-white"
              : "rounded-tl-none border border-slate-100 bg-white cmm-text-secondary dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="mb-2 flex flex-wrap gap-1.5">
            {isActionRelated ? (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                  isMe
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                }`}
              >
                <Zap size={10} /> Action Terrain
              </div>
            ) : null}
            {isQuestionRelated ? (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                  isMe
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                }`}
              >
                <MessageSquare size={10} /> Question
              </div>
            ) : null}
            {message.attachment_url ? (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                  isMe
                    ? "bg-white/20 text-white"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                }`}
              >
                <ImageIcon size={10} /> Preuve Visuelle
              </div>
            ) : null}
          </div>

          <div className={`cmm-text-small font-medium leading-relaxed ${isMe ? "text-white" : "cmm-text-secondary"}`}>
            {message.content}
          </div>

          {message.attachment_url ? (
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="group/img relative mt-3 overflow-hidden rounded-2xl shadow-2xl"
            >
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover/img:opacity-100">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-white">
                  <MapPin size={12} /> Voir sur la carte
                </div>
              </div>
              <Image
                src={message.attachment_url}
                alt={`Pièce jointe de ${message.sender.display_name}`}
                width={400}
                height={240}
                className="max-h-60 w-full object-cover"
              />
            </motion.div>
          ) : null}
        </div>

        {isActionRelated && !isMe ? (
          <div className="absolute -z-10 h-full w-full rounded-full bg-emerald-400/10 blur-2xl" />
        ) : null}
      </div>
    </motion.div>
  );
}
