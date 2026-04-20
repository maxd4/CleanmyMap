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
  ArrowRight
} from "lucide-react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { useTranslation } from "@/lib/i18n/use-translation";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

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
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-xs">
          <GraduationCap size={16} />
          {t("header_suptitle")}
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-none">
          {t("header_title")}
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl">
          {t("header_desc")}
        </p>
      </header>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-8">
        <Tabs.List className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {[
            { id: "enjeux", label: t("tabs.enjeux"), icon: Info },
            { id: "usage", label: t("tabs.usage"), icon: BookOpen },
            { id: "events", label: t("tabs.events"), icon: CalendarIcon },
            { id: "kit", label: t("tabs.kit"), icon: FileText },
            { id: "waste", label: t("tabs.waste"), icon: Trash2 },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all rounded-t-xl
                ${activeTab === tab.id 
                  ? "bg-slate-900 text-white translate-y-[1px]" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="min-h-[500px]">
          {/* Section: Enjeux */}
          <Tabs.Content value="enjeux" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-emerald-50 p-8 rounded-3xl space-y-6">
                <h3 className="text-2xl font-black text-emerald-950">{t("enjeux.title")}</h3>
                <p className="text-emerald-800 leading-relaxed">
                  {t("enjeux.desc")}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <p className="text-3xl font-black text-emerald-600">{t("enjeux.stat1_val")}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400">{t("enjeux.stat1_label")}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl shadow-sm">
                    <p className="text-3xl font-black text-emerald-600">{t("enjeux.stat2_val")}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400">{t("enjeux.stat2_label")}</p>
                  </div>
                </div>
              </div>
              <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center p-8 text-center">
                  <p className="text-white font-bold italic">{t("enjeux.quote")}</p>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1618477402246-935300bb3e3b?auto=format&fit=crop&q=80&w=800" 
                  alt="Plastic pollution"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </Tabs.Content>

          {/* Section: Mode d'emploi */}
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
