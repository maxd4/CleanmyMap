"use client";

import { useMemo, useState, useEffect } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { computeZoneCompare } from "@/lib/analytics/compare-zones";
import { formatSigned } from "@/components/sections/rubriques/helpers";



export function CompareSection() {
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("cmm_dashboard_days");
      if (saved === "30" || saved === "90" || saved === "365") {
        return Number(saved) as 30 | 90 | 365;
      }
    }
    return 90;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cmm_dashboard_days", String(periodDays));
    }
  }, [periodDays]);
  const { data, isLoading, error } = useSWR(["section-compare-v2"], () =>
    fetchActions({ status: "approved", limit: 700 }),
  );

  const comparison = useMemo(() => {
    const records = (data?.items ?? []).map((item) => ({
      observedAt: item.action_date,
      locationLabel: item.location_label || "Hors arrondissement",
      wasteKg: Number(item.waste_kg || 0),
      butts: Number(item.cigarette_butts || 0),
      volunteersCount: Number(item.volunteers_count || 0),
    }));
    return computeZoneCompare({ records, periodDays });
  }, [data?.items, periodDays]);

  const topRows = comparison.rows.slice(0, 12);

  return (
    <div className="space-y-4">
      {isLoading ? (<p className="text-sm text-slate-500">Comparaison des zones en cours...</p>) : null}
      {error ? (<p className="text-sm text-rose-700">Impossible de calculer la comparaison territoriale.</p>) : null}
      {!isLoading && !error ? (
        <>
          {/* En-tête + Sélecteur de période */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Analyse comparative inter-zones ({periodDays === 365 ? "12 mois" : `${periodDays} jours`})
              </h3>
              <p className="text-xs text-slate-500 mt-1">Lecture opérationnelle par zone.</p>
            </div>
            <div className="flex gap-2">
              {[30, 90, 365].map((value) => (
                <button
                  key={`compare-${value}`}
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

          <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-900">
              Méthodologie
            </summary>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p>
                Comparaison calculée sur les actions approuvées du périmètre courant, sur
                {periodDays === 365 ? " 12 mois" : ` ${periodDays} jours`}.
              </p>
              <p>
                Les classements sont normalisés par surface, récurrence et volume
                d&apos;activité pour rendre la lecture territoriale plus stable.
              </p>
              <p>
                Le bloc « Effort » signale le levier attendu, tandis que les zones
                prioritaires synthétisent l&apos;écart le plus utile à traiter.
              </p>
            </div>
          </details>

          {/* SPLIT : Classements (gauche) + Zones prioritaires (droite) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 items-start">
            {/* GAUCHE : Tableau détaillé */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Zone</th>
                    <th className="px-3 py-2">Brut</th>
                    <th className="px-3 py-2">Normalisé</th>
                    <th className="px-3 py-2">Ecart</th>
                    <th className="px-3 py-2">Trend</th>
                    <th className="px-3 py-2">Effort</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {topRows.map((row) => {
                    const deltaActions = row.currentActions - row.previousActions;
                    const deltaKg = row.currentKg - row.previousKg;
                    return (
                      <tr key={row.area} className="text-slate-700 hover:bg-slate-50 transition-colors align-top">
                        <td className="px-3 py-2 font-semibold">{row.area}</td>
                        <td className="px-3 py-2 text-xs">{row.currentActions} act. / {row.currentKg.toFixed(1)} kg</td>
                        <td className="px-3 py-2 text-xs">{row.kgPerAction.toFixed(2)} kg/act, {row.buttsPerAction.toFixed(1)} meg/act</td>
                        <td className="px-3 py-2 text-xs">{formatSigned(row.medianGapKgPerAction, 2)}</td>
                        <td className="px-3 py-2 text-xs">{row.trend} ({formatSigned(deltaActions, 0)}, {formatSigned(deltaKg, 1)} kg)</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            row.effort === "fort" ? "bg-rose-50 text-rose-700" :
                            row.effort === "moyen" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                          }`}>{row.effort}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {topRows.length === 0 ? (
                    <tr><td className="px-3 py-4 text-sm text-slate-500 italic" colSpan={6}>Aucune zone exploitable.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* DROITE : Classements + Alertes zones */}
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Classement Brut</h3>
                  <ol className="mt-2 space-y-1">
                    {comparison.rawRanking.slice(0, 8).map((area, index) => (
                      <li key={`raw-${area}`} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">{index + 1}</span>
                        {area}
                      </li>
                    ))}
                    {comparison.rawRanking.length === 0 ? <li className="text-sm text-slate-500">Aucune zone.</li> : null}
                  </ol>
                </article>
                <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Classement Normalisé</h3>
                  <ol className="mt-2 space-y-1">
                    {comparison.normalizedRanking.slice(0, 8).map((area, index) => (
                      <li key={`norm-${area}`} className="flex items-center gap-2 text-sm text-slate-700">
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">{index + 1}</span>
                        {area}
                      </li>
                    ))}
                    {comparison.normalizedRanking.length === 0 ? <li className="text-sm text-slate-500">Aucune zone.</li> : null}
                  </ol>
                </article>
              </div>

              <article className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700">Zones Prioritaires</h3>
                <ul className="mt-2 space-y-2">
                  {comparison.priorityZones.slice(0, 4).map((zone) => (
                    <li key={zone.area} className="rounded-lg border border-amber-200 bg-white p-2">
                      <p className="font-semibold text-sm">{zone.area}</p>
                      <p className="text-xs text-slate-600">{zone.reason}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Effort : {zone.effort}</span>
                    </li>
                  ))}
                  {comparison.priorityZones.length === 0 ? <li className="text-sm text-slate-500 italic">Aucune priorité détectée.</li> : null}
                </ul>
              </article>

              <div className="grid gap-3 md:grid-cols-2">
                <article className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700">En Amélioration</h3>
                  <ul className="mt-2 space-y-1">
                    {comparison.improvingZones.slice(0, 5).map((area) => (
                      <li key={`up-${area}`} className="text-sm text-emerald-800 font-medium">{area}</li>
                    ))}
                    {comparison.improvingZones.length === 0 ? <li className="text-sm text-slate-500 italic">Aucune.</li> : null}
                  </ul>
                </article>
                <article className="rounded-xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">En Dégradation</h3>
                  <ul className="mt-2 space-y-1">
                    {comparison.degradingZones.slice(0, 5).map((area) => (
                      <li key={`down-${area}`} className="text-sm text-rose-800 font-medium">{area}</li>
                    ))}
                    {comparison.degradingZones.length === 0 ? <li className="text-sm text-slate-500 italic">Aucune.</li> : null}
                  </ul>
                </article>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
