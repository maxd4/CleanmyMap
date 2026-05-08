"use client";

import { motion } from "framer-motion";
import { Info, MapPin, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import type { HomeMetric } from "@/lib/accueil/config";

interface HomeHeroProps {
  metrics: HomeMetric[];
}

const metricAccentStyles = {
  blue: {
    bar: "bg-[#0F6FFF]",
    value: "text-[#E9F4FF]",
    card: "hover:border-[#0F6FFF]/36",
  },
  emerald: {
    bar: "bg-[#16C79A]",
    value: "text-[#D9FFF1]",
    card: "hover:border-[#16C79A]/36",
  },
  amber: {
    bar: "bg-[#F2A313]",
    value: "text-[#FFF0B8]",
    card: "hover:border-[#F2A313]/36",
  },
} as const;

export function HomeHero({ metrics }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden bg-transparent pt-4 sm:pt-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(34,195,214,0.12),transparent),radial-gradient(ellipse_45%_45%_at_0%_100%,rgba(25,157,139,0.10),transparent)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'180\' height=\'180\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.72\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'180\' height=\'180\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1540px] px-4 pb-9 pt-2 sm:px-8 lg:pb-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative min-h-[470px] overflow-hidden rounded-[2rem] border border-[#4B7B8C]/22 shadow-[0_34px_76px_-34px_rgba(6,17,30,0.76)] sm:min-h-[515px]"
          >
            {/* Layer fond isolé — backdrop-blur UNIQUEMENT ici */}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[#18374E]/94 backdrop-blur-xl" />
            <div className="relative z-10 space-y-8 p-7 sm:p-9 lg:p-11">
              <div className="flex items-center justify-end gap-3">
                <SitePreferencesControls variant="locale" />
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-[clamp(3.5rem,7vw,5.35rem)] font-black leading-[0.94] tracking-[-0.05em] text-white">
                  Clean My Map
                </h1>
                <div className="flex items-center gap-3">
                  <span className="h-px w-12 bg-[#26C8D8]/42" />
                  <p className="inline-flex flex-wrap gap-x-3 gap-y-1 rounded-full border border-[#26C8D8]/34 bg-[#103F4D]/78 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.34em] text-[#75F4F6] sm:text-[11px]">
                    <span>Dépolluer</span>
                    <span className="opacity-35">·</span>
                    <span>Cartographier</span>
                    <span className="opacity-35">·</span>
                    <span>Impacter</span>
                  </p>
                </div>
              </div>

              <p className="max-w-2xl text-[1.1rem] font-medium leading-[1.6] text-white/90">
                Cultivons l&apos;entraide.
                <span className="block mt-2 text-[#26C8D8] font-semibold">📍 Carte interactive • 📱 Compagnon GPS • 📊 Hub Opérationnel</span>
              </p>

              <div className="flex flex-wrap gap-4 mt-8">
                <Link
                  href="/actions/map"
                  className="inline-flex h-[56px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#20C6D5] to-[#17C486] px-8 text-[15px] font-bold text-white shadow-[0_18px_30px_-18px_rgba(23,196,134,0.58)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/50"
                >
                  <MapPin size={20} />
                  Ouvrir la Carte
                </Link>
                <Link
                  href="/explorer"
                  className="inline-flex h-[56px] items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-8 text-[15px] font-bold text-white transition-all hover:bg-white/20 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <LayoutDashboard size={20} />
                  Accéder au Hub
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.05 }}
            className="relative min-h-[500px] overflow-hidden rounded-[2rem] border border-[#4B7B8C]/18 shadow-[0_34px_76px_-34px_rgba(6,17,30,0.76)]"
          >
            {/* Layer fond isolé */}
            <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[#18374E]/94 backdrop-blur-xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#0F6FFF] via-[#20C6D5] to-[#17C486]" />
            <div className="relative z-10 space-y-8 p-8 sm:p-10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.34em] text-white sm:text-[12px]">
                    <span className="h-4 w-4 rounded-full bg-[#009BFF] shadow-[0_0_18px_rgba(0,155,255,0.55)]" />
                    Impact terrain 2026
                  </p>
                  <p className="pl-7 text-sm leading-relaxed text-white/58 sm:text-[13px]">
                    Données terrain certifiées. Formules exposées en
                    méthodologie.
                  </p>
                </div>
                <Link
                  href="/methodology"
                  className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#0F2137] px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/82 shadow-[0_12px_24px_-18px_rgba(6,17,30,0.78)] transition-colors hover:bg-[#132B45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/40"
                >
                  <Info size={12} />
                  Méthodologie
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
                {metrics.map((metric) => {
                  const s = metricAccentStyles[metric.accent];
                  return (
                    <div
                      key={metric.key}
                      className={`group relative min-h-[148px] overflow-hidden rounded-[1.35rem] border border-[#31516B]/18 bg-[#102036] p-6 shadow-[0_14px_32px_-20px_rgba(6,17,30,0.9)] transition-transform hover:-translate-y-0.5 ${s.card}`}
                    >
                      <div className={`absolute inset-y-4 left-0 w-1 rounded-r-full ${s.bar}`} />
                      <p className="mb-4 min-h-[2.5rem] text-[15px] font-medium uppercase leading-snug tracking-[0.22em] text-white/58">
                        {metric.label}
                      </p>
                      <div className={`text-[clamp(2.1rem,4vw,3rem)] font-black leading-none tracking-tight ${s.value}`}>
                        {metric.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
