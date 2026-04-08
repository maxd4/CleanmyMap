"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import type { ActionMapItem, ActionStatus } from "@/lib/actions/types";
import { swrRecentViewOptions } from "@/lib/swr-config";
import {
  DEFAULT_VISIBLE_CATEGORIES,
  classifyPollutionColor,
  isVisibleWithCategoryFilter,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";
import {
  mapItemCigaretteButts,
  mapItemCoordinates,
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemType,
  mapItemWasteKg,
} from "../../lib/actions/data-contract";

const ActionsMapCanvas = dynamic(
  () => import("@/components/actions/actions-map-canvas").then((mod) => mod.ActionsMapCanvas),
  { ssr: false },
);

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
}

export function ActionsMapFeed() {
  const [days, setDays] = useState<number>(30);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">("all");
  const [visibleCategories, setVisibleCategories] = useState<Record<MarkerCategory, boolean>>(DEFAULT_VISIBLE_CATEGORIES);
  const swrKey = useMemo(() => ["actions-map", String(days), statusFilter], [days, statusFilter]);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: reload,
  } = useSWR(swrKey, () => fetchMapActions({ status: statusFilter, days, limit: 120 }), swrRecentViewOptions);

  const allItems = useMemo(() => data?.items ?? [], [data?.items]);
  const items = useMemo(
    () => allItems.filter((item) => isVisibleWithCategoryFilter(item, visibleCategories)),
    [allItems, visibleCategories],
  );
  const summary = useMemo(() => {
    const totalKg = items.reduce((acc, item) => acc + mapItemWasteKg(item), 0);
    const totalButts = items.reduce((acc, item) => acc + mapItemCigaretteButts(item), 0);
    return { totalKg, totalButts };
  }, [items]);

  function toggleCategory(category: MarkerCategory): void {
    setVisibleCategories((previous) => ({
      ...previous,
      [category]: !previous[category],
    }));
  }

  const categoryButtons: Array<{ key: MarkerCategory; label: string; className: string }> = [
    { key: "yellow", label: "Actions jaunes", className: "border-yellow-300 bg-yellow-50 text-yellow-900" },
    { key: "violet", label: "Actions violettes", className: "border-violet-300 bg-violet-50 text-violet-900" },
    { key: "green", label: "Actions vertes", className: "border-emerald-300 bg-emerald-50 text-emerald-900" },
    { key: "blue", label: "Actions bleues", className: "border-sky-300 bg-sky-50 text-sky-900" },
    { key: "ashtray", label: "Marqueur cendrier", className: "border-amber-300 bg-amber-50 text-amber-900" },
    { key: "bin", label: "Marqueur poubelle", className: "border-cyan-300 bg-cyan-50 text-cyan-900" },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Lecture cartographique</h2>
          <p className="mt-1 text-sm text-slate-600">
            Flux géolocalisé depuis <code>/api/actions/map</code> pour piloter les interventions terrain.
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isValidating ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Fenêtre temporelle
          <select
            value={String(days)}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="180">180 jours</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Statut
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as ActionStatus | "all")}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visibilite des marqueurs</p>
        <p className="mt-1 text-xs text-slate-600">
          Par defaut, seules les actions jaunes et violettes sont affichees. Clique pour afficher/masquer les autres marqueurs.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {categoryButtons.map((item) => {
            const active = visibleCategories[item.key];
            return (
              <button
                key={item.key}
                onClick={() => toggleCategory(item.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active ? item.className : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {active ? "ON" : "OFF"} - {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Points géolocalisés</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{items.length}</p>
          <p className="text-xs text-slate-500">sur {allItems.length} points disponibles</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Déchets (kg)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalKg.toFixed(1)}</p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Mégots</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.totalButts}</p>
        </article>
      </div>

      <ActionsMapCanvas items={items} />

      {isLoading ? (
        <div className="mt-5 space-y-2">
          <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error instanceof Error ? error.message : "Erreur inconnue."}
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Lieu</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Trace</th>
                <th className="px-2 py-2 font-medium">Coordonnées</th>
                <th className="px-2 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: ActionMapItem) => (
                <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-2 py-2">{formatDate(mapItemObservedAt(item))}</td>
                  <td className="px-2 py-2">{mapItemLocationLabel(item)}</td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {mapItemType(item) === "clean_place" ? "lieu propre" : mapItemType(item) === "spot" ? "spot" : "action"}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    {item.manual_drawing ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        {item.manual_drawing.kind === "polygon"
                          ? `Polygone (${item.manual_drawing.coordinates.length})`
                          : `Trace (${item.manual_drawing.coordinates.length})`}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Aucun</span>
                    )}
                  </td>
                  <td className="px-2 py-2 font-mono text-xs">
                    {mapItemCoordinates(item).latitude?.toFixed(5)}, {mapItemCoordinates(item).longitude?.toFixed(5)}
                  </td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {item.status}
                    </span>
                    <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {classifyPollutionColor(item)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Aucun point géolocalisé sur la fenêtre choisie.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}


