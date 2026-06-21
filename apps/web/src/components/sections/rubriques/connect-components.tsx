"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  Hash,
  Info,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  Shield,
  Users,
} from "lucide-react";
import { getDiscussionGuidance } from "@/components/chat/discussion-guidance";
import { CmmButton } from "@/components/ui/cmm-button";
import { cn } from "@/lib/utils";
import type {
  ChannelStat,
  CommunityAnnouncementTemplateKey,
  ConnectTab,
  ConnectTabItem,
} from "./connect-types";

type TabTone = {
  active: string;
  icon: string;
  hoverText: string;
  subtitle: string;
};

const TAB_TONES: Record<ConnectTab, TabTone> = {
  discussions: {
    active: "bg-rose-500",
    icon: "text-rose-500",
    hoverText: "hover:text-rose-600",
    subtitle: "group-hover:text-rose-400",
  },
  dm: {
    active: "bg-fuchsia-500",
    icon: "text-fuchsia-500",
    hoverText: "hover:text-fuchsia-600",
    subtitle: "group-hover:text-fuchsia-400",
  },
};

export const CHANNEL_STATS: ChannelStat[] = [
  { label: { fr: "Communauté", en: "Community" }, icon: Users, count: "Public", color: "text-rose-400" },
  { label: { fr: "Privé", en: "Private" }, icon: Mail, count: "1:1", color: "text-fuchsia-400" },
  { label: { fr: "Admin & élus", en: "Admin & elected" }, icon: Shield, count: "Réservé", color: "text-fuchsia-300" },
  { label: { fr: "Territoire", en: "Territory" }, icon: MapPin, count: "Local", color: "text-rose-300" },
  { label: { fr: "Idées et problèmes", en: "Ideas & issues" }, icon: MessageSquare, count: "Direct", color: "text-fuchsia-300" },
];

export const CONNECT_TABS: ConnectTabItem[] = [
  {
    id: "discussions",
    label: { fr: "Canaux Publics", en: "Public Channels" },
    icon: Hash,
    desc: {
      fr: "Communauté & Territoire",
      en: "Community & Territory",
    },
  },
  {
    id: "dm",
    label: { fr: "Messages privés", en: "Private messages" },
    icon: Mail,
    desc: {
      fr: "Confidentiel & Direct",
      en: "Confidential & Direct",
    },
  },
];

export const ConnectTabs = memo(function ConnectTabs({
  activeTab,
  setActiveTab,
  fr,
}: {
  activeTab: ConnectTab;
  setActiveTab: (tab: ConnectTab) => void;
  fr: boolean;
}) {
  return (
    <div className="flex gap-1.5 rounded-[2rem] border border-rose-100 bg-white p-1.5 shadow-sm">
      {CONNECT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const tone = TAB_TONES[tab.id];

        return (
          <CmmButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            tone={isActive ? "primary" : "tertiary"}
            variant="pill"
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-[1.5rem] px-6 py-3 transition-all duration-300",
              isActive ? "text-white" : cn("text-slate-600", tone.hoverText),
            )}
          >
            {isActive && (
              <motion.div
                layoutId="connect-tab-active"
                className={cn("absolute inset-0 -z-10 shadow-sm", tone.active)}
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <tab.icon
              size={18}
              className={cn(
                "transition-transform group-hover:scale-110",
                isActive ? "text-white" : cn("text-slate-500", tone.icon),
              )}
            />
            <div className="relative z-10 text-left">
              <span className="block text-[11px] font-black uppercase tracking-widest">
                {fr ? tab.label.fr : tab.label.en}
              </span>
              <span
                className={cn(
                  "mt-0.5 hidden text-[9px] font-black uppercase tracking-[0.2em] sm:block",
                  isActive ? "text-white/80" : cn("text-slate-400", tone.subtitle),
                )}
              >
                {fr ? tab.desc.fr : tab.desc.en}
              </span>
            </div>
          </CmmButton>
        );
      })}
    </div>
  );
});

export const ConnectHeroCompact = memo(function ConnectHeroCompact({ fr }: { fr: boolean }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        {
          title: fr ? "Publier en communauté" : "Post to community",
          text: fr ? "Coordination visible." : "Visible coordination.",
          icon: Users,
          accent: { icon: "text-rose-300 bg-rose-400/20 border-rose-400/30", bar: "bg-rose-400" },
        },
        {
          title: fr ? "Écrire en privé" : "Write privately",
          text: fr ? "Échange confidentiel." : "Confidential exchange.",
          icon: Lock,
          accent: { icon: "text-fuchsia-300 bg-fuchsia-400/20 border-fuchsia-400/30", bar: "bg-fuchsia-400" },
        },
        {
          title: fr ? "Ancrer un sujet local" : "Anchor a local topic",
          text: fr ? "Secteur précis." : "Specific sector.",
          icon: MapPin,
          accent: { icon: "text-rose-300 bg-rose-400/20 border-rose-400/30", bar: "bg-rose-400" },
        },
      ].map((item) => (
        <div
          key={item.title}
          className="group relative overflow-hidden rounded-2xl border border-rose-100 bg-white p-5 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md"
        >
          <div className={cn("absolute inset-x-0 top-0 z-10 h-[2px]", item.accent.bar)} />
          <div className="flex items-center gap-4">
            <div className={cn("flex items-center justify-center rounded-xl border p-2.5", item.accent.icon)}>
              <item.icon size={16} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500">{item.text}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

export const ConnectGuideCompact = memo(function ConnectGuideCompact({
  activeTab,
  locale,
  fr,
}: {
  activeTab: ConnectTab;
  locale: string;
  fr: boolean;
}) {
  const currentTabGuide = activeTab === "dm"
    ? getDiscussionGuidance("dm", { locale: locale as "fr" | "en" })
    : getDiscussionGuidance("community", { locale: locale as "fr" | "en" });

  const toneClass = activeTab === "dm" ? "border-fuchsia-100 bg-fuchsia-500/5" : "border-rose-100 bg-rose-500/5";
  const iconClass = activeTab === "dm" ? "bg-fuchsia-500/20 text-fuchsia-400" : "bg-rose-500/20 text-rose-400";
  const badgeClass = activeTab === "dm"
    ? "bg-fuchsia-500/10 border-fuchsia-200/40"
    : "bg-rose-500/10 border-rose-200/40";

  return (
    <div className={cn("flex flex-col items-center justify-between gap-4 rounded-2xl border p-5 md:flex-row", toneClass)}>
      <div className="flex items-center gap-4">
        <div className={cn("rounded-xl p-3", iconClass)}>
          <Info size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">
            {activeTab === "dm" ? (fr ? "Échange confidentiel" : "Confidential exchange") : (fr ? "Canaux Thématiques" : "Thematic Channels")}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {activeTab === "discussions"
              ? (fr ? "Communauté pour le groupe, privé pour un échange direct." : "Community for the group, private for one-to-one.")
              : currentTabGuide.cardSummary}
          </p>
        </div>
      </div>
      <div className={cn("rounded-lg border px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500", badgeClass)}>
        {currentTabGuide.visibilityLabel}
      </div>
    </div>
  );
});

export const ConnectAnnouncementCompact = memo(function ConnectAnnouncementCompact({
  announcementTemplate,
  setAnnouncementTemplate,
  fr,
}: {
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  setAnnouncementTemplate: (template: CommunityAnnouncementTemplateKey | null) => void;
  fr: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-white">
            {fr ? "Préparer un message de relais" : "Prepare a relay message"}
          </h3>
          <p className="text-xs text-slate-400">
            {fr ? "Utilisez un modèle pour aller plus vite." : "Use a template to go faster."}
          </p>
        </div>
        {announcementTemplate && (
          <CmmButton
            type="button"
            onClick={() => setAnnouncementTemplate(null)}
            tone="tertiary"
            variant="pill"
            className="rounded-lg px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
          >
            {fr ? "Effacer" : "Clear"}
          </CmmButton>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { key: "relais_associatif" as const, label: fr ? "Relais Associatif" : "Association Relay", icon: Users, tone: "rose" },
          { key: "benevoles" as const, label: fr ? "Appel Bénévoles" : "Volunteer Call", icon: Send, tone: "fuchsia" },
          { key: "diffusion" as const, label: fr ? "Diffusion" : "Diffusion", icon: Hash, tone: "rose" },
        ].map((option) => {
          const isActive = announcementTemplate === option.key;
          const isFuchsia = option.tone === "fuchsia";

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setAnnouncementTemplate(option.key)}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-xs font-black uppercase tracking-widest transition-all",
                isActive
                  ? isFuchsia
                    ? "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-300"
                    : "border-rose-400/50 bg-rose-500/20 text-rose-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
              )}
            >
              <option.icon
                size={14}
                className={isActive ? (isFuchsia ? "text-fuchsia-400" : "text-rose-400") : "text-slate-500"}
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});
