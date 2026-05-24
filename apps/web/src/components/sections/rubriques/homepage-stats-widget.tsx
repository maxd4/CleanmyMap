"use client";

import { motion } from "framer-motion";
import { Users, Trash2, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { cn } from "@/lib/utils";

type HomepageStatsAction = {
  waste_kg?: number | string | null;
  created_by?: string | null;
};

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

function computeStats(actions: HomepageStatsAction[]) {
  const totalKg = actions.reduce((sum, a) => sum + Number(a.waste_kg || 0), 0);
  const volunteers = new Set(actions.map(a => a.created_by)).size;
  return { totalKg: Math.round(totalKg), totalActions: actions.length, volunteers };
}

export function HomepageStatsWidget() {
  const { data, isLoading } = useSWR("homepage-stats", () => 
    fetchActions({ status: "approved", limit: 5000 }), 
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  
  const stats = data?.items ? computeStats(data.items) : null;
  
  const items = [
    { label: "kg collectés", value: stats ? formatNumber(stats.totalKg) : "—", icon: Trash2, color: "text-emerald-300" },
    { label: "actions", value: stats ? formatNumber(stats.totalActions) : "—", icon: TrendingUp, color: "text-lime-300" },
    { label: "bénévoles", value: stats ? formatNumber(stats.volunteers) : "—", icon: Users, color: "text-teal-300" },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="group relative overflow-hidden rounded-[2rem] border border-emerald-100/16 bg-[linear-gradient(180deg,rgba(20,100,70,0.94)_0%,rgba(14,85,55,0.94)_100%)] p-5 shadow-2xl backdrop-blur-3xl"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
         <Sparkles size={60} className="text-emerald-100" />
      </div>

      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
           <p className="cmm-text-card-label cmm-text-caption font-semibold tracking-[0.12em]">
             Impact collectif
           </p>
        </div>
        <Link 
           href="/methodologie" 
           className="cmm-text-card-copy cmm-text-caption flex items-center gap-1 font-semibold tracking-[0.12em] transition-colors hover:text-white"
        >
          Méthodologie
          <ArrowUpRight size={10} />
        </Link>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-emerald-200/12 bg-[rgba(8,34,20,0.88)] p-3 text-center">
              <CmmSkeleton variant="rectangular" className="w-5 h-5 rounded-lg mx-auto mb-2 opacity-20" />
              <CmmSkeleton variant="text" className="h-4 w-10 mx-auto opacity-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {items.map((item) => (
            <div key={item.label} className="group/item rounded-2xl border border-emerald-200/12 bg-[rgba(8,34,20,0.88)] p-4 text-center transition-all duration-300 hover:bg-[rgba(10,42,25,0.94)]">
              <item.icon className={cn("w-4 h-4 mx-auto mb-2 opacity-60 group-hover/item:opacity-100 transition-opacity", item.color)} />
              <p className={cn("text-xl font-black tracking-tighter leading-none mb-1", item.color)}>{item.value}</p>
              <p className="cmm-text-card-copy cmm-text-caption font-semibold tracking-[0.12em]">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
