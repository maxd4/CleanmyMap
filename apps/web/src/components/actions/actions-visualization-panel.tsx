"use client";

import { useId, useMemo } from "react";
import useSWR from "swr";
import { fetchMapActions } from "@/lib/actions/http";
import { extractArrondissement, monthKey } from "@/components/sections/rubriques/helpers";
import type { ActionImpactLevel, ActionStatus } from "@/lib/actions/types";
import {
  DEFAULT_VISIBLE_CATEGORIES,
  isVisibleWithCategoryFilter,
  type MarkerCategory,
} from "@/components/actions/map-marker-categories";
import { cn } from "@/lib/utils";

type ZoneStats = {
  zone: string;
  actions: number;
  wasteKg: number;
  butts: number;
};

type ActionsVisualizationPanelProps = {
  days: number;
  status: ActionStatus | "all";
  impact?: ActionImpactLevel | "all";
  qualityMin?: number;
  visibleCategories?: Record<MarkerCategory, boolean>;
  compact?: boolean;
};

type ImpactLevel = "faible" | "moyen" | "fort" | "critique";
const IMPACT_LEVELS: ImpactLevel[] = ["faible", "moyen", "fort", "critique"];

export function ActionsVisualizationPanel({
  days,
  status,
  impact = "all",
  qualityMin = 0,
  visibleCategories = DEFAULT_VISIBLE_CATEGORIES,
  compact = false,
}: ActionsVisualizationPanelProps) {
  const gradientId = useId();
  const mapQuery = useSWR(
    ["visualization-map", String(days), status, impact, String(qualityMin)],
    () =>
      fetchMapActions({
        status,
        days,
        impact: impact === "all" ? undefined : impact,
        qualityMin: qualityMin > 0 ? qualityMin : undefined,
        limit: 300,
        types: "all",
      }),
  );

  const model = useMemo(() => {
    const mapItems = (mapQuery.data?.items ?? []).filter((item) =>
      isVisibleWithCategoryFilter(item, visibleCategories),
    );

    let wasteKg = 0;
    let butts = 0;
    let volunteers = 0;
    let citizenHours = 0;
    const impacts = new Map<ImpactLevel, number>();
    const byZone = new Map<string, ZoneStats>();
    const byMonth = new Map<string, number>();

    for (const level of IMPACT_LEVELS) {
      impacts.set(level, 0);
    }

    for (const item of mapItems) {
      wasteKg += Number(item.waste_kg || 0);
      butts += Number(item.cigarette_butts || 0);
      const volunteersCount = Number(item.contract?.metadata.volunteersCount || 0);
      const durationMinutes = Number(item.contract?.metadata.durationMinutes || 0);
      volunteers += volunteersCount;
      citizenHours += (volunteersCount * Math.max(0, durationMinutes)) / 60;

      const level =
        item.impact_level && IMPACT_LEVELS.includes(item.impact_level as ImpactLevel)
          ? (item.impact_level as ImpactLevel)
          : "faible";
      impacts.set(level, (impacts.get(level) ?? 0) + 1);

      const zone = extractArrondissement(item.location_label || "");
      const current = byZone.get(zone) ?? { zone, actions: 0, wasteKg: 0, butts: 0 };
      current.actions += 1;
      current.wasteKg += Number(item.waste_kg || 0);
      current.butts += Number(item.cigarette_butts || 0);
      byZone.set(zone, current);

      const month = monthKey(item.action_date);
      byMonth.set(month, (byMonth.get(month) ?? 0) + 1);
    }

    const zoneRows = [...byZone.values()]
      .sort((a, b) => b.actions - a.actions || b.wasteKg - a.wasteKg)
      .slice(0, 8);

    const monthRows = [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([label, actions]) => ({ label, actions }));

    const impactRows = IMPACT_LEVELS.map((level) => ({
      level,
      count: impacts.get(level) ?? 0,
    }));

    const maxMonth = monthRows.reduce((acc, row) => Math.max(acc, row.actions), 1);
    return {
      totals: {
        actions: mapItems.length,
        wasteKg,
        butts,
        volunteers,
        citizenHours,
      },
      zoneRows,
      monthRows,
      impactRows,
      maxMonth,
    };
  }, [mapQuery.data?.items, visibleCategories]);

  const loading = mapQuery.isLoading;
  const error = mapQuery.error;
  const mainClass = compact ? "space-y-6" : "space-y-8";

  return (
    <div className={mainClass}>
      <div className={cn("flex flex-wrap items-center justify-between gap-4", compact ? "px-2" : "px-4")}>
        <div className="space-y-1">
          <h2 className="cmm-text-caption font-semibold tracking-[0.14em] text-cyan-700">Lecture spatiale</h2>
          <p className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-600">Flux cockpit en temps réel</p>
        </div>
      </div>

      {loading && (
        <div className="flex h-48 items-center justify-center rounded-[2rem] bg-white border border-dashed border-cyan-200/80">
          <p className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-600 animate-pulse">Synchronisation...</p>
        </div>
      )}

      {error && (
        <div className="p-8 rounded-[2rem] bg-rose-50 border border-rose-200/70 text-center">
          <p className="cmm-text-caption font-semibold tracking-[0.12em] text-rose-700">Flux momentanément interrompu</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[2.5rem] border border-cyan-200/80 bg-white p-8 relative overflow-hidden group hover:bg-cyan-50 transition-all duration-500">
              <div className="flex items-center justify-between gap-4 mb-8">
                <h3 className="cmm-text-caption font-semibold tracking-[0.14em] text-slate-600">Tendance mensuelle</h3>
                <span className="cmm-text-caption font-semibold tracking-[0.12em] text-cyan-700">{model.totals.actions} actions visibles</span>
              </div>

              <div className="relative h-40 w-full mt-4">
                {model.monthRows.length > 1 ? (
                  <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <defs>
                      <linearGradient id={`gradient-curve-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d={`M 0 40 ${model.monthRows
                        .map(
                          (row, i) =>
                            `L ${(i / (model.monthRows.length - 1)) * 100} ${40 - (row.actions / model.maxMonth) * 35}`,
                        )
                        .join(" ")} L 100 40 Z`}
                      fill={`url(#gradient-curve-${gradientId})`}
                    />
                    <path
                      d={model.monthRows
                        .map(
                          (row, i) =>
                            `${i === 0 ? "M" : "L"} ${(i / (model.monthRows.length - 1)) * 100} ${
                              40 - (row.actions / model.maxMonth) * 35
                            }`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <div className="flex h-full items-center justify-center cmm-text-caption font-semibold tracking-[0.12em] text-slate-500">Data low</div>
                )}
                <div className="mt-6 flex justify-between px-1">
                  {model.monthRows.map((row) => (
                    <span key={row.label} className="cmm-text-caption font-semibold tracking-[0.08em] text-slate-500">
                      {row.label.split("-")[1]}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article className="rounded-[2.5rem] border border-cyan-200/80 bg-white p-8 group hover:bg-cyan-50 transition-all duration-500">
              <h3 className="cmm-text-caption mb-8 font-semibold tracking-[0.14em] text-slate-600">Profil d&apos;impact</h3>
              <div className="flex items-center justify-center gap-10 h-40">
                <div className="relative h-32 w-32 shrink-0">
                  <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 32 32">
                    {model.impactRows.map((row, i) => {
                      const total = model.impactRows.reduce((acc, r) => acc + r.count, 0) || 1;
                      const previous = model.impactRows.slice(0, i).reduce((acc, r) => acc + r.count, 0);
                      const percentage = (row.count / total) * 100;
                      const strokeDasharray = `${percentage} ${100 - percentage}`;
                      const strokeDashoffset = -((previous / total) * 100);

                      const colors = {
                        critique: "#f43f5e",
                        fort: "#f59e0b",
                        moyen: "#38bdf8",
                        faible: "#10b981",
                      };

                      return (
                        <circle
                          key={row.level}
                          cx="16"
                          cy="16"
                          r="14"
                          fill="none"
                          stroke={colors[row.level as keyof typeof colors]}
                          strokeWidth="4"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                          className="transition-all duration-1000"
                        />
                      );
                    })}
                    <circle cx="16" cy="16" r="10" fill="rgba(255,255,255,0.65)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-slate-950 leading-none">{model.totals.actions}</span>
                    <span className="cmm-text-caption mt-1 font-semibold tracking-[0.12em] text-slate-500">Total</span>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-2.5">
                  {model.impactRows.map((row) => (
                    <div key={row.level} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          row.level === "critique" ? "bg-rose-500" :
                          row.level === "fort" ? "bg-amber-500" :
                          row.level === "moyen" ? "bg-sky-500" : "bg-emerald-500"
                        )}
                      />
                      <span className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-600">
                        {row.level} • <span className="text-slate-950">{row.count}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>

          <article className="rounded-[2.5rem] border border-cyan-200/80 bg-white p-8 group hover:bg-cyan-50 transition-all duration-500">
            <div className="flex items-center justify-between gap-4 mb-8">
              <h3 className="cmm-text-caption font-semibold tracking-[0.14em] text-slate-600">Volume par zone</h3>
            </div>

            <div className="space-y-6">
              {model.zoneRows.length > 0 ? (
                model.zoneRows.slice(0, 6).map((row) => {
                  const maxActions = Math.max(...model.zoneRows.map((entry) => entry.actions)) || 1;
                  const percentage = (row.actions / maxActions) * 100;

                  return (
                    <div key={row.zone} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold tracking-[-0.01em] text-slate-950">{row.zone}</span>
                        <span className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-600">
                          {row.actions} Actions • {row.wasteKg.toFixed(1)}kg
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-cyan-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300 transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center">
                  <p className="cmm-text-caption font-semibold tracking-[0.12em] text-slate-500">Aucune zone détectée</p>
                </div>
              )}
            </div>
          </article>
        </>
      )}
    </div>
  );
}
