"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";

import type { ChatChannelType } from "@/lib/chat/channels";
import { ChannelButton } from "./ui/channel-button";

export type ChatSidebarChannel = {
  channelType: ChatChannelType;
  active: boolean;
  disabled: boolean;
  icon: LucideIcon;
  label: string;
  description: string;
  count?: number;
  accentClass: string;
  chipClass: string;
  isLocked: boolean;
};

type ChatSidebarProps = {
  channels: ChatSidebarChannel[];
  currentChannelType: ChatChannelType;
  onSelectChannel: (channelType: ChatChannelType) => void;
};

export const ChatSidebar = memo(function ChatSidebar({
  channels,
  currentChannelType,
  onSelectChannel,
}: ChatSidebarProps) {
  return (
    <aside className="w-24 md:w-72 border-r border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col p-3 space-y-3 overflow-y-auto">
      {channels.map((channel) => (
        <ChannelButton
          key={channel.channelType}
          active={channel.active && currentChannelType === channel.channelType}
          disabled={channel.disabled}
          onClick={() => onSelectChannel(channel.channelType)}
          icon={channel.icon}
          label={channel.label}
          description={channel.description}
          count={channel.count}
          accentClass={channel.accentClass}
          chipClass={channel.chipClass}
          isLocked={channel.isLocked}
        />
      ))}
    </aside>
  );
});
