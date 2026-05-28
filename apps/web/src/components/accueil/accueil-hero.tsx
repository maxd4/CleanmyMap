"use client";

import dynamic from "next/dynamic";
import {
  Cloud,
  Droplets,
  Euro,
  FileText,
  Info,
  LayoutDashboard,
  Leaf,
  MapPin,
  Trash2,
  UsersRound,
} from "lucide-react";
import useSWR from "swr";
import { CmmButton } from "@/components/ui/cmm-button";
import { SitePreferencesControls } from "@/components/ui/site-preferences-controls";
import { fetchMapActions } from "@/lib/actions/http";
import { EXPLORER_ROUTE } from "@/lib/accueil-pilotage-routes";
import type { HomeMetric } from "@/lib/accueil/config";

interface HomeHeroProps {
  metrics: HomeMetric[];
}

const HomeMapCanvas = dynamic(
  () =>
    import("@/components/actions/actions-map-canvas").then(
      (mod) => mod.ActionsMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full animate-pulse rounded-[1.65rem] border border-white/10 bg-[rgba(10,31,50,0.96)]" />
    ),
  },
);

const metricAccentStyles = {
  blue: {
    ring: "from-emerald-300/28 via-emerald-200/12 to-transparent",
    bubble: "bg-emerald-300/14 text-emerald-100 ring-1 ring-emerald-200/18",
    bar: "bg-[#34d399]",
    label: "text-[#d9f99d]",
    value: "text-[#ecfdf5]",
    card: "hover:border-[#34d399]/36",
  },
  emerald: {
    ring: "from-lime-300/24 via-emerald-200/12 to-transparent",
    bubble: "bg-lime-300/14 text-lime-100 ring-1 ring-lime-200/18",
    bar: "bg-[#84cc16]",
    label: "text-[#bbf7d0]",
    value: "text-[#f7fee7]",
    card: "hover:border-[#84cc16]/36",
  },
  amber: {
    ring: "from-amber-300/24 via-lime-200/12 to-transparent",
    bubble: "bg-amber-300/14 text-amber-100 ring-1 ring-amber-200/18",
    bar: "bg-[#22c55e]",
    label: "text-[#fde68a]",
    value: "text-[#f0fdf4]",
    card: "hover:border-[#22c55e]/36",
  },
} as const;

const metricIconByKey = {
  wasteKg: Trash2,
  butts: Leaf,
  volunteers: UsersRound,
  co2: Cloud,
  water: Droplets,
  euro: Euro,
} as const;

export function HomeHero({ metrics }: HomeHeroProps) {
  const { data: mapData, error: mapError } = useSWR(
    "home-hero-map-preview",
    () =>
      fetchMapActions({
        status: "approved",
        days: 365,
        limit: 18,
        types: "all",
      }),
  );

  return (
    <section className="relative overflow-hidden bg-transparent pt-4 sm:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-[-6rem] h-[24rem] bg-[radial-gradient(ellipse_55%_45%_at_50%_0%,rgba(34,197,94,0.22),transparent_68%)]" />
      <div className="relative z-10 mx-auto w-full max-w-none px-1 pb-9 pt-2 sm:px-2 lg:px-4 lg:pb-12">
        <div className="flex flex-col gap-6 xl:gap-8">
          <div className="group relative min-h-[470px] overflow-hidden rounded-[2.5rem] border border-white/10 cmm-surface-texture-emerald shadow-[0_36px_90px_-44px_rgba(2,6,23,0.78)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <div className="relative z-10 grid h-full gap-0 lg:grid-cols-2 lg:items-center">
              <div className="flex h-full min-w-0 flex-col justify-center gap-6 px-7 py-7 sm:px-9 sm:py-9 lg:px-11 lg:py-10">
                <div className="space-y-6">
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

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <CmmButton
                      href="/actions/map"
                      tone="primary"
                      variant="pill"
                      size="lg"
                      className="h-[52px] w-full min-w-0 rounded-2xl px-4 text-[13px] font-black gap-2 whitespace-nowrap transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    >
                      <MapPin size={20} />
                      Ouvrir la carte
                    </CmmButton>
                    <CmmButton
                      href="/actions/new"
                      tone="secondary"
                      variant="pill"
                      size="lg"
                      className="h-[52px] w-full min-w-0 rounded-full px-4 text-[13px] font-black gap-2 whitespace-nowrap transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    >
                      <FileText size={19} />
                      Formulaire bénévole
                    </CmmButton>
                    <CmmButton
                      href={EXPLORER_ROUTE}
                      tone="tertiary"
                      variant="pill"
                      size="lg"
                      className="h-[52px] w-full min-w-0 rounded-2xl px-4 text-[13px] font-black gap-2 whitespace-nowrap transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                    >
                      <LayoutDashboard size={20} />
                      Accéder au sommaire
                    </CmmButton>
                  </div>
                </div>
              </div>

              <section className="relative min-h-[430px] min-w-0 self-stretch overflow-hidden bg-[linear-gradient(180deg,rgba(4,59,38,0.94)_0%,rgba(8,83,52,0.96)_52%,rgba(6,96,59,0.98)_100%)]">
                <div className="absolute inset-0">
                  {mapError ? (
                    <div className="flex h-full w-full items-center justify-center px-5 text-center text-sm text-white/72">
                      Impossible de charger la carte pour le moment.
                    </div>
                  ) : (
                    <HomeMapCanvas
                      items={mapData?.items ?? []}
                      selectedActionId={null}
                      compact
                      className="absolute inset-0 h-full w-full rounded-none border-0 bg-transparent shadow-none ring-0"
                    />
                  )}
                </div>

              </section>
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
                <CmmButton
                  href="/methodologie"
                  tone="secondary"
                  variant="pill"
                  className="h-10 px-4 text-[10px] font-black uppercase tracking-[0.2em] gap-2"
                >
                  <Info size={12} />
                  Méthodologie
                </CmmButton>
              </div>

              <div className="mt-6 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                {metrics.map((metric) => {
                  const s = metricAccentStyles[metric.accent];
                  const MetricIcon = metricIconByKey[metric.key as keyof typeof metricIconByKey] ?? Trash2;
                  return (
                    <div
                      key={metric.key}
                      className={`group relative min-h-[148px] overflow-hidden rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,84,54,0.95)_0%,rgba(10,66,41,0.94)_100%)] p-4 shadow-[0_16px_34px_-24px_rgba(2,6,23,0.82)] transition-transform duration-300 hover:-translate-y-0.5 ${s.card}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${s.bar}`} />
                      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(132,204,22,0.10),transparent_32%)]`} />
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(132,204,22,0.12),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_38%),radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_55%)] opacity-90" />

                      <div className="relative z-10 flex h-full flex-col justify-between gap-5">
                        <div className="flex items-start justify-between gap-3">
                          <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${s.bubble}`}>
                            <MetricIcon size={22} strokeWidth={2.2} />
                          </span>
                          <span className="inline-flex rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/72">
                            2026
                          </span>
                        </div>

                        <div className="space-y-2">
                          <p className={`text-[11px] font-black uppercase tracking-[0.26em] ${s.label}`}>
                            {metric.label}
                          </p>
                          <div className={`text-[clamp(1.9rem,3.3vw,2.65rem)] font-black leading-none tracking-tight ${s.value} whitespace-nowrap truncate`}>
                            {metric.value}
                          </div>
                        </div>
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
