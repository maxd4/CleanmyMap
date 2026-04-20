"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { fetchActions } from "@/lib/actions/http";
import { evaluateActionQuality } from "@/lib/actions/quality";
import { mapItemWasteKg, mapItemCigaretteButts } from "@/lib/actions/data-contract";
import type {
  ActionListItem,
  ActionQualityGrade,
  ActionStatus,
} from "@/lib/actions/types";
import { swrRecentViewOptions } from "@/lib/swr-config";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    parsed,
  );
}

function formatRecordType(item: ActionListItem): string {
  if (item.record_type === "clean_place") {
    return "lieu propre";
  }
  if (item.record_type === "other") {
    return "spot";
  }
  return "action";
}

function qualityTone(grade: "A" | "B" | "C"): string {
  if (grade === "A") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (grade === "B") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function rowTone(grade: "A" | "B" | "C" | null): string {
  if (grade === "A") {
    return "bg-emerald-50/40";
  }
  if (grade === "B") {
    return "bg-amber-50/40";
  }
  if (grade === "C") {
    return "bg-rose-50/40";
  }
  return "";
}

export function ActionsHistoryList() {
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">(
    "approved",
  );
  const [qualityFilter, setQualityFilter] = useState<
    ActionQualityGrade | "all"
  >("all");
  const [toFixOnly, setToFixOnly] = useState<boolean>(false);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const swrKey = useMemo(
    () => [
      "actions",
      statusFilter,
      qualityFilter,
      String(toFixOnly),
      String(limit),
    ],
    [statusFilter, qualityFilter, toFixOnly, limit],
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
      fetchActions({
        status: statusFilter,
        qualityGrade: qualityFilter === "all" ? undefined : qualityFilter,
        toFixPriority: toFixOnly ? true : undefined,
        limit,
        types: "all",
      }),
    swrRecentViewOptions,
  );

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const failedSources = data?.sourceHealth?.failedSources ?? [];
  const partialSourcesLabel =
    failedSources.length > 0 ? failedSources.join(", ") : "inconnues";
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

  const qualityById = useMemo(() => {
    const output = new Map<string, ReturnType<typeof evaluateActionQuality>>();
    for (const item of filteredItems) {
      if (typeof item.quality_score === "number" && item.quality_grade) {
        output.set(item.id, {
          score: item.quality_score,
          grade: item.quality_grade,
          breakdown:
            item.quality_breakdown ?? evaluateActionQuality(item).breakdown,
          flags: item.quality_flags ?? [],
        });
      } else {
        output.set(item.id, evaluateActionQuality(item));
      }
    }
    return output;
  }, [filteredItems]);

  const selectedItem = useMemo(
    () =>
      filteredItems.find((item) => item.id === selectedId) ??
      filteredItems[0] ??
      null,
    [filteredItems, selectedId],
  );
  const selectedQuality = selectedItem
    ? (qualityById.get(selectedItem.id) ?? null)
    : null;
  const selectedLostPoints = selectedQuality
    ? Math.max(0, 100 - selectedQuality.score)
    : 0;
  const correctiveAction = selectedQuality
    ? selectedQuality.breakdown.geoloc < 70
      ? "Renforcer geo-tracabilite (coordonnees + trace/polygone)."
      : selectedQuality.breakdown.traceability < 80
        ? "Completer les champs de traçabilite (auteur/source/dates)."
        : selectedQuality.breakdown.freshness < 70
          ? "Prioriser moderation rapide pour reduire la staleness."
          : "Corriger les champs incomplets et valeurs incoherentes."
    : null;

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
            Historique des actions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Vue filtrable avec score qualite par action (A/B/C).
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {isValidating ? "Actualisation..." : "Rafraichir"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
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
          Limite
          <select
            value={String(limit)}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="10">10</option>
            <option value="30">30</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Grade qualite
          <select
            value={qualityFilter}
            onChange={(event) =>
              setQualityFilter(event.target.value as ActionQualityGrade | "all")
            }
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          >
            <option value="all">Tous</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Priorite correction
          <button
            type="button"
            onClick={() => setToFixOnly((prev) => !prev)}
            className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition ${
              toFixOnly
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {toFixOnly ? "Actif: a corriger" : "Tous les enregistrements"}
          </button>
        </label>

        <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
          Recherche rapide
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nom ou lieu"
            className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
          />
        </label>
      </div>

      {selectedItem && selectedQuality ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Detail score qualite
          </p>
          <p className="mt-1 text-sm text-slate-700">
            <span className="font-semibold">
              {selectedQuality.grade} ({selectedQuality.score}/100)
            </span>{" "}
            - points perdus: {selectedLostPoints}
            {selectedItem.contract?.metadata.placeType && (
              <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
                Type: {selectedItem.contract.metadata.placeType}
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Facteurs:{" "}
            {selectedQuality.flags.length > 0
              ? selectedQuality.flags.join(", ")
              : "Aucun facteur critique."}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Action corrective recommandee: {correctiveAction}
          </p>
        </div>
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

      {!isLoading && !error ? (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Benevole</th>
                <th className="px-2 py-2 font-medium">Lieu</th>
                <th className="px-2 py-2 font-medium">Type</th>
                <th className="px-2 py-2 font-medium">Kg</th>
                <th className="px-2 py-2 font-medium">Megots</th>
                <th className="px-2 py-2 font-medium">Statut</th>
                <th className="px-2 py-2 font-medium">Qualite</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: ActionListItem) => {
                const quality = qualityById.get(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer border-b border-slate-100 text-slate-700 ${rowTone(quality?.grade ?? null)}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td className="px-2 py-2">
                      {formatDate(item.action_date)}
                    </td>
                    <td className="px-2 py-2">
                      {item.actor_name || "Anonyme"}
                    </td>
                    <td className="px-2 py-2">{item.location_label}</td>
                    <td className="px-2 py-2">{formatRecordType(item)}</td>
                    <td className="px-2 py-2">
                      {mapItemWasteKg(item as any) !== null 
                        ? Number(mapItemWasteKg(item as any)).toFixed(1)
                        : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-2 py-2">
                      {mapItemCigaretteButts(item as any) !== null 
                        ? mapItemCigaretteButts(item as any)
                        : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-2 py-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {quality ? (
                        <div className="space-y-1">
                          <span
                            title={quality.flags.join(" | ")}
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${qualityTone(quality.grade)}`}
                          >
                            {quality.grade} ({quality.score}/100)
                          </span>
                          <p className="max-w-48 truncate text-[11px] text-slate-500">
                            {quality.flags[0]
                              ? `Risque: ${quality.flags[0]}`
                              : "Aucun risque majeur detecte"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">n/a</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredItems.length === 0 ? (
            <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Aucun resultat pour ce filtre.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
