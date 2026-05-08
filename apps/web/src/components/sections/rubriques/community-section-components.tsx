"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { ActionsHistoryList } from "@/components/actions/actions-history-list";
import { CommunityConversionKpiGrid } from "@/components/sections/rubriques/community/conversion-kpi-grid";
import { CommunityCreateEventCard } from "@/components/sections/rubriques/community/create-event-card";
import { CommunityEventsTabsCard } from "@/components/sections/rubriques/community/events-tabs-card";
import { CommunityFunnelExportCard } from "@/components/sections/rubriques/community/funnel-export-card";
import { CommunityHighlightsCard } from "@/components/sections/rubriques/community/highlights-card";
import { CommunityPostEventLoopCard } from "@/components/sections/rubriques/community/post-event-loop-card";
import { CommunityRemindersCard } from "@/components/sections/rubriques/community/reminders-card";
import { CommunityStaffingCard } from "@/components/sections/rubriques/community/staffing-card";
import { WeatherSection } from "@/components/sections/rubriques/weather-section";
import { NewsletterSignup } from "@/components/newsletter/newsletter-signup";
import { ExternalHubSection } from "@/components/sections/rubriques/community/external-hub-section";
import { CleanupGuideCard } from "@/components/sections/rubriques/community/cleanup-guide-card";
import { OrganizerKitCard } from "@/components/sections/rubriques/community/organizer-kit-card";
import { CampaignsSection } from "@/components/sections/rubriques/community/campaigns-section";
import { MissionZeroSection } from "@/components/sections/rubriques/mission-zero-section";
import { FAQSection } from "@/components/sections/rubriques/faq-section";
import { LegalSection } from "@/components/sections/rubriques/legal-section";
import { ChatShell } from "@/components/chat/chat-shell";
import { MapPin, Calendar, Lightbulb, Target, Sparkles, Globe, ShieldCheck } from "lucide-react";

export type HubCategory = "agir" | "missions" | "solutions";

export const CommunityHubNav = memo(function CommunityHubNav({
  category,
  setCategory,
  zone,
  setZone,
  fr,
}: {
  category: HubCategory;
  setCategory: (cat: HubCategory) => void;
  zone: string;
  setZone: (zone: string) => void;
  fr: boolean;
}) {
  const tabs: { id: HubCategory; label: string; icon: any; color: string; bg: string; shadow: string }[] = [
    { id: "missions", label: fr ? "Missions" : "Missions", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500", shadow: "shadow-blue-500/20" },
    { id: "agir", label: fr ? "Agir" : "Act", icon: Target, color: "text-emerald-400", bg: "bg-emerald-500", shadow: "shadow-emerald-500/20" },
    { id: "solutions", label: fr ? "Solutions" : "Solutions", icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-500", shadow: "shadow-amber-500/20" },
  ];

  return (
    <div className="bg-slate-950/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 flex flex-wrap gap-4 items-center justify-between shadow-2xl">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={`relative flex items-center gap-3 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${
                isActive ? "text-white" : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-community-hub"
                  className={`absolute inset-0 ${tab.bg} rounded-2xl shadow-2xl ${tab.shadow}`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3">
                <Icon size={16} className={isActive ? "text-white" : tab.color} />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4 px-4 h-full">
        <div className="h-8 w-px bg-white/10 hidden md:block" />
        <div className="flex items-center gap-4 bg-white/5 rounded-2xl px-6 py-3 border border-white/5 group hover:border-emerald-500/30 transition-colors">
          <MapPin size={14} className="text-emerald-500" />
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Périmètre</span>
            <select 
              value={zone} 
              onChange={(e) => setZone(e.target.value)} 
              className="bg-transparent border-none text-xs font-black text-white uppercase tracking-widest outline-none cursor-pointer focus:ring-0 p-0"
            >
              <option value="paris" className="bg-slate-900">Paris (75)</option>
              <option value="idf" className="bg-slate-900">Île-de-France</option>
              <option value="france" className="bg-slate-900">France Entière</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
});

export const CommunityAgirView = memo(function CommunityAgirView({ fr }: { fr: boolean }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 items-start">
      <div className="lg:col-span-8 space-y-12">
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Target size={20} className="text-emerald-400" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{fr ? "Actions de Terrain" : "Field Actions"}</h3>
          </div>
          <ActionsHistoryList fr={fr} />
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Globe size={20} className="text-blue-400" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{fr ? "Impact Écosystémique" : "Ecosystem Impact"}</h3>
          </div>
          <CommunityConversionKpiGrid fr={fr} />
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-8">
        <CommunityHighlightsCard fr={fr} />
        <CleanupGuideCard fr={fr} />
        <ExternalHubSection fr={fr} />
      </aside>
    </div>
  );
});

export const CommunityMissionsView = memo(function CommunityMissionsView({ fr }: { fr: boolean }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 items-start">
      <div className="lg:col-span-8 space-y-12">
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <Calendar size={20} className="text-blue-400" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{fr ? "Exploration des Missions" : "Missions Exploration"}</h3>
          </div>
          <CommunityEventsTabsCard fr={fr} />
        </section>

        <div className="grid gap-8 md:grid-cols-2">
          <CommunityStaffingCard fr={fr} />
          <CommunityPostEventLoopCard fr={fr} />
        </div>
      </div>

      <aside className="lg:col-span-4 space-y-8">
        <CommunityCreateEventCard fr={fr} />
        <CommunityRemindersCard fr={fr} />
        <CommunityFunnelExportCard fr={fr} />
        <OrganizerKitCard fr={fr} />
      </aside>
    </div>
  );
});

export const CommunitySolutionsView = memo(function CommunitySolutionsView({ fr }: { fr: boolean }) {
  return (
    <div className="grid gap-12 lg:grid-cols-12 items-start">
      <div className="lg:col-span-8 space-y-12">
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <Lightbulb size={20} className="text-amber-400" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{fr ? "Bibliothèque de Solutions" : "Solutions Library"}</h3>
          </div>
          <CampaignsSection fr={fr} />
          <MissionZeroSection fr={fr} />
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <ShieldCheck size={20} className="text-blue-400" />
            </div>
            <h3 className="text-2xl font-black text-white tracking-tighter">{fr ? "Ressources & Support" : "Resources & Support"}</h3>
          </div>
          <FAQSection fr={fr} />
          <LegalSection fr={fr} />
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-8">
        <div className="p-8 rounded-[3rem] border border-white/10 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform">
            <Sparkles size={120} className="text-amber-400" />
          </div>
          <div className="relative z-10 space-y-6">
            <h4 className="text-xl font-black text-white tracking-tight">{fr ? "Restez informé" : "Stay informed"}</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              {fr ? "Recevez les dernières solutions et missions directement dans votre boîte mail." : "Receive the latest solutions and missions directly in your mailbox."}
            </p>
            <NewsletterSignup fr={fr} />
          </div>
        </div>

        <div className="p-8 rounded-[3rem] border border-emerald-500/10 bg-emerald-500/5 backdrop-blur-3xl shadow-2xl">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Target size={20} />
              </div>
              <h4 className="text-lg font-black text-white tracking-tight">{fr ? "Assistant IA" : "AI Assistant"}</h4>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              {fr ? "Posez vos questions sur la vie de la communauté et les solutions durables." : "Ask your questions about community life and sustainable solutions."}
            </p>
            <ChatShell fr={fr} />
          </div>
        </div>
      </aside>
    </div>
  );
});
