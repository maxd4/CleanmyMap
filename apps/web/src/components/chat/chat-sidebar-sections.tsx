"use client";

import { CmmCountBadge } from "@/components/ui/cmm-count-badge";
import { ChannelButton } from "./ui/channel-button";
import { Leaf } from "lucide-react";
import type { ChatTopicId } from "./discussion-guidance";
import type { ChatSidebarChannel, ChatSidebarTopic } from "./chat-sidebar";
import { ChatActionSurface } from "./chat-action-surface";
import { ChatTerritorySelector } from "./chat-territory-selector";
import type { ActionListItem } from "@/lib/actions/types";

function ChatSidebarTopics({
  currentChannelType,
  isLight,
  onSelectChannel,
  onSelectTopic,
  topicSectionDescription,
  topicSectionTitle,
  topics,
}: {
  currentChannelType: ChatSidebarChannel["channelType"];
  isLight: boolean;
  onSelectChannel: (channelType: ChatSidebarChannel["channelType"]) => void;
  onSelectTopic: (topicId: ChatTopicId) => void;
  topicSectionTitle?: string | null;
  topicSectionDescription?: string | null;
  topics: ChatSidebarTopic[];
}) {
  return (
    <>
      {currentChannelType === "admin_elu" && (topicSectionTitle || topicSectionDescription) ? (
        <div className="px-2 pb-1 pt-2">
          {topicSectionTitle ? (
            <p className={`cmm-text-caption font-semibold ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              {topicSectionTitle}
            </p>
          ) : null}
          {topicSectionDescription ? (
            <p className={`mt-1 cmm-text-caption leading-relaxed ${isLight ? "text-slate-400" : "text-slate-500"}`}>
              {topicSectionDescription}
            </p>
          ) : null}
        </div>
      ) : null}
      {topics.map((topic) => {
        const TopicIcon = topic.icon;
        return (
          <button
            key={topic.id}
            type="button"
            onClick={() => {
              onSelectChannel(currentChannelType);
              onSelectTopic(topic.id);
            }}
            aria-pressed={topic.active}
            className={`group flex w-full items-center gap-3 rounded-[1.25rem] border p-2 pl-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${
              topic.active
                ? isLight
                  ? "border-transparent bg-pink-50 text-pink-800"
                  : "border-transparent bg-pink-900/20 text-pink-300"
                : isLight
                  ? "border-transparent bg-transparent text-slate-600 hover:bg-white"
                  : "border-transparent bg-transparent text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${topic.active ? "bg-pink-100 text-pink-700" : "bg-transparent text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"}`}>
              <TopicIcon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`block text-xs font-bold leading-tight ${topic.active ? "text-pink-900 dark:text-pink-100" : ""}`}>
                {topic.label}
              </span>
              <span className={`block cmm-text-caption leading-tight ${topic.active ? "text-pink-700 dark:text-pink-300" : "text-slate-400"}`}>
                {topic.description}
              </span>
            </div>
            <CmmCountBadge
              count={topic.unreadCount ?? 0}
              tone="rose"
              className="shrink-0"
              accessibleLabel={`${topic.unreadCount ?? 0} notification${(topic.unreadCount ?? 0) > 1 ? "s" : ""} non lue${(topic.unreadCount ?? 0) > 1 ? "s" : ""}`}
            />
          </button>
        );
      })}
    </>
  );
}

function ChatSidebarChannelButton({
  channel,
  currentChannelType,
  isMessagerie,
  onSelectChannel,
  overrides = {},
  tone,
}: {
  channel: ChatSidebarChannel | undefined;
  currentChannelType: ChatSidebarChannel["channelType"];
  isMessagerie: boolean;
  onSelectChannel: (channelType: ChatSidebarChannel["channelType"]) => void;
  overrides?: { label?: string; description?: string; onClick?: () => void; count?: number };
  tone: "light" | "dark";
}) {
  if (!channel) return null;
  return (
    <ChannelButton
      key={channel.channelType}
      active={channel.active && currentChannelType === channel.channelType}
      disabled={channel.disabled}
      onClick={overrides.onClick ?? (() => onSelectChannel(channel.channelType))}
      icon={channel.icon}
      label={overrides.label ?? channel.label}
      description={overrides.description ?? channel.description}
      count={isMessagerie ? channel.unreadCount : overrides.count ?? channel.count}
      accentClass={channel.accentClass}
      chipClass={channel.chipClass}
      isLocked={channel.isLocked}
      tone={tone}
      compact={isMessagerie}
    />
  );
}

export function ChatSidebarContent({
  channels,
  currentChannelType,
  isLight,
  isMessagerie,
  onSelectChannel,
  onSelectTopic,
  topicSectionTitle,
  topicSectionDescription,
  topics,
  tone,
  actionItems,
  activeActionId,
  onSelectAction,
  actionLoading,
  actionError,
  currentZone,
  profileDefaultZone,
  onSelectZone,
}: {
  channels: ChatSidebarChannel[];
  currentChannelType: ChatSidebarChannel["channelType"];
  isLight: boolean;
  isMessagerie: boolean;
  onSelectChannel: (channelType: ChatSidebarChannel["channelType"]) => void;
  onSelectTopic: (topicId: ChatTopicId) => void;
  topicSectionTitle?: string | null;
  topicSectionDescription?: string | null;
  topics: ChatSidebarTopic[];
  tone: "light" | "dark";
  actionItems: ActionListItem[];
  activeActionId: string | null;
  onSelectAction?: (actionId: string) => void;
  actionLoading: boolean;
  actionError: string | null;
  currentZone: string;
  profileDefaultZone: string;
  onSelectZone?: (zoneName: string) => void;
}) {
  const communityChannel = channels.find((channel) => channel.channelType === "community");
  const territoryChannel = channels.find((channel) => channel.channelType === "territory");
  const adminEluChannel = channels.find((channel) => channel.channelType === "admin_elu");
  const channelButtonProps = { currentChannelType, isMessagerie, onSelectChannel, tone };
  const topicProps = { currentChannelType, isLight, onSelectChannel, onSelectTopic, topicSectionDescription, topicSectionTitle, topics };

  return (
    <>
      <section className={isMessagerie ? "w-full space-y-2" : "space-y-2"}>
        <p className={`px-2 cmm-text-caption font-semibold ${isLight ? "text-slate-500" : "text-slate-500"}`}>Discussions</p>
        <div className="space-y-1">
          <ChatSidebarChannelButton {...channelButtonProps} channel={communityChannel} overrides={{ label: "Communauté globale", description: "Conversation collective" }} />
          {currentChannelType === "community" ? <ChatSidebarTopics {...topicProps} /> : null}
          <ChatSidebarChannelButton {...channelButtonProps} channel={territoryChannel} overrides={{ label: "Territoire", description: "Organisation locale" }} />
          {currentChannelType === "territory" && onSelectZone ? <ChatTerritorySelector currentZone={currentZone} profileDefaultZone={profileDefaultZone} onChange={onSelectZone} tone={tone} compact={isMessagerie} /> : null}
        </div>
      </section>
      {isMessagerie ? <ChatActionSurface items={actionItems} activeActionId={activeActionId} onSelectAction={onSelectAction ?? (() => undefined)} loading={actionLoading} error={actionError} tone={tone} /> : null}
      {adminEluChannel && !adminEluChannel.disabled ? <section className="space-y-2"><ChatSidebarChannelButton {...channelButtonProps} channel={adminEluChannel} overrides={{ label: "Admin & élus", description: "Pilotage, arbitrages et coordination" }} />{currentChannelType === "admin_elu" ? <ChatSidebarTopics {...topicProps} /> : null}</section> : null}
      {!isMessagerie ? <section className="space-y-2"><div className="flex items-center justify-between px-2"><p className={`cmm-text-caption font-semibold ${isLight ? "text-slate-400" : "text-slate-500"}`}>Messages privés</p><span className="text-lg leading-none text-slate-400">+</span></div><ChatSidebarChannelButton {...channelButtonProps} channel={channels.find((channel) => channel.channelType === "dm")} overrides={{ label: "Messages privés", description: "Échanges confidentiels en tête-à-tête" }} /></section> : null}
      {!isMessagerie ? <div className={`mt-auto mx-2 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden border ${isLight ? "bg-emerald-50 border-emerald-100" : "bg-emerald-500/10 border-emerald-500/20"}`}><div className="absolute -right-4 -bottom-4 text-emerald-200/50 dark:text-emerald-500/20"><Leaf size={64} /></div><h4 className={`text-xs font-black flex items-center gap-1.5 z-10 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>Impact ensemble <Leaf size={12} /></h4><p className={`cmm-text-caption leading-relaxed z-10 font-medium ${isLight ? "text-emerald-600/80" : "text-emerald-300/70"}`}>Chaque message partagé rapproche notre territoire d&apos;un environnement plus propre.</p></div> : null}
    </>
  );
}
