"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";
import { swrRecentViewOptions } from "@/lib/swr-config";

export function ReportsKpiSummary() {
  const actions = useSWR(
    ["reports-kpi-actions"],
    () => fetchActions({ status: "approved", limit: 300 }),
    swrRecentViewOptions,
  );
  const map = useSWR(
    ["reports-kpi-map"],
    () => fetchMapActions({ status: "approved", days: 365, limit: 300 }),
    swrRecentViewOptions,
  );

  const isLoading = actions.isLoading || map.isLoading;
  const error = actions.error || map.error;

  const metrics = useMemo(() => {
    const items = actions.data?.items ?? [];
    const mapItems = map.data?.items ?? [];
    const totalKg = items.reduce(
      (acc, item) => acc + Number(item.waste_kg || 0),
      0,
    );
    const totalButts = items.reduce(
      (acc, item) => acc + Number(item.cigarette_butts || 0),
      0,
    );
    const totalMinutes = items.reduce(
      (acc, item) => acc + Number(item.duration_minutes || 0),
      0,
    );
    const totalVolunteers = items.reduce(
      (acc, item) => acc + Number(item.volunteers_count || 0),
      0,
    );
    const geolocated = mapItems.filter(
      (item) => item.latitude !== null && item.longitude !== null,
    ).length;
    const traced = mapItems.filter((item) =>
      Boolean(item.manual_drawing),
    ).length;
    return {
      totalKg,
      totalButts,
      totalMinutes,
      totalVolunteers,
      geolocated,
      traced,
      count: items.length,
    };
  }, [actions.data?.items, map.data?.items]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        Synthese scientifique rapide
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Indicateurs consolides sur les actions approuvees pour preparer les
        rapports terrain et collectivites.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Chargement des KPI...</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-rose-700">
          Impossible de charger la synthese KPI.
        </p>
      ) : null}

      {!isLoading && !error ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Actions approuvees
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {metrics.count}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Dechets et megots
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {metrics.totalKg.toFixed(1)} kg / {metrics.totalButts} megots
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Mobilisation
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {metrics.totalVolunteers} participants /{" "}
              {(metrics.totalMinutes / 60).toFixed(1)} h
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Points geolocalises
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {metrics.geolocated}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Traces / Polygones
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {metrics.traced}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Qualite donnees
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {metrics.count > 0
                ? `${Math.round((metrics.geolocated / metrics.count) * 100)}% geo-couverture`
                : "n/a"}
            </p>
          </article>
        </div>
      ) : null}
    </section>
  );
}
