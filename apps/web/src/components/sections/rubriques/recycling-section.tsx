"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { RecyclingQuestionAssistant } from "./recycling-question-assistant/index";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { 
  RecyclingKpiGrid, 
  RecyclingWorkflowCard, 
  RecyclingDataUsageCard,
  RecyclingStreamTable,
  RecyclingQualitySummary
} from "./recycling-components";
import { AlertCircle, Recycle, Sparkles, MapPin, Search } from "lucide-react";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { RubriqueCard } from "@/components/ui/rubrique-card";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function RecyclingSection() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  
  const actions = useSWR(["section-recycling-actions"], () =>
    fetchActions({ status: "approved", limit: 350 }),
  );
  const map = useSWR(["section-recycling-map"], () =>
    fetchMapActions({ status: "approved", days: 365, limit: 300 }),
  );
  
  const breakdown = useSWR("section-recycling-breakdown", async () => {
    const response = await fetch("/api/recycling/breakdown", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("breakdown_unavailable");
    }
    return (await response.json()) as {
      totalKg: number;
      lines: Array<{
        category: string;
        kg: number;
        sharePercent: number;
        entries: number;
      }>;
      triQuality: { elevee: number; moyenne: number; faible: number };
      generatedAt: string;
    };
  });

  const stats = useMemo(() => {
    const items = actions.data?.items ?? [];
    const totalKg = items.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
    const totalButts = items.reduce((acc, item) => acc + Number(item.cigarette_butts || 0), 0);
    const avgKg = items.length > 0 ? totalKg / items.length : 0;
    const withTrace = (map.data?.items ?? []).filter((item) =>
      (item.contract?.geometry.kind ?? item.geometry_kind ?? "point") !== "point",
    ).length;
    const mixedIndex = totalKg > 0 ? Math.max(0, 100 - Math.round((totalButts / Math.max(totalKg, 1)) * 0.8)) : 0;
    
    return { totalKg, totalButts, avgKg, withTrace, mixedIndex, count: items.length };
  }, [actions.data?.items, map.data?.items]);

  const isLoading = actions.isLoading || map.isLoading || breakdown.isLoading;
  const hasError = Boolean(actions.error || map.error || breakdown.error);

  return (
    <SectionShell
      id="recycling"
      title={fr ? "Cycle des Ressources" : "Resource Cycle"}
      subtitle={fr ? "Suivi de la valorisation, des flux de tri et optimisation circulaire." : "Tracking recovery, sorting flows, and circular optimization."}
      icon={Recycle}
      gradient="from-emerald-500/20 via-slate-500/10 to-transparent"
    >
      <div className="space-y-16 pt-8">
        {/* Top Control & Search Bar */}
        <RubriqueCard 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          themeColor="emerald"
          withTopBar={false}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 p-8 group"
        >
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Recycle size={18} />
              </div>
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                {fr ? "Flux de Valorisation" : "Recovery Flows"}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {fr ? "Périmètre Global" : "Global Scope"}</span>
              <div className="w-1 h-1 rounded-full bg-white/10" />
              <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-slate-400" /> {fr ? "Intelligence Circulaire" : "Circular Intelligence"}</span>
            </div>
          </div>

          <div className="relative z-10 flex gap-4">
             <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 group/search hover:border-emerald-500/30 transition-all cursor-pointer">
                <Search size={16} className="group-hover/search:text-emerald-400 transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest">{fr ? "Rechercher une filière" : "Search a stream"}</span>
             </div>
          </div>
        </RubriqueCard>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-12">
               <CmmSkeleton className="h-48 rounded-[2.5rem]" />
               <CmmSkeleton className="h-[500px] rounded-[3rem]" />
            </div>
            <div className="lg:col-span-4 space-y-12">
               <CmmSkeleton className="h-96 rounded-[3rem]" />
               <CmmSkeleton className="h-64 rounded-[3rem]" />
            </div>
          </div>
        ) : hasError ? (
          <div className="p-20 text-center rounded-[3rem] border border-white/5 bg-slate-900/20 backdrop-blur-xl">
            <AlertCircle className="mx-auto text-rose-500 mb-6" size={48} />
            <h3 className="text-2xl font-black text-white mb-2">Flux non disponibles</h3>
            <p className="text-slate-400">Une erreur est survenue lors de la récupération des données de recyclage.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
          >
            <div className="lg:col-span-8 space-y-16">
              <motion.div variants={itemVariants}>
                <RecyclingKpiGrid stats={stats} fr={fr} />
              </motion.div>

              <motion.div variants={itemVariants}>
                <RecyclingStreamTable breakdown={breakdown.data} fr={fr} />
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <RubriqueCard themeColor="emerald" withTopBar={true} className="p-8">
                  <RecyclingWorkflowCard fr={fr} />
                </RubriqueCard>
                <RubriqueCard themeColor="emerald" withTopBar={true} className="p-8">
                  <RecyclingDataUsageCard fr={fr} />
                </RubriqueCard>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-12">
              <RubriqueCard themeColor="emerald" withTopBar={true} className="p-8">
                <RecyclingQualitySummary quality={breakdown.data?.triQuality} fr={fr} />
              </RubriqueCard>

              <RubriqueCard themeColor="emerald" withTopBar={true} className="p-8">
                <RecyclingQuestionAssistant />
              </RubriqueCard>
            </div>
          </motion.div>
        )}
      </div>
    </SectionShell>
  );
}
