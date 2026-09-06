"use client";

import {
  ArrowRight,
  MessageCircle,
  Plus,
  UserRound,
  MapPin,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { HomeCounters, HomeMetric } from "@/lib/accueil/config";
import { HomeImpactKpiCard } from "./accueil-impact-kpi-card";
import { HomeMapPreview } from "./accueil-map-preview";

interface HomeHeroProps {
  metrics: HomeMetric[];
  counters: HomeCounters;
  actionCount?: number;
}

const heroActions = [
  {
    href: "/actions/map",
    label: "Consulter la carte",
    icon: MapPin,
    primary: true,
  },
  {
    href: "/sections/messagerie",
    label: "Discuter",
    icon: MessageCircle,
    primary: false,
  },
  {
    href: "/actions/new",
    label: "Créer une action",
    icon: Plus,
    primary: false,
  },
  {
    href: "/sections/rejoindre-un-formulaire",
    label: "Rejoindre une action",
    icon: UserRound,
    primary: false,
  },
] as const;

export function HomeHero({ metrics, counters, actionCount = 0 }: HomeHeroProps) {
  return (
    <section className="relative isolate left-1/2 w-screen -translate-x-1/2 overflow-visible bg-[#dffbed] text-[#082f24]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_16%,rgba(196,181,253,0.42),transparent_24%),radial-gradient(circle_at_32%_82%,rgba(110,231,183,0.52),transparent_30%),linear-gradient(135deg,#005743_0%,#0a936b_42%,#b9f3dc_100%)]" />
      <div className="pointer-events-none absolute -right-28 top-24 h-96 w-96 rounded-full bg-violet-300/30 blur-[100px]" />
      <div className="pointer-events-none absolute -left-40 bottom-20 h-96 w-96 rounded-full bg-emerald-200/45 blur-[110px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1680px] px-4 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-8 lg:px-10 lg:pb-10 lg:pt-10">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(25rem,0.82fr)_minmax(38rem,1.38fr)] lg:gap-10 xl:gap-14">
          <div className="min-w-0 px-1 py-4 sm:px-3 lg:py-8">
            <div className="max-w-[37rem]">
              <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.32em] text-emerald-100 sm:text-xs">
                <span className="h-3 w-3 shrink-0 rounded-full bg-[#26e6a4] shadow-[0_0_18px_rgba(38,230,164,0.92)]" />
                Des territoires plus propres, ensemble
              </p>

              <h1 className="mt-6 max-w-[38rem] text-[clamp(3.5rem,5.4vw,5.25rem)] font-black leading-[0.88] tracking-[-0.085em] text-white drop-shadow-[0_12px_26px_rgba(0,37,27,0.18)] lg:whitespace-nowrap">
                Clean My Map
              </h1>
              <p className="mt-7 max-w-[35rem] text-[clamp(1.05rem,1.7vw,1.42rem)] leading-[1.45] text-white/90">
                Cultivons l&apos;entraide pour dépolluer, cartographier et transformer chaque action terrain en preuve utile.
              </p>

              <div className="mt-9 grid max-w-[36rem] grid-cols-2 gap-4 sm:mt-10 sm:gap-5">
                {heroActions.map(({ href, icon: Icon, label, primary }) => (
                  <CmmButton
                    key={href}
                    href={href}
                    tone={primary ? "primary" : "secondary"}
                    variant="pill"
                    size="lg"
                    className={
                      primary
                        ? "h-[4.2rem] w-full justify-between rounded-[1.45rem] !border-[#72ffd0] !bg-[#28d99b] !text-[#053b2a] !shadow-[0_16px_34px_-18px_rgba(0,44,30,0.75)] hover:!bg-[#67efbb] sm:px-6"
                        : "h-[4.2rem] w-full justify-start rounded-[1.45rem] !border-white/80 !bg-white !text-[#102044] !shadow-[0_16px_34px_-22px_rgba(0,44,30,0.38)] hover:!bg-[#f5fffb] sm:px-6"
                    }
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
                      <span className="truncate text-left text-[13px] font-black sm:text-[15px]">
                        {label}
                      </span>
                    </span>
                    {primary ? <ArrowRight size={21} aria-hidden="true" /> : null}
                  </CmmButton>
                ))}
              </div>
            </div>
          </div>

          <HomeMapPreview />
        </div>

        <section className="relative mt-8 overflow-visible rounded-[2rem] border border-white/70 bg-white/30 p-4 shadow-[0_28px_70px_-38px_rgba(0,53,37,0.6)] backdrop-blur-xl sm:mt-10 sm:p-7 lg:mt-12 lg:p-8">
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_10%_0%,rgba(255,255,255,0.6),transparent_28%),radial-gradient(circle_at_90%_100%,rgba(110,231,183,0.26),transparent_32%)]" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-1 sm:px-2">
            <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.28em] text-[#11234a] sm:text-xs">
              <span className="h-3 w-3 rounded-full bg-[#1bd9a0] shadow-[0_0_15px_rgba(27,217,160,0.7)]" />
              Impact terrain 2026
            </p>
            <CmmButton
              href="/methodologie"
              tone="secondary"
              variant="pill"
              className="h-10 !border-white/80 !bg-white/90 !text-[#102044] !shadow-[0_10px_24px_-16px_rgba(0,40,30,0.4)] hover:!bg-white"
            >
              <span aria-hidden="true">ⓘ</span>
              Méthodologie
              <ArrowRight size={14} aria-hidden="true" />
            </CmmButton>
          </div>

          <div className="relative z-10 mt-5 grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {metrics.map((metric) => (
              <HomeImpactKpiCard
                key={metric.key}
                metric={metric}
                counters={counters}
                actionCount={actionCount}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
