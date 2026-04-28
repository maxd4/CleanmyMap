"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { swrRecentViewOptions } from "@/lib/swr-config";

import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  Trash2, 
  Users, 
  MapPin, 
  Route, 
  Activity 
} from "lucide-react";

const containerVariant = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function ReportsKpiSummary() {
  const actions = useSWR(
    ["reports-kpi-actions"],
    () => fetchActions({ status: "approved", limit: 300 }),
    swrRecentViewOptions,
  );
  const map = useSWR(
    ["reports-kpi-map"],
    () => fetchMapActions({ status: "approved", days: 365, limit: 300 }),
    swrRecentViewOptions,
  );

  const isLoading = actions.isLoading || map.isLoading;
  const error = actions.error || map.error;

  const metrics = useMemo(() => {
    const items = actions.data?.items ?? [];
    const mapItems = map.data?.items ?? [];
    const totalKg = items.reduce(
      (acc, item) => acc + Number(item.waste_kg || 0),
      0,
    );
    const totalButts = items.reduce(
      (acc, item) => acc + Number(item.cigarette_butts || 0),
      0,
    );
    const totalMinutes = items.reduce(
      (acc, item) => acc + Number(item.duration_minutes || 0),
      0,
    );
    const totalVolunteers = items.reduce(
      (acc, item) => acc + Number(item.volunteers_count || 0),
      0,
    );
    const geolocated = mapItems.filter(
      (item) => item.latitude !== null && item.longitude !== null,
    ).length;
    const traced = mapItems.filter((item) =>
      (item.contract?.geometry.kind ?? item.geometry_kind ?? "point") !== "point",
    ).length;
    return {
      totalKg,
      totalButts,
      totalMinutes,
      totalVolunteers,
      geolocated,
      traced,
      count: items.length,
      dataQuality: items.length > 0 ? Math.round((geolocated / items.length) * 100) : 0
    };
  }, [actions.data?.items, map.data?.items]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/40 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Synthèse d'Impact Scientifique
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Indicateurs consolidés en temps réel.{" "}
            <a href="/methodologie" className="text-emerald-500 hover:text-emerald-600 transition-colors underline decoration-emerald-500/30 underline-offset-4">
              Voir le protocole →
            </a>
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : null}
      
      {error ? (
        <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-sm text-rose-600 font-semibold">
          Impossible de charger les données d'impact.
        </div>
      ) : null}

      {!isLoading && !error ? (
        <motion.div 
          variants={containerVariant}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {/* Actions */}
          <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-emerald-100">
            <div className="flex items-center gap-3 mb-3 text-emerald-500">
              <div className="p-2 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
                <CheckCircle2 size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Actions Validées</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{metrics.count}</div>
          </motion.div>

          {/* Waste */}
          <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-teal-100">
            <div className="flex items-center gap-3 mb-3 text-teal-500">
              <div className="p-2 rounded-xl bg-teal-50 group-hover:bg-teal-100 transition-colors">
                <Trash2 size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Matière Retirée</span>
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-black text-slate-800">{metrics.totalKg.toFixed(1)}</div>
              <div className="text-sm font-bold text-slate-400">kg</div>
            </div>
            <div className="mt-1 text-xs font-semibold text-teal-600 bg-teal-50 inline-block px-2 py-0.5 rounded-full">
              + {metrics.totalButts} mégots
            </div>
          </motion.div>

          {/* Mobilization */}
          <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-blue-100">
            <div className="flex items-center gap-3 mb-3 text-blue-500">
              <div className="p-2 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Users size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Force Citoyenne</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{metrics.totalVolunteers}</div>
            <div className="mt-1 text-xs font-semibold text-blue-600">
              Totalisant {(metrics.totalMinutes / 60).toFixed(1)} heures
            </div>
          </motion.div>

          {/* Geolocation */}
          <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-indigo-100">
            <div className="flex items-center gap-3 mb-3 text-indigo-500">
              <div className="p-2 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                <MapPin size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Points GPS</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{metrics.geolocated}</div>
          </motion.div>

          {/* Traces */}
          <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-violet-100">
            <div className="flex items-center gap-3 mb-3 text-violet-500">
              <div className="p-2 rounded-xl bg-violet-50 group-hover:bg-violet-100 transition-colors">
                <Route size={20} strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Surfaces/Tracés</span>
            </div>
            <div className="text-3xl font-black text-slate-800">{metrics.traced}</div>
          </motion.div>

          {/* Data Quality */}
          <motion.div variants={itemVariant} className="group relative rounded-2xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-emerald-100">
            <div className="flex items-center gap-3 mb-3 text-emerald-500">
              <div className="p-2 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition-colors">
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
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </section>
  );
}
