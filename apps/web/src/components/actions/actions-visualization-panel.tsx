"use client";

import { useMemo } from"react";
import useSWR from"swr";
import { fetchMapActions } from"@/lib/actions/http";
import { extractArrondissement, monthKey } from"@/components/sections/rubriques/helpers";
import type { ActionImpactLevel, ActionStatus } from"@/lib/actions/types";
import {
 DEFAULT_VISIBLE_CATEGORIES,
 isVisibleWithCategoryFilter,
 type MarkerCategory,
} from"@/components/actions/map-marker-categories";

type ZoneStats = {
 zone: string;
 actions: number;
 wasteKg: number;
 butts: number;
};

type ActionsVisualizationPanelProps = {
 days: number;
 status: ActionStatus |"all";
 impact?: ActionImpactLevel |"all";
 qualityMin?: number;
 visibleCategories?: Record<MarkerCategory, boolean>;
 compact?: boolean;
};

type ImpactLevel ="faible" |"moyen" |"fort" |"critique";
const IMPACT_LEVELS: ImpactLevel[] = ["faible","moyen","fort","critique"];

export function ActionsVisualizationPanel({
 days,
 status,
 impact ="all",
 qualityMin = 0,
 visibleCategories = DEFAULT_VISIBLE_CATEGORIES,
 compact = false,
}: ActionsVisualizationPanelProps) {
 const mapQuery = useSWR(
 ["visualization-map", String(days), status, impact, String(qualityMin)],
 () =>
 fetchMapActions({
 status,
 days,
 impact: impact ==="all" ? undefined : impact,
 qualityMin: qualityMin > 0 ? qualityMin : undefined,
 limit: 300,
 types:"all",
 }),
 );

 const loading = mapQuery.isLoading;
 const error = mapQuery.error;

 const model = useMemo(() => {
 const mapItems = (mapQuery.data?.items ?? []).filter((item) =>
 isVisibleWithCategoryFilter(item, visibleCategories),
 );

 let wasteKg = 0;
 let butts = 0;
 let geolocated = 0;
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
 citizenHours +=
 (volunteersCount * Math.max(0, durationMinutes)) / 60;
 if (item.latitude !== null && item.longitude !== null) {
 geolocated += 1;
 }

 const level =
 item.impact_level && IMPACT_LEVELS.includes(item.impact_level as ImpactLevel)
 ? (item.impact_level as ImpactLevel)
 :"faible";
 impacts.set(level, (impacts.get(level) ?? 0) + 1);

 const zone = extractArrondissement(item.location_label ||"");
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
 const maxImpact = impactRows.reduce((acc, row) => Math.max(acc, row.count), 1);

 return {
 totals: {
 actions: mapItems.length,
 wasteKg,
 butts,
 volunteers,
 citizenHours,
 geocoveragePct:
 mapItems.length > 0 ? Math.round((geolocated / mapItems.length) * 100) : 0,
 },
 zoneRows,
 monthRows,
 impactRows,
 maxMonth,
 maxImpact,
 };
 }, [mapQuery.data?.items, visibleCategories]);

 return (
 <div className={compact ?"space-y-3" :"space-y-4"}>
 <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ?"p-0" :"p-1"}`}>
 <div>
 <h2 className={compact ?"text-lg font-semibold cmm-text-primary" :"text-xl font-semibold cmm-text-primary"}>
 Graphiques et tableaux dynamiques
 </h2>
 <p className={compact ?"cmm-text-caption cmm-text-secondary" :"cmm-text-small cmm-text-secondary"}>
 Lecture consolidée (échantillon live API).
 </p>
 </div>
 </div>

 {loading ? (
 <p className={compact ?"cmm-text-caption cmm-text-muted" :"cmm-text-small cmm-text-muted"}>Chargement des indicateurs dynamiques...</p>
 ) : null}
 {error ? (
 <p className={compact ?"cmm-text-caption text-rose-700" :"cmm-text-small text-rose-700"}>Indicateurs dynamiques indisponibles.</p>
 ) : null}

 {!loading && !error ? (
 <>
 {/* Les compteurs globaux ont ete remontes dans le Dashboard Global, 
 mais on garde ici les graphiques specifiques. */}
 <div className="grid gap-4 lg:grid-cols-2">
    <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <h3 className={compact ? "cmm-text-caption font-semibold cmm-text-primary" : "cmm-text-small font-semibold cmm-text-primary"}>
        Tendance mensuelle (Actions)
      </h3>
      <div className="mt-4 relative h-32 w-full">
        {model.monthRows.length > 1 ? (
          <svg className="h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
            <defs>
              <linearGradient id="gradient-curve" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 40 ${model.monthRows.map((row, i) => 
                `L ${(i / (model.monthRows.length - 1)) * 100} ${40 - (row.actions / model.maxMonth) * 35}`
              ).join(" ")} L 100 40 Z`}
              fill="url(#gradient-curve)"
            />
            <path
              d={model.monthRows.map((row, i) => 
                `${i === 0 ? "M" : "L"} ${(i / (model.monthRows.length - 1)) * 100} ${40 - (row.actions / model.maxMonth) * 35}`
              ).join(" ")}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center cmm-text-caption cmm-text-muted italic">
            Données insuffisantes
          </div>
        )}
        <div className="mt-2 flex justify-between px-1">
          {model.monthRows.map((row) => (
            <span key={row.label} className="text-[9px] font-medium uppercase tracking-tighter cmm-text-muted">
              {row.label.split("-")[1]}
            </span>
          ))}
        </div>
      </div>
    </article>

    <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <h3 className={compact ? "cmm-text-caption font-semibold cmm-text-primary" : "cmm-text-small font-semibold cmm-text-primary"}>
        Profil d&apos;impact terrain
      </h3>
      <div className="mt-4 flex h-32 items-center justify-center gap-6">
        <div className="relative h-24 w-24 shrink-0">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 32 32">
            {model.impactRows.map((row, i) => {
              const total = model.impactRows.reduce((acc, r) => acc + r.count, 0) || 1;
              const prevTotal = model.impactRows.slice(0, i).reduce((acc, r) => acc + r.count, 0);
              const percentage = (row.count / total) * 100;
              const strokeDasharray = `${percentage} ${100 - percentage}`;
              const strokeDashoffset = -((prevTotal / total) * 100);
              
              const colors = {
                critique: "#e11d48",
                fort: "#d97706",
                moyen: "#0284c7",
                faible: "#059669"
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
                />
              );
            })}
            <circle cx="16" cy="16" r="10" fill="white" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold cmm-text-primary">{model.totals.actions}</span>
            <span className="text-[8px] uppercase tracking-tighter cmm-text-muted">Pts</span>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-1.5 overflow-hidden">
          {model.impactRows.map((row) => (
            <div key={row.level} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full shrink-0 ${
                row.level === "critique" ? "bg-rose-600" :
                row.level === "fort" ? "bg-amber-600" :
                row.level === "moyen" ? "bg-sky-600" : "bg-emerald-600"
              }`} />
              <span className="cmm-text-caption truncate cmm-text-secondary capitalize">
                {row.level}: <span className="font-bold">{row.count}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </article>
 </div>

    <article className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? "p-3" : "p-4"}`}>
      <h3 className={compact ? "cmm-text-caption font-semibold cmm-text-primary" : "cmm-text-small font-semibold cmm-text-primary"}>
        Volume par zone (Top zones)
      </h3>
      <div className="mt-4 space-y-3">
        {model.zoneRows.length > 0 ? (
          model.zoneRows.slice(0, 6).map((row) => {
            const maxActions = Math.max(...model.zoneRows.map(r => r.actions)) || 1;
            const percentage = (row.actions / maxActions) * 100;
            
            return (
              <div key={row.zone} className="group">
                <div className="flex items-center justify-between cmm-text-caption mb-1">
                  <span className="font-medium cmm-text-primary truncate max-w-[140px]">{row.zone}</span>
                  <span className="cmm-text-secondary font-bold">{row.actions} <span className="font-normal opacity-60">act.</span></span>
                </div>
                <div className="relative h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700 group-hover:bg-emerald-400"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="mt-1 flex gap-3 text-[9px] cmm-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Waste: <strong>{row.wasteKg.toFixed(1)}kg</strong></span>
                  <span>Butts: <strong>{Math.round(row.butts)}</strong></span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center cmm-text-caption cmm-text-muted italic">
            Aucune donnée de zone
          </div>
        )}
      </div>
    </article>
 </>
 ) : null}
 </div>
 );
}
