"use client";

import { ArrowRight, AlertTriangle, Activity, Info, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import {
  localizeSummaryKpi,
  localizeSummaryText,
  type SummaryKpi,
} from "@/lib/pilotage/summary-localization";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

export { localizeSummaryKpi, localizeSummaryText, type SummaryKpi };

type SummaryAlert = {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
};

type SummaryAction = {
  href: string;
  label: string;
  reason?: string;
};

type SummaryLike = {
  kpis?: Array<SummaryKpi>;
  alert?: SummaryAlert;
  recommendedAction?: SummaryAction;
};

export type ThirtySecondsSummaryProps = {
  summary?: SummaryLike;
  kpis?: Array<SummaryKpi>;
  alert?: SummaryAlert;
  recommendedAction?: SummaryAction;
  recommendedReason?: string;
  locale?: Locale;
};

export function getSummaryInterpretationStyles(
  interpretation: SummaryKpi["interpretation"],
): { color: string; background: string; icon: LucideIcon } {
  if (interpretation === "positive") {
    return {
      color: "text-emerald-700 dark:text-emerald-300",
      background: "bg-emerald-100 dark:bg-emerald-500/15",
      icon: TrendingUp,
    };
  }
  if (interpretation === "negative") {
    return {
      color: "text-rose-700 dark:text-rose-300",
      background: "bg-rose-100 dark:bg-rose-500/15",
      icon: TrendingDown,
    };
  }
  return {
    color: "text-slate-700 dark:text-slate-200",
    background: "bg-slate-200/80 dark:bg-slate-500/20",
    icon: Minus,
  };
}

type NormalizedThirtySecondsSummary = {
  kpis: Array<SummaryKpi>;
  alert?: SummaryAlert;
  recommendedAction?: SummaryAction;
  recommendedReason?: string;
};

export function normalizeThirtySecondsSummaryProps(
  props: ThirtySecondsSummaryProps,
): NormalizedThirtySecondsSummary {
  const summary = props.summary;

  return {
    kpis: summary?.kpis ?? props.kpis ?? [],
    alert: summary?.alert ?? props.alert,
    recommendedAction: summary?.recommendedAction ?? props.recommendedAction,
    recommendedReason:
      summary?.recommendedAction?.reason ??
      props.recommendedAction?.reason ??
      props.recommendedReason,
  };
}

function alertCopy(severity: SummaryAlert["severity"], locale: Locale): string {
  const copy: Record<SummaryAlert["severity"], { fr: string; en: string }> = {
    critical: { fr: "Critique", en: "Critical" },
    high: { fr: "Urgent", en: "Urgent" },
    medium: { fr: "Attention", en: "Attention" },
    low: { fr: "Information", en: "Information" },
  };
  return copy[severity][locale];
}

function alertTone(severity: SummaryAlert["severity"]): "rose" | "amber" | "slate" {
  return severity === "critical" || severity === "high"
    ? "rose"
    : severity === "medium"
      ? "amber"
      : "slate";
}

function SummaryAlertCard({ alert, locale }: { alert: SummaryAlert; locale: Locale }) {
  return (
    <CmmCard
      as="section"
      tone={alertTone(alert.severity)}
      variant="outlined"
      size="md"
      className="flex flex-col gap-4 sm:flex-row sm:items-start"
      data-testid="summary-alert"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-current" aria-hidden="true" />
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="cmm-text-small font-black uppercase tracking-[0.12em]">
            {alertCopy(alert.severity, locale)}
          </span>
          <span aria-hidden="true" className="text-current/50">·</span>
          <span className="cmm-text-small text-current/70">
            {locale === "fr" ? "Alerte de pilotage" : "Operations alert"}
          </span>
        </div>
        <h3 className="text-xl font-black tracking-tight">{localizeSummaryText(alert.title, locale)}</h3>
        <p className="cmm-text-body">{localizeSummaryText(alert.detail, locale)}</p>
      </div>
    </CmmCard>
  );
}

function SummaryKpiGrid({ kpis, locale }: { kpis: SummaryKpi[]; locale: Locale }) {
  if (kpis.length === 0) {
    return (
      <CmmCard as="section" tone="slate" variant="muted" size="md" className="text-center" data-testid="summary-empty">
        <p className="cmm-text-small font-black uppercase tracking-[0.12em]">
          {locale === "fr" ? "Synthèse indisponible" : "Summary unavailable"}
        </p>
        <h3 className="mt-2 text-xl font-black tracking-tight">
          {locale === "fr" ? "Aucun KPI à afficher" : "No KPIs to display"}
        </h3>
        <p className="cmm-text-body mt-2">
          {locale === "fr"
            ? "Les données de pilotage n'ont pas encore été chargées pour cette vue."
            : "Operations data has not loaded for this view yet."}
        </p>
      </CmmCard>
    );
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3" data-testid="summary-kpi-grid">
      {kpis.map((rawKpi) => {
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
            data-testid={`summary-kpi-${kpi.id ?? kpi.label}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Activity className="h-4 w-4 shrink-0 text-current/70" aria-hidden="true" />
                <span className="cmm-text-small min-w-0 break-words font-black uppercase tracking-[0.12em]">
                  {kpi.label}
                </span>
              </div>
              <CmmButton
                href="/methodologie"
                tone="tertiary"
                variant="ghost"
                ariaLabel={locale === "fr" ? "Consulter la méthodologie" : "View methodology"}
                className="shrink-0"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </CmmButton>
            </div>

            <div className="mt-4 min-w-0 space-y-3">
              <p className="break-words text-4xl font-black tracking-tight tabular-nums">
                {kpi.value}
              </p>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {kpi.deltaPercent ? (
                  <span className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 cmm-text-small font-black tracking-tight", interpretationStyles.background, interpretationStyles.color)}>
                    <InterpretationIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="break-words tabular-nums">{kpi.deltaPercent}</span>
                  </span>
                ) : null}
                <span className="cmm-text-small font-semibold text-current/70">
                  {locale === "fr" ? "vs période précédente" : "vs previous period"}
                </span>
              </div>
              <p className="cmm-text-small border-t border-current/10 pt-3">
                <span className="font-semibold text-current/70">
                  {locale === "fr" ? "Référence précédente" : "Previous baseline"}: {" "}
                </span>
                <span className="font-black tabular-nums">{kpi.previousValue}</span>
              </p>
            </div>
          </CmmCard>
        );
      })}
    </div>
  );
}

function SummaryRecommendedAction({
  action,
  locale,
}: {
  action?: SummaryAction;
  locale: Locale;
}) {
  if (!action?.label || !action.href) return null;
  return (
    <CmmCard
      as="section"
      tone="slate"
      variant="muted"
      size="sm"
      className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      data-testid="summary-recommended-action"
    >
      <div className="min-w-0 space-y-1">
        <p className="cmm-text-small font-black uppercase tracking-[0.12em]">
          {locale === "fr" ? "Action recommandée" : "Recommended action"}
        </p>
        {action.reason ? <p className="cmm-text-body break-words">{localizeSummaryText(action.reason, locale)}</p> : null}
      </div>
      <CmmButton href={action.href} tone="primary" variant="pill" className="shrink-0 gap-2">
        {localizeSummaryText(action.label, locale)}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </CmmButton>
    </CmmCard>
  );
}

export function ThirtySecondsSummary(props: ThirtySecondsSummaryProps) {
  const { kpis, alert, recommendedAction, recommendedReason } =
    normalizeThirtySecondsSummaryProps(props);
  const locale = props.locale ?? "fr";
  const action = recommendedAction
    ? { ...recommendedAction, reason: recommendedReason ?? recommendedAction.reason }
    : undefined;

  return (
    <div className="min-w-0 space-y-4" data-testid="thirty-seconds-summary">
      {alert ? <SummaryAlertCard alert={alert} locale={locale} /> : null}
      <SummaryKpiGrid kpis={kpis} locale={locale} />
      <SummaryRecommendedAction action={action} locale={locale} />
    </div>
  );
}
