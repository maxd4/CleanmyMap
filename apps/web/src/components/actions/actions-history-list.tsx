"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import type { ActionListItem, ActionStatus } from "@/lib/actions/types";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
}

export function ActionsHistoryList() {
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">("all");
  const [limit, setLimit] = useState<number>(30);
  const [search, setSearch] = useState<string>("");

  const swrKey = useMemo(() => ["actions", statusFilter, String(limit)], [statusFilter, limit]);
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: reload,
  } = useSWR(swrKey, () => fetchActions({ status: statusFilter, limit }), {
    revalidateOnFocus: false,
  });

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }

    return items.filter((item: ActionListItem) => {
      const actor = (item.actor_name ?? "").toLowerCase();
      const location = (item.location_label ?? "").toLowerCase();
      return actor.includes(query) || location.includes(query);
    });
  }, [items, search]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Historique des actions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Vue filtrable sur les actions déclarées via la nouvelle API Next.js.
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isValidating ? "Actualisation..." : "Rafraîchir"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
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

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Limite
          <select
            value={String(limit)}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="20">20</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Recherche rapide
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom ou lieu"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>
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
                <th className="px-2 py-2 font-medium">Bénévole</th>
                <th className="px-2 py-2 font-medium">Lieu</th>
                <th className="px-2 py-2 font-medium">Kg</th>
                <th className="px-2 py-2 font-medium">Mégots</th>
                <th className="px-2 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: ActionListItem) => (
                <tr key={item.id} className="border-b border-slate-100 text-slate-700">
                  <td className="px-2 py-2">{formatDate(item.action_date)}</td>
                  <td className="px-2 py-2">{item.actor_name || "Anonyme"}</td>
                  <td className="px-2 py-2">{item.location_label}</td>
                  <td className="px-2 py-2">{Number(item.waste_kg).toFixed(1)}</td>
                  <td className="px-2 py-2">{item.cigarette_butts}</td>
                  <td className="px-2 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Aucun résultat pour ce filtre.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
