"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";

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
  accentClass: string;
  chipClass: string;
  isLocked: boolean;
};

export type ChatSidebarTopic = ChatTopicDefinition & {
  active: boolean;
  onSelect: () => void;
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
}: ChatSidebarProps) {
  const isLight = tone === "light";
  const communityChannel = channels.find((channel) => channel.channelType === "community");
  const dmChannel = channels.find((channel) => channel.channelType === "dm");
  const adminChannel = channels.find((channel) => channel.channelType === "admin_elu");
  const territoryChannel = channels.find((channel) => channel.channelType === "territory");
  const feedbackChannel = channels.find((channel) => channel.channelType === "bug_report");

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
        count={overrides.count ?? channel.count}
        accentClass={channel.accentClass}
        chipClass={channel.chipClass}
        isLocked={channel.isLocked}
        tone={tone}
      />
    );
  };

  return (
    <aside className={`w-24 md:w-72 flex flex-col p-3 space-y-3 overflow-y-auto border-r ${isLight ? "border-rose-100/80 bg-white/70" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"}`}>
      <section className="space-y-2">
        <p className={`px-2 text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-500" : "text-pink-600"}`}>
          Salons
        </p>
        {renderButton(communityChannel, {
          label: "Communauté globale",
          description: "Conversation collective",
        })}
        {currentChannelType === "community" && topics.length > 0 ? (
          <div className="pl-2 pt-1 space-y-2">
            {topics.map((topic) => {
              const TopicIcon = topic.icon;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={topic.onSelect}
                  className={`group flex w-full items-start gap-3 rounded-[1.25rem] border p-3 text-left transition-all duration-300 ${isLight ? "border-transparent bg-white/75 text-slate-700 hover:border-rose-200 hover:bg-white" : "border-transparent bg-slate-50/90 text-slate-600 hover:border-slate-200 hover:bg-white dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isLight ? "bg-rose-50 text-rose-500" : "bg-white text-slate-500 shadow-sm dark:bg-slate-950/70"}`}>
                    <TopicIcon size={17} className={topic.accentClassName} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] font-black uppercase tracking-widest leading-none">
                      {topic.label}
                    </span>
                    <span className={`mt-1 block text-[10px] leading-tight ${isLight ? "text-slate-500" : "text-slate-400 dark:text-slate-500"}`}>
                      {topic.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-500" : "text-pink-600"}`}>
            Messages privés
          </p>
          <span className="text-lg leading-none text-slate-400">+</span>
        </div>
        {renderButton(dmChannel, {
          label: "Discussions privées",
          description: "Échanges confidentiels",
        })}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-500" : "text-pink-600"}`}>
            Admin & élus
          </p>
          <span className="text-lg leading-none text-slate-400">+</span>
        </div>
        {renderButton(adminChannel, {
          label: "Espace élus & admin",
          description: "Gouvernance et suivi",
        })}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-500" : "text-pink-600"}`}>
            Territoire & limitrophes
          </p>
          <span className="text-lg leading-none text-slate-400">+</span>
        </div>
        {renderButton(territoryChannel, {
          label: "Mon territoire",
          description: "Secteur local",
          onClick: () => {
            onSelectChannel("territory");
          },
        })}
        <button
          type="button"
          onClick={() => {
            onSelectChannel("territory");
            onSelectTopic("territoires_voisins");
          }}
          className={`group flex w-full items-start gap-3 rounded-[1.25rem] border p-3 text-left transition-all duration-300 ${isLight ? "border-transparent bg-white/75 text-slate-700 hover:border-rose-200 hover:bg-white" : "border-transparent bg-slate-50/90 text-slate-600 hover:border-slate-200 hover:bg-white dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"}`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${isLight ? "bg-sky-50 text-sky-500" : "bg-white text-slate-500 shadow-sm dark:bg-slate-950/70"}`}>
            <span className="text-sm font-black">🌐</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-black uppercase tracking-widest leading-none">
              Territoires voisins
            </span>
            <span className={`mt-1 block text-[10px] leading-tight ${isLight ? "text-slate-500" : "text-slate-400 dark:text-slate-500"}`}>
              Coordination limitrophes
            </span>
          </div>
        </button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-500" : "text-pink-600"}`}>
            Feedback
          </p>
          <span className="text-lg leading-none text-slate-400">+</span>
        </div>
        {renderButton(feedbackChannel, {
          label: "Retour utilisateurs",
          description: "Idées et amélioration",
        })}
      </section>

      {currentChannelType === "territory" && topics.length > 0 ? (
        <section className={`rounded-[1.5rem] border p-3 shadow-sm backdrop-blur-sm ${isLight ? "border-rose-100/70 bg-white/80" : "border-slate-800 dark:bg-slate-950/70"}`}>
          <div className="space-y-1">
            <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-rose-500" : "text-rose-600 dark:text-rose-300"}`}>
              {topicSectionTitle ?? "Salons proposés"}
            </p>
            <p className={`hidden md:block text-[11px] leading-tight ${isLight ? "text-slate-500" : "text-slate-500 dark:text-slate-400"}`}>
              {topicSectionDescription ?? "Raccourcis thématiques du canal actif."}
            </p>
          </div>

          <div className="mt-3 space-y-2">
            {topics.map((topic) => {
              const TopicIcon = topic.icon;
              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={topic.onSelect}
                  aria-pressed={topic.active}
                  className={`group flex w-full items-start gap-3 rounded-[1.25rem] border p-3 text-left transition-all duration-300 ${
                    topic.active
                      ? isLight
                        ? "border-rose-200 bg-rose-500 text-white shadow-sm"
                        : "border-rose-200 bg-rose-50 text-rose-700 shadow-sm dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-200"
                      : isLight
                        ? "border-transparent bg-rose-50/50 text-slate-700 hover:border-rose-200 hover:bg-white"
                        : "border-transparent bg-slate-50/90 text-slate-600 hover:border-slate-200 hover:bg-white dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                      topic.active
                        ? "bg-white/20 text-white"
                        : isLight
                          ? "bg-white text-slate-500 shadow-sm"
                          : "bg-white text-slate-500 shadow-sm dark:bg-slate-950/70"
                    }`}
                  >
                    <TopicIcon size={17} className={topic.accentClassName} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="block text-[10px] font-black uppercase tracking-widest leading-none">
                          {topic.label}
                        </span>
                        <span
                          className={`mt-1 block text-[10px] leading-tight ${
                            topic.active
                              ? "text-white/80"
                              : isLight
                                ? "text-slate-500"
                                : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          {topic.description}
                        </span>
                      </div>
                      {topic.active ? (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">
                          Actif
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </aside>
  );
});
