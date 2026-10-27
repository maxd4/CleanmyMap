"use client";

import type { ChangeEvent, FormEvent, RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { Locale } from "@/lib/ui/preferences";
import type {
  ChatRelatedEvent,
  CommunityAnnouncementTemplateKey,
} from "@/lib/chat/announcements";
import type { ChatSearchResult } from "@/lib/chat/chat-search";
import type { ChatFeedState } from "./chat-feed-state";
import type { ChatEmptyStateCopy, ChatMetaItem } from "./chat-shell.utils";
import type { ChatMessage, ChatUser } from "./chat-types";
import { ChatHeader } from "./chat-header";
import { ChatThreadPaneBody } from "./chat-thread-pane-body";

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
  locale: Locale;
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
  onPollVoteRetry: (messageId: string) => void;
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

export function ChatThreadPane(props: ChatThreadPaneProps) {
  const { tone, messagerieMode, showThreadOnMobile } = props;
  const isLight = tone === "light";

  return (
    <div className={`min-h-0 min-w-0 flex-1 flex-col relative ${messagerieMode && !showThreadOnMobile ? "hidden md:flex" : "flex"} ${isLight ? "bg-white/60" : "bg-white/5 dark:bg-slate-950/20"}`}>
      <ChatHeader
        activeChannelType={props.activeChannelType}
        activeChannelLabel={props.activeChannelLabel}
        activeChannelDescription={props.activeChannelDescription}
        activeChannelIcon={props.activeChannelIcon}
        metaItems={props.metaItems}
        viewMode={props.viewMode}
        isBugReportChannel={props.isBugReportChannel}
        selectedRecipient={props.selectedRecipient}
        isEditingHandle={props.isEditingHandle}
        newHandle={props.newHandle}
        onViewModeChange={props.onViewModeChange}
        onToggleHandleEditor={props.onToggleHandleEditor}
        onHandleChange={props.onHandleChange}
        onConfirmHandle={props.onConfirmHandle}
        tone={tone}
        showControls={!isLight}
        isLive={props.isLive}
        onBackToDmInbox={props.onBackToDmInbox}
        onBackToContextList={props.onBackToContextList}
        showSearch={props.showSearch}
        isSearchOpen={props.isSearchOpen}
        searchQuery={props.searchQuery}
        searchResults={props.searchResults}
        searchIsLoading={props.searchIsLoading}
        searchError={props.searchError}
        searchHasMore={props.searchHasMore}
        searchIsLoadingMore={props.searchIsLoadingMore}
        searchLoadMoreError={props.searchLoadMoreError}
        onToggleSearch={props.onToggleSearch}
        onSearchQueryChange={props.onSearchQueryChange}
        onCloseSearch={props.onCloseSearch}
        onSelectSearchResult={props.onSelectSearchResult}
        onLoadMoreSearch={props.onLoadMoreSearch}
      />
      <ChatThreadPaneBody {...props} />
    </div>
  );
}
