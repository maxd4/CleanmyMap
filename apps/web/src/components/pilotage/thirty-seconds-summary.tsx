"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Info, ArrowRight, AlertTriangle, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type SummaryKpi = {
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
};

type SummaryAlert = {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
};

type SummaryAction = {
  href: string;
  label: string;
  reason?: string;
};

type SummaryLike = {
  kpis?: Array<SummaryKpi>;
  alert?: SummaryAlert;
  recommendedAction?: SummaryAction;
};

export type ThirtySecondsSummaryProps = {
  summary?: SummaryLike;
  kpis?: Array<SummaryKpi>;
  alert?: SummaryAlert;
  recommendedAction?: SummaryAction;
  recommendedReason?: string;
};

function deltaStyles(v: SummaryKpi["interpretation"]) {
  if (v === "positive") return { color: "text-amber-400", bg: "bg-amber-500/10", icon: TrendingUp };
  if (v === "negative") return { color: "text-rose-400", bg: "bg-rose-500/10", icon: TrendingDown };
  return { color: "text-slate-500", bg: "bg-white/5", icon: Minus };
}

function alertStyles(severity: string) {
  if (severity === "critical" || severity === "high")
    return { border: "border-rose-500/30", bg: "bg-rose-500/5", text: "text-rose-400", badge: "bg-rose-500/20 text-rose-300", glow: "shadow-[0_0_50px_rgba(244,63,94,0.1)]" };
  if (severity === "medium")
    return { border: "border-amber-500/30", bg: "bg-amber-500/5", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-300", glow: "shadow-[0_0_50px_rgba(245,158,11,0.1)]" };
  return { border: "border-white/10", bg: "bg-white/5", text: "text-slate-400", badge: "bg-white/10 text-slate-300", glow: "" };
}

type NormalizedThirtySecondsSummary = {
  kpis: Array<SummaryKpi>;
  alert?: SummaryAlert;
  recommendedAction?: SummaryAction;
  recommendedReason?: string;
};

export function normalizeThirtySecondsSummaryProps(
  props: ThirtySecondsSummaryProps,
): NormalizedThirtySecondsSummary {
  const summary = props.summary;

  return {
    kpis: summary?.kpis ?? props.kpis ?? [],
    alert: summary?.alert ?? props.alert,
    recommendedAction: summary?.recommendedAction ?? props.recommendedAction,
    recommendedReason:
      summary?.recommendedAction?.reason ?? props.recommendedReason,
  };
}

export function ThirtySecondsSummary(props: ThirtySecondsSummaryProps) {
  const { kpis, alert, recommendedAction, recommendedReason } =
    normalizeThirtySecondsSummaryProps(props);
  const hasKpis = kpis.length > 0;
  const actionLabel = recommendedAction?.label;
  const actionHref = recommendedAction?.href;
  const actionReason = recommendedReason?.trim();
  const alertStyle = alert ? alertStyles(alert.severity) : null;

  return (
    <div className="space-y-8">
      {alert ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "group relative overflow-hidden rounded-[3rem] border p-10 backdrop-blur-3xl",
            alertStyle?.border,
            alertStyle?.bg,
            alertStyle?.glow,
          )}
        >
          <div className="pointer-events-none absolute right-0 top-0 p-12 opacity-5 transition-transform duration-1000 group-hover:scale-110">
            <AlertTriangle size={160} className={alertStyle?.text} />
          </div>

          <div className="relative z-10 flex flex-col items-start gap-8 md:flex-row md:items-center">
            <div
              className={cn(
                "rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl transition-transform duration-500 group-hover:scale-110",
                alertStyle?.text,
              )}
            >
              <AlertTriangle size={32} className="animate-pulse" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "rounded-full px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl",
                    alertStyle?.badge,
                  )}
                >
                  {alert.severity === "critical"
                    ? "Critique"
                    : alert.severity === "high"
                      ? "Urgent"
                      : "Attention"}
                </span>
                <div className="h-1 w-1 rounded-full bg-slate-700" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Protocole d&apos;Alerte Alpha
                </span>
              </div>
              <h4 className="text-3xl font-black leading-none tracking-tighter text-white">
                {alert.title}
              </h4>
              <p className="max-w-3xl text-sm font-bold leading-relaxed text-slate-400 opacity-80">
                {alert.detail}
              </p>
            </div>
            <button className="shrink-0 flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl transition-transform hover:translate-x-2">
              Résoudre
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      ) : null}

      {/* KPI Grid */}
      {hasKpis ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpis.map((kpi, i) => {
            const styles = deltaStyles(kpi.interpretation);
            const DeltaIcon = styles.icon;

            return (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-[3rem] border border-white/5 bg-slate-900/40 p-10 shadow-2xl backdrop-blur-3xl transition-all hover:bg-white/5"
              >
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/5 blur-3xl translate-x-16 -translate-y-16" />

                <div className="relative z-10 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg border border-white/5 bg-white/5 p-2 text-slate-600">
                        <Activity size={14} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {kpi.label}
                      </span>
                    </div>
                    <Link
                      href="/methodologie"
                      className="rounded-lg bg-white/5 p-2 text-slate-600 transition-all hover:bg-white/10 hover:text-white"
                    >
                      <Info size={14} />
                    </Link>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-3">
                      <p className="text-6xl font-black tracking-tighter text-white">
                        {kpi.value}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black tracking-tight",
                          styles.bg,
                          styles.color,
                        )}
                      >
                        <DeltaIcon size={12} />
                        {kpi.deltaPercent}
                      </div>
                      <span className="text-[10px] font-bold italic text-slate-600">
                        vs last period
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-6">
                    <p className="text-[10px] font-bold italic leading-relaxed text-slate-500">
                      Previous baseline:{" "}
                      <span className="font-black text-slate-400">
                        {kpi.previousValue}
                      </span>
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[3rem] border border-white/5 bg-slate-900/40 p-10 text-center backdrop-blur-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Synthèse indisponible
          </p>
          <h4 className="mt-3 text-2xl font-black tracking-tighter text-white">
            Aucun KPI à afficher
          </h4>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-400">
            Les données de pilotage n&apos;ont pas encore été chargées pour cette vue.
          </p>
        </div>
      )}

      {actionLabel && actionHref ? (
        <div className="flex flex-col gap-4 rounded-[3rem] border border-white/5 bg-white/5 p-6 backdrop-blur-3xl md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Action recommandée
            </p>
            {actionReason ? (
              <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-300">
                {actionReason}
              </p>
            ) : null}
          </div>
          <Link
            href={actionHref}
            className="inline-flex shrink-0 items-center gap-3 rounded-2xl bg-white px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl transition-transform hover:translate-x-2"
          >
            {actionLabel}
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
