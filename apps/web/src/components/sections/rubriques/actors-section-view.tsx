"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Gauge, ListChecks, MapPin, Target, TrendingUp, Users } from "lucide-react";

import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { RubriqueCard } from "@/components/ui/rubrique-card";
import { buildActorActivityCards } from "@/lib/community/engagement";

type ActorActivityCard = ReturnType<typeof buildActorActivityCards>[number];

export function ActorsHotspotsCard({
  fr,
  loading,
  hotspots,
}: {
  fr: boolean;
  loading: boolean;
  hotspots: Array<[string, number]>;
}) {
  return (
    <RubriqueCard initial={{ opacity: 1, x: -20 }} whileInView={{ opacity: 1, x: 0 }} themeColor="indigo" watermarkIcon={TrendingUp} watermarkSize={160}>
      <div className="mb-10 flex items-center gap-4">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-400"><Target size={20} /></div>
        <h3 className="text-xl font-black tracking-tight text-white">{fr ? "Actions (12 mois)" : "Actions (12 months)"}</h3>
      </div>
      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <CmmSkeleton key={i} variant="rectangular" className="h-14 rounded-2xl bg-white/5" />)}</div>
      ) : (
        <ul className="space-y-3">
          {hotspots.map(([area, count], index) => (
            <motion.li key={area} initial={{ opacity: 1, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-5 py-4 transition-all hover:bg-white/10">
              <div className="flex items-center gap-4"><span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40 text-xs font-black text-indigo-400 transition-transform group-hover:scale-110">{index + 1}</span><span className="text-sm font-black tracking-tight text-white">{area}</span></div>
              <div className="text-right"><p className="text-lg font-black tracking-tight text-white">{count}</p><p className="text-xs font-black uppercase tracking-widest text-slate-500">{fr ? "Actions" : "Actions"}</p></div>
            </motion.li>
          ))}
          {hotspots.length === 0 && <li className="space-y-4 p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-slate-600"><MapPin size={24} /></div><p className="text-xs font-bold italic text-slate-500">{fr ? "Aucune action sur cette période." : "No action for this period."}</p></li>}
        </ul>
      )}
    </RubriqueCard>
  );
}

export function ActorsActivityGrid({
  fr,
  loading,
  cards,
}: {
  fr: boolean;
  loading: boolean;
  cards: ActorActivityCard[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-4"><div className="flex items-center gap-4"><div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-400"><Users size={20} /></div><h3 className="text-xl font-black tracking-tight text-white">{fr ? "Acteurs observés dans les actions" : "Actors observed in actions"}</h3></div><div className="rounded-full border border-white/5 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500">{cards.length} {fr ? "Observés" : "Observed"}</div></div>
      <div className="grid gap-6 md:grid-cols-2">
        {loading ? [...Array(4)].map((_, i) => <CmmSkeleton key={i} variant="rectangular" className="h-64 rounded-[2.5rem] bg-white/5" />) : <AnimatePresence mode="popLayout">{cards.map((card, idx) => <RubriqueCard key={card.actor} initial={{ opacity: 1, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }} themeColor="indigo" withTopBar={false} className="flex flex-col justify-between"><div className="space-y-6"><h3 className="text-xl font-black leading-tight tracking-tight text-white transition-colors group-hover:text-indigo-400">{card.actor}</h3><div className="grid grid-cols-2 gap-4">{[{ label: fr ? "Zone" : "Zone", value: card.zone, icon: MapPin }, { label: fr ? "Actions" : "Actions", value: card.actions, icon: ListChecks }, { label: fr ? "Qualité des actions" : "Action quality", value: `${card.avgActionQuality}%`, icon: Gauge }].map((stat, i) => <div key={i} className="rounded-2xl border border-white/5 bg-slate-950/40 p-3 transition-colors group-hover:border-white/10"><p className="mb-1 text-xs font-black uppercase tracking-widest text-slate-500">{stat.label}</p><p className="text-sm font-black text-white">{stat.value}</p></div>)}</div></div></RubriqueCard>)}</AnimatePresence>}
        {!loading && cards.length === 0 && <div className="col-span-full flex flex-col items-center justify-center space-y-4 rounded-[2.5rem] border border-dashed border-white/10 bg-white/5 py-20 text-center"><div className="rounded-full bg-slate-950/40 p-6 text-slate-600"><Users size={48} /></div><p className="max-w-xs text-sm font-bold text-slate-500">{fr ? "Aucun acteur nommé n'est encore présent dans les actions récentes." : "No named actor is present in recent actions yet."}</p></div>}
      </div>
    </div>
  );
}
