"use client";

import { Activity, ChevronRight, Layers, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { DecisionClusterSection } from "@/components/pilotage/decision-cluster-section";
import { PilotageInsightCard, PilotageMetricGrid } from "@/components/pilotage/pilotage-cluster-panels";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

type ElusSectionOverviewPanelProps = {
  data: PilotageOverview;
  locale: Locale;
};

export function ElusSectionOverviewPanel({ data, locale }: ElusSectionOverviewPanelProps) {
  return (
    <div className="space-y-24">
      {/* Summary Hero - Dynamic HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-8">
          <ThirtySecondsSummary summary={data.summary} />
        </div>
        <PilotageInsightCard
          variant="governance"
          className="lg:col-span-4"
          insight={{
            eyebrow: "Lecture territoriale",
            title: "Focus stratégique",
            detail: data.summary.recommendedAction.reason,
            actionLabel: data.summary.recommendedAction.label,
            actionHref: data.summary.recommendedAction.href,
          }}
        />
      </div>

      <PilotageMetricGrid
        variant="governance"
        metrics={data.summary.kpis.map((kpi) => ({
          id: kpi.label,
          label: kpi.label,
          value: kpi.value,
          previousValue: kpi.previousValue,
          deltaAbsolute: kpi.deltaAbsolute,
          deltaPercent: kpi.deltaPercent,
          interpretation: kpi.interpretation,
        }))}
      />

      <DecisionClusterSection locale={locale} surfaceId="governance" />

      {/* Secondary KPIs / Detailed Analytics */}
      <div className="space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-500">
              <Activity size={20} />
            </div>
            <h3 className="text-xl font-black text-white tracking-widest uppercase">Deep Analytics & Trends</h3>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Période: 30 derniers jours</span>
            <ChevronRight size={12} className="text-slate-700" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {data.summary.kpis.map((kpi, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl group hover:bg-white/5 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                <Layers size={100} />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                {kpi.label}
              </p>
              <div className="space-y-3">
                <span className="text-5xl font-black text-white tracking-tighter block">{kpi.value}</span>
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black tracking-tight shadow-2xl",
                  kpi.interpretation === "positive" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400",
                )}>
                  {kpi.interpretation === "positive" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {kpi.deltaPercent}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
