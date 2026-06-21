"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { MessageCircle, Bell, Star, Map, Leaf } from "lucide-react";

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
  topics,
  tone = "dark",
}: ChatSidebarProps) {
  const isLight = tone === "light";
  const communityChannel = channels.find((channel) => channel.channelType === "community");
  const dmChannel = channels.find((channel) => channel.channelType === "dm");
  const territoryChannel = channels.find((channel) => channel.channelType === "territory");

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
        accentClass={channel.accentClass.replace(/rose|pink/g, "indigo")}
        chipClass={channel.chipClass.replace(/rose|pink/g, "indigo")}
        isLocked={channel.isLocked}
        tone={tone}
      />
    );
  };

  return (
    <aside className={`w-24 md:w-80 flex flex-col p-4 space-y-6 overflow-y-auto border-r custom-scrollbar ${isLight ? "border-rose-100/80 bg-rose-50/30" : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"}`}>
      
      {/* CANAUX PUBLICS */}
      <section className="space-y-2">
        <p className={`px-2 text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
          Canaux Publics
        </p>
        <div className="space-y-1">
          {renderButton(communityChannel, {
            label: "Communauté globale",
            description: "Conversation collective",
          })}
          
          {/* Sub-topics directly listed under the community channel like the mockup */}
          {topics.map((topic) => {
            const TopicIcon = topic.icon;
            const isActive = currentChannelType === "community" && topic.active;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => {
                  onSelectChannel("community");
                  topic.onSelect();
                }}
                className={`group flex w-full items-center gap-3 rounded-[1.25rem] border p-2 pl-3 text-left transition-all duration-300 ${
                  isActive 
                    ? isLight 
                      ? "border-transparent bg-indigo-50/50 text-indigo-700" 
                      : "border-transparent bg-indigo-900/20 text-indigo-300"
                    : isLight 
                      ? "border-transparent bg-transparent text-slate-600 hover:bg-white" 
                      : "border-transparent bg-transparent text-slate-400 hover:bg-slate-800/50"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-indigo-100 text-indigo-600" : "bg-transparent text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800"}`}>
                  <TopicIcon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`block text-xs font-bold leading-tight ${isActive ? "text-indigo-900 dark:text-indigo-100" : ""}`}>
                    {topic.label}
                  </span>
                  <span className={`block text-[10px] leading-tight ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}>
                    {topic.description}
                  </span>
                </div>
                {/* Mock count for visual parity with mockup */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}>
                  {Math.floor(Math.random() * 5) + 1}
                </span>
              </button>
            );
          })}

          {/* Render territory as a public channel as well */}
          {renderButton(territoryChannel, {
            label: "Coordination de secteur",
            description: "Organisation locale",
          })}
        </div>
      </section>

      {/* DISCUSSIONS PRIVEES */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-2">
          <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
            Discussions Privées
          </p>
          <span className="text-lg leading-none text-slate-400">+</span>
        </div>
        {renderButton(dmChannel, {
          label: "Discussions privées",
          description: "Échanges confidentiels en tête-à-tête",
          count: 5
        })}
      </section>

      {/* FILTRES & REPERES */}
      <section className="space-y-3 pt-2">
        <p className={`px-2 text-[10px] font-black uppercase tracking-[0.18em] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
          Filtres & Repères
        </p>
        <div className="grid grid-cols-2 gap-2 px-2">
          <button className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isLight ? "bg-slate-50 hover:bg-white text-slate-700" : "bg-slate-800/50 hover:bg-slate-800 text-slate-300"}`}>
            <span>Non lus</span>
            <span className="text-indigo-500">19</span>
          </button>
          <button className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isLight ? "bg-slate-50 hover:bg-white text-slate-700" : "bg-slate-800/50 hover:bg-slate-800 text-slate-300"}`}>
            <span>@ Mentions</span>
            <span className="text-indigo-500">4</span>
          </button>
          <button className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isLight ? "bg-slate-50 hover:bg-white text-slate-700" : "bg-slate-800/50 hover:bg-slate-800 text-slate-300"}`}>
            <span>Favoris</span>
            <span className="text-indigo-500">3</span>
          </button>
          <button className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-colors ${isLight ? "bg-slate-50 hover:bg-white text-slate-700" : "bg-slate-800/50 hover:bg-slate-800 text-slate-300"}`}>
            <span>Mes secteurs</span>
            <span>▾</span>
          </button>
        </div>
      </section>

      {/* IMPACT ENSEMBLE */}
      <div className={`mt-auto mx-2 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden border ${isLight ? "bg-emerald-50 border-emerald-100" : "bg-emerald-500/10 border-emerald-500/20"}`}>
        <div className="absolute -right-4 -bottom-4 text-emerald-200/50 dark:text-emerald-500/20">
          <Leaf size={64} />
        </div>
        <h4 className={`text-xs font-black flex items-center gap-1.5 z-10 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
          Impact ensemble <Leaf size={12} />
        </h4>
        <p className={`text-[10px] leading-relaxed z-10 font-medium ${isLight ? "text-emerald-600/80" : "text-emerald-300/70"}`}>
          Chaque message partagé rapproche notre territoire d'un environnement plus propre.
        </p>
      </div>

    </aside>
  );
});
