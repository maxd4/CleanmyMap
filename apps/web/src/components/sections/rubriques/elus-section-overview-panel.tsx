"use client";

import { Activity, ChevronRight } from "lucide-react";
import { CmmCard } from "@/components/ui/cmm-card";
import { DecisionClusterSection } from "@/components/pilotage/decision-cluster-section";
import {
  buildPilotageClusterMetrics,
  PilotageInsightCard,
  PilotageMetricGrid,
} from "@/components/pilotage/pilotage-cluster-panels";
import {
  getSummaryInterpretationStyles,
  localizeSummaryKpi,
  localizeSummaryText,
  ThirtySecondsSummary,
} from "@/components/pilotage/thirty-seconds-summary";
import type { PilotageOverview } from "@/lib/pilotage/overview.types";
import type { Locale } from "@/lib/ui/preferences";

type ElusSectionOverviewPanelProps = {
  data: PilotageOverview;
  locale: Locale;
};

export function ElusSectionOverviewPanel({ data, locale }: ElusSectionOverviewPanelProps) {
  return (
    <div className="min-w-0 space-y-12">
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-8">
          <ThirtySecondsSummary locale={locale} summary={data.summary} />
        </div>
        <PilotageInsightCard
          variant="governance"
          className="lg:col-span-4"
          insight={{
            eyebrow: locale === "fr" ? "Lecture territoriale" : "Territorial reading",
            title: locale === "fr" ? "Focus stratégique" : "Strategic focus",
            detail: localizeSummaryText(data.summary.recommendedAction.reason, locale) ?? "",
            actionLabel: localizeSummaryText(data.summary.recommendedAction.label, locale) ?? "",
            actionHref: data.summary.recommendedAction.href,
          }}
        />
      </div>

      <PilotageMetricGrid
        variant="governance"
        metrics={buildPilotageClusterMetrics(
          data.summary.kpis.map((kpi) => localizeSummaryKpi(kpi, locale)),
        )}
      />

      <DecisionClusterSection locale={locale} surfaceId="governance" />

      <section className="min-w-0 space-y-4" aria-labelledby="elus-detailed-analytics-title">
        <div className="flex min-w-0 flex-col justify-between gap-3 px-1 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Activity className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
            <h2 id="elus-detailed-analytics-title" className="min-w-0 text-lg font-black tracking-tight text-white">
              {locale === "fr" ? "Analyses détaillées et tendances" : "Detailed analytics and trends"}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
            <span>{locale === "fr" ? "Période : 30 derniers jours" : "Period: last 30 days"}</span>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {data.summary.kpis.map((rawKpi) => {
            const kpi = localizeSummaryKpi(rawKpi, locale);
            const interpretationStyles = getSummaryInterpretationStyles(kpi.interpretation);
            const InterpretationIcon = interpretationStyles.icon;
            return (
              <CmmCard
                key={kpi.id ?? kpi.label}
                as="article"
                tone="slate"
                variant="glass"
                size="md"
                className="min-w-0"
              >
                <p className="cmm-text-small min-w-0 break-words font-black uppercase tracking-[0.12em] text-slate-400">
                  {kpi.label}
                </p>
                <div className="mt-3 min-w-0 space-y-3">
                  <span className="block break-words text-3xl font-black tracking-tight tabular-nums text-white">
                    {kpi.value}
                  </span>
                  <span className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 cmm-text-small font-black tracking-tight ${interpretationStyles.background} ${interpretationStyles.color}`}>
                    <InterpretationIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="break-words tabular-nums">{kpi.deltaPercent}</span>
                  </span>
                </div>
              </CmmCard>
            );
          })}
        </div>
      </section>
    </div>
  );
}
