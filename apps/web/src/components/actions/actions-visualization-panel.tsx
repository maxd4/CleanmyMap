"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { extractArrondissement, monthKey } from "@/components/sections/rubriques/helpers";
import type { ActionStatus } from "@/lib/actions/types";

type ZoneStats = {
  zone: string;
  actions: number;
  wasteKg: number;
  butts: number;
};

type ActionsVisualizationPanelProps = {
  days: number;
  status: ActionStatus | "all";
  compact?: boolean;
};

type ImpactLevel = "faible" | "moyen" | "fort" | "critique";
const IMPACT_LEVELS: ImpactLevel[] = ["faible", "moyen", "fort", "critique"];

export function ActionsVisualizationPanel({ days, status, compact = false }: ActionsVisualizationPanelProps) {
  const mapQuery = useSWR(["visualization-map", String(days), status], () =>
    fetchMapActions({ status, days, limit: 300, types: "all" }),
  );
  const actionsQuery = useSWR(["visualization-actions", String(days), status], () =>
    fetchActions({ status, days, limit: 200, types: "all" }),
  );

  const loading = mapQuery.isLoading || actionsQuery.isLoading;
  const error = mapQuery.error || actionsQuery.error;

  const model = useMemo(() => {
    const mapItems = mapQuery.data?.items ?? [];
    const actionsItems = actionsQuery.data?.items ?? [];

    let wasteKg = 0;
    let butts = 0;
    let geolocated = 0;
    const impacts = new Map<ImpactLevel, number>();
    const byZone = new Map<string, ZoneStats>();
    const byMonth = new Map<string, number>();

    for (const level of IMPACT_LEVELS) {
      impacts.set(level, 0);
    }

    for (const item of mapItems) {
      wasteKg += Number(item.waste_kg || 0);
      butts += Number(item.cigarette_butts || 0);
      if (item.latitude !== null && item.longitude !== null) {
        geolocated += 1;
      }

      const level =
        item.impact_level && IMPACT_LEVELS.includes(item.impact_level as ImpactLevel)
          ? (item.impact_level as ImpactLevel)
          : "faible";
      impacts.set(level, (impacts.get(level) ?? 0) + 1);

      const zone = extractArrondissement(item.location_label || "");
      const current = byZone.get(zone) ?? { zone, actions: 0, wasteKg: 0, butts: 0 };
      current.actions += 1;
      current.wasteKg += Number(item.waste_kg || 0);
      current.butts += Number(item.cigarette_butts || 0);
      byZone.set(zone, current);

      const month = monthKey(item.action_date);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }

    let volunteers = 0;
    let citizenHours = 0;
    for (const item of actionsItems) {
      const count = Number(item.volunteers_count || 0);
      const minutes = Number(item.duration_minutes || 0);
      volunteers += count;
      citizenHours += (count * Math.max(0, minutes)) / 60;
    }

    const zoneRows = [...byZone.values()]
      .sort((a, b) => b.actions - a.actions || b.wasteKg - a.wasteKg)
      .slice(0, 8);

    const monthRows = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([label, actions]) => ({ label, actions }));

    const impactRows = IMPACT_LEVELS.map((level) => ({
      level,
      count: impacts.get(level) ?? 0,
    }));

    const maxMonth = monthRows.reduce((acc, row) => Math.max(acc, row.actions), 1);
    const maxImpact = impactRows.reduce((acc, row) => Math.max(acc, row.count), 1);

    return {
      totals: {
        actions: mapItems.length,
        wasteKg,
        butts,
        volunteers,
        citizenHours,
        geocoveragePct:
          mapItems.length > 0 ? Math.round((geolocated / mapItems.length) * 100) : 0,
      },
      zoneRows,
      monthRows,
      impactRows,
      maxMonth,
      maxImpact,
    };
  }, [actionsQuery.data?.items, mapQuery.data?.items]);

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? "p-0" : "p-1"}`}>
        <div>
          <h2 className={compact ? "text-lg font-semibold text-slate-900" : "text-xl font-semibold text-slate-900"}>
            Graphiques et tableaux dynamiques
          </h2>
          <p className={compact ? "text-xs text-slate-600" : "text-sm text-slate-600"}>
            Lecture consolidée (échantillon live API).
          </p>
        </div>
      </div>

      {loading ? (
        <p className={compact ? "text-xs text-slate-500" : "text-sm text-slate-500"}>Chargement des indicateurs dynamiques...</p>
      ) : null}
      {error ? (
        <p className={compact ? "text-xs text-rose-700" : "text-sm text-rose-700"}>Indicateurs dynamiques indisponibles.</p>
      ) : null}

      {!loading && !error ? (
        <>
          {/* Les compteurs globaux ont ete remontes dans le Dashboard Global, 
              mais on garde ici les graphiques specifiques. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
              <h3 className={compact ? "text-xs font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>Tendance 6 derniers mois</h3>
              <div className="mt-3 space-y-2">
                {model.monthRows.map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{row.label}</span>
                      <span>{row.actions} actions</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${Math.max(6, (row.actions / model.maxMonth) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
              <h3 className={compact ? "text-xs font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>Répartition impact</h3>
              <div className="mt-3 space-y-2">
                {model.impactRows.map((row) => (
                  <div key={row.level}>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span className="capitalize">{row.level}</span>
                      <span>{row.count}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          row.level === "critique"
                            ? "bg-rose-600"
                            : row.level === "fort"
                              ? "bg-amber-600"
                              : row.level === "moyen"
                                ? "bg-sky-600"
                                : "bg-emerald-600"
                        }`}
                        style={{ width: `${Math.max(6, (row.count / model.maxImpact) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
            <h3 className={compact ? "text-xs font-semibold text-slate-900" : "text-sm font-semibold text-slate-900"}>Tableau dynamique par zone</h3>
            <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Zone</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                    <th className="px-3 py-2 text-right">Déchets (kg)</th>
                    <th className="px-3 py-2 text-right">Mégots</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {model.zoneRows.map((row) => (
                    <tr key={row.zone} className="text-slate-700 hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 font-medium">{row.zone}</td>
                      <td className="px-3 py-2 text-right">{row.actions}</td>
                      <td className="px-3 py-2 text-right">{row.wasteKg.toFixed(1)}</td>
                      <td className="px-3 py-2 text-right">{Math.round(row.butts)}</td>
                    </tr>
                  ))}
                  {model.zoneRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-slate-500 italic">
                        Aucune donnée disponible pour cette période.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </>
      ) : null}
    </div>
  );
}
