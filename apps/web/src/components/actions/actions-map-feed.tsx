"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import type {
  ActionImpactLevel,
  ActionMapItem,
  ActionRecordType,
  ActionStatus,
} from "@/lib/actions/types";
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
import { COLOR_TOKENS } from "./map-marker-categories";

const ActionsMapCanvas = dynamic(
  () =>
    import("@/components/actions/actions-map-canvas").then(
      (mod) => mod.ActionsMapCanvas,
    ),
  { ssr: false },
);

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    parsed,
  );
}

type ActionsMapFeedProps = {
  types?: ActionRecordType[] | "all";
};

export function ActionsMapFeed({ types = "all" }: ActionsMapFeedProps) {
  const [days, setDays] = useState<number>(30);
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">("all");
  const [impactFilter, setImpactFilter] = useState<ActionImpactLevel | "all">(
    "all",
  );
  const [qualityMin, setQualityMin] = useState<number>(0);
  const visibleCategories: Record<MarkerCategory, boolean> =
    DEFAULT_VISIBLE_CATEGORIES;
  const serializedTypes = useMemo(
    () => (types === "all" ? "all" : [...new Set(types)].sort().join(",")),
    [types],
  );
  const swrKey = useMemo(
    () => [
      "actions-map",
      String(days),
      statusFilter,
      serializedTypes,
      impactFilter,
      String(qualityMin),
    ],
    [days, statusFilter, serializedTypes, impactFilter, qualityMin],
  );

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: reload,
  } = useSWR(
    swrKey,
    () =>
      fetchMapActions({
        status: statusFilter,
        days,
        impact: impactFilter === "all" ? undefined : impactFilter,
        qualityMin: qualityMin > 0 ? qualityMin : undefined,
        limit: 120,
        types,
      }),
    swrRecentViewOptions,
  );

  const allItems = useMemo(() => data?.items ?? [], [data?.items]);
  const items = useMemo(
    () =>
      allItems.filter((item) =>
        isVisibleWithCategoryFilter(item, visibleCategories),
      ),
    [allItems, visibleCategories],
  );
  const summary = useMemo(() => {
    const totalKg = items.reduce((acc, item) => acc + mapItemWasteKg(item), 0);
    const totalButts = items.reduce(
      (acc, item) => acc + mapItemCigaretteButts(item),
      0,
    );
    return { totalKg, totalButts };
  }, [items]);
  const failedSources = data?.sourceHealth?.failedSources ?? [];
  const partialSourcesLabel =
    failedSources.length > 0 ? failedSources.join(", ") : "inconnues";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {data?.partialSource ? (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Sources partielles: {partialSourcesLabel}
            </span>
          ) : null}
          <h2 className="text-xl font-semibold text-slate-900">
            Lecture cartographique
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Flux géolocalisé depuis <code>/api/actions/map</code> pour piloter
            les interventions terrain.
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isValidating ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
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
            onChange={(event) =>
              setStatusFilter(event.target.value as ActionStatus | "all")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Impact terrain
          <select
            value={impactFilter}
            onChange={(event) =>
              setImpactFilter(event.target.value as ActionImpactLevel | "all")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="faible">Faible</option>
            <option value="moyen">Moyen</option>
            <option value="fort">Fort</option>
            <option value="critique">Critique</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Fiabilite data min
          <select
            value={String(qualityMin)}
            onChange={(event) => setQualityMin(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="0">Toutes</option>
            <option value="60">B et + (&gt;=60)</option>
            <option value="80">A uniquement (&gt;=80)</option>
          </select>
        </label>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner">
        <div className="bg-white px-4 py-2 border-b border-slate-200">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Légende Dynamique d&apos;Impact
          </p>
        </div>
        
        <div className="p-4 space-y-6">
          {/* Gradient Couleur & Opacité */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
              <span>Faible</span>
              <span>Moyen</span>
              <span>Fort</span>
              <span>Critique</span>
            </div>
            <div 
              className="h-4 w-full rounded-full shadow-sm relative overflow-hidden"
              style={{
                background: `linear-gradient(to right, 
                  hsla(${COLOR_TOKENS.GREEN.h}, ${COLOR_TOKENS.GREEN.s}%, ${COLOR_TOKENS.GREEN.l}%, 0.4) 0%, 
                  hsla(${COLOR_TOKENS.ORANGE.h}, ${COLOR_TOKENS.ORANGE.s}%, ${COLOR_TOKENS.ORANGE.l}%, 0.6) 37%, 
                  hsla(${COLOR_TOKENS.RED.h}, ${COLOR_TOKENS.RED.s}%, ${COLOR_TOKENS.RED.l}%, 0.8) 75%, 
                  hsla(${COLOR_TOKENS.VIOLET.h}, ${COLOR_TOKENS.VIOLET.s}%, ${COLOR_TOKENS.VIOLET.l}%, 1.0) 100%
                )`
              }}
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 px-1">
              <span>Impact &lt; 30</span>
              <span>30 - 60</span>
              <span>60 - 80</span>
              <span>Score &gt; 80</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Cas particulier: Lieu Propre */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
              <div className="h-4 w-4 rounded-full bg-sky-600 shadow-sm ring-2 ring-sky-100 flex-shrink-0"></div>
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Lieu Propre</p>
                <p className="text-[10px] text-slate-500">Zone référencée sans pollution signalée (Bleu fixe)</p>
              </div>
            </div>

            {/* Note sur l'opacité */}
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
              <div className="flex -space-x-1">
                <div className="h-3 w-3 rounded-full bg-violet-500 opacity-100 translate-y-0.5"></div>
                <div className="h-3 w-3 rounded-full bg-violet-500 opacity-60"></div>
                <div className="h-3 w-3 rounded-full bg-violet-500 opacity-30 -translate-y-0.5"></div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Opacité Dynamique</p>
                <p className="text-[10px] text-slate-500">Augmente avec le score pour isoler visuellement les urgences</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Points géolocalisés
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {items.length}
          </p>
          <p className="text-xs text-slate-500">
            sur {allItems.length} points disponibles
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Déchets (kg)
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.totalKg.toFixed(1)}
          </p>
        </article>
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Mégots
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {summary.totalButts}
          </p>
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
                <th className="px-2 py-2 font-medium">Impact / Fiabilite</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: ActionMapItem) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-100 text-slate-700"
                >
                  <td className="px-2 py-2">
                    {formatDate(mapItemObservedAt(item))}
                  </td>
                  <td className="px-2 py-2">{mapItemLocationLabel(item)}</td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {mapItemType(item) === "clean_place"
                        ? "lieu propre"
                        : mapItemType(item) === "spot"
                          ? "spot"
                          : "action"}
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
                    {mapItemCoordinates(item).latitude?.toFixed(5)},{" "}
                    {mapItemCoordinates(item).longitude?.toFixed(5)}
                  </td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {item.status}
                    </span>
                    <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {classifyPollutionColor(item)}
                    </span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        {item.impact_level ?? "faible"}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {item.quality_grade ?? "C"} (
                        {Math.round(item.quality_score ?? 0)})
                      </span>
                    </div>
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
