"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    <div className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-black/30 px-8 py-16 text-white shadow-2xl lg:py-24 backdrop-blur-3xl">
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
          <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-black leading-[0.93] tracking-[-0.04em] text-white">
            {fr ? (
              <>
                Parlez au bon endroit,<br />dès le premier message.
              </>
            ) : (
              <>
                Speak in the right place,<br />from the first message.
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
              accent: { icon: "text-emerald-300 bg-emerald-400/20 border-emerald-400/30", bar: "bg-emerald-400" }
            },
            {
              title: fr ? "Écrire en privé" : "Write privately",
              text: fr ? "Pour un échange confidentiel." : "For confidential exchange.",
              icon: Lock,
              accent: { icon: "text-blue-300 bg-blue-400/20 border-blue-400/30", bar: "bg-blue-400" }
            },
            {
              title: fr ? "Ancrer un sujet local" : "Anchor a local topic",
              text: fr ? "Pour un secteur précis." : "For a specific sector.",
              icon: MapPin,
              accent: { icon: "text-amber-300 bg-amber-400/20 border-amber-400/30", bar: "bg-amber-400" }
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group relative overflow-hidden rounded-3xl border border-white/10 transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_12px_40px_-8px_rgba(217,70,239,0.2)] text-left"
            >
              <div className="pointer-events-none absolute inset-0 rounded-3xl bg-black/30 transition-colors duration-300 group-hover:bg-black/35" />
              <div className={cn("absolute inset-x-0 top-0 h-[3px] z-10", item.accent.bar)} />

              <div className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className={cn("flex items-center justify-center rounded-xl border p-2.5", item.accent.icon)}>
                    <item.icon size={16} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    {fr ? "Objectif" : "Goal"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xl font-black tracking-tight text-white leading-snug">
                    {item.title}
                  </p>
                  <p className="text-sm text-white/75 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          {CHANNEL_STATS.map((stat) => (
            <div
              key={stat.label.fr}
              className="inline-flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 px-4 py-2 backdrop-blur-sm group hover:bg-black/50 transition-colors"
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
    <div className="p-2 bg-black/40 border border-white/5 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl flex gap-2">
      {CONNECT_TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex items-center gap-4 px-8 py-4 rounded-[1.75rem] transition-all duration-500 group overflow-hidden",
              isActive ? "text-fuchsia-300" : "text-slate-500 hover:text-white"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="connect-tab-active"
                className="absolute inset-0 bg-fuchsia-500/10 border border-fuchsia-500/20 shadow-[0_0_30px_rgba(217,70,239,0.15)] -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon size={20} className={cn("transition-transform group-hover:scale-110", isActive ? "text-fuchsia-400" : "text-slate-500 group-hover:text-white")} />
            <div className="text-left relative z-10">
              <span className="text-[11px] font-black uppercase tracking-widest block">
                {fr ? tab.label.fr : tab.label.en}
              </span>
              <span className={cn("text-[9px] font-black uppercase tracking-[0.2em] block mt-0.5", isActive ? "text-fuchsia-300/70" : "text-slate-600 group-hover:text-slate-400")}>
                {fr ? tab.desc.fr : tab.desc.en}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
});

import { RubriqueCard, RubriqueCardIcon } from "@/components/ui/rubrique-card";

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
      <RubriqueCard 
        themeColor="fuchsia" 
        watermarkIcon={Info}
        watermarkSize={100}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <RubriqueCardIcon 
            icon={Info} 
            themeColor="fuchsia" 
            className="animate-pulse"
          />
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl bg-fuchsia-500/20 text-fuchsia-300">
                {activeTab === "dm" ? (fr ? "Confidentialité" : "Privacy") : (fr ? "Intelligence Collective" : "Collective Intelligence")}
              </span>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter leading-none">
              {activeTab === "dm" ? (fr ? "Échange direct et confidentiel" : "Direct and confidential exchange") : (fr ? "Canaux Thématiques" : "Thematic Channels")}
            </h2>
            <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-3xl opacity-80">
              {activeTab === "discussions" 
                ? (fr ? "Choisissez un canal puis envoyez un message court. Communauté pour le groupe, privé pour un échange direct, territoire pour le local, feedback pour le produit." : "Choose one channel, then send a short message. Community for the group, private for one-to-one, territory for local topics, feedback for the product.")
                : currentTabGuide.cardSummary}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="px-4 py-1.5 rounded-lg bg-black/50 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-500 italic">
                {currentTabGuide.visibilityLabel}
              </div>
            </div>
          </div>
        </div>
      </RubriqueCard>
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
      <div className="rounded-[2.5rem] border border-white/10 bg-black/30 p-8 backdrop-blur-3xl shadow-2xl relative overflow-hidden group transition-colors hover:bg-black/40">
        <div className="absolute inset-x-0 top-0 h-[3px] z-10 bg-fuchsia-500" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
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
              className="px-6 py-2 rounded-xl bg-black/50 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-black/70 transition-all"
            >
              {fr ? "Effacer le template" : "Clear template"}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative z-10">
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
                  "flex items-center gap-4 px-6 py-4 rounded-[1.5rem] border transition-all duration-300 text-left group",
                  isActive
                    ? "bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-300 shadow-[0_4px_16px_-4px_rgba(217,70,239,0.3)] hover:-translate-y-0.5 hover:bg-fuchsia-500/30"
                    : "bg-black/30 border-white/10 text-slate-500 hover:border-white/25 hover:text-white hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(0,0,0,0.4)]"
                )}
              >
                <div className={cn("flex items-center justify-center rounded-xl p-2", isActive ? "bg-fuchsia-400/20" : "bg-white/5 group-hover:bg-white/10")}>
                  <option.icon size={16} className={cn("transition-transform group-hover:scale-110", isActive ? "text-fuchsia-300" : "text-slate-500 group-hover:text-white")} />
                </div>
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
