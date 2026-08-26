"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { buildActorActivityCards } from "@/lib/community/engagement";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { Users, MapPin, TrendingUp, Target, ListChecks, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RubriqueCard } from "@/components/ui/rubrique-card";

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

  const actorActivityCards = useMemo(() => {
    return buildActorActivityCards(actionsData?.items ?? []);
  }, [actionsData?.items]);

  return (
    <SectionShell
      id="actors"
      title={fr ? "Activité des acteurs" : "Actors activity"}
      subtitle={fr
        ? "Synthèse des actions enregistrées, des zones observées et de la qualité des déclarations."
        : "Summary of recorded actions, observed areas and declaration quality."}
      icon={Users}
      gradient="from-indigo-500/20 via-sky-500/10 to-transparent"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 pt-8 items-start">
        {/* GAUCHE : Pression territoriale */}
        <RubriqueCard 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          themeColor="indigo"
          watermarkIcon={TrendingUp}
          watermarkSize={160}
        >

          <div className="flex items-center gap-4 mb-10">
             <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Target size={20} />
             </div>
             <h3 className="text-xl font-black text-white tracking-tight">
                {fr ? "Actions (12 mois)" : "Actions (12 months)"}
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
                       {fr ? "Actions" : "Actions"}
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
                      {fr ? "Aucune action sur cette période." : "No action for this period."}
                   </p>
                </li>
              )}
            </ul>
          )}
        </RubriqueCard>

        {/* DROITE : Activité observée des acteurs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
             <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                   <Users size={20} />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">
                   {fr ? "Acteurs observés dans les actions" : "Actors observed in actions"}
                </h3>
             </div>
             <div className="text-xs font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                {actorActivityCards.length} {fr ? "Observés" : "Observed"}
             </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {actionsLoading ? (
              [...Array(4)].map((_, i) => (
                <CmmSkeleton key={i} variant="rectangular" className="h-64 rounded-[2.5rem] bg-white/5" />
              ))
            ) : (
              <AnimatePresence mode="popLayout">
                {actorActivityCards.map((card, idx) => (
                  <RubriqueCard 
                    key={card.actor}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    themeColor="indigo"
                    withTopBar={false}
                    className="flex flex-col justify-between"
                  >
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-indigo-400 transition-colors">
                             {card.actor}
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         {[
                           { label: fr ? "Zone" : "Zone", value: card.zone, icon: MapPin },
                           { label: fr ? "Actions" : "Actions", value: card.actions, icon: ListChecks },
                           { label: fr ? "Qualité des actions" : "Action quality", value: `${card.avgActionQuality}%`, icon: Gauge },
                         ].map((stat, i) => (
                           <div key={i} className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 group-hover:border-white/10 transition-colors">
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                              <p className="text-sm font-black text-white">{stat.value}</p>
                           </div>
                         ))}
                      </div>

                    </div>
                  </RubriqueCard>
                ))}
              </AnimatePresence>
            )}

            {!actionsLoading && actorActivityCards.length === 0 && (
              <div className="col-span-full py-20 rounded-[2.5rem] border border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center text-center space-y-4">
                 <div className="p-6 rounded-full bg-slate-950/40 text-slate-600">
                    <Users size={48} />
                 </div>
                 <p className="text-sm font-bold text-slate-500 max-w-xs">
                    {fr
                      ? "Aucun acteur nommé n'est encore présent dans les actions récentes."
                      : "No named actor is present in recent actions yet."}
                 </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
