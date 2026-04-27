"use client";

import { useMemo, useState } from"react";
import useSWR from"swr";
import { fetchActions } from"@/lib/actions/http";
import { computeClimateContext } from"@/lib/analytics/climate-context";
import { formatDeltaLine, formatDateTimeShort } from"@/components/sections/rubriques/helpers";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";



export function ClimateSection() {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(30);
 const { data, isLoading, error } = useSWR(["section-climate"], () =>
 fetchActions({ status:"approved", limit: 320 }),
 );

 const context = useMemo(() => {
 const records = (data?.items ?? []).map((item) => ({
 observedAt: item.action_date,
 wasteKg: Number(item.waste_kg || 0),
 cigaretteButts: Number(item.cigarette_butts || 0),
 durationMinutes: Number(item.duration_minutes || 0),
 volunteersCount: Number(item.volunteers_count || 0),
 latitude: item.latitude === null ? null : Number(item.latitude),
 longitude: item.longitude === null ? null : Number(item.longitude),
 plasticKg: null,
 }));
 return computeClimateContext({ records, periodDays });
 }, [data?.items, periodDays]);

 const summaryKpis = useMemo(() => {
 const current = context.comparison.current;
 const previous = context.comparison.previous;
 return [
 {
 label:"Volume collecte",
 value: `${current.volumeKg.toFixed(1)} kg`,
 delta: formatDeltaLine(current.volumeKg, previous.volumeKg,"kg"),
 },
 {
 label:"Heures citoyennes",
 value: `${current.citizenHours.toFixed(1)} h`,
 delta: formatDeltaLine(
 current.citizenHours,
 previous.citizenHours,
"h",
 ),
 },
 {
 label:"Taux géocouverture",
 value: `${current.geocoverageRate.toFixed(1)}%`,
 delta: formatDeltaLine(
 current.geocoverageRate,
 previous.geocoverageRate,
"pts",
 ),
 },
 ];
 }, [context]);

 const firstDecision = context.weeklyDecisions[0];
 const priorityIndicator = [...context.indicators].sort((a, b) => {
 const rank = { eleve: 3, moyen: 2, faible: 1 } as const;
 return rank[a.confidence] - rank[b.confidence];
 })[0];

 return (
 <div className="space-y-4">
 <CmmCard tone="emerald" size="md" className="cmm-text-small cmm-text-primary">
 {fr
 ?"Cette rubrique vulgarise les rapports scientifiques récents, les objectifs de développement durable (ODD) et les limites planétaires. Elle relie l'impact des actions locales de dépollution aux enjeux climatiques pour aider bénévoles, associations, commerçants et entreprises à orienter leurs choix quotidiens."
 :"This section translates recent scientific reports, the Sustainable Development Goals (SDGs) and planetary boundaries. It links local cleanup impact to climate issues to help volunteers, associations, businesses and companies guide daily choices."}
 </CmmCard>

 {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2.5fr] gap-8 items-start">
          <div className="space-y-4">
            <CmmSkeleton className="h-48 w-full rounded-xl" />
            <CmmSkeleton className="h-[300px] w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="grid gap-3 grid-cols-2">
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
              <CmmSkeleton className="h-24 rounded-xl" />
            </div>
            <CmmSkeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      ) : null}
 {error ? (
 <p className="cmm-text-small text-danger">Indicateurs indisponibles.</p>
 ) : null}
 {!isLoading && !error ? (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
 {/* GAUCHE : Résumé décisionnel + Alertes */}
 <div className="space-y-4">
 <CmmCard tone="slate" size="md">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 {fr ?"Résumé décisionnel" :"Decision summary"} ({periodDays === 365 ? (fr ?"12 mois" :"12 months") : `${periodDays} ${fr ?"jours" :"days"}`})
 </h3>
 <div className="flex flex-wrap gap-2">
 {[30, 90, 365].map((value) => (
 <button
 key={`climate-${value}`}
 onClick={() => setPeriodDays(value as 30 | 90 | 365)}
 className={`rounded-lg border px-4 py-3 min-h-[44px] cmm-text-small font-semibold transition ${
 periodDays === value
 ?"border-emerald-300 bg-emerald-50 cmm-text-primary"
 :"border-slate-300 bg-white cmm-text-secondary hover:bg-slate-50"
 }`}
 >
 {value === 365 ? (fr ?"12 mois" :"12 months") : `${value} ${fr ?"jours" :"days"}`}
 </button>
 ))}
 </div>
 </div>
 <div className="mt-3 grid gap-3 grid-cols-3">
 {summaryKpis.map((kpi) => (
 <div key={kpi.label} className="rounded-lg border border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/50 dark:border-slate-700/80 p-3">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">{kpi.label}</p>
 <p className="mt-1 text-xl font-semibold cmm-text-primary">{kpi.value}</p>
 <p className={`mt-1 cmm-text-caption font-semibold ${kpi.delta.tone}`}>{kpi.delta.text} vs préc.</p>
 </div>
 ))}
 </div>
 <div className="mt-3 grid gap-3 md:grid-cols-2">
 <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/60 dark:border-amber-800/80 p-3 cmm-text-small cmm-text-primary">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide">{fr ?"Alerte prioritaire" :"Priority alert"}</p>
 <p className="mt-1">
 {fr ?"Signal à consolider sur" :"Signal to validate on"}{""}
 <span className="font-semibold">{priorityIndicator.label}</span>.
 </p>
 </div>
 <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 dark:bg-emerald-950/60 dark:border-emerald-800/80 p-3 cmm-text-small cmm-text-primary">
 <p className="cmm-text-caption font-semibold uppercase tracking-wide">{fr ?"Action recommandée" :"Recommended action"}</p>
 <p className="mt-1 font-semibold">{firstDecision?.decision ??"Consolider la qualité des données terrain."}</p>
 </div>
 </div>
 <p className="mt-3 cmm-text-caption cmm-text-muted">
 Modèle proxy {context.modelVersion} · recalcul {formatDateTimeShort(context.generatedAt)}
 </p>
 </CmmCard>

 <details className="rounded-2xl border border-slate-200/80 bg-white/90 dark:bg-slate-800/90 dark:border-slate-700/80 shadow-sm p-5 backdrop-blur-sm">
 <summary className="cursor-pointer cmm-text-small font-semibold cmm-text-primary">
 {fr ?"Méthodologie" :"Methodology"}
 </summary>
 <div className="mt-3 space-y-4">
 <p className="cmm-text-small cmm-text-secondary">
 Modèle proxy {context.modelVersion} · recalcul{""}
 {formatDateTimeShort(context.generatedAt)}
 </p>
 <div>
 <h3 className="cmm-text-small font-semibold cmm-text-primary">{fr ?"Méthodes" :"Methods"}</h3>
 <ul className="mt-2 space-y-2 cmm-text-small cmm-text-secondary">
 {context.methods.map((method) => (
 <li key={method.metric} className="rounded-lg border border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/50 dark:border-slate-700/80 p-2">
 <p className="font-semibold cmm-text-primary">{method.metric}</p>
 <p>Formule: {method.formula}</p>
 <p className="cmm-text-caption cmm-text-muted">Source: {method.source}</p>
 </li>
 ))}
 </ul>
 </div>
 <div>
 <h3 className="cmm-text-small font-semibold cmm-text-primary">{fr ?"Limites d'interprétation" :"Reading limits"}</h3>
 <ul className="mt-2 list-disc space-y-1 pl-5 cmm-text-small cmm-text-secondary">
 {context.interpretationLimits.map((limit) => (
 <li key={limit}>{limit}</li>
 ))}
 </ul>
 </div>
 </div>
 </details>
 </div>

 {/* DROITE : Indicateurs détaillés + Décisions */}
 <div className="space-y-4">
 <div className="grid gap-3 grid-cols-2">
 {context.indicators.map((indicator) => {
 const previousValue =
 indicator.id ==="volume" ? context.comparison.previous.volumeKg :
 indicator.id ==="butts" ? context.comparison.previous.butts :
 indicator.id ==="hours" ? context.comparison.previous.citizenHours :
 indicator.id ==="co2_proxy" ? context.comparison.previous.co2ProxyKg :
 indicator.id ==="plastic_leakage_proxy" ? context.comparison.previous.plasticLeakageProxyKg :
 context.comparison.previous.geocoverageRate;
 const delta = formatDeltaLine(indicator.value, previousValue, indicator.unit);
 return (
 <CmmCard key={indicator.id} tone="slate" size="sm" className="p-4">
 <div className="flex items-center justify-between gap-2">
 <p className="cmm-text-caption uppercase tracking-wide cmm-text-muted">{indicator.label}</p>
 </div>
 <p className="mt-1 text-2xl font-semibold cmm-text-primary">
 {indicator.value.toFixed(indicator.unit ==="u" ? 0 : 1)} {indicator.unit}
 </p>
 <p className={`mt-1 cmm-text-caption font-semibold ${delta.tone}`}>{delta.text} vs préc.</p>
 </CmmCard>
 );
 })}
 </div>

 <CmmCard tone="slate" size="md">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">{fr ?"Décisions de la semaine" :"Weekly decisions"}</h3>
 <ul className="mt-2 space-y-2 cmm-text-small cmm-text-secondary">
 {context.weeklyDecisions.map((decision) => (
 <li key={decision.decision} className="rounded-lg border border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/50 dark:border-slate-700/80 p-2">
 <p className="font-semibold cmm-text-primary">{decision.decision}</p>
 <p className="mt-1 cmm-text-caption">{decision.rationale}</p>
 </li>
 ))}
 </ul>
 </CmmCard>
 </div>
 </div>
 ) : null}
 </div>
 );
}

