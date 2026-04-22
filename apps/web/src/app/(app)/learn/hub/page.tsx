"use client";

import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  BookOpen,
  Calendar as CalendarIcon,
  FileText,
  Info,
  Trash2,
  GraduationCap,
  ArrowRight,
  Globe,
  Target,
  Brain,
  FileText as FileTextIcon,
  Sparkles
} from "lucide-react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { useTranslation } from "@/lib/i18n/use-translation";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { PlanetaryBoundariesInteractive } from "@/components/learn/planetary-boundaries";
import { SustainableGoalsInteractive } from "@/components/learn/sustainable-goals";
import { EnvironmentalQuiz } from "@/components/learn/environmental-quiz";
import { GIECContent } from "@/components/learn/giac-content";

const locales = {
  "fr": fr,
  "en": enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Mock events for the calendar
const MOCK_EVENTS = [
  {
    title: "Grande Collecte de Printemps - Paris 14",
    start: new Date(2026, 3, 25, 10, 0),
    end: new Date(2026, 3, 25, 14, 0),
    allDay: false,
  },
  {
    title: "Atelier Recyclage Créatif",
    start: new Date(2026, 3, 28, 18, 0),
    end: new Date(2026, 3, 28, 20, 0),
    allDay: false,
  }
];

export default function LearnHubPage() {
  const [activeTab, setActiveTab] = useState("enjeux");
  const { t } = useTranslation("learnHub");
  const { locale } = useSitePreferences();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Enhanced Header */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 p-8 md:p-12 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-4">
            <Sparkles size={120} />
          </div>
          <div className="absolute bottom-4 left-4">
            <Globe size={80} />
          </div>
        </div>

        <div className="relative space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
              <GraduationCap size={32} />
            </div>
            <div>
              <div className="text-emerald-100 font-bold uppercase tracking-widest text-sm">
                {t("header_suptitle")}
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                {t("header_title")}
              </h1>
            </div>
          </div>

          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl leading-relaxed">
            {t("header_desc")}
          </p>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-2xl font-black">9</div>
              <div className="text-sm text-blue-100">Limites planétaires</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-2xl font-black">17</div>
              <div className="text-sm text-blue-100">Objectifs mondiaux</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-2xl font-black">+1.1°C</div>
              <div className="text-sm text-blue-100">Réchauffement actuel</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-2xl font-black">2030</div>
              <div className="text-sm text-blue-100">Échéance critique</div>
            </div>
          </div>
        </div>
      </header>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-8">
        <Tabs.List className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
          {[
            { id: "enjeux", label: "Rapports GIEC", icon: FileText, color: "text-blue-600" },
            { id: "limites", label: "Limites Planétaires", icon: Globe, color: "text-red-600" },
            { id: "odd", label: "Objectifs Mondiaux", icon: Target, color: "text-emerald-600" },
            { id: "quiz", label: "Quiz Interactif", icon: Brain, color: "text-purple-600" },
            { id: "usage", label: "Mode d'Emploi", icon: BookOpen, color: "text-slate-600" },
            { id: "events", label: "Rassemblements", icon: CalendarIcon, color: "text-orange-600" },
            { id: "kit", label: "Kit Terrain", icon: FileTextIcon, color: "text-indigo-600" },
            { id: "waste", label: "Guide Déchets", icon: Trash2, color: "text-slate-600" },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={`group flex items-center gap-3 px-6 py-4 text-sm font-bold transition-all rounded-2xl border-2
                ${activeTab === tab.id
                  ? 'bg-slate-900 text-white border-slate-900 translate-y-[1px] shadow-lg'
                  : 'text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md'
                }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : tab.color} />
              {tab.label}
              {activeTab !== tab.id && (
                <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="min-h-[600px]">
          {/* Section: Rapports GIEC */}
          <Tabs.Content value="enjeux" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <GIECContent />
          </Tabs.Content>

          {/* Section: Limites Planétaires */}
          <Tabs.Content value="limites" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <PlanetaryBoundariesInteractive />
          </Tabs.Content>

          {/* Section: Objectifs de Développement Durable */}
          <Tabs.Content value="odd" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <SustainableGoalsInteractive />
          </Tabs.Content>

          {/* Section: Quiz Interactif */}
          <Tabs.Content value="quiz" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <EnvironmentalQuiz />
          </Tabs.Content>

          {/* Section: Mode d'emploi (Original) */}
          <Tabs.Content value="usage" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid gap-4">
              {[
                { step: "01", title: t("usage.step1_title"), detail: t("usage.step1_desc") },
                { step: "02", title: t("usage.step2_title"), detail: t("usage.step2_desc") },
                { step: "03", title: t("usage.step3_title"), detail: t("usage.step3_desc") },
                { step: "04", title: t("usage.step4_title"), detail: t("usage.step4_desc") },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors bg-white">
                  <span className="text-4xl font-black text-emerald-100">{item.step}</span>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{item.title}</h4>
                    <p className="text-slate-600 text-sm">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Tabs.Content>

          {/* Section: Rassemblements */}
          <Tabs.Content value="events" className="h-[600px] bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Calendar
              localizer={localizer}
              events={MOCK_EVENTS}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              culture={locale}
              messages={{
                next: t("events.next"),
                previous: t("events.previous"),
                today: t("events.today"),
                month: t("events.month"),
                week: t("events.week"),
                day: t("events.day")
              }}
            />
          </Tabs.Content>

          {/* Section: Kit Terrain */}
          <Tabs.Content value="kit" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {[
              { title: t("kit.doc1_title"), type: "PDF", size: "1.2 MB" },
              { title: t("kit.doc2_title"), type: "PDF", size: "4.5 MB" },
              { title: t("kit.doc3_title"), type: "PNG", size: "12 MB" },
              { title: t("kit.doc4_title"), type: "PDF", size: "0.5 MB" },
            ].map((doc) => (
              <div key={doc.title} className="group p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-500 transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                  <FileText size={24} />
                </div>
                <h4 className="mt-4 font-bold text-slate-900">{doc.title}</h4>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{t("kit.type_size", { type: doc.type, size: doc.size })}</span>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-600 translate-x-0 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </Tabs.Content>

          {/* Section: Déchets */}
          <Tabs.Content value="waste" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Trash2 size={120} />
              </div>
              <h3 className="text-2xl font-black mb-6">{t("waste.title")}</h3>
              <div className="grid gap-4">
                {[
                  { name: t("waste.cat1_name"), color: "bg-emerald-500", info: t("waste.cat1_info") },
                  { name: t("waste.cat2_name"), color: "bg-blue-500", info: t("waste.cat2_info") },
                  { name: t("waste.cat3_name"), color: "bg-amber-500", info: t("waste.cat3_info") },
                  { name: t("waste.cat4_name"), color: "bg-slate-500", info: t("waste.cat4_info") },
                ].map((cat) => (
                  <div key={cat.name} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className={`w-4 h-4 rounded-full ${cat.color}`} />
                    <div className="flex-1">
                      <p className="text-sm font-bold uppercase tracking-wider">{cat.name}</p>
                      <p className="text-xs text-slate-400">{cat.info}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
}
