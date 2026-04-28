"use client";

import { useMemo, useState } from"react";
import useSWR from"swr";
import { fetchActions } from"@/lib/actions/http";
import { evaluateActionQuality } from"@/lib/actions/quality";
import {
 getActionOperationalContext,
 mapItemWasteKg,
 mapItemCigaretteButts,
} from"@/lib/actions/data-contract";
import type {
 ActionListItem,
 ActionQualityGrade,
 ActionStatus,
} from"@/lib/actions/types";
import { swrRecentViewOptions } from"@/lib/swr-config";
import { CmmSkeleton } from"@/components/ui/cmm-skeleton";

function formatDate(value: string): string {
 const parsed = new Date(value);
 if (Number.isNaN(parsed.getTime())) {
 return value;
 }
 return new Intl.DateTimeFormat("fr-FR", { dateStyle:"medium" }).format(
 parsed,
 );
}

function formatRecordType(item: ActionListItem): string {
 if (item.record_type ==="clean_place") {
 return"lieu propre";
 }
 if (item.record_type ==="other") {
 return"spot";
 }
 return"action";
}

function qualityTone(grade:"A" |"B" |"C"): string {
 if (grade ==="A") {
 return"border-emerald-200 bg-emerald-50 text-emerald-700";
 }
 if (grade ==="B") {
 return"border-amber-200 bg-amber-50 text-amber-700";
 }
 return"border-rose-200 bg-rose-50 text-rose-700";
}

function rowTone(grade:"A" |"B" |"C" | null): string {
 if (grade ==="A") {
 return"bg-emerald-50/40";
 }
 if (grade ==="B") {
 return"bg-amber-50/40";
 }
 if (grade ==="C") {
 return"bg-rose-50/40";
 }
 return"";
}

export function ActionsHistoryList() {
 const [statusFilter, setStatusFilter] = useState<ActionStatus |"all">(
"approved",
 );
 const [qualityFilter, setQualityFilter] = useState<
 ActionQualityGrade |"all"
 >("all");
 const [toFixOnly, setToFixOnly] = useState<boolean>(false);
 const [limit, setLimit] = useState<number>(25);
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
 qualityGrade: qualityFilter ==="all" ? undefined : qualityFilter,
 toFixPriority: toFixOnly ? true : undefined,
 limit,
 types:"all",
 }),
 swrRecentViewOptions,
 );

 const items = useMemo(() => data?.items ?? [], [data?.items]);
 const failedSources = data?.sourceHealth?.failedSources ?? [];
 const partialSourcesLabel =
 failedSources.length > 0 ? failedSources.join(",") :"inconnues";
 const filteredItems = useMemo(() => {
 const query = search.trim().toLowerCase();
 if (!query) {
 return items;
 }

 return items.filter((item: ActionListItem) => {
 const actor = (item.actor_name ??"").toLowerCase();
 const location = (item.location_label ??"").toLowerCase();
 return actor.includes(query) || location.includes(query);
 });
 }, [items, search]);

 const qualityById = useMemo(() => {
 const output = new Map<string, ReturnType<typeof evaluateActionQuality>>();
 for (const item of filteredItems) {
 if (typeof item.quality_score ==="number" && item.quality_grade) {
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
 const selectedOperational = selectedItem?.contract
 ? getActionOperationalContext(selectedItem.contract)
 : null;
 const selectedLostPoints = selectedQuality
 ? Math.max(0, 100 - selectedQuality.score)
 : 0;
 const correctiveAction = selectedQuality
 ? selectedQuality.breakdown.geoloc < 70
 ?"Renforcer geo-tracabilite (coordonnees + trace/polygone)."
 : selectedQuality.breakdown.traceability < 80
 ?"Completer les champs de traçabilite (auteur/source/dates)."
 : selectedQuality.breakdown.freshness < 70
 ?"Prioriser moderation rapide pour reduire la staleness."
 :"Corriger les champs incomplets et valeurs incoherentes."
 : null;

 return (
 <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 {data?.partialSource ? (
 <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 cmm-text-caption font-semibold uppercase tracking-wide text-amber-900">
 Sources partielles: {partialSourcesLabel}
 </span>
 ) : null}
 <h2 className="text-xl font-semibold cmm-text-primary">
 Historique des actions
 </h2>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 Vue filtrable avec score qualite par action (A/B/C).
 </p>
 </div>
 <button
 onClick={() => void reload()}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary transition hover:bg-slate-100"
 >
 {isValidating ?"Actualisation..." :"Rafraichir"}
 </button>
 </div>

 <div className="mt-4 grid gap-3 md:grid-cols-3">
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Statut
 <select
 value={statusFilter}
 onChange={(event) =>
 setStatusFilter(event.target.value as ActionStatus |"all")
 }
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="all">Tous</option>
 <option value="pending">Pending</option>
 <option value="approved">Approved</option>
 <option value="rejected">Rejected</option>
 </select>
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Grade qualite
 <select
 value={qualityFilter}
 onChange={(event) =>
 setQualityFilter(event.target.value as ActionQualityGrade |"all")
 }
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="all">Tous</option>
 <option value="A">A</option>
 <option value="B">B</option>
 <option value="C">C</option>
 </select>
 </label>

 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 Priorite correction
 <button
 type="button"
 onClick={() => setToFixOnly((prev) => !prev)}
 className={`rounded-lg border px-3 py-2 text-left cmm-text-small font-semibold transition ${
 toFixOnly
 ?"border-rose-300 bg-rose-50 text-rose-800"
 :"border-slate-300 bg-white cmm-text-secondary hover:bg-slate-100"
 }`}
 >
 {toFixOnly ?"Actif: a corriger" :"Tous les enregistrements"}
 </button>
 </label>

 <label className="md:col-span-2 flex flex-col gap-2 cmm-text-small cmm-text-secondary">
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
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Detail score qualite
 </p>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 <span className="font-semibold">
 {selectedQuality.grade} ({selectedQuality.score}/100)
 </span>{""}
 - points perdus: {selectedLostPoints}
 {selectedItem.contract?.metadata.placeType && (
 <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 cmm-text-caption cmm-text-secondary">
 Type: {selectedItem.contract.metadata.placeType}
 </span>
 )}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Facteurs:{""}
 {selectedQuality.flags.length > 0
 ? selectedQuality.flags.join(",")
 :"Aucun facteur critique."}
 </p>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 Action corrective recommandee: {correctiveAction}
 </p>
 {selectedOperational ? (
 <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide cmm-text-muted">
 Contexte métier
 </p>
 <div className="mt-2 flex flex-wrap gap-2">
 <span className="rounded-full bg-emerald-50 px-2 py-0.5 cmm-text-caption font-semibold text-emerald-800">
 {selectedOperational.placeTypeLabel}
 </span>
 <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-semibold cmm-text-secondary">
 {selectedOperational.routeStyleLabel}
 </span>
 <span className="rounded-full bg-sky-50 px-2 py-0.5 cmm-text-caption font-semibold text-sky-800">
 {selectedOperational.volunteersCount} bénévoles
 </span>
 <span className="rounded-full bg-indigo-50 px-2 py-0.5 cmm-text-caption font-semibold text-indigo-800">
 {selectedOperational.durationMinutes} min
 </span>
 <span className="rounded-full bg-amber-50 px-2 py-0.5 cmm-text-caption font-semibold text-amber-800">
 {selectedOperational.engagementHours} h-personnes
 </span>
 </div>
 {selectedOperational.routeAdjustmentMessage ? (
 <p className="mt-2 cmm-text-caption cmm-text-secondary">
 Ajustement trajet: {selectedOperational.routeAdjustmentMessage}
 </p>
 ) : null}
 </div>
 ) : null}
 </div>
 ) : null}

 {isLoading ? (
 <div className="mt-5 space-y-3">
 <div className="flex gap-4 border-b border-slate-200 pb-3 px-2">
 <CmmSkeleton className="h-4 w-16" />
 <CmmSkeleton className="h-4 w-24" />
 <CmmSkeleton className="h-4 w-32" />
 <CmmSkeleton className="h-4 w-20" />
 </div>
 {[...Array(5)].map((_, i) => (
 <div key={i} className="flex gap-4 px-2 items-center py-2 border-b border-slate-50">
 <CmmSkeleton className="h-4 w-16" />
 <CmmSkeleton className="h-4 w-24" />
 <CmmSkeleton className="h-4 w-48 flex-1" />
 <CmmSkeleton className="h-5 w-16 rounded-full" />
 <CmmSkeleton className="h-5 w-20 rounded-full" />
 </div>
 ))}
 </div>
 ) : null}

 {error ? (
 <p className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-small text-rose-700">
  {error instanceof Error ? error.message : "Impossible de charger l'historique des actions. Veuillez vérifier votre connexion ou rafraîchir la page."}
 </p>
 ) : null}

 {!isLoading && !error ? (
 <div className="mt-5 overflow-x-auto">
 <table className="min-w-full text-left cmm-text-small">
 <thead>
 <tr className="border-b border-slate-200 cmm-text-muted">
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
 className={`cursor-pointer border-b border-slate-100 cmm-text-secondary ${rowTone(quality?.grade ?? null)}`}
 onClick={() => setSelectedId(item.id)}
 >
 <td className="px-2 py-2">
 {formatDate(item.action_date)}
 </td>
 <td className="px-2 py-2">
 {item.actor_name ||"Anonyme"}
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
 <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-semibold uppercase tracking-wide cmm-text-secondary">
 {item.status}
 </span>
 </td>
 <td className="px-2 py-2">
 {quality ? (
 <div className="space-y-1">
 <span
 title={quality.flags.join(" |")}
 className={`inline-flex rounded-full border px-2 py-0.5 cmm-text-caption font-semibold ${qualityTone(quality.grade)}`}
 >
 {quality.grade} ({quality.score}/100)
 </span>
 <p className="max-w-48 truncate cmm-text-caption cmm-text-muted">
 {quality.flags[0]
 ? `Risque: ${quality.flags[0]}`
 :"Aucun risque majeur detecte"}
 </p>
 </div>
 ) : (
 <span className="cmm-text-caption cmm-text-muted">n/a</span>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>

 {filteredItems.length >= limit && (
 <div className="mt-6 flex justify-center border-t border-slate-100 pt-6">
 <button
 type="button"
 onClick={() => setLimit((prev) => prev + 25)}
 disabled={isValidating}
 className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 cmm-text-small font-bold cmm-text-secondary shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 active:translate-y-0 disabled:opacity-50"
 >
 {isValidating ? (
 <>
 <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
 Actualisation...
 </>
 ) : (
 <>
 <span>Afficher 25 de plus</span>
 <span className="text-slate-300 group-hover:text-emerald-400">↓</span>
 </>
 )}
 </button>
 </div>
 )}

  {filteredItems.length === 0 ? (
    <div className="mt-8 text-center space-y-3 p-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
      <p className="cmm-text-small font-medium cmm-text-secondary">
        Aucune action ne correspond à vos critères de recherche.
      </p>
      <p className="cmm-text-caption cmm-text-muted">
        Essayez d'élargir vos filtres ou déclarez une nouvelle action pour commencer à enrichir votre historique.
      </p>
    </div>
  ) : null}
 </div>
 ) : null}
 </section>
 );
}
