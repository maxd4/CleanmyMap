"use client";

import { ArrowRight, AlertTriangle, Activity, Info, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

export type SummaryKpi = {
  id?: string;
  label: string;
  value: string;
  previousValue: string;
  deltaAbsolute?: string;
  deltaPercent?: string;
  interpretation?: "positive" | "negative" | "neutral";
};

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

type SummaryCopy = { fr: string; en: string };

const SUMMARY_TEXT_COPY: Record<string, SummaryCopy> = {
  "Impact terrain": { fr: "Impact terrain", en: "Field impact" },
  "IUR (Sobriété)": { fr: "IUR (Sobriété)", en: "IUR (Sustainability)" },
  "Qualite data": { fr: "Qualité des données", en: "Data quality" },
  "Non comparable": { fr: "Non comparable", en: "Not comparable" },
  Indisponible: { fr: "Indisponible", en: "Unavailable" },
  "Traiter backlog moderation": {
    fr: "Traiter le backlog de modération",
    en: "Clear the moderation backlog",
  },
  "Renforcer geo-tracabilite": {
    fr: "Renforcer la géotraçabilité",
    en: "Strengthen geospatial traceability",
  },
  "Renforcer geo-couverture": {
    fr: "Renforcer la géocouverture",
    en: "Strengthen geographic coverage",
  },
  "Maintenir le pilotage courant": {
    fr: "Maintenir le pilotage courant",
    en: "Maintain current operations",
  },
  "Aucune alerte prioritaire": {
    fr: "Aucune alerte prioritaire",
    en: "No priority alert",
  },
  "Resorber le backlog de moderation": {
    fr: "Résorber le backlog de modération",
    en: "Clear the moderation backlog",
  },
  "Le delai de moderation et le volume pending degradent la fiabilite de publication.": {
    fr: "Le délai de modération et le volume pending dégradent la fiabilité de publication.",
    en: "Moderation delay and pending volume reduce publication reliability.",
  },
  "Rehausser la qualite des donnees terrain": {
    fr: "Rehausser la qualité des données terrain",
    en: "Improve field data quality",
  },
  "La qualite et la geo-couverture conditionnent la lecture KPI et les exports institutionnels.": {
    fr: "La qualité et la géocouverture conditionnent la lecture KPI et les exports institutionnels.",
    en: "Data quality and geographic coverage shape KPI reading and institutional exports.",
  },
  "Aucune zone prioritaire detectee": {
    fr: "Aucune zone prioritaire détectée",
    en: "No priority area detected",
  },
  "Pas de signal territorial suffisamment robuste sur la fenetre courante.": {
    fr: "Pas de signal territorial suffisamment robuste sur la fenêtre courante.",
    en: "No sufficiently robust territorial signal was found in the current window.",
  },
  "La zone combine impact eleve et pression recurrente sur la periode recente.": {
    fr: "La zone combine impact élevé et pression récurrente sur la période récente.",
    en: "The area combines high impact with recurring pressure over the recent period.",
  },
  "Renforcer la preuve spatiale": {
    fr: "Renforcer la preuve spatiale",
    en: "Strengthen spatial evidence",
  },
  "Les traces geolocalisees conditionnent la defendabilite des analyses de terrain.": {
    fr: "Les traces géolocalisées conditionnent la défendabilité des analyses de terrain.",
    en: "Geolocated traces support the defensibility of field analyses.",
  },
  "Fiabiliser la mesure des déchets": {
    fr: "Fiabiliser la mesure des déchets",
    en: "Make waste measurement reliable",
  },
  "Optimiser le rendement écologique (IUR)": {
    fr: "Optimiser le rendement écologique (IUR)",
    en: "Optimize ecological efficiency (IUR)",
  },
  "L'indice d'utilité réelle est trop bas. L'infrastructure consomme trop par rapport à l'impact terrain généré.": {
    fr: "L'indice d'utilité réelle est trop bas. L'infrastructure consomme trop par rapport à l'impact terrain généré.",
    en: "The real-utility index is too low. Infrastructure consumes too much for the field impact generated.",
  },
  "Nettoyage du registre de données": {
    fr: "Nettoyage du registre de données",
    en: "Clean the data register",
  },
  "Le pilotage ne detecte pas d'urgence immediate sur la fenetre courante.": {
    fr: "Le pilotage ne détecte pas d'urgence immédiate sur la fenêtre courante.",
    en: "No immediate urgency was detected in the current window.",
  },
  "Aucune degradation majeure detectee sur qualite, couverture ou moderation.": {
    fr: "Aucune dégradation majeure détectée sur qualité, couverture ou modération.",
    en: "No major deterioration was detected in quality, coverage, or moderation.",
  },
  "Aucune degradation majeure detectee sur qualite ou couverture; moderation indisponible avec la source actuelle.": {
    fr: "Aucune dégradation majeure détectée sur qualité ou couverture ; modération indisponible avec la source actuelle.",
    en: "No major deterioration was detected in quality or coverage; moderation is unavailable from the current source.",
  },
};

type SummaryTemplate = {
  pattern: RegExp;
  render: (match: RegExpMatchArray, locale: Locale) => string;
};

const SUMMARY_TEMPLATES: SummaryTemplate[] = [
  {
    pattern: /^([+-]?\d+(?:[.,]\d+)?) kg \(([+-]?\d+(?:[.,]\d+)?)% renseigné\)$/,
    render: (match, locale) => locale === "fr"
      ? `${match[1]} kg (${match[2]}% renseigné)`
      : `${match[1]} kg (${match[2]}% reported)`,
  },
  {
    pattern: /^Prioriser (.+)$/,
    render: (match, locale) => locale === "fr" ? `Prioriser ${match[1]}` : `Prioritize ${match[1]}`,
  },
  {
    pattern: /^Delai moderation en degradation \(([+-]?\d+(?:[.,]\d+)?) j, ([+-]?\d+(?:[.,]\d+)?) j actuels\)\.$/,
    render: (match, locale) => locale === "fr"
      ? `Délai de modération en dégradation (${match[1]} j, ${match[2]} j actuels).`
      : `Moderation delay is worsening (${match[1]} d, ${match[2]} d currently).`,
  },
  {
    pattern: /^Qualite data en baisse \(([+-]?\d+(?:[.,]\d+)?) pt, score actuel ([+-]?\d+(?:[.,]\d+)?)%\)\.$/,
    render: (match, locale) => locale === "fr"
      ? `Qualité des données en baisse (${match[1]} pt, score actuel ${match[2]}%).`
      : `Data quality is down (${match[1]} pt, current score ${match[2]}%).`,
  },
  {
    pattern: /^Couverture geoloc en degradation \(([+-]?\d+(?:[.,]\d+)?) pt, couverture actuelle ([+-]?\d+(?:[.,]\d+)?)%\)\.$/,
    render: (match, locale) => locale === "fr"
      ? `Couverture géoloc en dégradation (${match[1]} pt, couverture actuelle ${match[2]}%).`
      : `Geographic coverage is worsening (${match[1]} pt, current coverage ${match[2]}%).`,
  },
  {
    pattern: /^L'IUR est indisponible pour une décision métier : seulement ([+-]?\d+(?:[.,]\d+)?)% des actions ont une masse renseignée\.$/,
    render: (match, locale) => locale === "fr"
      ? `L'IUR est indisponible pour une décision métier : seulement ${match[1]}% des actions ont une masse renseignée.`
      : `The IUR is unavailable for a business decision: only ${match[1]}% of actions have reported mass.`,
  },
  {
    pattern: /^Détection de (\d+) anomalies de saisie \(Impact suspect ou date manquante\)\.$/,
    render: (match, locale) => locale === "fr"
      ? `Détection de ${match[1]} anomalies de saisie (Impact suspect ou date manquante).`
      : `Detected ${match[1]} data-entry anomalies (suspected impact or missing date).`,
  },
];

export function localizeSummaryText(text: string | undefined, locale: Locale): string | undefined {
  if (text === undefined) return undefined;
  const exactCopy = SUMMARY_TEXT_COPY[text];
  if (exactCopy) return exactCopy[locale];

  const template = SUMMARY_TEMPLATES.find(({ pattern }) => pattern.test(text));
  const match = template ? text.match(template.pattern) : null;
  return template && match ? template.render(match, locale) : text;
}

export function localizeSummaryKpi(kpi: SummaryKpi, locale: Locale): SummaryKpi {
  return {
    ...kpi,
    label: localizeSummaryText(kpi.label, locale) ?? kpi.label,
    value: localizeSummaryText(kpi.value, locale) ?? kpi.value,
    previousValue: localizeSummaryText(kpi.previousValue, locale) ?? kpi.previousValue,
    deltaAbsolute: localizeSummaryText(kpi.deltaAbsolute, locale),
    deltaPercent: localizeSummaryText(kpi.deltaPercent, locale),
  };
}

export function getSummaryInterpretationStyles(
  interpretation: SummaryKpi["interpretation"],
): { color: string; background: string; icon: LucideIcon } {
  if (interpretation === "positive") {
    return { color: "text-emerald-300", background: "bg-emerald-500/10", icon: TrendingUp };
  }
  if (interpretation === "negative") {
    return { color: "text-rose-300", background: "bg-rose-500/10", icon: TrendingDown };
  }
  return { color: "text-slate-200", background: "bg-slate-500/15", icon: Minus };
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
  const copy: Record<SummaryAlert["severity"], SummaryCopy> = {
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
