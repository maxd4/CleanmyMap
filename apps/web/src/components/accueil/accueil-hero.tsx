"use client";

import { Info, MapPin, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import type { HomeMetric } from "@/lib/accueil/config";

interface HomeHeroProps {
  metrics: HomeMetric[];
}

const metricAccentStyles = {
  blue: {
    bar: "bg-[#34d399]",
    label: "text-[#d9f99d]",
    value: "text-[#ecfdf5]",
    card: "hover:border-[#34d399]/36",
  },
  emerald: {
    bar: "bg-[#84cc16]",
    label: "text-[#bbf7d0]",
    value: "text-[#f7fee7]",
    card: "hover:border-[#84cc16]/36",
  },
  amber: {
    bar: "bg-[#22c55e]",
    label: "text-[#fde68a]",
    value: "text-[#f0fdf4]",
    card: "hover:border-[#22c55e]/36",
  },
} as const;

export function HomeHero({ metrics }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden bg-transparent pt-4 sm:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-[-6rem] h-[24rem] bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(34,197,94,0.22),transparent_68%)]" />
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-9 pt-2 sm:px-8 lg:pb-12">
        <div className="flex flex-col gap-6 xl:gap-8">
          <div className="group relative min-h-[560px] overflow-hidden rounded-[2.5rem] border border-white/10 cmm-surface-texture-emerald shadow-[0_36px_90px_-44px_rgba(2,6,23,0.78)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-9 lg:p-11">
              <div className="flex items-center justify-between gap-3">
                {/* removed 'Accueil' bubble per design request */}
                <div />
              </div>

              <div className="space-y-7">
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <h1 className="text-[clamp(2.95rem,4.15vw,4.4rem)] font-black leading-[0.9] tracking-[-0.07em] text-white drop-shadow-[0_14px_34px_rgba(2,6,23,0.42)] lg:whitespace-nowrap">
                      Clean My Map
                    </h1>
                    <div className="ml-2">
                      <SitePreferencesControls variant="locale" />
                    </div>
                  </div>
                  <p className="max-w-2xl text-[1.08rem] leading-[1.7] text-white sm:text-[1.12rem]">
                    Cultivons l&apos;entraide pour dépolluer, cartographier et
                    transformer chaque action terrain en preuve utile.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-emerald-300/16 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-white">
                    Dépolluer
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-300/16 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-white">
                    Cartographier
                  </span>
                  <span className="inline-flex items-center rounded-full border border-emerald-300/16 bg-emerald-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-white">
                    Impacter
                  </span>
                </div>



                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href="/actions/map"
                    className="inline-flex h-[56px] items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-300 via-lime-300 to-amber-200 px-8 text-[15px] font-black text-emerald-950 shadow-[0_18px_34px_-18px_rgba(132,204,22,0.58)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/50"
                  >
                    <MapPin size={20} />
                    Ouvrir la carte
                  </Link>
                  <Link
                    href="/explorer"
                    className="inline-flex h-[56px] items-center justify-center gap-3 rounded-2xl border border-white/12 bg-slate-950/35 px-8 text-[15px] font-black !text-white shadow-[0_16px_34px_-26px_rgba(2,6,23,0.8)] transition-all hover:bg-slate-900/48 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                  >
                    <LayoutDashboard size={20} />
                    Accéder au sommaire
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="relative min-h-[560px] overflow-hidden rounded-[2.5rem] border border-white/10 cmm-surface-texture-emerald shadow-[0_36px_90px_-44px_rgba(2,6,23,0.72)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-emerald-300 via-lime-300 to-emerald-200" />
            <div className="relative z-10 flex h-full flex-col p-7 sm:p-9 lg:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.32em] text-white sm:text-[12px]">
                    <span className="h-3.5 w-3.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" />
                    Impact terrain 2026
                  </p>

                </div>
                <Link
                  href="/methodology"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-[0_12px_24px_-18px_rgba(2,6,23,0.78)] transition-colors hover:border-white/18 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
                >
                  <Info size={12} />
                  Méthodologie
                </Link>
              </div>

              <div className="mt-6 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {metrics.map((metric) => {
                  const s = metricAccentStyles[metric.accent];
                  return (
                    <div
                      key={metric.key}
                      className={`group relative min-h-[130px] overflow-hidden rounded-[1.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,94,60,0.92)_0%,rgba(12,80,50,0.92)_100%)] p-4 shadow-[0_12px_28px_-20px_rgba(2,6,23,0.78)] transition-transform hover:-translate-y-0.5 ${s.card}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${s.bar}`} />
                      <div className="flex items-start justify-between gap-3">
                        <p className={`min-h-[2.2rem] max-w-[8ch] text-[12px] font-black uppercase leading-snug tracking-[0.24em] ${s.label}`}>
                          {metric.label}
                        </p>
                      </div>
                      <div className={`mt-4 text-[clamp(1.6rem,3vw,2.4rem)] font-black leading-none tracking-tight ${s.value} whitespace-nowrap truncate`}>
                        {metric.value}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
