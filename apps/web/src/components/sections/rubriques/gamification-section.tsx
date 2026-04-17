"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { fetchActions } from "@/lib/actions/http";
import { normalizeAssociationScopeValue } from "@/lib/actions/association-options";
import { computeQualityLeaderboard } from "@/lib/community/engagement";

export function GamificationSection() {
  const { locale } = useSitePreferences();
  const [associationFilter, setAssociationFilter] = useState<string>("all");
  const { data, isLoading, error } = useSWR(
    ["section-gamification", "approved"],
    () => fetchActions({ status: "approved", limit: 900, days: 365 }),
  );

  const associationOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of data?.items ?? []) {
      const value = normalizeAssociationScopeValue(item.association_name);
      if (value) {
        names.add(value);
      }
    }
    return [...names].sort((a, b) => a.localeCompare(b, "fr"));
  }, [data?.items]);

  const filteredItems = useMemo(() => {
    if (associationFilter === "all") {
      return data?.items ?? [];
    }
    return (data?.items ?? []).filter(
      (item) =>
        normalizeAssociationScopeValue(item.association_name) ===
        associationFilter,
    );
  }, [associationFilter, data?.items]);

  const leaderboard = useMemo(
    () => computeQualityLeaderboard(filteredItems).slice(0, 12),
    [filteredItems],
  );

  const networkAverageQuality = useMemo(() => {
    const totalActions = leaderboard.reduce((acc, row) => acc + row.actions, 0);
    if (totalActions === 0) {
      return 0;
    }
    const weighted = leaderboard.reduce(
      (acc, row) => acc + row.avgQuality * row.actions,
      0,
    );
    return Math.round((weighted / totalActions) * 10) / 10;
  }, [leaderboard]);

  const badgeDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of leaderboard) {
      map.set(row.badge, (map.get(row.badge) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [leaderboard]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="flex flex-col gap-2 text-sm text-slate-700 md:max-w-md">
          Perimetre du classement / livrable
          <select
            value={associationFilter}
            onChange={(event) => setAssociationFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Global (toutes associations)</option>
            {associationOptions.map((association) => (
               <option key={association} value={association}>
                {association}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {locale === "fr" ? "Contributeurs" : "Contributors"}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {leaderboard.length}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Qualite moyenne reseau
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {networkAverageQuality}/100
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Ambassadeurs qualite
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {
              leaderboard.filter((item) => item.badge === "Ambassadeur qualite")
                .length
            }
          </p>
        </article>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement du classement...</p>
      ) : null}
      {error ? (
        <p className="text-sm text-rose-700">
          Impossible de charger les donnees de classement.
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Benevole</th>
                  <th className="px-3 py-2">Score qualite</th>
                  <th className="px-3 py-2">Taux A</th>
                  <th className="px-3 py-2">Actions</th>
                  <th className="px-3 py-2">Badge</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                   <tr
                    key={`${row.actor}-${index}`}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="px-3 py-2 font-semibold">{index + 1}</td>
                    <td className="px-3 py-2">{row.actor}</td>
                    <td className="px-3 py-2">
                       {row.weightedScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2">{row.rateA.toFixed(1)}%</td>
                    <td className="px-3 py-2">{row.actions}</td>
                    <td className="px-3 py-2">{row.badge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Regle de scoring qualite
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              <li>
                Score global = qualite moyenne * 0.7 + taux A * 35 + bonus
                regularite - penalite qualite C.
              </li>
              <li>
                Le volume reste compte, mais ne suffit plus sans fiabilite data.
              </li>
            </ul>
            <h4 className="mt-4 text-sm font-semibold text-slate-900">
              Distribution des badges
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {badgeDistribution.map(([badge, count]) => (
                 <li key={badge}>
                  {badge}: <span className="font-semibold">{count}</span>
                </li>
              ))}
              {badgeDistribution.length === 0 ? (
                 <li>Aucun badge attribue.</li>
              ) : null}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              Objectif: recompenser la qualite de saisie et la robustesse des preuves terrain.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
