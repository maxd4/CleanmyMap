import type { RefObject } from "react";
import type { PostgrestError } from "@supabase/supabase-js";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatFeedState } from "../chat-feed-state";
import type { ChatEmptyStateCopy } from "../chat-shell.utils";
import type { ChatMessage } from "../chat-types";
import { ChatMessageItem } from "./chat-message-item";
import {
  ChatDegradedState,
  ChatEmptyState,
  ChatLoadingState,
} from "./chat-feed-states";

type PollVoteState = {
  pending: boolean;
  error: string | null;
};

export type ChatMessageFeedProps = {
  scrollRef: RefObject<HTMLDivElement | null>;
  hasMoreMessages: boolean;
  isLoadingPrevious: boolean;
  loadPreviousError: string | null;
  onLoadPreviousMessages: () => void;
  targetMessageId: string | null;
  targetStatus: "found" | "unavailable" | undefined;
  feedState: ChatFeedState;
  messagesError: Error | PostgrestError | null;
  messages: ChatMessage[];
  userId?: string;
  tone: "light" | "dark";
  onPollVote: (messageId: string, optionId: string | null) => void;
  pollVoteStates: Record<string, PollVoteState>;
  highlightedMessageId: string | null;
  emptyState: ChatEmptyStateCopy;
  locale: "fr" | "en";
  activeChannelType: ChatChannelType;
  selectedRecipientId?: string | null;
  onStarterPrompt: (prompt: string) => void;
  onOpenRecipientPicker: () => void;
};

export function ChatMessageFeed({
  scrollRef,
  hasMoreMessages,
  isLoadingPrevious,
  loadPreviousError,
  onLoadPreviousMessages,
  targetMessageId,
  targetStatus,
  feedState,
  messagesError,
  messages,
  userId,
  tone,
  onPollVote,
  pollVoteStates,
  highlightedMessageId,
  emptyState,
  locale,
  activeChannelType,
  selectedRecipientId,
  onStarterPrompt,
  onOpenRecipientPicker,
}: ChatMessageFeedProps) {
  const isLight = tone === "light";

  return (
    <div
      ref={scrollRef}
      className={`min-h-0 flex-1 overflow-y-auto space-y-4 p-4 custom-scrollbar sm:p-6 ${isLight ? "bg-transparent" : ""}`}
    >
      {hasMoreMessages ? (
        <div className="flex flex-col items-center gap-2 pb-1">
          <button
            type="button"
            onClick={onLoadPreviousMessages}
            disabled={isLoadingPrevious}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 shadow-sm transition hover:border-rose-300 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-wait disabled:opacity-60"
          >
            {isLoadingPrevious
              ? "Chargement…"
              : loadPreviousError
                ? "Réessayer les messages précédents"
                : "Charger les messages précédents"}
          </button>
          {loadPreviousError ? (
            <p className="text-center text-xs text-rose-700" role="alert">
              {loadPreviousError}
            </p>
          ) : null}
        </div>
      ) : null}
      {targetStatus === "unavailable" && targetMessageId ? (
        <p
          className="rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-center text-xs text-slate-500"
          role="status"
        >
          Le message demandé n’est plus disponible dans ce fil.
        </p>
      ) : null}
      {feedState === "loading" && <ChatLoadingState tone={tone} />}
      {feedState === "degraded" && (
        <ChatDegradedState error={messagesError} tone={tone} />
      )}
      {feedState === "empty" && (
        <ChatEmptyState
          emptyState={emptyState}
          locale={locale}
          activeChannelType={activeChannelType}
          selectedRecipientId={selectedRecipientId}
          onStarterPrompt={onStarterPrompt}
          onOpenRecipientPicker={onOpenRecipientPicker}
          tone={tone}
        />
      )}
      {messages.map((message) => (
        <ChatMessageItem
          key={message.id}
          message={message}
          userId={userId}
          tone={tone}
          onPollVote={onPollVote}
          pollVotePending={pollVoteStates[message.id]?.pending}
          pollVoteError={pollVoteStates[message.id]?.error}
          isHighlighted={highlightedMessageId === message.id}
        />
      ))}
    </div>
  );
}
