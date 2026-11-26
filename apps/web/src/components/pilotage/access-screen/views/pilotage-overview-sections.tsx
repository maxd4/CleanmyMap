"use client";

import { CmmCard } from "@/components/ui/cmm-card";
import { CmmButton } from "@/components/ui/cmm-button";
import { ThirtySecondsSummary, localizeSummaryKpi } from "@/components/pilotage/thirty-seconds-summary";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import type { PilotageLocale } from "../access-screen-constants";
import { reliabilityTone, severityTone } from "../access-screen-utils";

export type PilotageOverviewCopy = {
  scopeNotice: string;
  emptyScopeTitle: string;
  emptyScopeDescription: string;
  summaryEyebrow: string;
  windowsEyebrow: string;
  methodsEyebrow: string;
  prioritiesEyebrow: string;
  accessEyebrow: string;
};

type ReliabilityMetric = "completeness" | "geoloc" | "freshness";
const RELIABILITY_LABELS: Record<PilotageLocale, Record<ReliabilityMetric, string>> = {
  fr: { completeness: "Complétude", geoloc: "Géoloc", freshness: "Fraîcheur" },
  en: { completeness: "Completeness", geoloc: "Geoloc", freshness: "Freshness" },
};
export function getReliabilityMetricLabels(locale: PilotageLocale) {
  return RELIABILITY_LABELS[locale];
}

export function PilotageOverviewSummary({ locale, copy, overview, lastUpdatedAt }: { locale: PilotageLocale; copy: PilotageOverviewCopy; overview: PilotageOverview; lastUpdatedAt: string | null }) {
  const fr = locale === "fr";
  return (
    <section id="pilotage" className="space-y-4 scroll-mt-28">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold cmm-text-primary">{copy.summaryEyebrow}</h2>
        <p className="text-sm cmm-text-secondary">{overview.periodDays} {fr ? "jours" : "days"} · {fr ? "Calculé le" : "Generated"} {lastUpdatedAt ?? (fr ? "Indisponible" : "Unavailable")}</p>
      </div>
      <ThirtySecondsSummary locale={locale} summary={overview.summary} />
      <CmmCard className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold cmm-text-primary">{fr ? "Organiser une action" : "Organize an action"}</h3>
          <p className="text-sm cmm-text-secondary">{fr ? "Préparer vos actions et consulter les enregistrements accessibles." : "Prepare your actions and review accessible records."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CmmButton href="/actions/new" tone="primary">{fr ? "Créer une action" : "Create an action"}</CmmButton>
          <CmmButton href="/actions/history" tone="secondary">{fr ? "Historique" : "History"}</CmmButton>
        </div>
      </CmmCard>
    </section>
  );
}

export function PilotageOverviewMetrics({ locale, copy, overview }: { locale: PilotageLocale; copy: PilotageOverviewCopy; overview: PilotageOverview }) {
  const fr = locale === "fr";
  const labels = getReliabilityMetricLabels(locale);
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-xl font-bold cmm-text-primary">{fr ? "Comparaison des indicateurs" : "Metric comparison"}</h2>
        <div className="cmm-data-table-wrap">
          <table className="cmm-data-table">
            <caption className="sr-only">{fr ? "Comparaison avec la période précédente" : "Comparison with previous period"}</caption>
            <thead><tr>{(fr ? ["Indicateur", "Actuel", "Précédent", "Écart absolu", "Écart relatif"] : ["Metric", "Current", "Previous", "Absolute change", "Relative change"]).map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
            <tbody>{overview.summary.kpis.map(raw => {
              const kpi = localizeSummaryKpi(raw, locale);
              return <tr key={raw.id}><th scope="row">{kpi.label}</th><td>{kpi.value}</td><td>{kpi.previousValue}</td><td>{kpi.deltaAbsolute}</td><td>{kpi.deltaPercent}</td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold cmm-text-primary">{copy.windowsEyebrow}</h2>
        <div className="grid items-start gap-4 md:grid-cols-3">
          {(["30", "90", "365"] as const).map(windowKey => {
            const reliability = overview.comparisonsByWindow[windowKey].current.reliability;
            const levelLabel = fr ? { elevee: "Élevée", moyenne: "Moyenne", faible: "Faible" }[reliability.level] : { elevee: "High", moyenne: "Medium", faible: "Low" }[reliability.level];
            return (
              <CmmCard key={windowKey} className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold cmm-text-primary">{windowKey} {fr ? "jours" : "days"}</h3>
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${reliabilityTone(reliability.level)}`}>{levelLabel}</span>
                </div>
                <p className="text-sm cmm-text-secondary">{reliability.reason}</p>
                <dl className="space-y-2">
                  {(["completeness", "geoloc", "freshness"] as const).map(key => (
                    <div key={key} className="flex justify-between gap-2 border-t border-current/10 pt-2">
                      <dt className="text-sm cmm-text-secondary">{labels[key]}</dt>
                      <dd className="font-semibold tabular-nums cmm-text-primary">{Number(reliability[key]).toFixed(1)}</dd>
                    </div>
                  ))}
                </dl>
              </CmmCard>
            );
          })}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold cmm-text-primary">{copy.methodsEyebrow}</h2>
        {overview.methods.map(method => (
          <CmmCard key={method.id}>
            <details className="space-y-3">
              <summary className="cursor-pointer font-semibold cmm-text-primary">{method.kpi}</summary>
              <dl className="space-y-2 text-sm cmm-text-secondary">
                {[[fr ? "Formule" : "Formula", method.formula], [fr ? "Source" : "Source", method.source], [fr ? "Fréquence" : "Frequency", method.recalc], [fr ? "Limites" : "Limits", method.limits]].map(([label, value]) => (
                  <div key={label}><dt className="font-semibold cmm-text-primary">{label}</dt><dd className="break-words">{value}</dd></div>
                ))}
              </dl>
            </details>
          </CmmCard>
        ))}
      </section>
    </div>
  );
}

export function PilotageOverviewPriorities({ locale, copy, topPriorities, topZones }: { locale: PilotageLocale; copy: PilotageOverviewCopy; topPriorities: PilotageOverview["priorities"]; topZones: PilotageOverview["zones"] }) {
  const fr = locale === "fr";
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-3">
        <h2 className="text-xl font-bold cmm-text-primary">{copy.prioritiesEyebrow}</h2>
        {topPriorities.length === 0 ? <CmmCard><p className="cmm-text-secondary">{fr ? "Aucune priorité majeure sur la fenêtre courante." : "No major priority detected on the current window."}</p></CmmCard> : topPriorities.map(priority => (
          <CmmCard key={priority.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${severityTone(priority.severity)}`}>{fr ? { critical: "Critique", high: "Élevée", medium: "Moyenne", low: "Faible" }[priority.severity] : priority.severity}</span>
              <span className="text-sm cmm-text-secondary">Score : {priority.score.toFixed(1)}</span>
            </div>
            <h3 className="font-bold cmm-text-primary">{priority.title}</h3>
            <p className="text-sm cmm-text-secondary">{priority.reason}</p>
            <dl className="space-y-1 text-sm cmm-text-secondary">
              <div><dt className="inline font-semibold cmm-text-primary">{fr ? "Impact estimé : " : "Estimated impact: "}</dt><dd className="inline">{priority.impactEstimate}</dd></div>
              <div><dt className="inline font-semibold cmm-text-primary">{fr ? "Responsable suggéré : " : "Suggested owner: "}</dt><dd className="inline">{priority.suggestedOwner}</dd></div>
            </dl>
            {priority.evidence.length > 0 && <details><summary className="cursor-pointer text-sm font-semibold cmm-text-primary">{fr ? "Éléments de preuve" : "Evidence"}</summary><ul className="mt-2 list-disc pl-5 text-sm cmm-text-secondary">{priority.evidence.map(item => <li key={item}>{item}</li>)}</ul></details>}
            <CmmButton href={priority.recommendedAction.href} tone="secondary">{priority.recommendedAction.label}</CmmButton>
          </CmmCard>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold cmm-text-primary">{fr ? "Zones sous pression" : "Areas under pressure"}</h2>
        {topZones.length === 0 ? <CmmCard><p className="cmm-text-secondary">{fr ? "Aucune zone prioritaire détectée sur la fenêtre courante." : "No priority area detected on the current window."}</p></CmmCard> : topZones.map(zone => (
          <CmmCard key={zone.area} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold cmm-text-primary">{zone.area}</h3>
              <span className="text-sm font-semibold cmm-text-secondary">{zone.urgency}</span>
            </div>
            <p className="text-sm cmm-text-secondary">{zone.justification}</p>
            <p className="text-sm cmm-text-secondary">Score : {zone.normalizedScore.toFixed(1)}</p>
            <p className="text-sm cmm-text-secondary">{fr ? "Action : " : "Action: "}{zone.recommendedAction}</p>
          </CmmCard>
        ))}
      </section>
    </div>
  );
}
