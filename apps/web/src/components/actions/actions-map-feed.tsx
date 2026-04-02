"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import type { ActionMapItem, ActionStatus } from "@/lib/actions/types";

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
  const swrKey = useMemo(() => ["actions-map", String(days), statusFilter], [days, statusFilter]);

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: reload,
  } = useSWR(swrKey, () => fetchMapActions({ status: statusFilter, days, limit: 120 }), {
    revalidateOnFocus: false,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const summary = useMemo(() => {
    const totalKg = items.reduce((acc, item) => acc + Number(item.waste_kg || 0), 0);
    const totalButts = items.reduce((acc, item) => acc + Number(item.cigarette_butts || 0), 0);
    return { totalKg, totalButts };
  }, [items]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Lecture cartographique</h2>
          <p className="mt-1 text-sm text-slate-600">
            Flux géolocalisé depuis <code>/api/actions/map</code> pour préparer la migration de la carte interactive.
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

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Points géolocalisés</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{items.length}</p>
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
                <th className="px-2 py-2 font-medium">Coordonnées</th>
                <th className="px-2 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: ActionMapItem) => (
                <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-2 py-2">{formatDate(item.action_date)}</td>
                  <td className="px-2 py-2">{item.location_label}</td>
                  <td className="px-2 py-2 font-mono text-xs">
                    {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
                  </td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {item.status}
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
