"use client";

import { motion, useSpring, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Info, TrendingUp, TrendingDown, Minus } from "lucide-react";
import Link from "next/link";

interface KpiData {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
}

interface AnimatedImpactMetricsProps {
  kpis: readonly [KpiData, KpiData, KpiData];
}

function NumberTicker({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  
  // Extract number and suffix (e.g., "1.5kg" -> { num: 1.5, suffix: "kg" })
  const match = value.match(/([\d.,]+)(.*)/);
  const targetNum = match ? parseFloat(match[1].replace(",", ".")) : 0;
  const suffix = match ? match[2] : "";
  const decimals = match?.[1].includes(",") || match?.[1].includes(".") ? 1 : 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const controls = animate(0, targetNum, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1], // expoOut
      onUpdate(value) {
        node.textContent = value.toFixed(decimals).replace(".", ",") + suffix;
      },
    });

    return () => controls.stop();
  }, [targetNum, suffix, decimals]);

  return <span ref={ref} className={className}>0{suffix}</span>;
}

export function AnimatedImpactMetrics({ kpis }: AnimatedImpactMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {kpis.map((kpi, idx) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.8 }}
          className="relative group bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none overflow-hidden"
        >
          {/* Decorative background element */}
          <div className={cn(
            "absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700",
            kpi.interpretation === "positive" ? "bg-emerald-500" :
            kpi.interpretation === "negative" ? "bg-rose-500" : "bg-amber-500"
          )} />

          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {kpi.label}
            </span>
            <Link href="/methodologie">
              <Info size={14} className="text-slate-300 hover:text-violet-500 transition-colors" />
            </Link>
          </div>

          <div className="flex items-baseline gap-2">
            <NumberTicker 
              value={kpi.value} 
              className="text-4xl font-black cmm-text-primary tracking-tighter" 
            />
            {kpi.deltaPercent && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold",
                kpi.interpretation === "positive" ? "bg-emerald-100 text-emerald-700" :
                kpi.interpretation === "negative" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
              )}>
                {kpi.interpretation === "positive" ? <TrendingUp size={10} /> :
                 kpi.interpretation === "negative" ? <TrendingDown size={10} /> : <Minus size={10} />}
                {kpi.deltaPercent}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Période précédente
            </div>
            <div className="text-sm font-bold text-slate-600 dark:text-slate-400">
              {kpi.previousValue}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
