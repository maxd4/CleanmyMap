"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { buildPartnerCards } from "@/lib/community/engagement";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Users, MapPin, TrendingUp, ShieldCheck, ArrowRight, Zap, Trophy, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

function extractArea(label: string): string {
  const normalized = label.toLowerCase();
  const matched = normalized.match(/\b([1-9]|1[0-9]|20)(?:eme|er|e)?\b/);
  if (!matched) {
    return "Hors arrondissement";
  }
  return `${matched[1]}e`;
}

export function ActorsSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  
  const { data: mapData, isLoading: mapLoading } = useSWR(["section-actors-map"], () =>
    fetchMapActions({ limit: 220, days: 365, status: "approved" }),
  );
  const { data: actionsData, isLoading: actionsLoading } = useSWR(["section-actors-actions"], () =>
    fetchActions({ status: "approved", limit: 250 }),
  );

  const hotspots = useMemo(() => {
    const byArea = new Map<string, number>();
    for (const item of mapData?.items ?? []) {
      const area = extractArea(item.location_label ?? "");
      byArea.set(area, (byArea.get(area) ?? 0) + 1);
    }
    return [...byArea.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [mapData?.items]);

  const hotspotSet = useMemo(
    () => new Set(hotspots.slice(0, 3).map(([area]) => area)),
    [hotspots],
  );

  const partnerCards = useMemo(() => {
    return buildPartnerCards(actionsData?.items ?? []);
  }, [actionsData?.items]);

  return (
    <SectionShell
      id="actors"
      title={fr ? "Écosystème des Acteurs" : "Actors Ecosystem"}
      subtitle={fr 
        ? "Cartographie des pressions territoriales et pilotage des partenaires opérationnels."
        : "Mapping of territorial pressures and management of operational partners."}
      icon={Users}
      gradient="from-indigo-500/20 via-blue-500/10 to-transparent"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 pt-8 items-start">
        {/* GAUCHE : Pression territoriale */}
        <motion.article 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <TrendingUp size={160} className="text-indigo-400" />
          </div>

          <div className="flex items-center gap-4 mb-10">
             <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Target size={20} />
             </div>
             <h3 className="text-xl font-black text-white tracking-tight">
                {fr ? "Pression (12 mois)" : "Pressure (12 months)"}
             </h3>
          </div>
          
          {mapLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <CmmSkeleton key={i} variant="rectangular" className="h-14 rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {hotspots.map(([area, count], index) => (
                <motion.li 
                  key={area}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-5 py-4 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-950/40 border border-white/10 text-[10px] font-black text-indigo-400 group-hover:scale-110 transition-transform">
                       {index + 1}
                    </span>
                    <span className="text-sm font-black text-white tracking-tight">{area}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white tracking-tight">{count}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                       {fr ? "Signalements" : "Reports"}
                    </p>
                  </div>
                </motion.li>
              ))}
              {hotspots.length === 0 && (
                <li className="p-10 text-center space-y-4">
                   <div className="mx-auto w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-600">
                      <MapPin size={24} />
                   </div>
                   <p className="text-xs font-bold text-slate-500 italic">
                      {fr ? "Aucune donnée sur cette période." : "No data for this period."}
                   </p>
                </li>
              )}
            </ul>
          )}
        </motion.article>

        {/* DROITE : Fiches partenaires */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                   <ShieldCheck size={20} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                   {fr ? "Fiches Partenaires" : "Partner Files"}
                </h3>
             </div>
             <div className="text-xs font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                {partnerCards.length} {fr ? "Actifs" : "Active"}
             </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {actionsLoading ? (
              [...Array(4)].map((_, i) => (
                <CmmSkeleton key={i} variant="rectangular" className="h-64 rounded-[2.5rem] bg-white/5" />
              ))
            ) : (
              <AnimatePresence mode="popLayout">
                {partnerCards.map((card, idx) => (
                  <motion.article 
                    key={card.actor}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group rounded-[2.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-8 shadow-2xl hover:bg-white/5 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-blue-400 transition-colors">
                             {card.actor}
                          </h3>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                             {card.role}
                          </p>
                        </div>
                        {hotspotSet.has(card.zone) && (
                          <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                             <Zap size={10} className="text-amber-400 fill-amber-400" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">
                                {fr ? "Prioritaire" : "Priority"}
                             </span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         {[
                           { label: fr ? "Zone" : "Zone", value: card.zone, icon: MapPin },
                           { label: fr ? "Capacité" : "Capacity", value: card.capacity, icon: Users },
                           { label: fr ? "Actions" : "Actions", value: card.actions, icon: Trophy },
                           { label: fr ? "Qualité" : "Quality", value: `${card.avgQuality}%`, icon: ShieldCheck },
                         ].map((stat, i) => (
                           <div key={i} className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 group-hover:border-white/10 transition-colors">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                              <p className="text-sm font-black text-white">{stat.value}</p>
                           </div>
                         ))}
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-center justify-between group-hover:bg-blue-500/10 transition-all">
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">
                               {fr ? "Prochaine Action" : "Next Action"}
                            </p>
                            <p className="text-xs font-bold text-white leading-none">
                               {card.nextAction}
                            </p>
                         </div>
                         <ArrowRight size={16} className="text-blue-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </motion.article>
                ))}
              </AnimatePresence>
            )}

            {!actionsLoading && partnerCards.length === 0 && (
              <div className="col-span-full py-20 rounded-[2.5rem] border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center space-y-4">
                 <div className="p-6 rounded-full bg-slate-950/40 text-slate-600">
                    <Users size={48} />
                 </div>
                 <p className="text-sm font-bold text-slate-500 max-w-xs">
                    {fr 
                      ? "Aucun profil partenaire n'est encore relié à vos actions récentes." 
                      : "No partner profile is linked to your recent actions yet."}
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}