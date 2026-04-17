"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { computeZoneCompare } from "@/lib/analytics/compare-zones";
import { formatSigned } from "@/components/sections/rubriques/helpers";



export function CompareSection() {
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(90);
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
      {isLoading ? (
        <p className="text-sm text-slate-500">
          Comparaison des zones en cours...
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700">
          Impossible de calculer la comparaison territoriale.
        </p>
      ) : null}
      {!isLoading && !error ? (
        <>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Methode de normalisation inter-zones (
                {periodDays === 365 ? "12 mois" : `${periodDays} jours`})
              </h3>
              <div className="flex flex-wrap gap-2">
                {[30, 90, 365].map((value) => (
                  <button
                    key={`compare-${value}`}
                    onClick={() => setPeriodDays(value as 30 | 90 | 365)}
                    className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
                      periodDays === value
                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                        : "border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    {value === 365 ? "12m" : `${value}j`}
                  </button>
                ))}
              </div>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              <li>kg_par_action = total_kg / nb_actions</li>
              <li>butts_par_action = total_megots / nb_actions</li>
              <li>densite_actions = nb_actions / surface_km2</li>
              <li>
                recurrence_score = nb_signaux_recurrents / nb_points_uniques
              </li>
            </ul>
            <p className="mt-2 text-xs text-slate-500">
              Comparaison brute et normalisee affichees simultanement, avec
              ecarts vs mediane reseau et evolution vs periode precedente.
            </p>
          </article>

          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Classement brut (volume d&apos;activite)
              </h3>
              <ol className="mt-2 space-y-1 text-sm text-slate-700">
                {comparison.rawRanking.slice(0, 10).map((area, index) => (
                  <li key={`raw-${area}`}>
                    {index + 1}. {area}
                  </li>
                ))}
                {comparison.rawRanking.length === 0 ? (
                  <li>Aucune zone classee.</li>
                ) : null}
              </ol>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Classement normalise (lecture decisionnelle)
              </h3>
              <ol className="mt-2 space-y-1 text-sm text-slate-700">
                {comparison.normalizedRanking
                  .slice(0, 10)
                  .map((area, index) => (
                    <li key={`norm-${area}`}>
                      {index + 1}. {area}
                    </li>
                  ))}
                {comparison.normalizedRanking.length === 0 ? (
                  <li>Aucune zone classee.</li>
                ) : null}
              </ol>
            </article>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Zone</th>
                  <th className="px-3 py-2">Brut</th>
                  <th className="px-3 py-2">Normalise</th>
                  <th className="px-3 py-2">Ecart mediane</th>
                  <th className="px-3 py-2">Evolution</th>
                  <th className="px-3 py-2">Effort</th>
                </tr>
              </thead>
              <tbody>
                {topRows.map((row) => {
                  const deltaActions = row.currentActions - row.previousActions;
                  const deltaKg = row.currentKg - row.previousKg;
                  return (
                    <tr
                      key={row.area}
                      className="border-t border-slate-100 text-slate-700 align-top"
                    >
                      <td className="px-3 py-2 font-semibold">{row.area}</td>
                      <td className="px-3 py-2">
                        {row.currentActions} act. / {row.currentKg.toFixed(1)}{" "}
                        kg / {row.currentButts} megots
                      </td>
                      <td className="px-3 py-2">
                        {row.kgPerAction.toFixed(2)} kg/act,{" "}
                        {row.buttsPerAction.toFixed(1)} megots/act,{" "}
                        {row.densityActions.toFixed(2)} act/km2, rec.{" "}
                        {row.recurrenceScore.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        kg/act {formatSigned(row.medianGapKgPerAction, 2)} |
                        densite {formatSigned(row.medianGapDensity, 2)}
                      </td>
                      <td className="px-3 py-2">
                        {row.trend} ({formatSigned(deltaActions, 0)} act,{" "}
                        {formatSigned(deltaKg, 1)} kg)
                      </td>
                      <td className="px-3 py-2 uppercase font-semibold">
                        {row.effort}
                      </td>
                    </tr>
                  );
                })}
                {topRows.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-3 text-sm text-slate-500"
                      colSpan={6}
                    >
                      Aucune zone exploitable pour la comparaison.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Zones a traiter en priorite
              </h3>
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {comparison.priorityZones.slice(0, 5).map((zone) => (
                  <li
                    key={zone.area}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-2"
                  >
                    <p className="font-semibold">{zone.area}</p>
                    <p>{zone.reason}</p>
                    <p className="text-xs uppercase tracking-wide">
                      Effort recommande: {zone.effort}
                    </p>
                  </li>
                ))}
                {comparison.priorityZones.length === 0 ? (
                  <li>Aucune priorite detectee.</li>
                ) : null}
              </ul>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Zones en amelioration
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {comparison.improvingZones.slice(0, 8).map((area) => (
                  <li
                    key={`up-${area}`}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1"
                  >
                    {area}
                  </li>
                ))}
                {comparison.improvingZones.length === 0 ? (
                  <li>Aucune zone en amelioration nette.</li>
                ) : null}
              </ul>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Zones en degradation
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {comparison.degradingZones.slice(0, 8).map((area) => (
                  <li
                    key={`down-${area}`}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1"
                  >
                    {area}
                  </li>
                ))}
                {comparison.degradingZones.length === 0 ? (
                  <li>Aucune degradation nette detectee.</li>
                ) : null}
              </ul>
            </article>
          </div>
        </>
      ) : null}
    </div>
  );
}
