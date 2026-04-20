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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* GAUCHE : KPIs et Workflow */}
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Volume triable</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalKg.toFixed(1)} kg</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mégots</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalButts}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Traçabilité géo</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.withTrace}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Indice tri propre</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.mixedIndex}/100</p>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Workflow filière (trier - qualifier - orienter)</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Mégots: contenant fermé, étiquette volume, stockage sec.</li>
              <li>Verre/métal: sacs distincts pour éviter contamination croisée.</li>
              <li>Plastique: prioriser PET/PEHD séparables, limiter les mélanges.</li>
              <li>Mixte: isoler le non triable et documenter la raison terrain.</li>
              <li className="font-semibold">Moyenne actuelle: {stats.avgKg.toFixed(1)} kg par intervention.</li>
            </ul>
          </article>
          
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Exploitation des données</h2>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Associer catégorie de déchet dans les commentaires.</li>
              <li>Documenter zone de collecte par trace/polygone.</li>
              <li>Exporter CSV/JSON pour partage collectivités.</li>
              <li>Vérifier modération avant analyse scientifique.</li>
            </ul>
          </article>
        </div>

        {/* DROITE : Données réelles filières */}
        <div className="space-y-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Pilotage par filière</h2>
            {isLoading ? (<p className="text-sm text-slate-500 mt-2">Chargement des indicateurs de tri...</p>) : null}
            {hasError ? (<p className="text-sm text-rose-700 mt-2">Données de tri indisponibles.</p>) : null}
            
            {breakdown.isLoading ? (<p className="mt-2 text-sm text-slate-500">Chargement des filières...</p>) : null}
            {breakdown.error ? (<p className="mt-2 text-sm text-rose-700">Agrégation filière indisponible.</p>) : null}
            
            {breakdown.data ? (
              <div className="mt-3 space-y-3">
                <div className="overflow-x-auto rounded-lg border border-slate-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Filière</th>
                        <th className="px-3 py-2 font-semibold">Volume (kg)</th>
                        <th className="px-3 py-2 font-semibold">Part</th>
                        <th className="px-3 py-2 font-semibold">Actions source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {breakdown.data.lines.map((line) => (
                        <tr key={line.category} className="text-slate-700 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 capitalize font-medium">{line.category}</td>
                          <td className="px-3 py-2">{line.kg.toFixed(1)}</td>
                          <td className="px-3 py-2">
                            <span className="inline-block w-8">{line.sharePercent.toFixed(1)}%</span>
                          </td>
                          <td className="px-3 py-2">{line.entries}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600">Qualité de tri signalée :</p>
                  <p className="text-xs text-slate-700 mt-1">
                    Élevée: <span className="font-semibold text-emerald-600">{breakdown.data.triQuality.elevee}</span> • 
                    Moyenne: <span className="font-semibold text-amber-600">{breakdown.data.triQuality.moyenne}</span> • 
                    Faible: <span className="font-semibold text-rose-600">{breakdown.data.triQuality.faible}</span>
                  </p>
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </div>
    </div>
  );
}

