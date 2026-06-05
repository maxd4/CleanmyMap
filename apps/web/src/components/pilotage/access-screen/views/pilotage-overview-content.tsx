"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  decisionTone,
  formatDateTime,
  reliabilityTone,
  renderMetricTone,
  severityTone,
} from "../access-screen-utils";
import type { PilotageLocale } from "../access-screen-constants";
import type { PilotageOverview } from "@/lib/pilotage/overview";
import { PilotageOverviewSupportSections } from "./pilotage-overview-support-sections";
import { ThirtySecondsSummary } from "@/components/pilotage/thirty-seconds-summary";
import { DecisionClusterSection } from "@/components/pilotage/decision-cluster-section";
import { PilotageOverviewSurfaceTabs } from "./pilotage-overview-surface-tabs";

import type { NavigationGridItem } from "@/components/ui/navigation-grid";

type PilotageOverviewCopy = {
  summaryEyebrow: string;
  windowsEyebrow: string;
  methodsEyebrow: string;
  prioritiesEyebrow: string;
  accessEyebrow: string;
};

type PilotageOverviewContentProps = {
  locale: PilotageLocale;
  copy: PilotageOverviewCopy;
  overview: PilotageOverview | null;
  overviewLinks: NavigationGridItem[];
  accessAllowed: boolean;
  lastUpdatedAt: string | null;
};

export function PilotageOverviewContent({
  locale,
  copy,
  overview,
  overviewLinks,
  accessAllowed,
  lastUpdatedAt,
}: PilotageOverviewContentProps) {
  const topZones = overview?.zones.slice(0, 3) ?? [];
  const topPriorities = overview?.priorities ?? [];

  if (overview) {
    return (
      <>
        <PilotageOverviewSurfaceTabs locale={locale} overview={overview} />

        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              {copy.summaryEyebrow}
            </p>
            <ThirtySecondsSummary summary={overview.summary} />
          </div>

          <div className="rounded-2xl border border-white/12 bg-black/10 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-100/70">
              {locale === "fr" ? "Dernière mise à jour" : "Last update"}
            </p>
            <p className="mt-2 text-sm font-semibold text-white/90">
              {lastUpdatedAt ?? (locale === "fr" ? "Indisponible" : "Unavailable")}
            </p>
          </div>
        </div>

        <section id="pilotage" className="scroll-mt-28 rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-200/30 bg-[rgba(69,45,28,0.72)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-orange-100">
                  {locale === "fr" ? "Accueil & Pilotage" : "Home & Operations"}
                </span>
                <span className="inline-flex items-center rounded-full border border-stone-400/18 bg-[rgba(44,28,15,0.60)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-orange-100">
                  {locale === "fr" ? "Déclaration directe" : "Direct declaration"}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                {locale === "fr" ? "Déclarer une action" : "Declare an action"}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-white md:text-base">
                {locale === "fr"
                  ? "Ouvrez le formulaire de déclaration depuis l'espace Accueil & Pilotage pour centraliser les actions administrateur au même endroit."
                  : "Open the declaration form from the Home & Operations area to centralize administrative actions in one place."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/actions/new"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-sm font-black text-white shadow-[0_8px_24px_-8px_rgba(234,88,12,0.45)] transition hover:-translate-y-[1px]"
              >
                {locale === "fr" ? "Ouvrir le formulaire" : "Open form"}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/actions/history"
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-orange-200/30 bg-[rgba(44,28,15,0.60)] px-4 py-2.5 text-sm font-black text-white transition hover:-translate-y-[1px] hover:border-orange-300/50"
              >
                {locale === "fr" ? "Historique" : "History"}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        <DecisionClusterSection
          locale={locale}
          surfaceId="pilotage"
          className="border-white/12 bg-white/[0.06]"
        />

      <section className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              {copy.summaryEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-white md:text-3xl">
              {locale === "fr" ? "Lecture 30 jours, sans bruit" : "30-day reading, without noise"}
            </h2>
          </div>
          <div className="rounded-full border border-stone-400/18 bg-[rgba(69,45,28,0.72)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100">
            {locale === "fr"
              ? `Généré le ${formatDateTime(overview.generatedAt, locale)}`
              : `Generated ${formatDateTime(overview.generatedAt, locale)}`}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {overview.summary.kpis.map((kpi) => (
            <article
              key={kpi.id}
              className="rounded-[1.5rem] border border-stone-400/14 bg-[rgba(69,45,28,0.72)] p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  {kpi.label}
                </p>
                <span
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] ${renderMetricTone(kpi.interpretation)}`}
                >
                  {kpi.interpretation}
                </span>
              </div>
              <p className="mt-3 text-3xl font-black tracking-tight text-white">
                {kpi.value}
              </p>
              <p className="mt-1 text-sm text-white">
                {locale === "fr" ? "N-1" : "Previous"} {kpi.previousValue}
              </p>
              <div className="mt-4 grid gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
                <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2 text-orange-100">
                  {locale === "fr" ? "Delta absolu" : "Absolute delta"}:{" "}
                  <span className="text-white">{kpi.deltaAbsolute}</span>
                </div>
                <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2 text-orange-100">
                  {locale === "fr" ? "Delta relatif" : "Relative delta"}:{" "}
                  <span className="text-white">{kpi.deltaPercent}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                {copy.windowsEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                {locale === "fr" ? "Fiabilité et fenêtres comparées" : "Reliability and compared windows"}
              </h2>
            </div>
            <p className="rounded-full border border-stone-400/18 bg-[rgba(69,45,28,0.72)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100">
              {locale === "fr" ? `${overview.periodDays} jours` : `${overview.periodDays} days`}
            </p>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            {(["30", "90", "365"] as const).map((windowKey) => {
              const windowResult = overview.comparisonsByWindow[windowKey];
              return (
                <article
                  key={windowKey}
                  className="rounded-[1.5rem] border border-stone-400/14 bg-[rgba(69,45,28,0.72)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-100">
                      {windowKey === "365" ? "12 mois" : `${windowKey} jours`}
                    </p>
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] ${reliabilityTone(windowResult.current.reliability.level)}`}
                    >
                      {windowResult.current.reliability.level}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-white">
                    {windowResult.current.reliability.reason}
                  </p>
                  <div className="mt-4 grid gap-2 text-[11px] font-black uppercase tracking-[0.16em]">
                    <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2 text-orange-100">
                      {locale === "fr" ? "Complétude" : "Completeness"}:{" "}
                      <span className="text-white">
                        {windowResult.current.reliability.completeness.toFixed(1)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2 text-orange-100">
                      {locale === "fr" ? "Géoloc" : "Geoloc"}:{" "}
                      <span className="text-white">
                        {windowResult.current.reliability.geoloc.toFixed(1)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2 text-orange-100">
                      {locale === "fr" ? "Fraîcheur" : "Freshness"}:{" "}
                      <span className="text-white">
                        {windowResult.current.reliability.freshness.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
            {copy.methodsEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            {locale === "fr" ? "Métriques et limites visibles" : "Visible metrics and limits"}
          </h2>
          <div className="mt-5 space-y-3">
            {overview.methods.map((method) => (
              <article key={method.id} className="rounded-2xl border border-stone-400/14 bg-[rgba(69,45,28,0.72)] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                      {method.kpi}
                    </p>
                    <p className="mt-2 text-sm text-white">
                      <span className="font-bold text-white">Formule:</span> {method.formula}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      <span className="font-bold text-white">Source:</span> {method.source}
                    </p>
                    <p className="mt-1 text-sm text-white">
                      <span className="font-bold text-white">Fréquence:</span> {method.recalc}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-orange-100">
                  {locale === "fr" ? "Limites" : "Limits"}: {method.limits}
                </p>
              </article>
            ))}
          </div>
        </article>
      </section>

        <section className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
        <article className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
            {copy.prioritiesEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            {locale === "fr" ? "Ce qu'il faut traiter maintenant" : "What should be handled now"}
          </h2>
          <div className="mt-5 grid gap-4">
            {topPriorities.length > 0 ? (
              topPriorities.map((priority) => (
                <article
                  key={priority.id}
                  className="rounded-[1.5rem] border border-stone-400/14 bg-[rgba(69,45,28,0.72)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] ${severityTone(priority.severity)}`}
                        >
                          {priority.severity}
                        </span>
                        <span className="rounded-full border border-stone-400/18 bg-[rgba(44,28,15,0.60)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100">
                          score {priority.score.toFixed(1)}
                        </span>
                      </div>
                      <h3 className="text-lg font-black tracking-tight text-white">
                        {priority.title}
                      </h3>
                      <p className="text-sm leading-relaxed text-white">
                        {priority.reason}
                      </p>
                    </div>
                    <Link
                      href={priority.recommendedAction.href}
                      className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2 text-sm font-black text-white shadow-[0_8px_24px_-8px_rgba(234,88,12,0.45)] transition hover:-translate-y-[1px]"
                    >
                      {priority.recommendedAction.label}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2">
                      <span className="font-bold text-white">
                        {locale === "fr" ? "Impact estimé" : "Estimated impact"}:
                      </span>{" "}
                      <span className="text-orange-100">{priority.impactEstimate}</span>
                    </div>
                    <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2">
                      <span className="font-bold text-white">
                        {locale === "fr" ? "Responsable suggéré" : "Suggested owner"}:
                      </span>{" "}
                      <span className="text-orange-100">{priority.suggestedOwner}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {priority.evidence.map((item) => (
                        <span
                          key={item}
                          className="inline-flex rounded-full border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-orange-100"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-stone-400/14 bg-[rgba(69,45,28,0.72)] p-4 text-sm text-white">
                {locale === "fr"
                  ? "Aucune priorité majeure sur la fenêtre courante."
                  : "No major priority detected on the current window."}
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-stone-400/18 bg-[rgba(44,28,15,0.82)] p-5 md:p-6">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
            {copy.prioritiesEyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            {locale === "fr" ? "Zones sous pression" : "Areas under pressure"}
          </h2>
          <div className="mt-5 space-y-3">
            {topZones.length > 0 ? (
              topZones.map((zone) => (
                <article
                  key={zone.area}
                  className="rounded-[1.5rem] border border-stone-400/14 bg-[rgba(69,45,28,0.72)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-black tracking-tight text-white">
                        {zone.area}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-white">
                        {zone.justification}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] ${decisionTone(zone.urgency === "critique" ? "negative" : zone.urgency === "elevee" ? "neutral" : "positive")}`}
                    >
                      {zone.urgency}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2 text-sm">
                      <span className="font-bold text-white">Score</span>{" "}
                      <span className="text-orange-100">{zone.normalizedScore.toFixed(1)}</span>
                    </div>
                    <div className="rounded-xl border border-stone-400/14 bg-[rgba(44,28,15,0.60)] px-3 py-2 text-sm">
                      <span className="font-bold text-white">
                        {locale === "fr" ? "Action" : "Action"}
                      </span>{" "}
                      <span className="text-orange-100">{zone.recommendedAction}</span>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-stone-400/14 bg-[rgba(69,45,28,0.72)] p-4 text-sm text-white">
                {locale === "fr"
                  ? "Aucune zone prioritaire détectée sur la fenêtre courante."
                  : "No priority area detected on the current window."}
              </p>
            )}
          </div>
        </article>
      </section>

        <PilotageOverviewSupportSections
          locale={locale}
          accessEyebrow={copy.accessEyebrow}
          overview={overview}
          overviewLinks={overviewLinks}
          accessAllowed={accessAllowed}
        />
      </>
    );
  }

  return (
    <PilotageOverviewSupportSections
      locale={locale}
      accessEyebrow={copy.accessEyebrow}
      overview={null}
      overviewLinks={overviewLinks}
      accessAllowed={accessAllowed}
    />
  );
}
