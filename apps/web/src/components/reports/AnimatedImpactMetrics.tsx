"use client";

import { animate, motion } from "framer-motion";
import { Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

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

  const match = value.match(/([\d.,]+)(.*)/);
  const targetNum = match ? parseFloat(match[1].replace(",", ".")) : 0;
  const suffix = match ? match[2] : "";
  const decimals = match?.[1].includes(",") || match?.[1].includes(".") ? 1 : 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const controls = animate(0, targetNum, {
      duration: 2,
      ease: [0.16, 1, 0.3, 1],
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {kpis.map((kpi, idx) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.8 }}
          className="relative overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800/60 dark:bg-slate-900 dark:shadow-none group"
        >
          <div
            className={cn(
              "absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-[0.03] transition-transform duration-700 group-hover:scale-150",
              kpi.interpretation === "positive"
                ? "bg-sky-500"
                : kpi.interpretation === "negative"
                  ? "bg-red-500"
                  : "bg-cyan-500",
            )}
          />

          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {kpi.label}
            </span>
            <Link href="/methodologie">
              <Info size={14} className="text-slate-300 transition-colors hover:text-cyan-500" />
            </Link>
          </div>

          <div className="flex items-baseline gap-2">
            <NumberTicker value={kpi.value} className="text-4xl font-black tracking-tighter cmm-text-primary" />
            {kpi.deltaPercent ? (
              <div
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold",
                  kpi.interpretation === "positive"
                    ? "bg-sky-100 text-sky-700"
                    : kpi.interpretation === "negative"
                      ? "bg-red-100 text-red-700"
                      : "bg-slate-100 text-slate-600",
                )}
              >
                {kpi.interpretation === "positive" ? (
                  <TrendingUp size={10} />
                ) : kpi.interpretation === "negative" ? (
                  <TrendingDown size={10} />
                ) : (
                  <Minus size={10} />
                )}
                {kpi.deltaPercent}
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
