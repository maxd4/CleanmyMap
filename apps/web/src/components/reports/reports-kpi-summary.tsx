"use client";

import { useMemo } from "react";
import { motion, type Variants } from "framer-motion";
import { Activity, CheckCircle2, MapPin, Route, Trash2, Users } from "lucide-react";
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
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/60 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-red-400/18 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-400/18 blur-3xl" />

      <div className="relative z-10 mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="bg-gradient-to-r from-red-700 via-red-600 to-cyan-600 bg-clip-text text-2xl font-black text-transparent">
            Synthèse d&apos;Impact Scientifique
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Indicateurs consolidés en temps réel.{" "}
            <a
              href="/methodologie"
              className="text-red-600 underline decoration-red-500/30 underline-offset-4 transition-colors hover:text-red-700"
            >
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
        <motion.div
          variants={itemVariant}
          className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-red-100 hover:shadow-md"
        >
          <div className="mb-3 flex items-center gap-3 text-red-500">
            <div className="rounded-xl bg-red-50 p-2 transition-colors group-hover:bg-red-100">
              <CheckCircle2 size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Actions validées
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.count}</div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-cyan-100 hover:shadow-md"
        >
          <div className="mb-3 flex items-center gap-3 text-cyan-600">
            <div className="rounded-xl bg-cyan-50 p-2 transition-colors group-hover:bg-cyan-100">
              <Trash2 size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Matière retirée
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-black text-slate-800">{metrics.totalKg.toFixed(1)}</div>
            <div className="text-sm font-bold text-slate-400">kg</div>
          </div>
          <div className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">
            + {metrics.totalButts} mégots
          </div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-red-100 hover:shadow-md"
        >
          <div className="mb-3 flex items-center gap-3 text-red-500">
            <div className="rounded-xl bg-red-50 p-2 transition-colors group-hover:bg-red-100">
              <Users size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Force citoyenne
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.totalVolunteers}</div>
          <div className="mt-1 text-xs font-semibold text-cyan-700">
            Totalisant {(metrics.totalMinutes / 60).toFixed(1)} heures
          </div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-cyan-100 hover:shadow-md"
        >
          <div className="mb-3 flex items-center gap-3 text-cyan-600">
            <div className="rounded-xl bg-cyan-50 p-2 transition-colors group-hover:bg-cyan-100">
              <MapPin size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Points GPS
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.geolocated}</div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-red-100 hover:shadow-md"
        >
          <div className="mb-3 flex items-center gap-3 text-red-500">
            <div className="rounded-xl bg-red-50 p-2 transition-colors group-hover:bg-red-100">
              <Route size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Surfaces / tracés
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800">{metrics.traced}</div>
        </motion.div>

        <motion.div
          variants={itemVariant}
          className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-cyan-100 hover:shadow-md"
        >
          <div className="mb-3 flex items-center gap-3 text-cyan-600">
            <div className="rounded-xl bg-cyan-50 p-2 transition-colors group-hover:bg-cyan-100">
              <Activity size={20} strokeWidth={2.5} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fiabilité
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-slate-800">{metrics.dataQuality}%</div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${metrics.dataQuality}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-cyan-500"
              />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
