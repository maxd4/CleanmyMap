"use client";

import { useMemo, useState } from"react";
import type { ActionMapItem } from"@/lib/actions/types";
import {
 getGeometryPresentation,
 mapItemDrawing,
 mapItemLocationLabel,
 mapItemObservedAt,
 mapItemType,
 mapItemCoordinates,
} from"@/lib/actions/data-contract";
import { classifyPollutionColor } from"@/components/actions/map-marker-categories";

function formatDate(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }
 return new Intl.DateTimeFormat("fr-FR", { dateStyle:"medium" }).format(
 parsed,
 );
}

type ActionsMapTableProps = {
 items: ActionMapItem[];
 compact?: boolean;
};

const ACTIONS_BATCH_SIZE = 4;

export function ActionsMapTable({ items, compact = false }: ActionsMapTableProps) {
 const [isVisible, setIsVisible] = useState(false);
 const [visibleCount, setVisibleCount] = useState(ACTIONS_BATCH_SIZE);

 const orderedItems = useMemo(
 () =>
 [...items].sort((left, right) =>
 new Date(mapItemObservedAt(right)).getTime() -
 new Date(mapItemObservedAt(left)).getTime(),
 ),
 [items],
 );

 const visibleItems = orderedItems.slice(0, visibleCount);
 const hasMore = visibleCount < orderedItems.length;

 if (items.length === 0) {
 return (
 <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ?"p-4" :"p-6"}`}>
 <p className={compact ?"cmm-text-caption cmm-text-secondary" :"cmm-text-small cmm-text-secondary"}>Aucun point géolocalisé pour cette période.</p>
 </section>
 );
 }

 return (
 <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ?"p-4" :"p-6"}`}>
 <div className={`flex items-center justify-between ${compact ?"mb-3" :"mb-4"}`}>
 <h2 className={compact ?"text-lg font-semibold cmm-text-primary" :"text-xl font-semibold cmm-text-primary"}>Journal des actions (YTD)</h2>
 <span className="rounded-full bg-slate-100 px-2.5 py-1 cmm-text-caption font-medium cmm-text-muted">
 {items.length} points affichés
 </span>
 </div>

 {!isVisible ? (
 <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="cmm-text-small font-semibold cmm-text-primary">Journal masqué par défaut</p>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Affiche les 4 actions les plus récentes uniquement à la demande.
 </p>
 </div>
 <button
 type="button"
 onClick={() => {
 setIsVisible(true);
 setVisibleCount(ACTIONS_BATCH_SIZE);
 }}
 className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 <span aria-hidden="true">🗂️</span>
 Afficher des actions
 </button>
 </div>
 </div>
 ) : null}

 {isVisible ? (
 <div className={compact ?"max-h-[30rem] overflow-auto rounded-xl border border-slate-200" :"overflow-x-auto"}>
 <table className="min-w-full text-left cmm-text-small">
 <thead>
 <tr className="border-b border-slate-200 cmm-text-muted">
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
 {visibleItems.map((item: ActionMapItem) => {
 const drawing = mapItemDrawing(item);
 const geometry = getGeometryPresentation(item);
 return (
 <tr key={item.id} className="cmm-text-secondary hover:bg-slate-50 transition-colors">
 <td className="px-2 py-2 whitespace-nowrap">
 {formatDate(mapItemObservedAt(item))}
 </td>
 <td className="px-2 py-2 font-medium">
 {mapItemLocationLabel(item)}
 {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 {(item as any).campaign_name && (
 <div className="mt-1">
 { }
 <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 cmm-text-caption font-bold uppercase tracking-wider text-indigo-700 border border-indigo-100">
 {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
 📌 {(item as any).campaign_name}
 </span>
 </div>
 )}
 </td>
 <td className="px-2 py-2">
 <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-bold uppercase tracking-wide cmm-text-secondary">
 {mapItemType(item) ==="clean_place"
 ?"lieu propre"
 : mapItemType(item) ==="spot"
 ?"spot"
 :"action"}
 </span>
 </td>
 <td className="px-2 py-2">
 {drawing ? (
 <span
 className={`cmm-text-caption font-semibold px-2 py-0.5 rounded-full border ${
 geometry.reality ==="real"
 ?"text-emerald-700 bg-emerald-50 border-emerald-100"
 :"text-amber-800 bg-amber-50 border-amber-100"
 }`}
 >
 {geometry.label}
 </span>
 ) : (
 <span className="cmm-text-caption cmm-text-muted">Point discret</span>
 )}
 </td>
 <td className="px-2 py-2 font-mono cmm-text-caption cmm-text-muted">
 {mapItemCoordinates(item).latitude?.toFixed(4)}, {mapItemCoordinates(item).longitude?.toFixed(4)}
 </td>
 <td className="px-2 py-2">
 <div className="flex items-center gap-2">
 <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-bold uppercase cmm-text-secondary">
 {item.status}
 </span>
 <span className="cmm-text-caption font-medium cmm-text-muted">
 {classifyPollutionColor(item)}
 </span>
 </div>
 </td>
 <td className="px-2 py-2 text-right">
 <div className="flex justify-end gap-1">
 <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 cmm-text-caption font-bold text-emerald-700">
 {item.impact_level ??"faible"}
 </span>
 <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 cmm-text-caption font-bold cmm-text-secondary">
 {item.quality_grade ??"C"}
 </span>
 </div>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 ) : null}

 {isVisible ? (
 <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
 <p className="cmm-text-caption cmm-text-muted">
 {visibleItems.length} action{visibleItems.length > 1 ?"s" :""} affichée
 {visibleItems.length > 1 ?"s" :""} sur {orderedItems.length}
 </p>
 <div className="flex flex-wrap gap-2">
 {hasMore ? (
 <button
 type="button"
 onClick={() =>
 setVisibleCount((current) =>
 Math.min(current + ACTIONS_BATCH_SIZE, orderedItems.length),
 )
 }
 className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 cmm-text-small font-semibold text-emerald-800 transition hover:bg-emerald-100"
 >
 Afficher plus
 </button>
 ) : null}
 <button
 type="button"
 onClick={() => {
 setIsVisible(false);
 setVisibleCount(ACTIONS_BATCH_SIZE);
 }}
 className="rounded-xl border border-slate-300 bg-white px-4 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 Masquer le journal
 </button>
 </div>
 </div>
 ) : null}
 </section>
 );
}
