"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActionMapItem } from"@/lib/actions/types";
import {
 mapItemDrawing,
 mapItemLocationLabel,
 mapItemObservedAt,
 mapItemType,
} from"@/lib/actions/data-contract";
import { getGeometryPresentation } from "@/lib/actions/geometry/geometry-presentation";
import { classifyPollutionColor } from"@/components/actions/map-marker-categories";
import { useActionPollutionScoreReferences } from"./map/action-pollution-score-references-context";
import type { PollutionScoreScope } from "@/lib/actions/pollution/pollution-score";
import type { CurrentPlaceStateMode } from "@/lib/actions/pollution/current-place-state";

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
  selectedActionId?: string | null;
  onSelectAction?: (actionId: string) => void;
  scoreScope?: PollutionScoreScope;
  displayMode?: CurrentPlaceStateMode;
};

const ACTIONS_BATCH_SIZE = 4;

const POLLUTION_CATEGORY_LABELS = {
  blue: "Premier seuil",
  orange: "Moyen",
  red: "Fort",
  violet: "Critique",
  black: "Extrême",
  green: "Lieu propre",
  unavailable: "Indisponible",
} as const;

export function ActionsMapTable({
  items,
  compact = false,
  selectedActionId = null,
  onSelectAction,
  scoreScope = "global",
  displayMode = "projected_today",
}: ActionsMapTableProps) {
  const [isManuallyVisible, setIsManuallyVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ACTIONS_BATCH_SIZE);
  const selectedRowRef = useRef<HTMLTableRowElement | null>(null);
  const { references } = useActionPollutionScoreReferences();

 const orderedItems = useMemo(
 () =>
 [...items].sort((left, right) =>
 new Date(mapItemObservedAt(right)).getTime() -
 new Date(mapItemObservedAt(left)).getTime(),
 ),
 [items],
 );

  const selectedIndex = selectedActionId
    ? orderedItems.findIndex((item) => item.id === selectedActionId)
    : -1;
  const isSelectionPinned = selectedActionId !== null;
  const isVisible = isManuallyVisible || isSelectionPinned;
  const effectiveVisibleCount =
    selectedIndex >= 0 ? Math.max(visibleCount, selectedIndex + 1) : visibleCount;
  const visibleItems = orderedItems.slice(0, effectiveVisibleCount);
  const hasMore = effectiveVisibleCount < orderedItems.length;

  useEffect(() => {
    if (!isVisible || !selectedActionId) {
      return;
    }

    selectedRowRef.current?.scrollIntoView({
      block: "center",
      behavior:
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
    });
  }, [effectiveVisibleCount, isVisible, selectedActionId]);

  if (items.length === 0) {
    return (
      <section
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`rounded-2xl border border-sky-200/80 bg-sky-50/95 shadow-[0_18px_44px_-30px_rgba(14,165,233,0.16)] ${compact ? "p-4" : "p-6"}`}
      >
        <p className={compact ? "cmm-text-caption text-slate-700" : "cmm-text-small text-slate-700"}>
          Aucun point géolocalisé n&apos;a été enregistré sur cette période.
        </p>
      </section>
   );
  }

 return (
    <section
      className={`rounded-2xl border border-sky-200/80 bg-sky-50/95 shadow-[0_18px_44px_-30px_rgba(14,165,233,0.18)] ${compact ? "p-4" : "p-6"}`}
      aria-labelledby="actions-map-table-title"
    >
      <div className={`flex items-center justify-between ${compact ? "mb-3" : "mb-4"}`}>
        <h2
          id="actions-map-table-title"
          className={compact ? "text-lg font-semibold text-slate-950" : "text-xl font-semibold text-slate-950"}
        >
          Journal des actions
        </h2>
        <span
          className="rounded-full border border-sky-200/80 bg-white px-2.5 py-1 cmm-text-caption font-medium text-slate-700"
          aria-label={`${items.length} points dans le journal`}
        >
          {items.length} points
        </span>
      </div>

 {!isVisible ? (
 <div className="rounded-2xl border border-dashed border-sky-200/80 bg-white px-5 py-6">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div>
 <p className="cmm-text-small font-semibold text-slate-950">Journal caché</p>
 <p className="mt-1 cmm-text-small text-slate-700">
 Affiche les 4 plus récentes.
 </p>
 </div>
        <button
          type="button"
          onClick={() => {
            setIsManuallyVisible(true);
            setVisibleCount(ACTIONS_BATCH_SIZE);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-200/80 bg-sky-100 px-4 py-2.5 cmm-text-small font-semibold text-slate-950 transition hover:border-sky-300 hover:bg-sky-200"
        >
          <span aria-hidden="true">🗂️</span>
          Ouvrir le journal
        </button>
      </div>
    </div>
 ) : null}

{isVisible ? (
 <div className={compact ?"cmm-data-table-wrap max-h-[30rem] overflow-auto" :"cmm-data-table-wrap"}>
 <table className="cmm-data-table cmm-text-small" data-density={compact ? "compact" : undefined}>
 <caption className="sr-only">Journal des actions filtrées. Utilise le bouton d&apos;action de chaque ligne pour ouvrir la carte sur cette action.</caption>
 <thead>
 <tr>
 <th scope="col">Date</th>
 <th scope="col">Lieu</th>
 <th scope="col">Type</th>
 <th scope="col">Tracé</th>
 <th scope="col">Lecture</th>
 <th scope="col" className="cmm-data-table__end">Impact / Qualité</th>
 <th scope="col" className="cmm-data-table__end">Action</th>
 </tr>
 </thead>
 <tbody>
 {visibleItems.map((item: ActionMapItem) => {
 const drawing = mapItemDrawing(item);
 const geometry = getGeometryPresentation(item);
 const pollutionCategory = classifyPollutionColor(item, references, { scoreScope, displayMode });
 return (
          <tr
            key={item.id}
            ref={selectedActionId === item.id ? selectedRowRef : null}
            className={[
              "text-slate-700 transition-colors",
              selectedActionId === item.id ? "bg-sky-100 ring-1 ring-inset ring-sky-300/22" : "hover:bg-sky-100/70",
            ].join(" ")}
          >
            <td className="cmm-data-table__nowrap">
              {formatDate(mapItemObservedAt(item))}
            </td>
            <td className="font-medium">
              {mapItemLocationLabel(item)}
 </td>
 <td>
 <span className="rounded-full bg-slate-100 px-2 py-0.5 cmm-text-caption font-bold uppercase tracking-wide text-slate-700">
 {mapItemType(item) ==="clean_place"
 ?"lieu"
 : mapItemType(item) ==="spot"
 ?"spot"
 :"action"}
 </span>
 </td>
 <td>
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
 <span className="cmm-text-caption text-slate-500">Point discret</span>
 )}
 </td>
 <td>
 <span className="cmm-text-small font-medium text-slate-700">
 {POLLUTION_CATEGORY_LABELS[pollutionCategory]}
 </span>
 </td>
 <td className="cmm-data-table__end">
 <div className="flex justify-end gap-1">
 <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 cmm-text-caption font-bold text-emerald-800">
 {item.impact_level ?? "Indisponible"}
 </span>
 <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 cmm-text-caption font-bold text-slate-700">
 {item.quality_grade ?? "Non évalué"}
 </span>
 </div>
 </td>
 <td className="cmm-data-table__end">
   {onSelectAction ? (
     <button
       type="button"
       onClick={() => onSelectAction(item.id)}
       className="rounded-xl border border-sky-200/80 bg-sky-100 px-3 py-2 cmm-text-small font-semibold text-slate-950 transition hover:border-sky-300 hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
       aria-label={`Ouvrir le détail de ${mapItemLocationLabel(item)}`}
     >
       Ouvrir
     </button>
   ) : null}
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
 <p className="cmm-text-caption text-slate-700">
 {visibleItems.length} action{visibleItems.length > 1 ?"s" :""} sur {orderedItems.length}
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
 className="rounded-2xl border border-sky-200/80 bg-sky-100 px-4 py-2 cmm-text-small font-semibold text-slate-950 transition hover:border-sky-300 hover:bg-sky-200"
 >
 Afficher plus
 </button>
 ) : null}
 {isSelectionPinned ? (
   <span className="inline-flex items-center rounded-2xl border border-sky-200/80 bg-white px-4 py-2 cmm-text-small font-semibold text-slate-700">
     Sélection active
   </span>
 ) : (
 <button
 type="button"
 onClick={() => {
 setIsManuallyVisible(false);
 setVisibleCount(ACTIONS_BATCH_SIZE);
 }}
 className="rounded-2xl border border-sky-200/80 bg-sky-100 px-4 py-2 cmm-text-small font-semibold text-slate-950 transition hover:border-sky-300 hover:bg-sky-200"
 >
 Masquer le journal
 </button>
 )}
 </div>
 </div>
 ) : null}
 </section>
 );
}
