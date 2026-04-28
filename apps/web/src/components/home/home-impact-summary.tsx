"use client";

import { motion } from "framer-motion";
import { Info } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Metric {
  key: string;
  label: string;
  value: string;
  category: string;
  accent: "blue" | "emerald" | "amber";
}

interface HomeImpactSummaryProps {
  metrics: Metric[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

export function HomeImpactSummary({ metrics }: HomeImpactSummaryProps) {
  return (
    <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-8 lg:px-12 -mt-16 sm:-mt-20 lg:-mt-24">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-slate-800/50 bg-slate-900/95 backdrop-blur-2xl shadow-2xl shadow-slate-950/50">
        {/* watermark logo en fond */}
        <div className="pointer-events-none absolute right-0 bottom-0 w-[480px] h-[160px] opacity-[0.03] dark:opacity-[0.02] select-none overflow-hidden">
          <Image
            src="/brand/logo-cleanmymap-officiel.svg"
            alt=""
            fill
            sizes="480px"
            className="object-contain object-right-bottom"
          />
        </div>

        {/* barre accent supérieure */}
        <div className="h-[4px] w-full bg-gradient-to-r from-blue-700 via-cyan-500 to-emerald-500" />

        <div className="relative px-6 sm:px-10 py-10 sm:py-12 lg:px-16 lg:py-14">
          {/* en-tête de section */}
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="inline-block h-4 w-4 rounded-full bg-gradient-to-br from-blue-600 to-emerald-500 shadow-sm" />
                <h2 className="cmm-text-small font-bold uppercase tracking-[0.25em] text-white whitespace-nowrap">
                  Impact consolidé — 12 mois
                </h2>
              </div>
              <p className="pl-[28px] cmm-text-small cmm-text-muted dark:cmm-text-muted">
                Données terrain certifiées. Formules exposées en{" "}
                <Link
                  href="/methodology"
                  className="text-cyan-400 hover:underline"
                >
                  méthodologie
                </Link>
                .
              </p>
            </div>
            <Link
              href="/methodology"
              title="Comprendre le calcul des indicateurs"
              className="inline-flex w-max items-center gap-2.5 self-start rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-3 cmm-text-small font-bold uppercase tracking-widest text-slate-300 shadow-sm transition-all duration-300 hover:border-blue-500 hover:text-blue-300 hover:shadow-lg active:scale-95 whitespace-nowrap"
            >
              <Info size={14} />
              Méthodologie
            </Link>
          </div>

          {/* grille KPI unique 3 col */}
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6"
          >
            {metrics.map((m) => {
              const accentStyles = {
                blue: {
                  bar: "bg-blue-600",
                  badge:
                    "bg-blue-950/40 text-blue-300 ring-blue-800/40",
                  value: "text-blue-100",
                  card: "hover:shadow-blue-900/40",
                },
                emerald: {
                  bar: "bg-emerald-500",
                  badge:
                    "bg-emerald-950/40 text-emerald-300 ring-emerald-800/40",
                  value: "text-emerald-100",
                  card: "hover:shadow-emerald-900/40",
                },
                amber: {
                  bar: "bg-amber-500",
                  badge:
                    "bg-amber-950/40 text-amber-300 ring-amber-800/40",
                  value: "text-amber-100",
                  card: "hover:shadow-amber-900/40",
                },
              } as const;
              const s = accentStyles[m.accent];

              return (
                <motion.div
                  key={m.key}
                  variants={item}
                  className={`group relative flex flex-col overflow-hidden rounded-[1.5rem] border border-slate-800/50 bg-slate-950/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${s.card}`}
                >
                  {/* barre accent gauche */}
                  <div className={`absolute inset-y-0 left-0 w-[4px] ${s.bar}`} />

                  {/* badge catégorie + période */}
                  <div className="mb-5 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center rounded-lg px-2.5 py-1 cmm-text-caption font-bold uppercase tracking-widest ring-1 ${s.badge} whitespace-nowrap`}
                    >
                      {m.category}
                    </span>
                    <span className="cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted dark:cmm-text-muted whitespace-nowrap">
                      12 Mois
                    </span>
                  </div>

                  {/* valeur */}
                  <div
                    className={`font-bold tabular-nums leading-none tracking-tighter ${s.value} text-wrap`}
                    style={{ fontSize: "clamp(1.75rem, 3.2vw, 2.75rem)" }}
                  >
                    {m.value}
                  </div>

                  {/* libellé */}
                  <p className="mt-4 cmm-text-caption font-bold uppercase tracking-widest cmm-text-muted dark:cmm-text-muted leading-tight">
                    {m.label}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
