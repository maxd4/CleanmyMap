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
    <section className="relative isolate overflow-visible text-[#082f24]">
      <div className="relative z-10 mx-auto w-full max-w-[1800px] px-3 pb-3 pt-3 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8 lg:pb-6 lg:pt-6">
        <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-7 xl:gap-10">
          <div className="min-w-0 px-1 py-4 sm:px-3 lg:py-8">
            <div className="max-w-[42rem]">
              <p className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.32em] text-emerald-100 sm:text-xs">
                <span className="h-3 w-3 shrink-0 rounded-full bg-[#26e6a4] shadow-[0_0_18px_rgba(38,230,164,0.92)]" />
                Des territoires plus propres, ensemble
              </p>

              <h1 className="mt-5 max-w-none text-[clamp(3.5rem,5.2vw,5.4rem)] font-black leading-[0.88] tracking-[-0.085em] text-white drop-shadow-[0_12px_26px_rgba(0,37,27,0.18)] lg:whitespace-nowrap">
                Clean My Map
              </h1>
              <p className="mt-5 max-w-[37rem] text-[clamp(1.05rem,1.55vw,1.38rem)] leading-[1.42] text-white/90">
                Cultivons l&apos;entraide pour dépolluer, cartographier et transformer chaque action terrain en preuve utile.
              </p>

              <div className="mt-7 grid max-w-[38rem] grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
                {heroActions.map(({ href, icon: Icon, label, primary }) => (
                  <CmmButton
                    key={href}
                    href={href}
                    tone={primary ? "primary" : "secondary"}
                    variant="pill"
                    size="lg"
                    className={
                      primary
                        ? "h-[3.85rem] w-full justify-between rounded-[1.35rem] !border-[#72ffd0] !bg-[#28d99b] !text-[#053b2a] !shadow-[0_16px_34px_-18px_rgba(0,44,30,0.75)] hover:!bg-[#67efbb] sm:px-6"
                        : "h-[3.85rem] w-full justify-start rounded-[1.35rem] !border-white/80 !bg-white !text-[#102044] !shadow-[0_16px_34px_-22px_rgba(0,44,30,0.38)] hover:!bg-[#f5fffb] sm:px-6"
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

        <section className="relative mt-4 overflow-visible rounded-[2rem] border border-white/70 bg-white/30 p-3 shadow-[0_28px_70px_-38px_rgba(0,53,37,0.6)] backdrop-blur-xl sm:mt-6 sm:p-5 lg:mt-7 lg:p-5">
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

          <div className="relative z-10 mt-3 grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
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
