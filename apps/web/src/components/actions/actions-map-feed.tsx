"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
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
  INFRASTRUCTURE_ALERT_THRESHOLD,
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

type ActionsMapCanvasComponent = ComponentType<{
  items: ActionMapItem[];
}>;

type ActionsMapFeedProps = {
  types?: ActionRecordType[] | "all";
  days: number;
  statusFilter: ActionStatus | "all";
  impactFilter: ActionImpactLevel | "all";
  qualityMin: number;
  presentation?: "default" | "immersive";
};

export function ActionsMapFeed({
  types = "all",
  days,
  statusFilter,
  impactFilter,
  qualityMin,
  presentation = "default",
}: ActionsMapFeedProps) {
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
    const totalKg = items.reduce((acc, item) => acc + (mapItemWasteKg(item) ?? 0), 0);
    const totalButts = items.reduce(
      (acc, item) => acc + (mapItemCigaretteButts(item) ?? 0),
      0,
    );
    return { totalKg, totalButts };
  }, [items]);
  const failedSources = data?.sourceHealth?.failedSources ?? [];
  const partialSourcesLabel =
    failedSources.length > 0 ? failedSources.join(", ") : "inconnues";
  const isImmersive = presentation === "immersive";
  const [MapCanvas, setMapCanvas] = useState<ActionsMapCanvasComponent | null>(null);
  const [mapCanvasError, setMapCanvasError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("@/components/actions/actions-map-canvas")
      .then((mod) => {
        if (!cancelled) {
          setMapCanvas(() => mod.ActionsMapCanvas);
          setMapCanvasError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Chargement de la carte impossible.";
          console.error("Map canvas import failed", error);
          setMapCanvasError(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className={
        isImmersive
          ? "relative overflow-hidden rounded-[2.25rem] border border-slate-200/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.7)] sm:p-6"
          : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      }
    >
      {isImmersive ? (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0))]" />
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-white/8 px-4 py-4 text-white backdrop-blur-xl">
              <div className="max-w-2xl">
                {data?.partialSource ? (
                  <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
                    Sources partielles: {partialSourcesLabel}
                  </span>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                    Lecture cartographique
                  </h2>
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                    Carte dominante
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200 sm:text-[15px]">
                  Flux géolocalisé depuis <code className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-white">/api/actions/map</code> pour piloter les interventions terrain. La carte prend ici toute la place, tandis que la légende, les stats et les tableaux restent accessibles en second plan.
                </p>
              </div>
              <button
                onClick={() => void reload()}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/18"
              >
                {isValidating ? "Actualisation..." : "Rafraîchir"}
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/60">
              {MapCanvas ? (
                <MapCanvas items={items} />
              ) : mapCanvasError ? (
                <div className="flex h-[68vh] min-h-[34rem] items-center justify-center bg-slate-950 px-6 text-center text-white md:h-[74vh] md:min-h-[42rem]">
                  <div className="max-w-md space-y-3 rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 px-5 py-6">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-100">
                      Carte indisponible
                    </p>
                    <p className="text-sm leading-6 text-rose-50/90">
                      {mapCanvasError}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex h-[68vh] min-h-[34rem] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.22),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(15,23,42,0.98))] px-6 text-center text-white md:h-[74vh] md:min-h-[42rem]">
                  <div className="max-w-md space-y-3">
                    <div className="mx-auto h-12 w-12 animate-pulse rounded-2xl border border-white/15 bg-white/10" />
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                      Initialisation de la carte
                    </p>
                    <p className="text-sm leading-6 text-slate-200">
                      Chargement des couches interactives, des marqueurs et des contrôles de navigation.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4 text-white shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  Légende dynamique d&apos;impact
                </p>
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-300/90 px-1">
                      <span>Faible</span>
                      <span>Moyen</span>
                      <span>Fort</span>
                      <span>Critique</span>
                    </div>
                    <div
                      className="h-3.5 w-full overflow-hidden rounded-full shadow-sm ring-1 ring-white/10"
                      style={{
                        background: `linear-gradient(to right, 
                          hsla(${COLOR_TOKENS.GREEN.h}, ${COLOR_TOKENS.GREEN.s}%, ${COLOR_TOKENS.GREEN.l}%, 0.45) 0%, 
                          hsla(${COLOR_TOKENS.ORANGE.h}, ${COLOR_TOKENS.ORANGE.s}%, ${COLOR_TOKENS.ORANGE.l}%, 0.7) 37%, 
                          hsla(${COLOR_TOKENS.RED.h}, ${COLOR_TOKENS.RED.s}%, ${COLOR_TOKENS.RED.l}%, 0.82) 75%, 
                          hsla(${COLOR_TOKENS.VIOLET.h}, ${COLOR_TOKENS.VIOLET.s}%, ${COLOR_TOKENS.VIOLET.l}%, 1.0) 100%
                        )`,
                      }}
                    />
                    <div className="flex justify-between text-[9px] text-slate-300/70 px-1">
                      <span>Impact &lt; 30</span>
                      <span>30 - 60</span>
                      <span>60 - 80</span>
                      <span>Score &gt; 80</span>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <div className="h-4 w-4 rounded-full bg-sky-400 shadow-sm ring-2 ring-sky-300/30 flex-shrink-0"></div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-white">Lieu propre</p>
                        <p className="text-[10px] text-slate-300">Zone référencée sans pollution signalée.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <div className="flex -space-x-1">
                        <div className="h-3 w-3 rounded-full bg-violet-400 opacity-100 translate-y-0.5"></div>
                        <div className="h-3 w-3 rounded-full bg-violet-400 opacity-60"></div>
                        <div className="h-3 w-3 rounded-full bg-violet-400 opacity-30 -translate-y-0.5"></div>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-white">Opacité dynamique</p>
                        <p className="text-[10px] text-slate-300">Plus le score grimpe, plus la zone se détache.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">Points</p>
                      <p className="mt-1 text-lg font-semibold text-white">{items.length}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">Déchets</p>
                      <p className="mt-1 text-lg font-semibold text-white">{summary.totalKg.toFixed(1)} kg</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">Mégots</p>
                      <p className="mt-1 text-lg font-semibold text-white">{Math.round(summary.totalButts)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-[1.35rem] border border-white/10 bg-slate-950/70 p-4 text-white shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Nature de la géométrie
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Les tracés solides sont réels, les pointillés sont estimés et les points restent un fallback discret.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-100">Réel</p>
                    <p className="mt-1 text-[11px] text-emerald-50/90">Trait plein</p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-100">Estimé</p>
                    <p className="mt-1 text-[11px] text-amber-50/90">Pointillé</p>
                  </div>
                  <div className="rounded-2xl border border-slate-500/20 bg-white/5 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-100">Fallback</p>
                    <p className="mt-1 text-[11px] text-slate-300">Point discret</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    Infrastructure recommandée
                  </p>
                  <p className="mt-2 text-[11px] leading-6 text-slate-300">
                    Les symboles apparaissent quand le score normalisé atteint au moins{" "}
                    <span className="font-semibold text-white">{INFRASTRUCTURE_ALERT_THRESHOLD}%</span>.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold">
                    <span className="rounded-full bg-white/10 px-2.5 py-1">🗑️ Poubelle</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1">🚬 Cendrier</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1">💰 Double achat</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
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
                les interventions terrain. Par défaut, seules les données validées
                admin sont affichées.
              </p>
            </div>
            <button
              onClick={() => void reload()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              {isValidating ? "Actualisation..." : "Rafraîchir"}
            </button>
          </div>
        </>
      )}

      {!isImmersive ? (
        <>
          <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-950 shadow-inner">
            {MapCanvas ? (
              <MapCanvas items={items} />
            ) : mapCanvasError ? (
              <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-rose-200 bg-rose-50 px-6 text-center text-rose-900">
                <div className="max-w-sm space-y-2 rounded-[1.5rem] border border-rose-200 bg-white px-5 py-6 shadow-sm">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">
                    Carte indisponible
                  </p>
                  <p className="text-sm leading-6 text-rose-800">
                    {mapCanvasError}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex h-[28rem] items-center justify-center rounded-[1.75rem] border border-slate-200 bg-slate-950 px-6 text-center text-white">
                <div className="max-w-sm space-y-2">
                  <div className="mx-auto h-10 w-10 animate-pulse rounded-2xl border border-white/15 bg-white/10" />
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Initialisation de la carte
                  </p>
                  <p className="text-sm leading-6 text-slate-200">
                    Chargement des couches interactives.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner">
            <div className="bg-white px-4 py-2 border-b border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                Légende Dynamique d&apos;Impact
              </p>
            </div>
            
            <div className="p-4 space-y-6">
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
                <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                  <div className="h-4 w-4 rounded-full bg-sky-600 shadow-sm ring-2 ring-sky-100 flex-shrink-0"></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Lieu Propre</p>
                    <p className="text-[10px] text-slate-500">Zone référencée sans pollution signalée (Bleu fixe)</p>
                  </div>
                </div>

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

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Nature de la géométrie
                </p>
                <p className="mt-2 text-xs text-slate-600">
                  Les tracés solides sont des géométries réelles. Les tracés pointillés
                  sont estimés. Les points seuls restent des fallback discrets.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-[11px] font-bold text-emerald-700">
                      —
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-emerald-900">Réel</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-emerald-950/80">
                        Manuelle ou référence. Affichage en trait plein.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-white text-[11px] font-bold text-amber-700">
                      - -
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-amber-900">Estimé</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-amber-950/80">
                        Routé ou zone estimée. Affichage en pointillé.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-500">
                      •
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-800">Fallback</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        Point discret uniquement quand aucune forme exploitable n&apos;existe.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Légende infrastructures recommandées
                </p>
                <p className="mt-2 text-xs text-emerald-950">
                  Les symboles apparaissent quand le score normalisé d&apos;une composante atteint au moins{" "}
                  <span className="font-bold">{INFRASTRUCTURE_ALERT_THRESHOLD}%</span>. La moyenne métier reste à 50%.
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="flex items-start gap-3 rounded-lg border border-white/70 bg-white px-3 py-3 shadow-sm">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/5 text-lg">
                      🗑️
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-800">Poubelle</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        Déchets au-dessus du seuil. La zone suggère un besoin prioritaire de corbeille.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-white/70 bg-white px-3 py-3 shadow-sm">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/5 text-lg">
                      🚬
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-800">Cendrier</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        Mégots au-dessus du seuil. La zone suggère un besoin prioritaire de cendrier.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-white/70 bg-white px-3 py-3 shadow-sm">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/5 text-lg">
                      💰
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-800">Double achat</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        Déchets et mégots dépassent tous deux le seuil. Il faut prévoir poubelle + cendrier.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

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

    </section>
  );
}
