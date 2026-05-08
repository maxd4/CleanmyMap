"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Database, FileJson, Globe, Code, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function OpenDataSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <SectionShell
      id="open-data"
      title={fr ? "Open Data & API" : "Open Data & API"}
      subtitle={fr 
        ? "Accédez aux données opérationnelles et indicateurs d'impact pour la recherche et l'innovation locale."
        : "Access operational data and impact indicators for research and local innovation."}
      icon={Database}
      gradient="from-cyan-500/20 via-indigo-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Intro Highlight */}
        <div className="p-8 rounded-[3rem] border border-white/5 bg-slate-950/20 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group">
           <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                 <Globe size={24} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">{fr ? "Transparence Totale" : "Full Transparency"}</h4>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{fr ? "Données ouvertes par défaut" : "Open data by default"}</p>
              </div>
           </div>
           <p className="text-[11px] font-bold text-slate-400 leading-relaxed max-w-md md:text-right">
              {fr
                ? "Données ouvertes pour accélérer la coopération locale : API, export JSON et cadre réutilisable pour chercheurs et collectivités."
                : "Open data to accelerate local cooperation: API access, JSON export and a reusable framework for researchers and cities."}
           </p>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-6 md:grid-cols-3">
           {/* Section 1 */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6 group hover:bg-white/5 transition-all"
           >
              <div className="p-4 rounded-2xl w-fit bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                 <FileJson size={24} />
              </div>
              <div className="space-y-3">
                 <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Formats d'échange" : "Exchange Formats"}</h3>
                 <ul className="space-y-3">
                    {[
                      fr ? "Exports JSON/CSV auditables" : "Auditable JSON/CSV exports",
                      fr ? "Données géolocalisées" : "Geolocated data",
                      fr ? "Métadonnées de version" : "Version metadata"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-blue-500/40" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item}</span>
                      </li>
                    ))}
                 </ul>
              </div>
           </motion.div>

           {/* Section 2 */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6 group hover:bg-white/5 transition-all"
           >
              <div className="p-4 rounded-2xl w-fit bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 group-hover:scale-110 transition-transform">
                 <Code size={24} />
              </div>
              <div className="space-y-3">
                 <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Accès Chercheurs" : "Researcher Access"}</h3>
                 <ul className="space-y-3">
                    {[
                      fr ? "API cartographie temps réel" : "Real-time mapping API",
                      fr ? "Indicateurs d'impact" : "Impact indicators",
                      fr ? "Historique utilisateur" : "User history trends"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-500/40" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item}</span>
                      </li>
                    ))}
                 </ul>
              </div>
           </motion.div>

           {/* Section 3 */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6 group hover:bg-white/5 transition-all"
           >
              <div className="p-4 rounded-2xl w-fit bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                 <ShieldCheck size={24} />
              </div>
              <div className="space-y-3">
                 <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Villes & Territoires" : "Cities & Territories"}</h3>
                 <ul className="space-y-3">
                    {[
                      fr ? "Interopérabilité municipale" : "Municipal interoperability",
                      fr ? "Observatoires locaux" : "Local observatories",
                      fr ? "Gouvernance de données" : "Data governance"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/40" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item}</span>
                      </li>
                    ))}
                 </ul>
              </div>
           </motion.div>
        </div>

        {/* Technical Callout */}
        <div className="p-10 rounded-[3.5rem] border border-white/10 bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-12 group">
           <div className="space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] font-black uppercase tracking-widest">
                 <Sparkles size={12} className="text-cyan-300" />
                 {fr ? "Documentation Technique" : "Technical Documentation"}
              </div>
              <h3 className="text-4xl font-black tracking-tighter">{fr ? "Connectez vos outils" : "Connect your tools"}</h3>
              <p className="text-lg font-bold text-white/80 max-w-xl leading-relaxed">
                 {fr 
                   ? "CleanMyMap fournit une documentation Swagger/OpenAPI complète pour faciliter l'intégration de nos données dans vos propres écosystèmes."
                   : "CleanMyMap provides full Swagger/OpenAPI documentation to facilitate data integration into your own ecosystems."}
              </p>
           </div>
           
           <button className="flex items-center gap-4 px-10 py-5 rounded-2xl bg-white text-slate-950 text-xs font-black uppercase tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all">
              {fr ? "Accéder à l'API" : "Access API"}
              <ArrowRight size={18} />
           </button>
        </div>
      </div>
    </SectionShell>
  );
}
