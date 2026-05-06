"use client";

import { motion } from "framer-motion";
import { Users, Trash2, TrendingUp } from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";

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
    { label: "kg collectés", value: stats ? formatNumber(stats.totalKg) : "—", icon: Trash2 },
    { label: "actions", value: stats ? formatNumber(stats.totalActions) : "—", icon: TrendingUp },
    { label: "bénévoles", value: stats ? formatNumber(stats.volunteers) : "—", icon: Users },
  ];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[1.25rem] border border-orange-300/18 bg-[rgba(97,61,29,0.58)] p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-100/60">
          Impact collectif
        </p>
        <Link href="/methodologie" className="text-[10px] font-bold text-orange-300 hover:text-orange-200">
          En savoir +
        </Link>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <CmmSkeleton variant="rectangular" className="w-6 h-6 rounded-lg mx-auto mb-1" />
              <CmmSkeleton variant="text" className="h-5 w-10 mx-auto" />
              <CmmSkeleton variant="text" className="h-2 w-8 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, i) => (
            <div key={item.label} className="text-center">
              <item.icon className="w-4 h-4 mx-auto text-orange-300/70 mb-1" />
              <p className="text-lg font-black text-white">{item.value}</p>
              <p className="text-[9px] font-medium text-orange-100/60">{item.label}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}