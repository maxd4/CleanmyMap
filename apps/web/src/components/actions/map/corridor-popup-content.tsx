"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Calendar, Clock, Route, Sparkles, Users } from "lucide-react";
import type { ActionMapItem } from "@/lib/actions/types";
import type { CorridorHistory } from "@/lib/actions/corridor-history";
import { summarizeCorridorHistory } from "@/lib/actions/corridor-history";
import { mapItemObservedAt } from "@/lib/actions/data-contract";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";
import {
  formatNumber,
  formatObservedDate,
} from "./action-popup-content.helpers";
import { formatProjectionConfidenceLabel } from "@/lib/actions/projection-confidence";
import { formatScorePercent } from "@/lib/formatters/score";

type CorridorPopupContentProps = {
  corridorItems: readonly ActionMapItem[];
  corridorHistory: CorridorHistory;
  color: string;
  renderAction: (item: ActionMapItem) => ReactNode;
};

export function CorridorPopupContent({
  corridorItems,
  corridorHistory,
  color,
  renderAction,
}: CorridorPopupContentProps) {
  const [activeTab, setActiveTab] = useState(0);
  const { references } = useActionPollutionScoreReferences();
  const summary = useMemo(
    () => summarizeCorridorHistory(corridorHistory, { references }),
    [corridorHistory, references],
  );
  const activeItem = corridorItems[activeTab] ?? corridorItems[0];

  if (!activeItem) {
    return null;
  }

  return (
    <div className="min-w-[300px] max-w-[380px] overflow-hidden rounded-3xl border border-slate-200/70 bg-white/95 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/95">
      <div className="space-y-4 border-b border-slate-200/80 p-5 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Route size={16} style={{ color }} aria-hidden="true" />
              <span className="cmm-text-caption font-black uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
                Parcours récurrent
              </span>
            </div>
            <h3 className="cmm-text-body font-bold leading-tight text-slate-950 dark:text-slate-50">
              {summary.label}
            </h3>
          </div>
          <span className="shrink-0 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-black text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300">
            {summary.actionCount} actions
          </span>
        </div>

        <div
          className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="Actions du parcours récurrent"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 0}
            aria-controls="corridor-panel-summary"
            id="corridor-tab-summary"
            onClick={() => setActiveTab(0)}
            className={[
              "shrink-0 rounded-full px-3 py-2 text-[11px] font-black transition-colors",
              activeTab === 0
                ? "bg-sky-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300",
            ].join(" ")}
          >
            Synthèse
          </button>
          {corridorItems.map((item, index) => {
            const tabIndex = index + 1;
            const label = `Action · ${formatObservedDate(mapItemObservedAt(item))}`;
            return (
              <button
                type="button"
                role="tab"
                key={item.id}
                aria-selected={activeTab === tabIndex}
                aria-controls={`corridor-panel-${item.id}`}
                id={`corridor-tab-${item.id}`}
                onClick={() => setActiveTab(tabIndex)}
                className={[
                  "shrink-0 rounded-full px-3 py-2 text-[11px] font-black transition-colors",
                  activeTab === tabIndex
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300",
                ].join(" ")}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 0 ? (
        <div
          id="corridor-panel-summary"
          role="tabpanel"
          aria-labelledby="corridor-tab-summary"
          className="space-y-4 p-5"
        >
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800">
            <SummaryMetric
              icon={<Calendar size={13} />}
              label="Période"
              value={`${formatObservedDate(summary.firstActionAt)} → ${formatObservedDate(summary.lastActionAt)}`}
            />
            <SummaryMetric
              icon={<Clock size={13} />}
              label="Dernière action"
              value={formatObservedDate(summary.lastActionAt)}
            />
            <SummaryMetric
              icon={<Sparkles size={13} />}
              label="Déchets / mégots"
              value={`${formatNumber(summary.totalWasteKg, " kg")} · ${formatNumber(summary.totalCigaretteButts)}`}
            />
            <SummaryMetric
              icon={<Users size={13} />}
              label="Bénévoles / heures"
              value={`${formatNumber(summary.totalVolunteers)} · ${formatNumber(summary.totalEngagementHours, " h-p")}`}
            />
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/50">
            <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-slate-500">
              Évolution des scores observés
            </p>
            {summary.scoreEvolution ? (
              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                {formatScorePercent(summary.scoreEvolution.first)} → {formatScorePercent(summary.scoreEvolution.latest)}
                <span className="ml-2 text-xs font-semibold text-slate-500">
                  ({summary.scoreEvolution.delta >= 0 ? "+" : ""}
                  {summary.scoreEvolution.delta})
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                Données insuffisantes pour comparer les scores.
              </p>
            )}
          </div>

          {summary.latestProjection && (
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/25">
              <p className="cmm-text-caption font-black uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                État / projection courant
              </p>
              <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                Pollution projetée : {formatScorePercent(Math.round(summary.latestProjection.projectedScore))}
              </p>
              <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-200">
                {summary.latestProjection.elapsedDays} j depuis la dernière action · estimation, pas une mesure en temps réel
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {formatProjectionConfidenceLabel(
                  summary.latestProjection.projectionConfidence.level,
                )}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          id={`corridor-panel-${activeItem.id}`}
          role="tabpanel"
          aria-labelledby={`corridor-tab-${activeItem.id}`}
        >
          {renderAction(activeItem)}
        </div>
      )}
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1 bg-white p-3 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-slate-500">
        {icon}
        <span className="cmm-text-caption font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-bold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  );
}
