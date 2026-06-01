"use client";

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { CheckCircle2, Trash2, Users, MapPin, Route, Activity } from "lucide-react";
import { toActionListItem, toActionMapItem, type ActionDataContract } from "@/lib/actions/data-contract";

const containerVariant = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const satisfies Variants;

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as const satisfies Variants;

type ReportsKpiSummaryProps = {
  contracts: ActionDataContract[];
};

export function ReportsKpiSummary({ contracts }: ReportsKpiSummaryProps) {
  const metrics = useMemo(() => {
    const actions = contracts.map((contract) => toActionListItem(contract));
    const mapItems = contracts.map((contract) => toActionMapItem(contract));

    const totalKg = actions.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
    const totalButts = actions.reduce((acc, item) => acc + Number(item.cigarette_butts || 0), 0);
    const totalMinutes = actions.reduce((acc, item) => acc + Number(item.duration_minutes || 0), 0);
    const totalVolunteers = actions.reduce((acc, item) => acc + Number(item.volunteers_count || 0), 0);
    const geolocated = mapItems.filter((item) => item.latitude !== null && item.longitude !== null).length;
    const traced = mapItems.filter(
      (item) => (item.contract?.geometry.kind ?? item.geometry_kind ?? "point") !== "point",
    ).length;

    return {
      totalKg,
      totalButts,
      totalMinutes,
      totalVolunteers,
      geolocated,
      traced,
      count: actions.length,
      dataQuality: actions.length > 0 ? Math.round((geolocated / actions.length) * 100) : 0,
    };
  }, [contracts]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/40 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-red-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            Synthèse d&apos;Impact Scientifique
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Indicateurs consolidés en temps réel.{" "}
            <a href="/methodologie" className="text-rose-500 hover:text-rose-600 transition-colors underline decoration-rose-500/30 underline-offset-4">
              Voir le protocole →
            </a>
          </p>
        </div>
      </div>

      <motion.div
        variants={containerVariant}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-rose-100">
          <div className="flex items-center gap-3 mb-3 text-rose-500">
            <div className="p-2 rounded-xl bg-rose-50 group-hover:bg-rose-100 transition-colors">
              <CheckCircle2 size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Actions Validées</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.count}</div>
        </motion.div>

        <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-red-100">
          <div className="flex items-center gap-3 mb-3 text-red-500">
            <div className="p-2 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
              <Trash2 size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Matière Retirée</span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-slate-800">{metrics.totalKg.toFixed(1)}</div>
            <div className="text-sm font-bold text-slate-400">kg</div>
          </div>
          <div className="mt-1 text-xs font-semibold text-red-600 bg-red-50 inline-block px-2 py-0.5 rounded-full">
            + {metrics.totalButts} mégots
          </div>
        </motion.div>

        <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-rose-100">
          <div className="flex items-center gap-3 mb-3 text-rose-500">
            <div className="p-2 rounded-xl bg-rose-50 group-hover:bg-rose-100 transition-colors">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Force Citoyenne</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.totalVolunteers}</div>
          <div className="mt-1 text-xs font-semibold text-rose-600">
            Totalisant {(metrics.totalMinutes / 60).toFixed(1)} heures
          </div>
        </motion.div>

        <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-rose-100">
          <div className="flex items-center gap-3 mb-3 text-rose-500">
            <div className="p-2 rounded-xl bg-rose-50 group-hover:bg-rose-100 transition-colors">
              <MapPin size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Points GPS</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.geolocated}</div>
        </motion.div>

        <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-red-100">
          <div className="flex items-center gap-3 mb-3 text-red-500">
            <div className="p-2 rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
              <Route size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Surfaces/Tracés</span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.traced}</div>
        </motion.div>

        <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-rose-100">
          <div className="flex items-center gap-3 mb-3 text-rose-500">
            <div className="p-2 rounded-xl bg-rose-50 group-hover:bg-rose-100 transition-colors">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fiabilité</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-slate-800">{metrics.dataQuality}%</div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.dataQuality}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
