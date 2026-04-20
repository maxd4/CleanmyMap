"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { computeClimateContext } from "@/lib/analytics/climate-context";
import { formatDeltaLine, formatDateTimeShort } from "@/components/sections/rubriques/helpers";



export function ClimateSection() {
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(30);
  const { data, isLoading, error } = useSWR(["section-climate"], () =>
    fetchActions({ status: "approved", limit: 320 }),
  );

  const context = useMemo(() => {
    const records = (data?.items ?? []).map((item) => ({
      observedAt: item.action_date,
      wasteKg: Number(item.waste_kg || 0),
      cigaretteButts: Number(item.cigarette_butts || 0),
      durationMinutes: Number(item.duration_minutes || 0),
      volunteersCount: Number(item.volunteers_count || 0),
      latitude: item.latitude === null ? null : Number(item.latitude),
      longitude: item.longitude === null ? null : Number(item.longitude),
      plasticKg: null,
    }));
    return computeClimateContext({ records, periodDays });
  }, [data?.items, periodDays]);

  const summaryKpis = useMemo(() => {
    const current = context.comparison.current;
    const previous = context.comparison.previous;
    return [
      {
        label: "Volume collecte",
        value: `${current.volumeKg.toFixed(1)} kg`,
        delta: formatDeltaLine(current.volumeKg, previous.volumeKg, "kg"),
      },
      {
        label: "Heures citoyennes",
        value: `${current.citizenHours.toFixed(1)} h`,
        delta: formatDeltaLine(
          current.citizenHours,
          previous.citizenHours,
          "h",
        ),
      },
      {
        label: "Taux geocouverture",
        value: `${current.geocoverageRate.toFixed(1)}%`,
        delta: formatDeltaLine(
          current.geocoverageRate,
          previous.geocoverageRate,
          "pts",
        ),
      },
    ];
  }, [context]);

  const firstDecision = context.weeklyDecisions[0];
  const weakestIndicator = [...context.indicators].sort((a, b) => {
    const rank = { eleve: 3, moyen: 2, faible: 1 } as const;
    return rank[a.confidence] - rank[b.confidence];
  })[0];

  return (
    <div className="space-y-4">
      <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Cette rubrique vulgarise les rapports scientifiques recents, les
        objectifs de developpement durable (ODD) et les limites planetaires.
        Elle relie l&apos;impact des actions locales de depollution aux enjeux
        climatiques pour aider benevoles, associations, commercants et
        entreprises a orienter leurs choix quotidiens.
      </article>

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement des indicateurs...</p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700">Indicateurs indisponibles.</p>
      ) : null}
      {!isLoading && !error ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* GAUCHE : Résumé décisionnel + Alertes */}
          <div className="space-y-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  Résumé décisionnel ({periodDays === 365 ? "12 mois" : `${periodDays} jours`})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[30, 90, 365].map((value) => (
                    <button
                      key={`climate-${value}`}
                      onClick={() => setPeriodDays(value as 30 | 90 | 365)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                        periodDays === value
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {value === 365 ? "12 mois" : `${value} jours`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid gap-3 grid-cols-3">
                {summaryKpis.map((kpi) => (
                  <div key={kpi.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{kpi.label}</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{kpi.value}</p>
                    <p className={`mt-1 text-xs font-semibold ${kpi.delta.tone}`}>{kpi.delta.text} vs préc.</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="text-xs font-semibold uppercase tracking-wide">Alerte prioritaire</p>
                  <p className="mt-1">Confiance <span className="font-semibold">{weakestIndicator.confidence}</span> sur <span className="font-semibold">{weakestIndicator.label}</span>.</p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <p className="text-xs font-semibold uppercase tracking-wide">Action recommandée</p>
                  <p className="mt-1 font-semibold">{firstDecision?.decision ?? "Consolider la qualité des données terrain."}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Proxies model {context.modelVersion} · recalcul {formatDateTimeShort(context.generatedAt)}
              </p>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Méthode</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {context.methods.map((method) => (
                  <li key={method.metric} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="font-semibold text-slate-900">{method.metric}</p>
                    <p>Formule: {method.formula}</p>
                    <p className="text-xs text-slate-500">Source: {method.source}</p>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          {/* DROITE : Indicateurs détaillés + Décisions */}
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              {context.indicators.map((indicator) => {
                const previousValue =
                  indicator.id === "volume" ? context.comparison.previous.volumeKg :
                  indicator.id === "butts" ? context.comparison.previous.butts :
                  indicator.id === "hours" ? context.comparison.previous.citizenHours :
                  indicator.id === "co2_proxy" ? context.comparison.previous.co2ProxyKg :
                  indicator.id === "plastic_leakage_proxy" ? context.comparison.previous.plasticLeakageProxyKg :
                  context.comparison.previous.geocoverageRate;
                const delta = formatDeltaLine(indicator.value, previousValue, indicator.unit);
                return (
                  <article key={indicator.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">{indicator.label}</p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">conf. {indicator.confidence}</span>
                    </div>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {indicator.value.toFixed(indicator.unit === "u" ? 0 : 1)} {indicator.unit}
                    </p>
                    <p className={`mt-1 text-xs font-semibold ${delta.tone}`}>{delta.text} vs préc.</p>
                  </article>
                );
              })}
            </div>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Décisions de la semaine</h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {context.weeklyDecisions.map((decision) => (
                  <li key={decision.decision} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="font-semibold text-slate-900">{decision.decision}</p>
                    <p className="mt-1 text-xs">{decision.rationale}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confiance {decision.confidence}</p>
                  </li>
                ))}
              </ul>
              <article className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Limites d&apos;interprétation</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {context.interpretationLimits.map((limit) => (<li key={limit}>{limit}</li>))}
                </ul>
              </article>
            </article>
          </div>
        </div>
      ) : null}
    </div>
  );
}

