"use client";

import {
  ArrowRight,
  Plus,
  UserRound,
  Users,
  MapPin,
} from "lucide-react";
import { CmmButton, CmmButtonGroup } from "@/components/ui/cmm-button";
import type {
  HomeImpactSnapshot,
  HomeMetric,
} from "@/lib/accueil/config";
import { HomeImpactKpiCard } from "./accueil-impact-kpi-card";
import { HomeMapPreview } from "./accueil-map-preview";

interface HomeHeroProps {
  metrics: HomeMetric[];
  impactSnapshot: HomeImpactSnapshot | null;
}

const heroActions = [
  {
    href: "/actions/map",
    label: "Consulter la carte",
    icon: MapPin,
    tone: "primary",
    width: "auto",
    showArrow: true,
  },
  {
    href: "/sign-in",
    label: "Se connecter / S'inscrire",
    icon: Users,
    tone: "critical",
    width: "auto",
    showArrow: false,
  },
  {
    href: "/sections/rejoindre-un-formulaire",
    label: "Rejoindre une action",
    icon: UserRound,
    tone: "secondary",
    width: "auto",
    showArrow: false,
  },
  {
    href: "/actions/new",
    label: "Créer une action",
    icon: Plus,
    tone: "secondary",
    width: "auto",
    showArrow: false,
  },
] as const;

export function HomeHero({
  metrics,
  impactSnapshot,
}: HomeHeroProps) {
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

              <CmmButtonGroup
                layout="two-column"
                className="mt-7 max-w-[38rem] sm:mt-8"
              >
                {heroActions.map(({ href, icon: Icon, label, tone, width, showArrow }) => (
                  <CmmButton
                    key={href}
                    href={href}
                    tone={tone}
                    variant="pill"
                    size="lg"
                    width={width}
                  >
                    <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
                    <span>{label}</span>
                    {showArrow ? <ArrowRight size={21} aria-hidden="true" /> : null}
                  </CmmButton>
                ))}
              </CmmButtonGroup>
            </div>
          </div>

          <HomeMapPreview />
        </div>

        <section className="relative mt-4 overflow-visible sm:mt-6 lg:mt-7">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-5 px-1 sm:px-2">
            <p className="flex items-center gap-4 text-[clamp(1.9rem,3.8vw,3.35rem)] font-black leading-none tracking-[-0.055em] text-white">
              <span className="h-3 w-3 shrink-0 rounded-full bg-[#26e6a4] shadow-[0_0_15px_rgba(38,230,164,0.7)] sm:h-4 sm:w-4" />
              Impact terrain 2026
            </p>
            <CmmButton
              href="/methodologie#indicateurs-impact-terrain"
              tone="secondary"
              variant="pill"
              className="h-9 !border !border-[#047957] !bg-white/90 !text-[#047957] !shadow-[0_10px_24px_-16px_rgba(0,40,30,0.4)] hover:!bg-white"
            >
              <span aria-hidden="true">ⓘ</span>
              <span className="text-[#7c3aed]">Méthodologie</span>
              <ArrowRight size={14} aria-hidden="true" />
            </CmmButton>
          </div>

          <div className="relative z-10 mt-7 grid w-full grid-cols-2 gap-3 px-1 min-[768px]:grid-cols-3 min-[768px]:px-2 min-[1200px]:grid-cols-6 min-[1200px]:gap-4 min-[1200px]:px-3">
            {metrics.map((metric) => (
              <HomeImpactKpiCard
                key={metric.key}
                metric={metric}
                impactSnapshot={impactSnapshot}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
