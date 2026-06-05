"use client";

import { ArrowRight } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { PilotageLocale } from "../access-screen-constants";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { DecisionClusterSection } from "@/components/pilotage/decision-cluster-section";
import {
  PilotageInsightCard,
  PilotageMetricGrid,
} from "@/components/pilotage/pilotage-cluster-panels";

type PilotageOverviewSurfaceTabsProps = {
  locale: PilotageLocale;
  overview: PilotageOverview;
};

export function PilotageOverviewSurfaceTabs({
  locale,
  overview,
}: PilotageOverviewSurfaceTabsProps) {
  const decisionMetrics = overview.summary.kpis.map((kpi) => ({
    id: kpi.label,
    label: kpi.label,
    value: kpi.value,
    previousValue: kpi.previousValue,
    deltaAbsolute: kpi.deltaAbsolute,
    deltaPercent: kpi.deltaPercent,
    interpretation: kpi.interpretation,
  }));

  const decisionInsight = {
    eyebrow: locale === "fr" ? "Lecture rapide" : "Quick reading",
    title: overview.summary.recommendedAction.label,
    detail: overview.summary.recommendedAction.reason,
    actionLabel: locale === "fr" ? "Voir les rapports" : "View reports",
    actionHref: overview.summary.recommendedAction.href,
  };

  return (
    <>
      <nav
        aria-label={locale === "fr" ? "Onglets pilotage" : "Pilotage tabs"}
        className="flex flex-wrap gap-3 rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-3 backdrop-blur-2xl"
      >
        <CmmButton
          href="#decideurs"
          tone="secondary"
          variant="pill"
          className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]"
        >
          {locale === "fr" ? "Décideurs" : "Decision makers"}
        </CmmButton>
        <CmmButton
          href="#pilotage"
          tone="primary"
          variant="pill"
          className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]"
        >
          {locale === "fr" ? "Pilotage" : "Pilotage"}
        </CmmButton>
        <CmmButton
          href="#gouvernance"
          tone="secondary"
          variant="pill"
          className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em]"
        >
          {locale === "fr" ? "Gouvernance" : "Governance"}
        </CmmButton>
      </nav>

      <section
        id="decideurs"
        className="scroll-mt-28 space-y-6 rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 md:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-100/70">
              {locale === "fr" ? "Onglet décideurs" : "Decision makers tab"}
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
              {locale === "fr" ? "Lecture pour décideurs" : "Reading for decision makers"}
            </h2>
            <p className="text-sm leading-relaxed text-white/78 md:text-base">
              {locale === "fr"
                ? "Vue courte pour arbitrer rapidement, sans quitter le bloc Accueil & Pilotage."
                : "Short view for quick arbitration, without leaving the Home & Operations block."}
            </p>
          </div>
          <CmmButton
            href="/sponsor-portal"
            tone="secondary"
            variant="pill"
            className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black"
          >
            {locale === "fr" ? "Ouvrir le portail" : "Open portal"}
            <ArrowRight size={14} aria-hidden="true" />
          </CmmButton>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <PilotageMetricGrid
            variant="sponsor"
            metrics={decisionMetrics}
            className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          />
          <PilotageInsightCard variant="sponsor" insight={decisionInsight} />
        </div>

        <DecisionClusterSection
          locale={locale}
          surfaceId="sponsor"
          className="border-white/12 bg-white/[0.06]"
        />
      </section>

      <section
        id="gouvernance"
        className="scroll-mt-28 space-y-6 rounded-[1.75rem] border border-white/10 bg-slate-950/35 p-5 md:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
              {locale === "fr" ? "Onglet gouvernance" : "Governance tab"}
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
              {locale === "fr" ? "Lecture gouvernance" : "Governance reading"}
            </h2>
            <p className="text-sm leading-relaxed text-slate-300 md:text-base">
              {locale === "fr"
                ? "Repères d'arbitrage territorial et de méthode, avec accès direct à la gouvernance élargie."
                : "Territorial arbitration and method references, with direct access to the wider governance surface."}
            </p>
          </div>
          <CmmButton
            href="/sections/elus"
            tone="secondary"
            variant="pill"
            className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-black"
          >
            {locale === "fr" ? "Ouvrir la gouvernance" : "Open governance"}
            <ArrowRight size={14} aria-hidden="true" />
          </CmmButton>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <PilotageMetricGrid
            variant="governance"
            metrics={decisionMetrics}
            className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4"
          />
          <PilotageInsightCard
            variant="governance"
            insight={{
              eyebrow: locale === "fr" ? "Lecture rapide" : "Quick reading",
              title: locale === "fr" ? "Gouvernance" : "Governance",
              detail:
                locale === "fr"
                  ? "Accès rapide à la lecture territoriale et aux arbitrages."
                  : "Fast access to territorial reading and arbitration.",
              actionLabel: locale === "fr" ? "Ouvrir" : "Open",
              actionHref: "/sections/elus",
            }}
          />
        </div>

        <DecisionClusterSection
          locale={locale}
          surfaceId="governance"
          className="border-white/12 bg-white/[0.06]"
        />
      </section>
    </>
  );
}
