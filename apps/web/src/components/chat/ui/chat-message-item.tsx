"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  MapPin,
  Megaphone,
  MessageSquare,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { isSafeChatAttachmentUrl } from "@/lib/chat/chat-attachments";
import { ChatAvatar } from "@/components/chat/chat-avatar";

import type { ChatMessage } from "../chat-types";
import { getDiscussionTopic } from "../discussion-guidance";

type ChatMessageItemProps = {
  message: ChatMessage;
  userId?: string;
  tone?: "light" | "dark";
  onPollVote?: (messageId: string, optionId: string | null) => void;
  pollVotePending?: boolean;
  pollVoteError?: string | null;
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

export function ChatMessageItem({
  message,
  userId,
  tone = "dark",
  onPollVote,
  pollVotePending = false,
  pollVoteError = null,
}: ChatMessageItemProps) {
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

  const topic = getDiscussionTopic(message.channel_type, message.topic_id);
  const isAnnouncement = message.message_kind === "announcement";
  const isPoll = message.message_kind === "poll";
  const pollOptions = message.poll_options ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full group mb-4"
    >
      <div 
        className={cn(
          "w-full rounded-[1.5rem] border p-4 transition-all duration-300",
          isAnnouncement || isPoll
            ? isLight
              ? isPoll
                ? "border-pink-200 bg-pink-50/30 shadow-sm"
                : "border-rose-200 bg-rose-50/30 shadow-sm"
              : isPoll
                ? "border-pink-400/20 bg-pink-500/5 shadow-sm"
                : "border-rose-400/20 bg-rose-500/5 shadow-sm"
            : isLight
              ? "bg-white border-indigo-100 shadow-sm"
              : "bg-slate-800/80 border-slate-700 shadow-sm",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <ChatAvatar
              src={message.sender.avatar_url}
              name={message.sender.display_name}
              size="md"
              tone={isLight ? "light" : "dark"}
              className={isLight ? "bg-indigo-50 text-indigo-700" : "bg-slate-900 text-slate-100"}
            />
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
        </div>

        {/* Content */}
        <div className="pl-[52px]">
          <p className={`whitespace-pre-wrap text-[13px] leading-relaxed mb-3 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            {message.content}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isAnnouncement && (
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${isLight ? "bg-rose-100 text-rose-700" : "bg-rose-500/20 text-rose-300"}`}>
                <Megaphone size={10} /> Annonce / Relai
              </span>
            )}
            {isPoll && (
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-wider ${isLight ? "bg-pink-100 text-pink-700" : "bg-pink-500/20 text-pink-300"}`}>
                <BarChart3 size={10} /> Sondage
              </span>
            )}
            {topic && (
              <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ${isLight ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/20 text-indigo-300"}`}>
                {topic.label}
              </span>
            )}
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

          {isAnnouncement && message.related_event ? (
            <div className={`mb-3 rounded-xl border p-3 ${isLight ? "border-rose-100 bg-rose-50/60" : "border-rose-400/20 bg-rose-500/10"}`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">
                Cleanup associé
              </p>
              <p className={`mt-1 text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                {message.related_event.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} /> {message.related_event.event_date}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {message.related_event.location_label}
                </span>
              </div>
            </div>
          ) : null}

          {isPoll && pollOptions.length > 0 ? (
            <div className={`mb-3 rounded-xl border p-3 ${isLight ? "border-pink-100 bg-pink-50/60" : "border-pink-400/20 bg-pink-500/10"}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-pink-500">
                  {message.totalVotes ?? 0} vote{(message.totalVotes ?? 0) > 1 ? "s" : ""}
                </p>
                {pollVotePending ? (
                  <span className="text-[10px] font-bold text-slate-400" role="status">
                    Enregistrement…
                  </span>
                ) : null}
              </div>
              <div className="space-y-2" role="group" aria-label="Options du sondage">
                {pollOptions.map((option) => {
                  const voteCount = option.voteCount ?? 0;
                  const totalVotes = message.totalVotes ?? 0;
                  const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                  const isSelected = message.selectedOptionId === option.id;
                  const optionContent = (
                    <>
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-lg transition-[width]",
                          isLight ? "bg-pink-100/80" : "bg-pink-500/15",
                        )}
                        style={{ width: `${percentage}%` }}
                        aria-hidden="true"
                      />
                      <span className="relative flex min-w-0 flex-1 items-center gap-2 text-left">
                        <span className="text-pink-500">{option.position}.</span>
                        <span className="truncate">{option.label}</span>
                        {isSelected ? (
                          <span className="rounded-full bg-pink-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-pink-600">
                            Votre choix
                          </span>
                        ) : null}
                      </span>
                      <span className="relative shrink-0 text-[10px] font-black text-slate-500">
                        {voteCount} · {percentage} %
                      </span>
                    </>
                  );

                  return onPollVote ? (
                    <button
                      key={option.id}
                      type="button"
                      disabled={pollVotePending || isSelected}
                      aria-pressed={isSelected}
                      onClick={() => onPollVote(message.id, option.id)}
                      className={cn(
                        "relative flex w-full overflow-hidden rounded-lg border px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400",
                        isLight
                          ? "border-pink-100 bg-white text-slate-700 hover:border-pink-300 disabled:cursor-default disabled:opacity-100"
                          : "border-white/10 bg-white/5 text-slate-200 hover:border-pink-300/50 disabled:cursor-default disabled:opacity-100",
                        pollVotePending && !isSelected ? "cursor-wait" : "",
                      )}
                    >
                      {optionContent}
                    </button>
                  ) : (
                    <div
                      key={option.id}
                      className={cn(
                        "relative flex w-full overflow-hidden rounded-lg border px-3 py-2 text-xs font-bold",
                        isLight ? "border-pink-100 bg-white text-slate-700" : "border-white/10 bg-white/5 text-slate-200",
                      )}
                    >
                      {optionContent}
                    </div>
                  );
                })}
              </div>
              {onPollVote && message.selectedOptionId ? (
                <button
                  type="button"
                  disabled={pollVotePending}
                  onClick={() => onPollVote(message.id, null)}
                  className="mt-3 text-[10px] font-black uppercase tracking-wider text-pink-600 underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60"
                >
                  Retirer mon vote
                </button>
              ) : null}
              {pollVoteError ? (
                <p className="mt-2 text-[10px] font-bold text-rose-600" role="alert">
                  {pollVoteError}
                </p>
              ) : null}
            </div>
          ) : null}

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

        </div>
      </div>
    </motion.div>
  );
}
