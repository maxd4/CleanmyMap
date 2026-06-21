"use client";

import { animate, motion } from "framer-motion";
import { Info, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { SourceBadge, StatCard } from "@/components/ui/page-structure";

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
          className="group relative"
        >
          <StatCard
            label={kpi.label}
            value={<NumberTicker value={kpi.value} className="text-4xl font-black tracking-tighter text-stone-950" />}
            badge={
              kpi.deltaPercent ? (
                <SourceBadge
                  tone={
                    kpi.interpretation === "positive"
                      ? "emerald"
                      : kpi.interpretation === "negative"
                        ? "rose"
                        : "slate"
                  }
                >
                  {kpi.interpretation === "positive" ? (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp size={10} />
                      {kpi.deltaPercent}
                    </span>
                  ) : kpi.interpretation === "negative" ? (
                    <span className="inline-flex items-center gap-1">
                      <TrendingDown size={10} />
                      {kpi.deltaPercent}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Minus size={10} />
                      {kpi.deltaPercent}
                    </span>
                  )}
                </SourceBadge>
              ) : null
            }
            period={
              <span className="text-sm font-bold text-stone-600">
                Période précédente: {kpi.previousValue}
              </span>
            }
            footer={
              <Link href="/methodologie" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-700 transition hover:text-sky-800">
                Voir la méthode
                <Info size={14} />
              </Link>
            }
            tone="slate"
            className={cn(
              "overflow-hidden border-slate-200/60 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-slate-800/60 dark:bg-slate-900 dark:shadow-none",
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}
