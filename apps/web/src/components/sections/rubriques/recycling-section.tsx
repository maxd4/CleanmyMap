"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { fetchActions, fetchMapActions } from "@/lib/actions/http";


export function RecyclingSection() {
  const actions = useSWR(["section-recycling-actions"], () =>
    fetchActions({ status: "approved", limit: 350 }),
  );
  const map = useSWR(["section-recycling-map"], () =>
    fetchMapActions({ status: "approved", days: 365, limit: 300 }),
  );
  const breakdown = useSWR("section-recycling-breakdown", async () => {
    const response = await fetch("/api/recycling/breakdown", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error("breakdown_unavailable");
    }
    return (await response.json()) as {
      totalKg: number;
      lines: Array<{
        category: string;
        kg: number;
        sharePercent: number;
        entries: number;
      }>;
      triQuality: { elevee: number; moyenne: number; faible: number };
      generatedAt: string;
    };
  });

  const stats = useMemo(() => {
    const items = actions.data?.items ?? [];
    const totalKg = items.reduce(
      (acc, item) => acc + Number(item.waste_kg || 0),
      0,
    );
    const totalButts = items.reduce(
      (acc, item) => acc + Number(item.cigarette_butts || 0),
      0,
    );
    const avgKg = items.length > 0 ? totalKg / items.length : 0;
    const withTrace = (map.data?.items ?? []).filter((item) =>
      Boolean(item.manual_drawing),
    ).length;
    const mixedIndex =
      totalKg > 0
        ? Math.max(
            0,
            100 - Math.round((totalButts / Math.max(totalKg, 1)) * 0.8),
          )
        : 0;
    return {
      totalKg,
      totalButts,
      avgKg,
      withTrace,
      mixedIndex,
      count: items.length,
    };
  }, [actions.data?.items, map.data?.items]);

  const isLoading = actions.isLoading || map.isLoading;
  const hasError = Boolean(actions.error || map.error);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Volume triable
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.totalKg.toFixed(1)} kg
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Megots
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.totalButts}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Traceabilite geo
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.withTrace}
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Indice tri propre
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {stats.mixedIndex}/100
          </p>
        </article>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">
          Chargement des indicateurs de tri...
        </p>
      ) : null}
      {hasError ? (
        <p className="text-sm text-rose-700">Donnees de tri indisponibles.</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Workflow filiere (trier - qualifier - orienter)
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Megots: contenant ferme, etiquette volume, stockage sec.</li>
            <li>
              Verre/metal: sacs distincts pour eviter contamination croisee.
            </li>
            <li>
              Plastique: prioriser PET/PEHD separables, limiter les melanges.
            </li>
            <li>
              Mixte: isoler le non triable et documenter la raison terrain.
            </li>
            <li>
              Moyenne actuelle: {stats.avgKg.toFixed(1)} kg par intervention.
            </li>
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Exploitation des donnees
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            <li>Associer categorie de dechet dans les commentaires.</li>
            <li>Documenter zone de collecte par trace/polygone.</li>
            <li>Exporter CSV/JSON pour partage collectivites.</li>
            <li>Verifier moderation avant analyse scientifique.</li>
          </ul>
        </article>
      </div>

      <article className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Pilotage par filiere
        </h2>
        {breakdown.isLoading ? (
          <p className="mt-2 text-sm text-slate-500">
            Chargement des filieres...
          </p>
        ) : null}
        {breakdown.error ? (
          <p className="mt-2 text-sm text-rose-700">
            Aggregation filiere indisponible.
          </p>
        ) : null}
        {breakdown.data ? (
          <div className="mt-3 space-y-3">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-2 py-2">Filiere</th>
                    <th className="px-2 py-2">Volume (kg)</th>
                    <th className="px-2 py-2">Part</th>
                    <th className="px-2 py-2">Actions source</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.data.lines.map((line) => (
                    <tr
                      key={line.category}
                      className="border-b border-slate-100 text-slate-700"
                    >
                      <td className="px-2 py-2 capitalize">{line.category}</td>
                      <td className="px-2 py-2">{line.kg.toFixed(1)}</td>
                      <td className="px-2 py-2">
                        {line.sharePercent.toFixed(1)}%
                      </td>
                      <td className="px-2 py-2">{line.entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600">
              Qualite de tri: elevee {breakdown.data.triQuality.elevee} -
              moyenne {breakdown.data.triQuality.moyenne} - faible{" "}
              {breakdown.data.triQuality.faible}
            </p>
          </div>
        ) : null}
      </article>
    </div>
  );
}

