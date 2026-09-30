"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicId } from "./discussion-guidance";
import type { ChatTopicPresentationGroup } from "@/lib/chat/topic-presentation";
import type { ActionListItem } from "@/lib/actions/types";
import { ChatSidebarContent } from "./chat-sidebar-sections";

export type ChatSidebarChannel = {
  channelType: ChatChannelType;
  active: boolean;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  description: string;
  count?: number;
  unreadCount?: number;
  accentClass: string;
  chipClass: string;
  isLocked: boolean;
};

export type ChatSidebarTopic = ChatTopicPresentationGroup & {
  active: boolean;
  unreadCount?: number;
};

type ChatSidebarProps = {
  channels: ChatSidebarChannel[];
  currentChannelType: ChatChannelType;
  onSelectChannel: (channelType: ChatChannelType) => void;
  onSelectTopic: (topicId: ChatTopicId) => void;
  topicSectionTitle?: string | null;
  topicSectionDescription?: string | null;
  topics: ChatSidebarTopic[];
  tone?: "light" | "dark";
  presentation?: "default" | "messagerie";
  actionItems?: ActionListItem[];
  activeActionId?: string | null;
  actionLoading?: boolean;
  actionError?: string | null;
  onSelectAction?: (actionId: string) => void;
  currentZone?: string;
  profileDefaultZone?: string;
  onSelectZone?: (zoneName: string) => void;
  className?: string;
};

export const ChatSidebar = memo(function ChatSidebar({
  channels,
  currentChannelType,
  onSelectChannel,
  onSelectTopic,
  topicSectionTitle,
  topicSectionDescription,
  topics,
  tone = "dark",
  presentation = "default",
  actionItems = [],
  activeActionId = null,
  actionLoading = false,
  actionError = null,
  onSelectAction,
  currentZone = "",
  profileDefaultZone = "",
  onSelectZone,
  className = "",
}: ChatSidebarProps) {
  const isLight = tone === "light";
  const isMessagerie = presentation === "messagerie";
  return (
    <aside className={`${className || "flex"} custom-scrollbar ${isMessagerie ? "w-full shrink-0 flex-col gap-3 overflow-y-auto border-b p-3 md:w-60 md:gap-4 md:border-b-0 md:border-r md:p-3" : "w-24 flex-col space-y-6 overflow-y-auto border-r p-4 md:w-80"} ${isLight ? "border-rose-100/80 bg-rose-50/30" : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"}`}>
      <ChatSidebarContent channels={channels} currentChannelType={currentChannelType} isLight={isLight} isMessagerie={isMessagerie} onSelectChannel={onSelectChannel} onSelectTopic={onSelectTopic} topicSectionTitle={topicSectionTitle} topicSectionDescription={topicSectionDescription} topics={topics} tone={tone} actionItems={actionItems} activeActionId={activeActionId} onSelectAction={onSelectAction} actionLoading={actionLoading} actionError={actionError} currentZone={currentZone} profileDefaultZone={profileDefaultZone} onSelectZone={onSelectZone} />
    </aside>
  );
});
