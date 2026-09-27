"use client";

import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import type { ChatChannelType } from "@/lib/chat/channels";
import type {
  ChatRelatedEvent,
  CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import type { ChatSearchResult } from "@/lib/chat/chat-search";
import type { ChatFeedState } from "./chat-feed-state";
import type { ChatEmptyStateCopy, ChatMetaItem } from "./chat-shell.utils";
import type { ChatMessage, ChatUser } from "./chat-types";
import { ChatHeader } from "./chat-header";
import { ChatActionModeration } from "./chat-action-moderation";
import { TopicNetworkGraph } from "./topic-network-graph";
import { ChatComposer } from "./chat-composer";
import { ChatMessageFeed } from "./ui/chat-message-feed";

type PollVoteState = { pending: boolean; error: string | null };

export type ChatThreadPaneProps = {
  pagePath: string;
  tone: "light" | "dark";
  messagerieMode: boolean;
  showThreadOnMobile: boolean;
  activeChannelType: ChatChannelType;
  activeChannelLabel: string;
  activeChannelDescription: string;
  activeChannelIcon: LucideIcon;
  metaItems: ChatMetaItem[];
  viewMode: "messages" | "graph";
  isBugReportChannel: boolean;
  selectedRecipient: ChatUser | null;
  isEditingHandle: boolean;
  newHandle: string;
  onViewModeChange: (viewMode: "messages" | "graph") => void;
  onToggleHandleEditor: () => void;
  onHandleChange: (value: string) => void;
  onConfirmHandle: () => Promise<void>;
  isLive: boolean;
  onBackToDmInbox?: () => void;
  onBackToContextList?: () => void;
  showSearch: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  searchResults: ChatSearchResult[];
  searchIsLoading: boolean;
  searchError: Error | null;
  searchHasMore: boolean;
  searchIsLoadingMore: boolean;
  searchLoadMoreError: string | null;
  onToggleSearch: () => void;
  onSearchQueryChange: (value: string) => void;
  onCloseSearch: () => void;
  onSelectSearchResult: (result: ChatSearchResult) => void;
  onLoadMoreSearch: () => void;
  selectedActionId: string | null;
  messages: ChatMessage[];
  scrollRef: RefObject<HTMLDivElement | null>;
  hasMoreMessages: boolean;
  isLoadingPrevious: boolean;
  loadPreviousError: string | null;
  onLoadPreviousMessages: () => void;
  targetMessageId: string | null;
  targetStatus: "found" | "unavailable" | undefined;
  feedState: ChatFeedState;
  onRetryMessages: () => void;
  userId?: string;
  onPollVote: (messageId: string, optionId: string | null) => void;
  pollVoteStates: Record<string, PollVoteState>;
  highlightedMessageId: string | null;
  emptyState: ChatEmptyStateCopy;
  selectedRecipientId?: string | null;
  onStarterPrompt: (prompt: string) => void;
  isAuthenticated: boolean;
  composerPlaceholder: string;
  composerMode: "message" | "announcement" | "poll";
  onComposerModeChange: (mode: "message" | "announcement" | "poll") => void;
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  onAnnouncementTemplateChange: (template: CommunityAnnouncementTemplateKey) => void;
  relatedEvent: ChatRelatedEvent | null;
  announcementEventRequested: boolean;
  announcementEventLoading: boolean;
  announcementEventError: Error | null;
  pollOptions: string[];
  onPollOptionsChange: (options: string[]) => void;
  userMessage: string;
  onMessageChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isSending: boolean;
  isUploading: boolean;
  sendError: string | null;
  showMentions: boolean;
  mentionSuggestions: ChatUser[];
  onInsertMention: (handle: string) => void;
  onInsertLink: (url: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canSubmit: boolean;
};

export function ChatThreadPane({
  pagePath,
  tone,
  messagerieMode,
  showThreadOnMobile,
  activeChannelType,
  activeChannelLabel,
  activeChannelDescription,
  activeChannelIcon,
  metaItems,
  viewMode,
  isBugReportChannel,
  selectedRecipient,
  isEditingHandle,
  newHandle,
  onViewModeChange,
  onToggleHandleEditor,
  onHandleChange,
  onConfirmHandle,
  isLive,
  onBackToDmInbox,
  onBackToContextList,
  showSearch,
  isSearchOpen,
  searchQuery,
  searchResults,
  searchIsLoading,
  searchError,
  searchHasMore,
  searchIsLoadingMore,
  searchLoadMoreError,
  onToggleSearch,
  onSearchQueryChange,
  onCloseSearch,
  onSelectSearchResult,
  onLoadMoreSearch,
  selectedActionId,
  messages,
  scrollRef,
  hasMoreMessages,
  isLoadingPrevious,
  loadPreviousError,
  onLoadPreviousMessages,
  targetMessageId,
  targetStatus,
  feedState,
  onRetryMessages,
  userId,
  onPollVote,
  pollVoteStates,
  highlightedMessageId,
  emptyState,
  selectedRecipientId,
  onStarterPrompt,
  isAuthenticated,
  composerPlaceholder,
  composerMode,
  onComposerModeChange,
  announcementTemplate,
  onAnnouncementTemplateChange,
  relatedEvent,
  announcementEventRequested,
  announcementEventLoading,
  announcementEventError,
  pollOptions,
  onPollOptionsChange,
  userMessage,
  onMessageChange,
  file,
  onFileChange,
  fileInputRef,
  isSending,
  isUploading,
  sendError,
  showMentions,
  mentionSuggestions,
  onInsertMention,
  onInsertLink,
  onSubmit,
  canSubmit,
}: ChatThreadPaneProps) {
  const isLight = tone === "light";

  return (
    <div className={`min-h-0 min-w-0 flex-1 flex-col relative ${messagerieMode && !showThreadOnMobile ? "hidden md:flex" : "flex"} ${isLight ? "bg-white/60" : "bg-white/5 dark:bg-slate-950/20"}`}>
      <ChatHeader
        activeChannelType={activeChannelType}
        activeChannelLabel={activeChannelLabel}
        activeChannelDescription={activeChannelDescription}
        activeChannelIcon={activeChannelIcon}
        metaItems={metaItems}
        viewMode={viewMode}
        isBugReportChannel={isBugReportChannel}
        selectedRecipient={selectedRecipient}
        isEditingHandle={isEditingHandle}
        newHandle={newHandle}
        onViewModeChange={onViewModeChange}
        onToggleHandleEditor={onToggleHandleEditor}
        onHandleChange={onHandleChange}
        onConfirmHandle={onConfirmHandle}
        tone={tone}
        showControls={!isLight}
        isLive={isLive}
        onBackToDmInbox={onBackToDmInbox}
        onBackToContextList={onBackToContextList}
        showSearch={showSearch}
        isSearchOpen={isSearchOpen}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchIsLoading={searchIsLoading}
        searchError={searchError}
        searchHasMore={searchHasMore}
        searchIsLoadingMore={searchIsLoadingMore}
        searchLoadMoreError={searchLoadMoreError}
        onToggleSearch={onToggleSearch}
        onSearchQueryChange={onSearchQueryChange}
        onCloseSearch={onCloseSearch}
        onSelectSearchResult={onSelectSearchResult}
        onLoadMoreSearch={onLoadMoreSearch}
      />

      {activeChannelType === "action" && selectedActionId && messagerieMode ? (
        <ChatActionModeration actionId={selectedActionId} tone={tone} />
      ) : null}

      {isBugReportChannel ? (
        <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${isLight ? "bg-white/40" : ""}`}>
          <FeedbackSection pagePath={pagePath} source="feedback_discussion" />
        </div>
      ) : viewMode === "graph" ? (
        <div className="flex-1 overflow-hidden">
          <TopicNetworkGraph />
        </div>
      ) : (
        <>
          <ChatMessageFeed
            scrollRef={scrollRef}
            hasMoreMessages={hasMoreMessages}
            isLoadingPrevious={isLoadingPrevious}
            loadPreviousError={loadPreviousError}
            onLoadPreviousMessages={onLoadPreviousMessages}
            targetMessageId={targetMessageId}
            targetStatus={targetStatus}
            feedState={feedState}
            onRetryMessages={onRetryMessages}
            messages={messages}
            userId={userId}
            tone={tone}
            onPollVote={onPollVote}
            pollVoteStates={pollVoteStates}
            highlightedMessageId={highlightedMessageId}
            emptyState={emptyState}
            activeChannelType={activeChannelType}
            selectedRecipientId={selectedRecipientId}
            onStarterPrompt={onStarterPrompt}
            isAuthenticated={isAuthenticated}
          />
          <ChatComposer
            activeChannelType={activeChannelType}
            composerPlaceholder={composerPlaceholder}
            tone={tone}
            composerMode={composerMode}
            onComposerModeChange={onComposerModeChange}
            announcementTemplate={announcementTemplate}
            onAnnouncementTemplateChange={onAnnouncementTemplateChange}
            relatedEvent={relatedEvent}
            announcementEventRequested={announcementEventRequested}
            announcementEventLoading={announcementEventLoading}
            announcementEventError={announcementEventError}
            pollOptions={pollOptions}
            onPollOptionsChange={onPollOptionsChange}
            showModeTabs={activeChannelType !== "bug_report"}
            composerModes={
              activeChannelType === "community"
                ? ["message", "announcement", "poll"]
                : activeChannelType === "admin_elu"
                  ? ["message", "poll"]
                  : activeChannelType === "bug_report"
                    ? ["message"]
                    : ["message", "poll"]
            }
            userId={userId}
            message={userMessage}
            onMessageChange={onMessageChange}
            file={file}
            onFileChange={onFileChange}
            fileInputRef={fileInputRef}
            isSending={isSending}
            isUploading={isUploading}
            sendError={sendError}
            selectedRecipient={selectedRecipient}
            showMentions={showMentions}
            mentionSuggestions={mentionSuggestions}
            onInsertMention={onInsertMention}
            onInsertLink={onInsertLink}
            onSubmit={onSubmit}
            canSubmit={canSubmit}
          />
        </>
      )}
    </div>
  );
}
