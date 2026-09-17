"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  MapPin,
  Megaphone,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { isSafeChatAttachmentUrl } from "@/lib/chat/chat-attachments";
import { ChatAvatar } from "@/components/chat/chat-avatar";
import { ChatActionReferenceCard } from "./chat-action-reference-card";

import type { ChatMessage } from "../chat-types";
import { getDiscussionTopic } from "../discussion-guidance";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type ChatMessageItemProps = {
  message: ChatMessage;
  userId?: string;
  tone?: "light" | "dark";
  onPollVote?: (messageId: string, optionId: string | null) => void;
  pollVotePending?: boolean;
  pollVoteError?: string | null;
  isHighlighted?: boolean;
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
  isHighlighted = false,
}: ChatMessageItemProps) {
  const isLight = tone === "light";
  const { displayMode } = useSitePreferences();
  const reducedMotion = useReducedMotion();
  const isMe = message.sender_id === userId;
  const isPrivateChannel = message.channel_type === "dm";
  const shouldAnimate = reducedMotion !== true && displayMode !== "sobre";
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
  const hasActionReference = Boolean(message.action_id);
  const hasStructuredCard = isAnnouncement || isPoll || hasActionReference;
  const hasStructuredMetadata = Boolean(topic || isAnnouncement || isPoll || hasActionReference);
  const pollOptions = message.poll_options ?? [];

  return (
    <motion.div
      id={`chat-message-${message.id}`}
      tabIndex={isHighlighted ? -1 : undefined}
      data-chat-message-id={message.id}
      initial={shouldAnimate ? { opacity: 1, y: displayMode === "minimaliste" ? 2 : 10 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: shouldAnimate ? (displayMode === "minimaliste" ? 0.1 : 0.18) : 0 }}
      className="flex w-full group mb-4"
    >
      <div 
        className={cn(
          "w-full transition-all duration-300",
          hasStructuredCard
            ? "rounded-[1.5rem] border p-4 shadow-sm"
            : "border-b pb-4",
          isHighlighted ? "ring-2 ring-pink-400 ring-offset-2 ring-offset-rose-50" : "",
          hasStructuredCard
            ? isLight
              ? isPoll
                ? "border-pink-200 bg-pink-50/30 shadow-sm"
                : hasActionReference
                  ? "border-pink-200 bg-pink-50/40"
                  : "border-rose-200 bg-rose-50/30"
              : isPoll
                ? "border-pink-400/20 bg-pink-500/5 shadow-sm"
                : hasActionReference
                  ? "border-pink-400/20 bg-pink-500/5"
                  : "border-rose-400/20 bg-rose-500/5"
            : isLight
              ? "border-slate-200/80"
              : "border-slate-700/80",
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
              className={isPrivateChannel ? (isLight ? "bg-indigo-50 text-indigo-700" : "bg-indigo-500/20 text-indigo-300") : (isLight ? "bg-pink-50 text-pink-700" : "bg-pink-500/20 text-pink-300")}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {message.sender.display_name}
                </span>
                {isMe && (
                  <span className={`rounded px-1.5 py-0.5 cmm-text-caption font-semibold ${isPrivateChannel ? (isLight ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/20 text-indigo-300") : (isLight ? "bg-pink-50 text-pink-700" : "bg-pink-500/20 text-pink-300")}`}>
                    Moi
                  </span>
                )}
              </div>
              <span className={`cmm-text-caption ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                {formatDistanceToNow(new Date(message.created_at), { locale: fr, addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pl-[52px]">
          <p className={`whitespace-pre-wrap cmm-text-small leading-relaxed mb-3 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            {message.content}
          </p>

          {message.action_id ? (
            <ChatActionReferenceCard actionId={message.action_id} tone={tone} />
          ) : null}

          {hasStructuredMetadata ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {isAnnouncement ? (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 cmm-text-caption font-semibold ${isLight ? "bg-rose-100 text-rose-700" : "bg-rose-500/20 text-rose-300"}`}>
                  <Megaphone size={10} aria-hidden="true" /> Annonce / Relai
                </span>
              ) : null}
              {isPoll ? (
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 cmm-text-caption font-semibold ${isLight ? "bg-pink-100 text-pink-700" : "bg-pink-500/20 text-pink-300"}`}>
                  <BarChart3 size={10} aria-hidden="true" /> Sondage
                </span>
              ) : null}
              {topic ? (
                <span className={`inline-flex items-center rounded-md px-2 py-1 cmm-text-caption font-bold ${isPrivateChannel ? (isLight ? "bg-indigo-50 text-indigo-600" : "bg-indigo-500/20 text-indigo-300") : (isLight ? "bg-pink-50 text-pink-700" : "bg-pink-500/20 text-pink-300")}`}>
                  {topic.label}
                </span>
              ) : null}
              {hasActionReference ? (
                <span className={`inline-flex items-center rounded-md px-2 py-1 cmm-text-caption font-bold ${isLight ? "bg-pink-50 text-pink-700" : "bg-pink-500/20 text-pink-300"}`}>
                  Action
                </span>
              ) : null}
            </div>
          ) : null}

          {isAnnouncement && message.related_event ? (
            <div className={`mb-3 rounded-xl border p-3 ${isLight ? "border-rose-100 bg-rose-50/60" : "border-rose-400/20 bg-rose-500/10"}`}>
              <p className="cmm-text-caption font-semibold text-rose-500">
                Cleanup associé
              </p>
              <p className={`mt-1 text-xs font-black ${isLight ? "text-slate-800" : "text-white"}`}>
                {message.related_event.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 cmm-text-caption font-bold text-slate-500">
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
                <p className="cmm-text-caption font-semibold text-pink-700">
                  {message.totalVotes ?? 0} vote{(message.totalVotes ?? 0) > 1 ? "s" : ""}
                </p>
                {pollVotePending ? (
                  <span className="cmm-text-caption font-bold text-slate-400" role="status">
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
                        <span className="break-words">{option.label}</span>
                        {isSelected ? (
                          <span className="rounded-full bg-pink-500/15 px-1.5 py-0.5 cmm-text-caption font-semibold text-pink-600">
                            Votre choix
                          </span>
                        ) : null}
                      </span>
                      <span className="relative shrink-0 cmm-text-caption font-black text-slate-500">
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
                  className="mt-3 cmm-text-caption font-semibold text-pink-700 underline-offset-2 hover:underline disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
                >
                  Retirer mon vote
                </button>
              ) : null}
              {pollVoteError ? (
                <p className="mt-2 cmm-text-caption font-bold text-rose-600" role="alert">
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
                  className={`inline-flex items-center gap-3 rounded-xl border p-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${isPrivateChannel ? (isLight ? "border-indigo-100 bg-indigo-50/50 hover:bg-white" : "border-slate-700 bg-slate-800 hover:bg-slate-700") : (isLight ? "border-pink-100 bg-pink-50/50 hover:bg-white" : "border-slate-700 bg-slate-800 hover:bg-slate-700")}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPrivateChannel ? (isLight ? "bg-indigo-100 text-indigo-500" : "bg-indigo-500/20 text-indigo-400") : (isLight ? "bg-pink-100 text-pink-600" : "bg-pink-500/20 text-pink-300")}`}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className={`break-words cmm-text-small font-bold ${isLight ? "text-slate-800" : "text-white"}`}>
                      {attachmentLabel}
                    </p>
                    <p className={`cmm-text-caption font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Document
                    </p>
                  </div>
                  <Download size={14} className={isPrivateChannel ? (isLight ? "ml-2 text-indigo-500" : "ml-2 text-indigo-400") : (isLight ? "ml-2 text-pink-600" : "ml-2 text-pink-300")} />
                </a>
              )}
            </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}
