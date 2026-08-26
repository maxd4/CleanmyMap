"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Leaf } from "lucide-react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicDefinition, ChatTopicId } from "./discussion-guidance";
import { ChannelButton } from "./ui/channel-button";

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

export type ChatSidebarTopic = ChatTopicDefinition & {
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
};

export const ChatSidebar = memo(function ChatSidebar({
  channels,
  currentChannelType,
  onSelectChannel,
  onSelectTopic,
  topics,
  tone = "dark",
  presentation = "default",
}: ChatSidebarProps) {
  const isLight = tone === "light";
  const isMessagerie = presentation === "messagerie";
  const communityChannel = channels.find((channel) => channel.channelType === "community");
  const dmChannel = channels.find((channel) => channel.channelType === "dm");
  const territoryChannel = channels.find((channel) => channel.channelType === "territory");

  const renderTopics = () =>
    topics.map((topic) => {
      const TopicIcon = topic.icon;
      const topicIsActive = topic.active;
      return (
        <button
          key={topic.id}
          type="button"
          onClick={() => {
            onSelectChannel(currentChannelType);
            onSelectTopic(topic.id);
          }}
          aria-pressed={topicIsActive}
          className={`group flex w-full items-center gap-3 rounded-[1.25rem] border p-2 pl-3 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 ${
            topicIsActive
              ? isLight
                ? "border-transparent bg-indigo-50/50 text-indigo-700"
                : "border-transparent bg-indigo-900/20 text-indigo-300"
              : isLight
                ? "border-transparent bg-transparent text-slate-600 hover:bg-white"
                : "border-transparent bg-transparent text-slate-400 hover:bg-slate-800/50"
          }`}
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${topicIsActive ? "bg-indigo-100 text-indigo-600" : "bg-transparent text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"}`}>
            <TopicIcon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <span className={`block text-xs font-bold leading-tight ${topicIsActive ? "text-indigo-900 dark:text-indigo-100" : ""}`}>
              {topic.label}
            </span>
            <span className={`block text-[10px] leading-tight ${topicIsActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
              {topic.description}
            </span>
          </div>
          {topic.unreadCount && topic.unreadCount > 0 ? (
            <span
              className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black text-white"
              aria-label={`${topic.unreadCount} notification${topic.unreadCount > 1 ? "s" : ""} non lue${topic.unreadCount > 1 ? "s" : ""}`}
            >
              {topic.unreadCount > 99 ? "99+" : topic.unreadCount}
            </span>
          ) : null}
        </button>
      );
    });

  const renderButton = (
    channel: ChatSidebarChannel | undefined,
    overrides: { label?: string; description?: string; onClick?: () => void; count?: number } = {},
  ) => {
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
        accentClass={channel.accentClass.replace(/rose|pink/g, "indigo")}
        chipClass={channel.chipClass.replace(/rose|pink/g, "indigo")}
        isLocked={channel.isLocked}
        tone={tone}
      />
    );
  };

  return (
    <aside className={`custom-scrollbar ${isMessagerie ? "flex w-full shrink-0 flex-row gap-3 overflow-x-auto overflow-y-hidden border-b p-3 md:w-64 md:flex-col md:gap-6 md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r md:p-4" : "flex w-24 flex-col space-y-6 overflow-y-auto border-r p-4 md:w-80"} ${isLight ? "border-rose-100/80 bg-rose-50/30" : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"}`}>
      
      {/* CANAUX PUBLICS */}
      <section className={isMessagerie ? "w-[17rem] shrink-0 space-y-2 md:w-auto md:shrink" : "space-y-2"}>
        <p className={`px-2 text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
          {isMessagerie ? "Discussions" : "Canaux Publics"}
        </p>
        <div className="space-y-1">
          {renderButton(communityChannel, {
            label: "Communauté globale",
            description: "Conversation collective",
          })}
          
          {currentChannelType === "community" ? renderTopics() : null}

          {/* Render territory as a public channel as well */}
          {renderButton(territoryChannel, {
            label: currentChannelType === "territory" ? "Territoire global" : "Coordination de secteur",
            description: currentChannelType === "territory" ? "Tous les sujets de votre zone" : "Organisation locale",
          })}
          {currentChannelType === "territory" ? renderTopics() : null}
        </div>
      </section>

      {/* DISCUSSIONS PRIVEES */}
      <section className={isMessagerie ? "w-[17rem] shrink-0 space-y-2 md:w-auto md:shrink" : "space-y-2"}>
        <div className="flex items-center justify-between px-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
            {isMessagerie ? "Messages privés" : "Discussions Privées"}
          </p>
          {!isMessagerie ? <span className="text-lg leading-none text-slate-400">+</span> : null}
        </div>
        {renderButton(dmChannel, {
          label: "Discussions privées",
          description: "Échanges confidentiels en tête-à-tête",
        })}
      </section>

      {/* IMPACT ENSEMBLE */}
      {!isMessagerie ? <div className={`mt-auto mx-2 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden border ${isLight ? "bg-emerald-50 border-emerald-100" : "bg-emerald-500/10 border-emerald-500/20"}`}>
        <div className="absolute -right-4 -bottom-4 text-emerald-200/50 dark:text-emerald-500/20">
          <Leaf size={64} />
        </div>
        <h4 className={`text-xs font-black flex items-center gap-1.5 z-10 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
          Impact ensemble <Leaf size={12} />
        </h4>
        <p className={`text-[10px] leading-relaxed z-10 font-medium ${isLight ? "text-emerald-600/80" : "text-emerald-300/70"}`}>
          Chaque message partagé rapproche notre territoire d&apos;un environnement plus propre.
        </p>
      </div> : null}

    </aside>
  );
});
