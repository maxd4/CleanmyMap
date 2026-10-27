"use client";

import { FeedbackSection } from "@/components/sections/rubriques/feedback-section";
import type { ChatThreadPaneProps } from "./chat-thread-pane";
import { ChatActionModeration } from "./chat-action-moderation";
import { ChatComposer } from "./chat-composer";
import { ChatMessageFeed } from "./ui/chat-message-feed";
import { TopicNetworkGraph } from "./topic-network-graph";

export type ChatThreadPaneBodyProps = Pick<ChatThreadPaneProps,
  | "pagePath"
  | "tone"
  | "messagerieMode"
  | "activeChannelType"
  | "viewMode"
  | "isBugReportChannel"
  | "selectedActionId"
  | "selectedRecipient"
  | "messages"
  | "locale"
  | "scrollRef"
  | "hasMoreMessages"
  | "isLoadingPrevious"
  | "loadPreviousError"
  | "onLoadPreviousMessages"
  | "targetMessageId"
  | "targetStatus"
  | "feedState"
  | "onRetryMessages"
  | "userId"
  | "onPollVote"
  | "pollVoteStates"
  | "highlightedMessageId"
  | "emptyState"
  | "selectedRecipientId"
  | "onStarterPrompt"
  | "isAuthenticated"
  | "composerPlaceholder"
  | "composerMode"
  | "onComposerModeChange"
  | "announcementTemplate"
  | "onAnnouncementTemplateChange"
  | "relatedEvent"
  | "announcementEventRequested"
  | "announcementEventLoading"
  | "announcementEventError"
  | "pollOptions"
  | "onPollOptionsChange"
  | "userMessage"
  | "onMessageChange"
  | "file"
  | "onFileChange"
  | "fileInputRef"
  | "isSending"
  | "isUploading"
  | "sendError"
  | "showMentions"
  | "mentionSuggestions"
  | "onInsertMention"
  | "onInsertLink"
  | "onSubmit"
  | "canSubmit"
>;

export function ChatThreadPaneBody({
  pagePath,
  tone,
  messagerieMode,
  activeChannelType,
  viewMode,
  isBugReportChannel,
  selectedActionId,
  selectedRecipient,
  messages,
  locale,
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
}: ChatThreadPaneBodyProps) {
  const isLight = tone === "light";

  if (activeChannelType === "action" && selectedActionId && messagerieMode) {
    return <ChatActionModeration actionId={selectedActionId} tone={tone} />;
  }

  if (isBugReportChannel) {
    return (
      <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar ${isLight ? "bg-white/40" : ""}`}>
        <FeedbackSection pagePath={pagePath} source="feedback_discussion" />
      </div>
    );
  }

  if (viewMode === "graph") {
    return (
      <div className="flex-1 overflow-hidden">
        <TopicNetworkGraph />
      </div>
    );
  }

  return (
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
        locale={locale}
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
  );
}
