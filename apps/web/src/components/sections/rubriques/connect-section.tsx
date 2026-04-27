"use client";

import { useState, useMemo } from "react";
import {
 MessageSquare,
 Mail,
 Users,
 Hash,
 Sparkles,
 ArrowRight,
 Shield,
 Lock,
} from "lucide-react";
import Link from "next/link";
import { ChatShell } from "@/components/chat/chat-shell";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type ConnectTab = "discussions" | "dm";

const CHANNEL_STATS = [
 { label: { fr: "Voisinage", en: "Neighborhood" }, icon: Users, count: "24/7", color: "text-pink-600" },
 { label: { fr: "Gouvernance", en: "Governance" }, icon: Shield, count: "Staff", color: "text-violet-600" },
 { label: { fr: "Admin", en: "Admin" }, icon: Lock, count: "Privé", color: "text-fuchsia-600" },
];

export function ConnectSection({ defaultTab = "discussions" }: { defaultTab?: ConnectTab }) {
 const [activeTab, setActiveTab] = useState<ConnectTab>(defaultTab);
 const { locale } = useSitePreferences();

 const tabs = useMemo(() => [
   {
     id: "discussions" as const,
     label: { fr: "Discussions", en: "Channels" },
     icon: Hash,
     desc: {
       fr: "Canaux collectifs par thématique et territoire",
       en: "Collective channels by theme and territory",
     },
   },
   {
     id: "dm" as const,
     label: { fr: "Messages privés", en: "Private Messages" },
     icon: Mail,
     desc: {
       fr: "Échanges directs et confidentiels",
       en: "Direct and confidential messages",
     },
   },
 ], []);

 return (
   <section className="space-y-6">
     {/* ── Hero ── */}
     <div className="relative overflow-hidden rounded-[2.5rem] bg-[#1a0b2e] px-6 py-14 text-white shadow-2xl md:px-10 lg:py-20">
       {/* gradient layers */}
       <div className="absolute inset-0 bg-gradient-to-br from-[#2d1065] via-[#6b21a8] to-[#9d174d] opacity-80" />
       <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_-10%,rgba(236,72,153,0.2),transparent),radial-gradient(ellipse_40%_40%_at_0%_100%,rgba(139,92,246,0.15),transparent)]" />
       {/* grain */}
       <div
         className="absolute inset-0 opacity-[0.03]"
         style={{
           backgroundImage:
             "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
         }}
       />

       <div className="relative z-10 mx-auto max-w-4xl text-center space-y-8">
         {/* badge */}
         <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-2.5 backdrop-blur-md">
           <div className="flex items-center gap-2 rounded-xl bg-pink-500/15 border border-pink-500/20 px-4 py-1.5 text-pink-300">
             <MessageSquare size={14} />
             <span className="cmm-text-caption font-bold tracking-[0.25em] uppercase">
               {locale === "fr" ? "Échanges" : "Connect"}
             </span>
           </div>
         </div>

         {/* title */}
         <div className="space-y-4">
           <h1 className="text-4xl font-bold leading-[0.95] tracking-tighter sm:text-5xl md:text-6xl">
             {locale === "fr" ? (
               <>Communiquez,<br />coordonnez, agissez.</>
             ) : (
               <>Communicate,<br />coordinate, act.</>
             )}
           </h1>
           <p className="mx-auto max-w-xl text-base font-light leading-relaxed text-white/70 sm:text-lg">
             {locale === "fr"
               ? "Canaux collectifs, messages privés et coordination terrain réunis dans un espace unique."
               : "Collective channels, private messages and field coordination in one single space."}
           </p>
         </div>

         {/* quick stats */}
         <div className="flex flex-wrap items-center justify-center gap-3">
           {CHANNEL_STATS.map((stat) => (
             <div
               key={stat.label.fr}
               className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 backdrop-blur-sm"
             >
               <stat.icon size={14} className="text-pink-300" />
               <span className="cmm-text-caption font-semibold text-white/80">
                 {locale === "fr" ? stat.label.fr : stat.label.en}
               </span>
               <span className="cmm-text-caption font-bold text-pink-400">
                 {stat.count}
               </span>
             </div>
           ))}
         </div>
       </div>
     </div>

     {/* ── Tab Switcher ── */}
     <div className="relative z-20 mx-auto max-w-5xl -mt-8 px-4">
       <div className="rounded-[2rem] border border-white/60 bg-white/95 p-2 shadow-xl shadow-violet-950/5 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95">
         <div className="flex gap-2">
           {tabs.map((tab) => {
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={[
                   "flex-1 flex items-center justify-center gap-3 rounded-[1.5rem] px-5 py-4 transition-all duration-300 group",
                   isActive
                     ? "bg-gradient-to-br from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-500/20"
                     : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                 ].join(" ")}
               >
                 <tab.icon size={18} className={isActive ? "text-white" : "text-slate-400 group-hover:text-violet-500"} />
                 <div className="text-left">
                   <span className="cmm-text-small font-bold block">
                     {locale === "fr" ? tab.label.fr : tab.label.en}
                   </span>
                   <span className={[
                     "cmm-text-caption hidden sm:block",
                     isActive ? "text-white/70" : "text-slate-400",
                   ].join(" ")}>
                     {locale === "fr" ? tab.desc.fr : tab.desc.en}
                   </span>
                 </div>
                 {isActive && (
                   <span className="relative ml-auto flex h-2 w-2">
                     <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-300 opacity-75" />
                     <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                   </span>
                 )}
               </button>
             );
           })}
         </div>
       </div>
     </div>

     {/* ── Content ── */}
     <div className="mx-auto max-w-5xl">
       {activeTab === "discussions" && (
         <div className="space-y-5 animate-in fade-in duration-300">
           <ChatShell initialArrondissement={11} />
         </div>
       )}

       {activeTab === "dm" && (
         <div className="animate-in fade-in duration-300">
           <DmPlaceholder locale={locale} />
         </div>
       )}
     </div>
   </section>
 );
}

/* ── DM Placeholder — premium empty state ── */
function DmPlaceholder({ locale }: { locale: "fr" | "en" }) {
 return (
   <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-8 shadow-lg dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 md:p-12">
     {/* decorative glow */}
     <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pink-200/30 blur-3xl dark:bg-pink-900/20" />
     <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-900/20" />

     <div className="relative z-10 mx-auto max-w-md text-center space-y-6">
       {/* icon */}
       <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-pink-100 shadow-lg shadow-violet-200/40 dark:from-violet-900/50 dark:to-pink-900/50 dark:shadow-violet-800/20">
         <Mail size={32} className="text-violet-600 dark:text-violet-400" />
       </div>

       {/* badge */}
       <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 dark:border-violet-800 dark:bg-violet-950">
         <Sparkles size={12} className="text-violet-500" />
         <span className="cmm-text-caption font-bold text-violet-700 uppercase tracking-wider dark:text-violet-300">
           {locale === "fr" ? "Bientôt disponible" : "Coming soon"}
         </span>
       </div>

       {/* text */}
       <div className="space-y-3">
         <h2 className="text-xl font-bold cmm-text-primary sm:text-2xl">
           {locale === "fr"
             ? "Messagerie directe privée"
             : "Private direct messaging"}
         </h2>
         <p className="cmm-text-small cmm-text-secondary leading-relaxed">
           {locale === "fr"
             ? "Échangez directement avec les membres du réseau. Messages chiffrés, notifications instantanées et partage de fichiers."
             : "Chat directly with network members. Encrypted messages, instant notifications and file sharing."}
         </p>
       </div>

       {/* feature preview cards */}
       <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
         {[
           {
             icon: Shield,
             label: { fr: "Chiffré", en: "Encrypted" },
             desc: { fr: "E2E sécurisé", en: "E2E secure" },
           },
           {
             icon: Sparkles,
             label: { fr: "Instantané", en: "Instant" },
             desc: { fr: "Temps réel", en: "Real-time" },
           },
           {
             icon: Users,
             label: { fr: "Groupes", en: "Groups" },
             desc: { fr: "Multi-membres", en: "Multi-member" },
           },
         ].map((feature) => (
           <div
             key={feature.label.fr}
             className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/50"
           >
             <feature.icon size={18} className="mx-auto mb-2 text-pink-500" />
             <p className="cmm-text-caption font-bold cmm-text-primary">
               {locale === "fr" ? feature.label.fr : feature.label.en}
             </p>
             <p className="cmm-text-caption cmm-text-muted">
               {locale === "fr" ? feature.desc.fr : feature.desc.en}
             </p>
           </div>
         ))}
       </div>

       {/* CTA */}
       <Link
         href="/sections/messagerie"
         className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 px-6 py-3 cmm-text-small font-bold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-500/30"
       >
         {locale === "fr" ? "Rejoindre les discussions en attendant" : "Join channels in the meantime"}
         <ArrowRight size={16} />
       </Link>
     </div>
   </div>
 );
}
