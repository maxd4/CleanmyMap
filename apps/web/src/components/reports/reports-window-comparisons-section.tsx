import { KpiComparisonCard } from "@/components/pilotage/kpi-comparison-card";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { motion } from "framer-motion";
import { CalendarDays, AlertCircle, CheckCircle2 } from "lucide-react";

type ReportsWindowComparisonsSectionProps = {
  comparisonsByWindow: PilotageOverview["comparisonsByWindow"];
};

function signed(value: number, suffix = ""): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}${suffix}`;
}

function reliabilityTone(level: "elevee" | "moyenne" | "faible"): { bg: string; text: string; icon: any } {
  if (level === "elevee") return { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-600", icon: CheckCircle2 };
  if (level === "moyenne") return { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-600", icon: AlertCircle };
  return { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-600", icon: AlertCircle };
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function ReportsWindowComparisonsSection({
  comparisonsByWindow,
}: ReportsWindowComparisonsSectionProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/40 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
          <CalendarDays size={24} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Analyse Temporelle
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            Comparatifs d'impact sur 3 horizons (N vs N-1)
          </p>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mt-6 grid gap-6 lg:grid-cols-3"
      >
        {(["30", "90", "365"] as const).map((windowKey) => {
          const windowResult = comparisonsByWindow[windowKey];
          const tone = reliabilityTone(windowResult.current.reliability.level);
          const ReliabilityIcon = tone.icon;
          
          return (
            <motion.article
              variants={itemVariants}
              key={windowKey}
              className="relative flex flex-col rounded-2xl border border-white/40 bg-white/60 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.02)] backdrop-blur-md"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-t-2xl" />
              
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Horizon</p>
                  <p className="text-xl font-black text-slate-800">
                    {windowKey === "365" ? "12 mois" : `${windowKey} jours`}
                  </p>
                </div>
                
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${tone.bg} ${tone.text}`}>
                  <ReliabilityIcon size={14} strokeWidth={2.5} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Fiabilité {windowResult.current.reliability.level}
                  </span>
                </div>
              </div>
              
              <div className="mb-6 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  <span className="text-slate-700 font-bold">{windowResult.current.reliability.reason}</span> • 
                  Comp: {windowResult.current.reliability.completeness.toFixed(1)} / 
                  Géo: {windowResult.current.reliability.geoloc.toFixed(1)} / 
                  Date: {windowResult.current.reliability.freshness.toFixed(1)}
                </p>
              </div>

              <div className="grid gap-3 flex-1">
                <KpiComparisonCard
                  label="Actions"
                  value={`${windowResult.current.approvedActions}`}
                  previousValue={`${windowResult.previous.approvedActions}`}
                  deltaAbsolute={signed(windowResult.metrics.approvedActions.deltaAbsolute)}
                  deltaPercent={signed(windowResult.metrics.approvedActions.deltaPercent, "%")}
                  interpretation={windowResult.metrics.approvedActions.interpretation}
                />
                <KpiComparisonCard
                  label="Volume Retiré"
                  value={`${windowResult.current.impactVolumeKg.toFixed(1)} kg`}
                  previousValue={`${windowResult.previous.impactVolumeKg.toFixed(1)} kg`}
                  deltaAbsolute={signed(windowResult.metrics.impactVolumeKg.deltaAbsolute, " kg")}
                  deltaPercent={signed(windowResult.metrics.impactVolumeKg.deltaPercent, "%")}
                  interpretation={windowResult.metrics.impactVolumeKg.interpretation}
                />
                <KpiComparisonCard
                  label="Couverture"
                  value={`${windowResult.current.coverageRate.toFixed(1)}%`}
                  previousValue={`${windowResult.previous.coverageRate.toFixed(1)}%`}
                  deltaAbsolute={signed(windowResult.metrics.coverageRate.deltaAbsolute, " pt")}
                  deltaPercent={signed(windowResult.metrics.coverageRate.deltaPercent, "%")}
                  interpretation={windowResult.metrics.coverageRate.interpretation}
                />
                <KpiComparisonCard
                  label="Mobilisation"
                  value={`${windowResult.current.mobilizationCount}`}
                  previousValue={`${windowResult.previous.mobilizationCount}`}
                  deltaAbsolute={signed(windowResult.metrics.mobilizationCount.deltaAbsolute)}
                  deltaPercent={signed(windowResult.metrics.mobilizationCount.deltaPercent, "%")}
                  interpretation={windowResult.metrics.mobilizationCount.interpretation}
                />
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    </section>
  );
}
