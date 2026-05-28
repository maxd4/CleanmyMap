"use client";

import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Banknote, Landmark, Heart, ShieldCheck, ArrowRight, Sparkles, Target, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function FundingSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";

  return (
    <SectionShell
      id="funding"
      title={fr ? "Modèle Économique" : "Economic Model"}
      subtitle={fr 
        ? "Transparence, sponsoring de zones et mécénat pour une action environnementale pérenne."
        : "Transparency, zone sponsorship and patronage for sustainable environmental action."}
      icon={Banknote}
      gradient="from-rose-500/20 via-pink-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Impact Message */}
        <div className="p-8 rounded-[3rem] border border-white/5 bg-slate-950/20 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 group">
           <div className="flex items-center gap-6">
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                 <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">{fr ? "Action Indépendante" : "Independent Action"}</h4>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{fr ? "Zéro influence sur la modération" : "Zero influence on moderation"}</p>
              </div>
           </div>
           <p className="text-[11px] font-bold text-slate-400 leading-relaxed max-w-md md:text-right">
              {fr
                ?"Rubrique dédiée au modèle économique local: sponsoring de zones, mécénat écologique et appel au don pour renforcer les actions concrètes sur le terrain."
                :"Section dedicated to the local funding model: zone sponsorship, ecological patronage and donations to strengthen field actions."}
           </p>
        </div>

        {/* Funding Tracks Grid */}
        <div className="grid gap-6 md:grid-cols-3">
           {/* Section 1: Business Sponsoring */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6 group hover:bg-white/5 transition-all"
           >
              <div className="p-4 rounded-2xl w-fit bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
                 <Landmark size={24} />
              </div>
              <div className="space-y-4">
                 <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Sponsoring de Zones" : "Zone Sponsorship"}</h3>
                 <p className="text-xs font-bold text-slate-500 leading-relaxed">
                    {fr ? "Engagement des entreprises locales pour soutenir des périmètres géographiques spécifiques." : "Engagement of local businesses to support specific geographic perimeters."}
                 </p>
                 <ul className="space-y-3 pt-2">
                    {[
                      fr ? "Budget annuel transparent" : "Transparent annual budget",
                      fr ? "Évidence cartographique" : "Map-based evidence",
                      fr ? "Gouvernance indépendante" : "Independent governance"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-rose-500/40" />
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item}</span>
                      </li>
                    ))}
                 </ul>
              </div>
           </motion.div>

           {/* Section 2: Mécénat */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6 group hover:bg-white/5 transition-all"
           >
              <div className="p-4 rounded-2xl w-fit bg-pink-500/10 border border-pink-500/20 text-pink-400 group-hover:scale-110 transition-transform">
                 <Target size={24} />
              </div>
              <div className="space-y-4">
                 <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Mécénat Écologique" : "Ecological Patronage"}</h3>
                 <p className="text-xs font-bold text-slate-500 leading-relaxed">
                    {fr ? "Financement de matériel, logistique et formation pour les acteurs de terrain." : "Funding of equipment, logistics and training for field actors."}
                 </p>
                 <ul className="space-y-3 pt-2">
                    {[
                      fr ? "Capacité d'intervention" : "Intervention capacity",
                      fr ? "Logistique mutualisée" : "Shared logistics",
                      fr ? "Zéro sur-compétition" : "Zero over-competition"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-pink-500/40" />
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item}</span>
                      </li>
                    ))}
                 </ul>
              </div>
           </motion.div>

           {/* Section 3: Donations */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl space-y-6 group hover:bg-white/5 transition-all"
           >
              <div className="p-4 rounded-2xl w-fit bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-400 group-hover:scale-110 transition-transform">
                 <Heart size={24} />
              </div>
              <div className="space-y-4">
                 <h3 className="text-xl font-black text-white tracking-tight">{fr ? "Appel au Don" : "Donation Appeal"}</h3>
                 <p className="text-xs font-bold text-slate-500 leading-relaxed">
                    {fr ? "Collecte citoyenne orientée vers l'impact local et le suivi communautaire." : "Civic fundraising oriented towards local impact and community monitoring."}
                 </p>
                 <ul className="space-y-3 pt-2">
                    {[
                      fr ? "Rapports d'impact publics" : "Public impact reports",
                      fr ? "Priorisation des urgences" : "Urgency prioritization",
                      fr ? "Traçabilité des fonds" : "Fund traceability"
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-500/40" />
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item}</span>
                      </li>
                    ))}
                 </ul>
              </div>
           </motion.div>
        </div>

        {/* Partner CTA */}
        <div className="p-10 rounded-[3.5rem] border border-white/10 bg-gradient-to-br from-rose-600 to-pink-700 text-white shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-12 group overflow-hidden relative">
           <div className="absolute top-0 right-0 p-20 opacity-10 pointer-events-none rotate-12">
              <Coins size={300} />
           </div>

           <div className="relative z-10 space-y-4 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[9px] font-black uppercase tracking-widest">
                 <Sparkles size={12} className="text-rose-300" />
                 {fr ? "Rejoindre l'Action" : "Join the Action"}
              </div>
              <h3 className="text-4xl font-black tracking-tighter">{fr ? "Devenez Partenaire" : "Become a Partner"}</h3>
              <p className="text-lg font-bold text-white/80 max-w-xl leading-relaxed">
                 {fr 
                   ? "Engagez votre organisation dans une démarche de propreté urbaine et de préservation environnementale mesurable."
                   : "Commit your organization to a measurable urban cleanliness and environmental preservation approach."}
              </p>
           </div>
           
           <CmmButton type="button" tone="secondary" variant="pill" className="relative z-10 flex items-center gap-4 px-10 py-5 text-xs font-black uppercase tracking-[0.3em] shadow-2xl transition-all">
              {fr ? "Ouvrir le dossier" : "Open the file"}
              <ArrowRight size={18} />
           </CmmButton>
        </div>
      </div>
    </SectionShell>
  );
}
