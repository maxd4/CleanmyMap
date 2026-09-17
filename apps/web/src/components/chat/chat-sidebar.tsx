"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Leaf } from "lucide-react";

import type { ChatChannelType } from "@/lib/chat/channels";
import type { ChatTopicDefinition, ChatTopicId } from "./discussion-guidance";
import { ChannelButton } from "./ui/channel-button";
import { ChatActionSurface } from "./chat-action-surface";
import { ChatTerritorySelector } from "./chat-territory-selector";
import { CmmCountBadge } from "@/components/ui/cmm-count-badge";
import type { ActionListItem } from "@/lib/actions/types";

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
  const communityChannel = channels.find((channel) => channel.channelType === "community");
  const territoryChannel = channels.find((channel) => channel.channelType === "territory");
  const adminEluChannel = channels.find((channel) => channel.channelType === "admin_elu");

  const renderTopics = () => (
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
                  ? "border-transparent bg-pink-50 text-pink-800"
                  : "border-transparent bg-pink-900/20 text-pink-300"
                : isLight
                  ? "border-transparent bg-transparent text-slate-600 hover:bg-white"
                  : "border-transparent bg-transparent text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${topicIsActive ? "bg-pink-100 text-pink-700" : "bg-transparent text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"}`}>
              <TopicIcon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`block text-xs font-bold leading-tight ${topicIsActive ? "text-pink-900 dark:text-pink-100" : ""}`}>
                {topic.label}
              </span>
              <span className={`block cmm-text-caption leading-tight ${topicIsActive ? "text-pink-700 dark:text-pink-300" : "text-slate-400"}`}>
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
        accentClass={channel.accentClass}
        chipClass={channel.chipClass}
        isLocked={channel.isLocked}
        tone={tone}
        compact={isMessagerie}
      />
    );
  };

  return (
    <aside className={`${className || "flex"} custom-scrollbar ${isMessagerie ? "w-full shrink-0 flex-col gap-3 overflow-y-auto border-b p-3 md:w-60 md:gap-4 md:border-b-0 md:border-r md:p-3" : "w-24 flex-col space-y-6 overflow-y-auto border-r p-4 md:w-80"} ${isLight ? "border-rose-100/80 bg-rose-50/30" : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50"}`}>
      
      {/* DISCUSSIONS */}
      <section className={isMessagerie ? "w-full space-y-2" : "space-y-2"}>
        <p className={`px-2 cmm-text-caption font-semibold ${isLight ? "text-slate-500" : "text-slate-500"}`}>
          Discussions
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
            description: currentChannelType === "territory" ? "Tous les sujets de la zone choisie" : "Organisation locale",
          })}
          {currentChannelType === "territory" && onSelectZone ? (
            <ChatTerritorySelector
              currentZone={currentZone}
              profileDefaultZone={profileDefaultZone}
              onChange={onSelectZone}
              tone={tone}
              compact={isMessagerie}
            />
          ) : null}
          {currentChannelType === "territory" ? renderTopics() : null}

        </div>
      </section>

      {isMessagerie ? (
        <ChatActionSurface
          items={actionItems}
          activeActionId={activeActionId}
          onSelectAction={onSelectAction ?? (() => undefined)}
          loading={actionLoading}
          error={actionError}
          tone={tone}
        />
      ) : null}

      {adminEluChannel && !adminEluChannel.disabled ? (
        <section className="space-y-2">
          {renderButton(adminEluChannel, {
            label: "Admin & élus",
            description: "Pilotage, arbitrages et coordination",
          })}
          {currentChannelType === "admin_elu" ? renderTopics() : null}
        </section>
      ) : null}

      {!isMessagerie ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-2">
            <p className={`cmm-text-caption font-semibold ${isLight ? "text-slate-400" : "text-slate-500"}`}>
              Messages privés
            </p>
            <span className="text-lg leading-none text-slate-400">+</span>
          </div>
          {renderButton(channels.find((channel) => channel.channelType === "dm"), {
            label: "Messages privés",
            description: "Échanges confidentiels en tête-à-tête",
          })}
        </section>
      ) : null}

      {/* IMPACT ENSEMBLE */}
      {!isMessagerie ? <div className={`mt-auto mx-2 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden border ${isLight ? "bg-emerald-50 border-emerald-100" : "bg-emerald-500/10 border-emerald-500/20"}`}>
        <div className="absolute -right-4 -bottom-4 text-emerald-200/50 dark:text-emerald-500/20">
          <Leaf size={64} />
        </div>
        <h4 className={`text-xs font-black flex items-center gap-1.5 z-10 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
          Impact ensemble <Leaf size={12} />
        </h4>
        <p className={`cmm-text-caption leading-relaxed z-10 font-medium ${isLight ? "text-emerald-600/80" : "text-emerald-300/70"}`}>
          Chaque message partagé rapproche notre territoire d&apos;un environnement plus propre.
        </p>
      </div> : null}

    </aside>
  );
});
