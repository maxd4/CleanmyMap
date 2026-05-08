"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Info,
  MapPinned,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { DecisionSummary } from "@/lib/pilotage/overview";
import type { ZoneComparisonRow } from "@/lib/pilotage/prioritization";

type HomeImpactSummaryProps = {
  summary: DecisionSummary | null;
  zones: ZoneComparisonRow[];
  generatedAt?: string | null;
  periodDays?: number;
};

const container = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

const KPI_STYLES = {
  impact: {
    accent: "from-emerald-400 via-emerald-300 to-cyan-300",
    border: "border-emerald-300/18",
    surface: "bg-[rgba(10,39,28,0.92)]",
    label: "text-emerald-100/62",
    value: "text-emerald-50",
    bar: "bg-emerald-300",
    chip: "bg-emerald-400/12 text-emerald-100 ring-emerald-300/18",
  },
  mobilization: {
    accent: "from-sky-400 via-cyan-300 to-sky-200",
    border: "border-sky-300/18",
    surface: "bg-[rgba(8,35,44,0.92)]",
    label: "text-sky-100/62",
    value: "text-sky-50",
    bar: "bg-sky-300",
    chip: "bg-sky-400/12 text-sky-100 ring-sky-300/18",
  },
  quality: {
    accent: "from-amber-300 via-amber-200 to-emerald-200",
    border: "border-amber-300/18",
    surface: "bg-[rgba(38,30,8,0.92)]",
    label: "text-amber-100/62",
    value: "text-amber-50",
    bar: "bg-amber-300",
    chip: "bg-amber-400/12 text-amber-100 ring-amber-300/18",
  },
} as const;

const ALERT_STYLES = {
  critical: {
    badge: "bg-rose-400/12 text-rose-100 ring-rose-300/18",
    border: "border-rose-300/18",
    surface: "bg-[rgba(58,14,28,0.9)]",
    glow: "shadow-[0_28px_64px_-32px_rgba(244,63,94,0.28)]",
    dot: "bg-rose-300",
  },
  high: {
    badge: "bg-amber-400/12 text-amber-100 ring-amber-300/18",
    border: "border-amber-300/18",
    surface: "bg-[rgba(53,32,10,0.9)]",
    glow: "shadow-[0_28px_64px_-32px_rgba(245,158,11,0.28)]",
    dot: "bg-amber-300",
  },
  medium: {
    badge: "bg-sky-400/12 text-sky-100 ring-sky-300/18",
    border: "border-sky-300/18",
    surface: "bg-[rgba(10,34,48,0.9)]",
    glow: "shadow-[0_28px_64px_-32px_rgba(56,189,248,0.24)]",
    dot: "bg-sky-300",
  },
  low: {
    badge: "bg-emerald-400/12 text-emerald-100 ring-emerald-300/18",
    border: "border-emerald-300/18",
    surface: "bg-[rgba(10,38,28,0.9)]",
    glow: "shadow-[0_28px_64px_-32px_rgba(16,185,129,0.24)]",
    dot: "bg-emerald-300",
  },
} as const;

function formatGeneratedAt(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function interpretLabel(value: DecisionSummary["kpis"][number]["interpretation"]): string {
  if (value === "positive") return "En progression";
  if (value === "negative") return "A surveiller";
  return "Stable";
}

function severityLabel(severity: DecisionSummary["alert"]["severity"]): string {
  if (severity === "critical") return "Critique";
  if (severity === "high") return "Haute";
  if (severity === "medium") return "Moyenne";
  return "Faible";
}

function severityTone(severity: DecisionSummary["alert"]["severity"]) {
  return ALERT_STYLES[severity];
}

function parseDeltaPercent(deltaPercent: string): number {
  const normalized = Number(deltaPercent.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(normalized) ? Math.abs(normalized) : 0;
}

export function HomeImpactSummary({
  summary,
  zones,
  generatedAt,
  periodDays = 365,
}: HomeImpactSummaryProps) {
  const updatedLabel = formatGeneratedAt(generatedAt);
  const topZones = [...zones]
    .sort((a, b) => b.normalizedScore - a.normalizedScore || b.currentKg - a.currentKg)
    .slice(0, 4);
  const topZoneScore = topZones.reduce((max, zone) => Math.max(max, zone.normalizedScore), 0) || 100;
  const windowLabel = periodDays >= 365 ? "12 mois" : `${periodDays} jours`;
  const alertTone = summary ? severityTone(summary.alert.severity) : ALERT_STYLES.low;

  return (
    <section className="relative z-20 mx-auto -mt-12 max-w-7xl px-4 sm:-mt-16 sm:px-8 lg:-mt-20 lg:px-12">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-3xl shadow-[0_32px_80px_-36px_rgba(16,185,129,0.20)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_42%_at_12%_0%,rgba(16,185,129,0.12),transparent),radial-gradient(ellipse_50%_36%_at_88%_12%,rgba(34,211,238,0.08),transparent)]" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-[220px] w-[420px] opacity-[0.03]">
          <Image
            src="/brand/logo-cleanmymap-officiel.svg"
            alt=""
            fill
            sizes="420px"
            className="object-contain object-right-bottom"
          />
        </div>
        <div className="h-[4px] w-full bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400" />

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-120px" }}
          className="relative space-y-6 px-6 py-8 sm:px-10 sm:py-10 lg:px-16 lg:py-12"
        >
          <motion.div
            variants={item}
            className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"
          >
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/18 bg-emerald-400/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100">
                  <BadgeCheck size={12} />
                  Impact
                </span>
                <span className="inline-flex items-center rounded-full border border-emerald-300/14 bg-[rgba(10,38,28,0.78)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/72">
                  Fenêtre {windowLabel}
                </span>
                {updatedLabel ? (
                  <span className="inline-flex items-center rounded-full border border-emerald-300/14 bg-[rgba(10,38,28,0.78)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/72">
                    Mis à jour {updatedLabel}
                  </span>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="max-w-2xl text-sm leading-relaxed text-emerald-100/68 sm:text-base">
                  Chaque indicateur est relié à une évolution, un niveau de qualité et une zone à surveiller.
                  Visualisez immédiatement où se concentre l&apos;effort utile.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/methodology"
                title="Comprendre le calcul des indicateurs"
                className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/16 bg-[rgba(10,38,28,0.88)] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-50 transition hover:border-emerald-300/30 hover:bg-[rgba(13,46,34,0.96)]"
              >
                <Info size={14} />
                Méthodologie
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-950 transition hover:bg-emerald-300"
              >
                Voir les rapports
                <ArrowRight size={14} />
              </Link>
            </div>
          </motion.div>

          {!summary ? (
            <motion.div
              variants={item}
              className="rounded-[1.75rem] border border-emerald-300/14 bg-[rgba(10,38,28,0.88)] p-6 text-sm leading-relaxed text-emerald-100/74"
            >
              Les données d&apos;impact sont en cours de chargement. Dès que le tableau de bord est
              disponible, la progression, la qualité et les zones prioritaires apparaissent ici.
            </motion.div>
          ) : (
            <>
              <motion.div variants={item} className="grid gap-4 lg:grid-cols-3">
                {summary.kpis.map((kpi) => {
                  const style = KPI_STYLES[kpi.id];
                  const barStrength = 18 + Math.min(82, parseDeltaPercent(kpi.deltaPercent) * 1.8);

                  return (
                    <article
                      key={kpi.id}
                      className={`group relative overflow-hidden rounded-[1.75rem] border ${style.border} ${style.surface} p-5 shadow-[0_24px_56px_-32px_rgba(16,185,129,0.22)] transition-transform duration-300 hover:-translate-y-0.5`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${style.accent}`} />
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${style.label}`}>
                            {kpi.label}
                          </p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/42">
                            {interpretLabel(kpi.interpretation)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ring-1 ${style.chip}`}
                        >
                          {kpi.id === "quality" ? "Crédibilité" : "12 mois"}
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        <div className={`text-[clamp(2rem,3.8vw,3rem)] font-black leading-none tracking-tight ${style.value}`}>
                          {kpi.value}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-emerald-100/54">
                            <span>Référence précédente</span>
                            <span>{kpi.previousValue}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[rgba(8,31,23,0.72)]">
                            <div
                              className={`h-full rounded-full ${style.bar}`}
                              style={{ width: `${barStrength}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em]">
                        <span className="text-emerald-100/42">Variation</span>
                        <span className={kpi.interpretation === "positive" ? "text-emerald-100" : kpi.interpretation === "negative" ? "text-rose-100" : "text-sky-100"}>
                          {kpi.deltaAbsolute} / {kpi.deltaPercent}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </motion.div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <motion.section
                  variants={item}
                  className="rounded-[1.9rem] border border-emerald-300/14 bg-[rgba(8,30,23,0.9)] p-5 shadow-[0_24px_56px_-32px_rgba(16,185,129,0.24)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.22em] text-emerald-50">
                        Répartition territoriale
                      </h3>
                      <p className="mt-1 text-sm text-emerald-100/62">
                        Les zones ci-dessous concentrent la charge la plus visible sur la fenêtre courante.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/14 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                      <MapPinned size={12} />
                      Lecture zone
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {topZones.length > 0 ? (
                      topZones.map((zone, index) => {
                        const width = Math.max(12, (zone.normalizedScore / topZoneScore) * 100);
                        return (
                          <div key={zone.area} className="space-y-2 rounded-[1.4rem] border border-emerald-300/12 bg-[rgba(10,38,28,0.78)] p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-emerald-50">
                                  {index + 1}. {zone.area}
                                </p>
                                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100/46">
                                  {zone.currentActions} actions · {zone.currentKg.toFixed(1)} kg · score {zone.normalizedScore.toFixed(1)}
                                </p>
                              </div>
                              <span className="rounded-full border border-emerald-300/14 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                                {zone.urgency}
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-[rgba(8,31,23,0.72)]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-300 to-sky-300"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <p className="text-sm leading-relaxed text-emerald-100/66">
                              {zone.justification}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-[1.4rem] border border-emerald-300/12 bg-[rgba(10,38,28,0.78)] p-4 text-sm text-emerald-100/66">
                        Aucune zone prioritaire ne ressort encore sur la fenêtre actuelle.
                      </div>
                    )}
                  </div>
                </motion.section>

                <motion.aside
                  variants={item}
                  className={`rounded-[1.9rem] border ${alertTone.border} ${alertTone.surface} p-5 ${alertTone.glow}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-[0.22em] text-emerald-50">
                        Alerte prioritaire
                      </h3>
                      <p className="mt-1 text-sm text-emerald-100/62">
                        Ce qui mérite une action ou une surveillance immédiate.
                      </p>
                    </div>
                    {summary ? (
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ring-1 ${alertTone.badge}`}
                      >
                        {severityLabel(summary.alert.severity)}
                      </span>
                    ) : null}
                  </div>

                  {summary ? (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-[1.4rem] border border-emerald-300/12 bg-[rgba(10,38,28,0.78)] p-4">
                        <div className="flex items-center gap-2 text-emerald-100/52">
                          <ShieldAlert size={16} />
                          <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                            {summary.alert.title}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-emerald-100/78">
                          {summary.alert.detail}
                        </p>
                      </div>

                      <div className="rounded-[1.4rem] border border-emerald-300/12 bg-[rgba(10,38,28,0.78)] p-4">
                        <div className="flex items-center gap-2 text-emerald-100/52">
                          <Target size={16} />
                          <span className="text-[10px] font-black uppercase tracking-[0.22em]">
                            Recommandation
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-semibold leading-relaxed text-emerald-50">
                          {summary.recommendedAction.label}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                          {summary.recommendedAction.reason}
                        </p>
                        <Link
                          href={summary.recommendedAction.href}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/16 bg-emerald-400/12 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-emerald-50 transition hover:border-emerald-300/28 hover:bg-emerald-400/18"
                        >
                          Ouvrir la cible
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-[1.4rem] border border-emerald-300/12 bg-[rgba(10,38,28,0.78)] p-4 text-sm leading-relaxed text-emerald-100/72">
                      Aucune alerte prioritaire détectée sur la fenêtre courante. Le bloc reste centré
                      sur la preuve, la progression et la lecture des zones.
                    </div>
                  )}

                  <div className="mt-5 rounded-[1.4rem] border border-emerald-300/12 bg-[rgba(10,38,28,0.78)] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/48">
                      Ce bloc sert à
                    </p>
                    <div className="mt-3 grid gap-3 text-sm text-emerald-100/72">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-300" />
                        Comparer la période en cours à la précédente
                      </div>
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={14} className="text-cyan-300" />
                        Montrer la qualité et la crédibilité des données
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPinned size={14} className="text-amber-300" />
                        Faire ressortir les zones qui concentrent l&apos;effort
                      </div>
                    </div>
                  </div>
                </motion.aside>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
