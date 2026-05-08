"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import {
  Info,
  Hash,
  Mail,
  MapPin,
  MessageSquare,
  Shield,
  Users,
  Sparkles,
  ArrowRight,
  Send,
  Lock,
  Globe
} from "lucide-react";
import { getDiscussionGuidance } from "@/components/chat/discussion-guidance";
import type { ConnectTab, CommunityAnnouncementTemplateKey, ChannelStat, ConnectTabItem } from "./connect-types";
import { cn } from "@/lib/utils";

export const CHANNEL_STATS: ChannelStat[] = [
  { label: { fr: "Communauté", en: "Community" }, icon: Users, count: "Public", color: "text-emerald-400" },
  { label: { fr: "Privé", en: "Private" }, icon: Mail, count: "1:1", color: "text-blue-400" },
  { label: { fr: "Admin & élus", en: "Admin & elected" }, icon: Shield, count: "Réservé", color: "text-purple-400" },
  { label: { fr: "Territoire", en: "Territory" }, icon: MapPin, count: "Local", color: "text-amber-400" },
  { label: { fr: "Feedback", en: "Feedback" }, icon: MessageSquare, count: "Direct", color: "text-rose-400" },
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
    label: { fr: "Messages Privés", en: "Private Messages" },
    icon: Mail,
    desc: {
      fr: "Confidentiel & Direct",
      en: "Confidential & Direct",
    },
  },
];

export const ConnectHero = memo(function ConnectHero({ fr }: { fr: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-slate-900/40 px-8 py-16 text-white shadow-2xl lg:py-24 backdrop-blur-3xl">
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent opacity-50" />
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
        <Globe size={300} className="text-fuchsia-400" />
      </div>
      
      <div className="relative z-10 mx-auto max-w-5xl space-y-12 text-center">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 backdrop-blur-md">
          <Sparkles size={16} className="text-fuchsia-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
            {fr ? "Espace de Dialogue" : "Dialogue Space"}
          </span>
        </div>

        <div className="space-y-6">
          <h1 className="text-5xl font-black leading-tight tracking-tighter sm:text-6xl md:text-7xl bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            {fr ? (
              <>
                Parlez au bon endroit,
                <br />
                dès le premier message.
              </>
            ) : (
              <>
                Speak in the right place,
                <br />
                from the first message.
              </>
            )}
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-bold leading-relaxed text-slate-400">
            {fr
              ? "Choisissez le canal, voyez qui lit le message, puis lancez la conversation sans page vide ni ambiguïté."
              : "Choose the right channel, see who reads it, and start the conversation without friction or ambiguity."}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: fr ? "Publier en communauté" : "Post to community",
              text: fr ? "Pour une coordination visible." : "For visible coordination.",
              icon: Users,
              color: "text-emerald-400"
            },
            {
              title: fr ? "Écrire en privé" : "Write privately",
              text: fr ? "Pour un échange confidentiel." : "For confidential exchange.",
              icon: Lock,
              color: "text-blue-400"
            },
            {
              title: fr ? "Ancrer un sujet local" : "Anchor a local topic",
              text: fr ? "Pour un secteur précis." : "For a specific sector.",
              icon: MapPin,
              color: "text-amber-400"
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group p-6 rounded-[2rem] border border-white/5 bg-white/5 text-left backdrop-blur-md hover:border-white/20 transition-all hover:translate-y-[-4px]"
            >
              <item.icon size={24} className={cn("mb-4", item.color)} />
              <p className="text-xs font-black uppercase tracking-widest text-white mb-2">
                {item.title}
              </p>
              <p className="text-xs leading-relaxed text-slate-500 font-bold group-hover:text-slate-300 transition-colors">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {CHANNEL_STATS.map((stat) => (
            <div
              key={stat.label.fr}
              className="inline-flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-2 backdrop-blur-sm group hover:bg-white/10 transition-colors"
            >
              <stat.icon size={14} className={stat.color} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">
                {fr ? stat.label.fr : stat.label.en}
              </span>
              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg bg-white/5", stat.color)}>
                {stat.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

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
    <div className="p-2 bg-slate-950/60 border border-white/10 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl flex gap-2">
      {CONNECT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-4 px-8 py-4 rounded-[1.75rem] transition-all duration-500 group overflow-hidden",
              isActive ? "text-white" : "text-slate-500 hover:text-slate-200"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="connect-tab-active"
                className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 to-purple-700 shadow-2xl -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon size={20} className={isActive ? "text-white" : "text-slate-500 group-hover:text-fuchsia-400"} />
            <div className="text-left">
              <span className="text-xs font-black uppercase tracking-widest block">
                {fr ? tab.label.fr : tab.label.en}
              </span>
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] opacity-60 block mt-0.5", isActive ? "text-white" : "text-slate-600")}>
                {fr ? tab.desc.fr : tab.desc.en}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

export const ConnectGuide = memo(function ConnectGuide({
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

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div 
        layout
        className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
          <Info size={100} className="text-fuchsia-400" />
        </div>
        <div className="flex items-start gap-8 relative z-10">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 shadow-2xl">
            <Info size={24} />
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-400 mb-1">
                {activeTab === "dm" ? (fr ? "Confidentialité" : "Privacy") : (fr ? "Intelligence Collective" : "Collective Intelligence")}
              </p>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {activeTab === "dm" ? (fr ? "Échange direct et confidentiel" : "Direct and confidential exchange") : (fr ? "Canaux Thématiques" : "Thematic Channels")}
              </h2>
            </div>
            <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-3xl">
              {activeTab === "discussions" 
                ? (fr ? "Choisissez un canal puis envoyez un message court. Communauté pour le groupe, privé pour un échange direct, territoire pour le local, feedback pour le produit." : "Choose one channel, then send a short message. Community for the group, private for one-to-one, territory for local topics, feedback for the product.")
                : currentTabGuide.cardSummary}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500 italic">
                {currentTabGuide.visibilityLabel}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export const ConnectAnnouncement = memo(function ConnectAnnouncement({
  announcementTemplate,
  setAnnouncementTemplate,
  communityInitialMessage,
  fr,
}: {
  announcementTemplate: CommunityAnnouncementTemplateKey | null;
  setAnnouncementTemplate: (template: CommunityAnnouncementTemplateKey | null) => void;
  communityInitialMessage: string;
  fr: boolean;
}) {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-[2.5rem] border border-white/10 bg-slate-900/40 p-8 backdrop-blur-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-400">
              {fr ? "Accélération Spontanée" : "Spontaneous Boost"}
            </p>
            <h3 className="text-xl font-black text-white tracking-tight">
              {fr ? "Préparer un message de relais" : "Prepare a relay message"}
            </h3>
          </div>
          {announcementTemplate && (
            <button
              type="button"
              onClick={() => setAnnouncementTemplate(null)}
              className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
            >
              {fr ? "Effacer le template" : "Clear template"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              key: "relais_associatif" as const,
              label: fr ? "Relais Associatif" : "Association Relay",
              icon: Users
            },
            {
              key: "benevoles" as const,
              label: fr ? "Appel aux Bénévoles" : "Volunteer Call",
              icon: Send
            },
            {
              key: "diffusion" as const,
              label: fr ? "Demande de Diffusion" : "Diffusion Request",
              icon: Hash
            },
          ].map((option) => {
            const isActive = announcementTemplate === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setAnnouncementTemplate(option.key)}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 rounded-2xl border transition-all text-left group",
                  isActive
                    ? "bg-fuchsia-600 border-fuchsia-400 text-white shadow-xl shadow-fuchsia-600/20"
                    : "bg-white/5 border-white/5 text-slate-500 hover:border-white/20 hover:text-white"
                )}
              >
                <option.icon size={16} className={cn("transition-transform group-hover:scale-110", isActive ? "text-white" : "text-slate-500")} />
                <span className="text-[11px] font-black uppercase tracking-widest">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {communityInitialMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 p-6 rounded-3xl bg-fuchsia-500/5 border border-fuchsia-500/20 relative group"
            >
              <div className="absolute top-4 right-6 text-fuchsia-500 opacity-20">
                <Sparkles size={24} />
              </div>
              <p className="text-sm font-bold text-slate-300 leading-relaxed italic">
                "{communityInitialMessage}"
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-fuchsia-500 mt-4">
                Message suggéré prêt à l'envoi
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});
