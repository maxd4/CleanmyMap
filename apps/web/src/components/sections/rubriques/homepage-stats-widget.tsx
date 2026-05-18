"use client";

import { motion } from "framer-motion";
import { Users, Trash2, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { cn } from "@/lib/utils";

function formatNumber(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

function computeStats(actions: any[]) {
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
    { label: "kg collectés", value: stats ? formatNumber(stats.totalKg) : "—", icon: Trash2, color: "text-emerald-400" },
    { label: "actions", value: stats ? formatNumber(stats.totalActions) : "—", icon: TrendingUp, color: "text-blue-400" },
    { label: "bénévoles", value: stats ? formatNumber(stats.volunteers) : "—", icon: Users, color: "text-amber-400" },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-[2rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-5 shadow-2xl group overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
         <Sparkles size={60} className="text-white" />
      </div>

      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
           <p className="cmm-text-caption font-semibold tracking-[0.12em] text-white">
             Impact collectif
           </p>
        </div>
        <Link 
           href="/methodologie" 
           className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-500 hover:text-white transition-colors flex items-center gap-1"
        >
          Méthodologie
          <ArrowUpRight size={10} />
        </Link>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center p-3 rounded-2xl bg-white/5 border border-white/5">
              <CmmSkeleton variant="rectangular" className="w-5 h-5 rounded-lg mx-auto mb-2 opacity-20" />
              <CmmSkeleton variant="text" className="h-4 w-10 mx-auto opacity-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {items.map((item) => (
            <div key={item.label} className="text-center p-4 rounded-2xl bg-white/5 border border-white/5 group/item hover:bg-white/10 transition-all duration-300">
              <item.icon className={cn("w-4 h-4 mx-auto mb-2 opacity-60 group-hover/item:opacity-100 transition-opacity", item.color)} />
              <p className="text-xl font-black text-white tracking-tighter leading-none mb-1">{item.value}</p>
              <p className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
