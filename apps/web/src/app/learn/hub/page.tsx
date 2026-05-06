"use client";
import { useState } from"react";
import * as Tabs from"@radix-ui/react-tabs";
import {
 BookOpen,
 Calendar as CalendarIcon,
 FileText,
 Trash2,
 GraduationCap,
 ArrowRight,
 Globe,
 Target,
 Brain,
 Sparkles
} from"lucide-react";
import { Calendar, dateFnsLocalizer } from"react-big-calendar";
import { useTranslation } from"@/lib/i18n/use-translation";
import { format, parse, startOfWeek, getDay } from"date-fns";
import { fr, enUS } from"date-fns/locale";
import"react-big-calendar/lib/css/react-big-calendar.css";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { PlanetaryBoundariesInteractive } from"@/components/learn/planetary-boundaries";
import { SustainableGoalsInteractive } from"@/components/learn/sustainable-goals";
import { EnvironmentalQuiz } from"@/components/learn/environmental-quiz";
import { CognitivePrimer } from"@/components/learn/cognitive-primer";
import { GIECContent } from"@/components/learn/giac-content";

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

const MOCK_EVENTS = [
 {
 title:"Grande Collecte de Printemps - Paris 14",
 start: new Date(2026, 3, 25, 10, 0),
 end: new Date(2026, 3, 25, 14, 0),
 allDay: false,
 },
 {
 title:"Atelier Recyclage Créatif",
 start: new Date(2026, 3, 28, 18, 0),
 end: new Date(2026, 3, 28, 20, 0),
 allDay: false,
 }
];

const CURIOUSITY_PROMPTS = {
 "fr": {
  enjeux: {
   question: "Quel signal du GIEC montre le plus vite la pression exercée sur le système climatique ?",
   clue: "Un chiffre court, une preuve claire, puis une action utile à retenir.",
  },
  limites: {
   question: "Quelle limite planétaire bascule en premier dans votre lecture du territoire ?",
   clue: "Comparer les signaux permet de ne pas rester sur une seule courbe.",
  },
  odd: {
   question: "Quel ODD peut être relié le plus directement à une action du quotidien ?",
   clue: "Le bon réflexe est souvent celui qui revient le plus facilement demain.",
  },
  quiz: {
   question: "Quelle question mérite d'être revue plutôt que simplement relue ?",
   clue: "Le mélange des thèmes aide à récupérer la bonne réponse au bon moment.",
  },
  usage: {
   question: "Quelle entrée peut être reprise en moins d'une minute ?",
   clue: "Une micro-révision suffit pour consolider la suite.",
  },
  events: {
   question: "Quel événement donne le plus vite envie de passer à l'action ?",
   clue: "La curiosité sociale fonctionne mieux quand la prochaine étape est simple.",
  },
  waste: {
   question: "Quel flux de déchets revient le plus souvent et mérite d'être retenu ?",
   clue: "Un exemple concret facilite le rappel à la prochaine visite.",
  },
 },
 "en": {
  enjeux: {
   question: "Which IPCC signal reveals climate pressure the fastest?",
   clue: "A short number, a clear proof, then one useful action to remember.",
  },
  limites: {
   question: "Which planetary boundary becomes visible first in your territory reading?",
   clue: "Comparing signals keeps the picture from collapsing into one chart.",
  },
  odd: {
   question: "Which SDG can be linked most directly to a daily action?",
   clue: "The best cue is often the one that returns most easily tomorrow.",
  },
  quiz: {
   question: "Which question should be reviewed instead of simply reread?",
   clue: "Mixing themes helps the right answer come back at the right time.",
  },
  usage: {
   question: "Which entry can be revisited in under a minute?",
   clue: "A short recap is enough to consolidate the next step.",
  },
  events: {
   question: "Which event makes the next action feel immediate?",
   clue: "Social curiosity works best when the next step is simple.",
  },
  waste: {
   question: "Which waste stream appears most often and deserves to stick?",
   clue: "A concrete example makes the next recall easier.",
  },
 },
 } as const;

export default function LearnHubPage() {
 const [activeTab, setActiveTab] = useState("enjeux");
 const { t } = useTranslation("learnHub");
 const { locale } = useSitePreferences();
 const curiosityPrompt =
  CURIOUSITY_PROMPTS[locale][activeTab as keyof (typeof CURIOUSITY_PROMPTS)[typeof locale]] ??
  CURIOUSITY_PROMPTS[locale].enjeux;

 return (
 <div className="w-full p-4 md:p-8 space-y-8">
 <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-blue-500 to-purple-600 p-8 md:p-12 text-white">
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
 <div className="text-emerald-100 font-bold uppercase tracking-widest cmm-text-small">
 {t("header_suptitle")}
 </div>
 <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-none">
 {t("header_title")}
 </h1>
 </div>
 </div>

 <p className="text-xl md:text-2xl text-blue-100 max-w-3xl leading-relaxed">
 {t("header_desc")}
 </p>
 </div>
 </header>

 <CognitivePrimer
  locale={locale}
  highlightRubricId={activeTab === "quiz" ? "quiz" : "learn"}
  className="border-slate-200 bg-white/70"
 />

 <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm">
 <div className="flex flex-wrap items-center gap-2">
  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] cmm-text-secondary">
   Curiosité
  </span>
  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] cmm-text-secondary">
   Reprendre demain
  </span>
  {activeTab === "quiz" ? (
   <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] cmm-text-secondary">
    Questions mélangées
   </span>
  ) : null}
 </div>
 <h3 className="mt-4 text-xl font-black cmm-text-primary tracking-tight md:text-2xl">
  {curiosityPrompt.question}
 </h3>
 <p className="mt-2 max-w-3xl cmm-text-small cmm-text-secondary">
  {curiosityPrompt.clue}
 </p>
 </section>

 <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-8">
 <Tabs.List className="flex flex-wrap gap-3 border-b border-slate-200 pb-4">
 {[
 { id:"enjeux", label:"Rapports GIEC", icon: FileText, color:"text-blue-600" },
 { id:"limites", label:"Limites Planétaires", icon: Globe, color:"text-red-600" },
 { id:"odd", label:"Objectifs Mondiaux", icon: Target, color:"text-emerald-600" },
 { id:"quiz", label:"Quiz", icon: Brain, color:"text-purple-600" },
 { id:"usage", label:"Mode d'Emploi", icon: BookOpen, color:"cmm-text-secondary" },
 { id:"events", label:"Rassemblements", icon: CalendarIcon, color:"text-orange-600" },
 { id:"waste", label:"Guide Déchets", icon: Trash2, color:"cmm-text-secondary" },
 ].map((tab) => (
 <Tabs.Trigger
 key={tab.id}
 value={tab.id}
 className={`group flex items-center gap-3 px-6 py-4 cmm-text-small font-bold transition-all rounded-2xl border-2
 ${activeTab === tab.id
 ? 'bg-slate-900 text-white border-slate-900 translate-y-[1px] shadow-lg'
 : 'cmm-text-secondary border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md'
 }`}
 >
 <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : tab.color} />
 {tab.label}
 {activeTab !== tab.id && (
 <ArrowRight size={14} className="text-slate-300 group-hover:cmm-text-secondary group-hover:translate-x-1 transition-all" />
 )}
 </Tabs.Trigger>
 ))}
 </Tabs.List>

 <section className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
 <div className="rounded-2xl bg-slate-50 p-4 text-center">
 <div className="text-2xl font-bold">9</div>
 <div className="cmm-text-small cmm-text-secondary">Limites planétaires</div>
 </div>
 <div className="rounded-2xl bg-slate-50 p-4 text-center">
 <div className="text-2xl font-bold">17</div>
 <div className="cmm-text-small cmm-text-secondary">Objectifs mondiaux</div>
 </div>
 <div className="rounded-2xl bg-slate-50 p-4 text-center">
 <div className="text-2xl font-bold">+1.1°C</div>
 <div className="cmm-text-small cmm-text-secondary">Réchauffement actuel</div>
 </div>
 <div className="rounded-2xl bg-slate-50 p-4 text-center">
 <div className="text-2xl font-bold">2030</div>
 <div className="cmm-text-small cmm-text-secondary">Échéance critique</div>
 </div>
 </section>

 <div className="min-h-[600px]">
 <Tabs.Content value="enjeux" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
 <GIECContent />
 </Tabs.Content>

 <Tabs.Content value="limites" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
 <PlanetaryBoundariesInteractive />
 </Tabs.Content>

 <Tabs.Content value="odd" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
 <SustainableGoalsInteractive />
 </Tabs.Content>

 <Tabs.Content value="quiz" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
 <EnvironmentalQuiz />
 </Tabs.Content>

 <Tabs.Content value="usage" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
 <div className="grid gap-4">
 {[
 { step:"01", title: t("usage.step1_title"), detail: t("usage.step1_desc") },
 { step:"02", title: t("usage.step2_title"), detail: t("usage.step2_desc") },
 { step:"03", title: t("usage.step3_title"), detail: t("usage.step3_desc") },
 { step:"04", title: t("usage.step4_title"), detail: t("usage.step4_desc") },
 ].map((item) => (
 <div key={item.step} className="flex gap-6 p-6 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors bg-white">
 <span className="text-4xl font-bold text-emerald-100">{item.step}</span>
 <div>
 <h4 className="text-lg font-bold cmm-text-primary">{item.title}</h4>
 <p className="cmm-text-secondary cmm-text-small">{item.detail}</p>
 </div>
 </div>
 ))}
 </div>
 </Tabs.Content>

 <Tabs.Content value="events" className="h-[600px] bg-white rounded-3xl p-6 border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
 <Calendar
  localizer={localizer}
  events={MOCK_EVENTS}
  startAccessor="start"
  endAccessor="end"
  style={{ height:"100%" }}
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

 <Tabs.Content value="waste" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
 <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-white overflow-hidden relative">
 <div className="absolute top-0 right-0 p-8 opacity-10">
 <Trash2 size={120} />
 </div>
 <h3 className="text-2xl font-bold mb-6">{t("waste.title")}</h3>
 <div className="grid gap-4">
 {[
 { name: t("waste.cat1_name"), color:"bg-emerald-500", info: t("waste.cat1_info") },
 { name: t("waste.cat2_name"), color:"bg-blue-500", info: t("waste.cat2_info") },
 { name: t("waste.cat3_name"), color:"bg-amber-500", info: t("waste.cat3_info") },
 { name: t("waste.cat4_name"), color:"bg-slate-500", info: t("waste.cat4_info") },
 ].map((cat) => (
 <div key={cat.name} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
 <div className={`w-4 h-4 rounded-full ${cat.color}`} />
 <div className="flex-1">
 <p className="cmm-text-small font-bold uppercase tracking-wider">{cat.name}</p>
 <p className="cmm-text-caption cmm-text-muted">{cat.info}</p>
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
