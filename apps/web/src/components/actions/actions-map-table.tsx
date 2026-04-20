"use client";

import type { ActionMapItem } from "@/lib/actions/types";
import {
  mapItemLocationLabel,
  mapItemObservedAt,
  mapItemType,
  mapItemCoordinates,
} from "@/lib/actions/data-contract";
import { classifyPollutionColor } from "@/components/actions/map-marker-categories";

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    parsed,
  );
}

type ActionsMapTableProps = {
  items: ActionMapItem[];
};

export function ActionsMapTable({ items }: ActionsMapTableProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">Aucun point géolocalisé pour cette période.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Journal des actions (YTD)</h2>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {items.length} points affichés
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2 font-medium">Date</th>
              <th className="px-2 py-2 font-medium">Lieu</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Tracé</th>
              <th className="px-2 py-2 font-medium">Coordonnées</th>
              <th className="px-2 py-2 font-medium">Statut</th>
              <th className="px-2 py-2 font-medium text-right">Impact / Qualité</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item: ActionMapItem) => (
              <tr key={item.id} className="text-slate-700 hover:bg-slate-50 transition-colors">
                <td className="px-2 py-2 whitespace-nowrap">
                  {formatDate(mapItemObservedAt(item))}
                </td>
                <td className="px-2 py-2 font-medium">
                  {mapItemLocationLabel(item)}
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(item as any).campaign_name && (
                    <div className="mt-1">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 border border-indigo-100">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        📌 {(item as any).campaign_name}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                    {mapItemType(item) === "clean_place"
                      ? "lieu propre"
                      : mapItemType(item) === "spot"
                        ? "spot"
                        : "action"}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {item.manual_drawing ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {item.manual_drawing.kind === "polygon" ? "Polygone" : "Tracé"}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Point seul</span>
                  )}
                </td>
                <td className="px-2 py-2 font-mono text-[10px] text-slate-500">
                  {mapItemCoordinates(item).latitude?.toFixed(4)}, {mapItemCoordinates(item).longitude?.toFixed(4)}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {item.status}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {classifyPollutionColor(item)}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      {item.impact_level ?? "faible"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {item.quality_grade ?? "C"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
