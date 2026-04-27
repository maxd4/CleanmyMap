"use client";

import Link from"next/link";
import { useMemo, useState } from"react";
import useSWR from"swr";
import { KpiMethodBlock } from"@/components/pilotage/kpi-method-block";
import { ThirtySecondsSummary } from"@/components/pilotage/thirty-seconds-summary";
import { PRIORITIZATION_RULESET } from"@/lib/pilotage/constants";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmSkeleton } from "@/components/ui/cmm-skeleton";
import { CmmCard } from "@/components/ui/cmm-card";

type PilotageOverviewResponse = {
 status:"ok";
 generatedAt: string;
 periodDays: number;
 summary: {
 kpis: Array<{
 label: string;
 value: string;
 previousValue: string;
 deltaAbsolute: string;
 deltaPercent: string;
 interpretation:"positive" |"negative" |"neutral";
 }>;
 alert: {
 severity:"critical" |"high" |"medium" |"low";
 title: string;
 detail: string;
 };
 recommendedAction: { href: string; label: string; reason: string };
 };
 priorities: Array<{
 id: string;
 title: string;
 severity:"critical" |"high" |"medium" |"low";
 score: number;
 reason: string;
 impactEstimate: string;
 suggestedOwner: string;
 recommendedAction: { href: string; label: string };
 evidence: string[];
 engineVersion: string;
 }>;
 methods: Array<{
 id: string;
 kpi: string;
 formula: string;
 source: string;
 recalc: string;
 limits: string;
 }>;
 zones: Array<{
 area: string;
 currentActions: number;
 previousActions: number;
 deltaActionsAbsolute: number;
 currentKg: number;
 previousKg: number;
 deltaKgAbsolute: number;
 deltaActionsPercent: number;
 deltaKgPercent: number;
 currentCoverageRate: number;
 previousCoverageRate: number;
 deltaCoverageRateAbsolute: number;
 deltaCoverageRatePercent: number;
 currentModerationDelayDays: number;
 previousModerationDelayDays: number;
 deltaModerationDelayDaysAbsolute: number;
 deltaModerationDelayDaysPercent: number;
 normalizedScore: number;
 urgency:"critique" |"elevee" |"moderee";
 justification: string;
 recommendedAction: string;
 }>;
};

const fetchOverview = async (
 url: string,
): Promise<PilotageOverviewResponse> => {
 const response = await fetch(url, { method:"GET", cache:"no-store" });
 if (!response.ok) {
 const body = await response.text();
 throw new Error(body ||"overview_unavailable");
 }
 return (await response.json()) as PilotageOverviewResponse;
};

function signedPercent(value: number): string {
 return `${value >= 0 ?"+" :""}${value.toFixed(1)}%`;
}

function signedValue(value: number, suffix =""): string {
 return `${value >= 0 ?"+" :""}${value.toFixed(1)}${suffix}`;
}

function ElusSection() {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 const [periodDays, setPeriodDays] = useState<number>(30);
 const { data, isLoading, error } = useSWR(
 `/api/pilotage/overview?days=${periodDays}&limit=2000`,
 fetchOverview,
 );

 const summaryKpis = useMemo(() => {
 const kpis = data?.summary.kpis ?? [];
 if (kpis.length >= 3) {
 return [
 {
 label: kpis[0].label,
 value: kpis[0].value,
 previousValue: kpis[0].previousValue,
 deltaAbsolute: kpis[0].deltaAbsolute,
 deltaPercent: kpis[0].deltaPercent,
 interpretation: kpis[0].interpretation,
 },
 {
 label: kpis[1].label,
 value: kpis[1].value,
 previousValue: kpis[1].previousValue,
 deltaAbsolute: kpis[1].deltaAbsolute,
 deltaPercent: kpis[1].deltaPercent,
 interpretation: kpis[1].interpretation,
 },
 {
 label: kpis[2].label,
 value: kpis[2].value,
 previousValue: kpis[2].previousValue,
 deltaAbsolute: kpis[2].deltaAbsolute,
 deltaPercent: kpis[2].deltaPercent,
 interpretation: kpis[2].interpretation,
 },
 ] as const;
 }

 return [
 {
 label: fr ?"Impact terrain" :"Field impact",
 value:"n/a",
 previousValue:"n/a",
 deltaAbsolute:"n/a",
 deltaPercent:"n/a",
 interpretation:"neutral",
 },
 {
 label: fr ?"Mobilisation" :"Mobilization",
 value:"n/a",
 previousValue:"n/a",
 deltaAbsolute:"n/a",
 deltaPercent:"n/a",
 interpretation:"neutral",
 },
 {
 label: fr ?"Qualite data" :"Data quality",
 value:"n/a",
 previousValue:"n/a",
 deltaAbsolute:"n/a",
 deltaPercent:"n/a",
 interpretation:"neutral",
 },
 ] as const;
 }, [data?.summary.kpis]);

 return (
 <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 items-start">
 {/* GAUCHE : KPI, Synthèse et Exports */}
 <div className="space-y-4">
 <div className="max-w-xs">
 <label className="flex flex-col gap-2 cmm-text-small cmm-text-secondary">
 {fr ?"Fenêtre d&apos;observation" :"Observation window"}
 <select
 value={String(periodDays)}
 onChange={(event) => setPeriodDays(Number(event.target.value))}
 className="rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-emerald-500"
 >
 <option value="7">{fr ?"7 jours" :"7 days"}</option>
 <option value="30">{fr ?"30 jours" :"30 days"}</option>
 <option value="90">{fr ?"90 jours" :"90 days"}</option>
 <option value="180">{fr ?"180 jours" :"180 days"}</option>
 </select>
 </label>
 </div>

 <ThirtySecondsSummary
 kpis={summaryKpis}
 alert={data?.summary.alert}
 recommendedAction={{
 href: data?.summary.recommendedAction.href ??"/reports",
 label:
 data?.summary.recommendedAction.label ??
 (fr ?"Ouvrir le reporting" :"Open reporting"),
 }}
 recommendedReason={data?.summary.recommendedAction.reason}
 />

 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 {fr ?"Dossier élu 1-clic" :"One-click elected official pack"}
 </h3>
 <p className="mt-1 cmm-text-small cmm-text-secondary">
 {fr
 ?"Pack institutionnel prêt à partager: KPI clés, comparatifs N-1, priorités territoriales et méthode."
 :"Institutional pack ready to share: key KPIs, year-over-year comparisons, territorial priorities and method."}
 </p>
 <div className="mt-3 flex flex-col gap-2">
 <a
 href={`/api/reports/elus-dossier?days=${periodDays}&format=pdf`}
 className="rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 cmm-text-small font-semibold text-white text-center transition hover:bg-emerald-700"
 >
 {fr ?"Télécharger le dossier PDF" :"Download PDF pack"}
 </a>
 <a
 href={`/api/reports/elus-dossier?days=${periodDays}&format=md`}
 className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 cmm-text-small font-semibold text-emerald-800 text-center transition hover:bg-emerald-100"
 >
 {fr ?"Télécharger le dossier partageable" :"Download shareable pack"}
 </a>
 <a
 href={`/api/reports/elus-dossier?days=${periodDays}&format=json`}
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary text-center transition hover:bg-slate-100"
 >
 {fr ?"Télécharger les données JSON" :"Download JSON data"}
 </a>
 <Link
 href="/reports"
 className="rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small font-semibold cmm-text-secondary text-center transition hover:bg-slate-100"
 >
 {fr ?"Ouvrir le rapport web complet" :"Open full web report"}
 </Link>
 </div>
 <p className="mt-3 cmm-text-caption cmm-text-muted">
 {fr
 ?"Export 1-clic: inclut la méthode technique et la justification des interprétations."
 :"One-click export: includes the technical method and interpretation rationale."}
 </p>
 </div>
 
 {data ? (
 <KpiMethodBlock methods={data.methods} title={fr ?"Méthode KPI" :"KPI method"} />
 ) : null}

  {isLoading ? (
  <div className="space-y-4">
  <CmmSkeleton variant="title" className="h-5 w-48" />
  <div className="flex gap-4">
  <CmmSkeleton className="h-24 flex-1 rounded-xl" />
  <CmmSkeleton className="h-24 flex-1 rounded-xl" />
  <CmmSkeleton className="h-24 flex-1 rounded-xl" />
  </div>
  <CmmSkeleton className="h-[200px] w-full rounded-xl" />
  </div>
  ) : null}
 {error ? (
 <p className="cmm-text-small text-rose-700">
 {fr ?"KPI indisponibles." :"KPIs unavailable."}
 </p>
 ) : null}
 </div>

 {/* DROITE : Priorités et Data */}
 <div className="space-y-4">

 <div className="grid gap-4 md:grid-cols-2">
 <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 {fr ?"Top zones à traiter" :"Top zones to address"}
 </h3>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 {fr ?"Urgences et justifications terrain." :"Urgencies and field justifications."}
 </p>
 <ul className="mt-3 space-y-2 cmm-text-small cmm-text-secondary">
 {(data?.zones ?? []).slice(0, 5).map((zone) => (
 <li
 key={`zone-top-${zone.area}`}
 className="rounded-lg border border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/50 dark:border-slate-700/80 p-3"
 >
 <p className="font-semibold cmm-text-primary">
 {zone.area} - {fr ?"urgence" :"urgency"} {zone.urgency.toUpperCase()}
 </p>
 <p className="cmm-text-caption cmm-text-secondary mt-1">{zone.justification}</p>
 <p className="mt-1 cmm-text-caption">
 <span className="font-semibold cmm-text-secondary">
 {fr ?"Recommandation:" :"Recommendation:"}
 </span>{""}
 {zone.recommendedAction}
 </p>
 </li>
 ))}
 {!isLoading && !error && (data?.zones ?? []).length === 0 ? (
 <li className="rounded-lg border border-slate-200/80 bg-slate-50/80 dark:bg-slate-800/50 dark:border-slate-700/80 p-3 cmm-text-secondary">
 {fr
 ?"Aucune zone prioritaire exploitable sur cette fenêtre."
 :"No priority zone can be used on this window."}
 </li>
 ) : null}
 </ul>
 </div>

 <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <h3 className="cmm-text-small font-semibold cmm-text-primary">
 {fr ?"Méthode de priorisation" :"Prioritization method"}
 </h3>
 <ul className="mt-3 list-disc space-y-2 pl-5 cmm-text-caption cmm-text-secondary">
 <li>{fr ?"Variables: actions/km2, kg/km2, participation." :"Variables: actions/km2, kg/km2, participation."}</li>
 <li>
 {fr
 ?"Pondérations: impact 35%, volume 35%, participation 20%, pression 10%."
 :"Weights: impact 35%, volume 35%, participation 20%, pressure 10%."}
 </li>
 <li>{fr ?"Fréquence: calculé sur chaque rafraichissement." :"Frequency: recalculated on every refresh."}</li>
 <li>
 {fr ?"Modèle de ciblage" :"Targeting model"} v.{PRIORITIZATION_RULESET.version}.
 </li>
 <li>
 {fr ?"Dernier passage" :"Last run"}: {data ? new Date(data.generatedAt).toLocaleString(fr ?"fr-FR" :"en-GB") :"n/a"}.
 </li>
 </ul>
 </div>
 </div>

 <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
 <h3 className="cmm-text-small font-semibold cmm-text-primary mb-3">
 {fr
 ?"Comparaison par zone: période courante vs précédente"
 :"Zone comparison: current period vs previous"}
 </h3>
 <div className="overflow-x-auto rounded-lg border border-slate-100">
 <table className="min-w-full text-left cmm-text-caption whitespace-nowrap">
 <thead className="bg-slate-50 cmm-text-secondary">
 <tr>
 <th className="px-3 py-2 font-semibold">{fr ?"Zone" :"Area"}</th>
 <th className="px-3 py-2 font-semibold">{fr ?"Urgence" :"Urgency"}</th>
 <th className="px-3 py-2 font-semibold">{fr ?"Actions (N)" :"Actions (N)"}</th>
 <th className="px-3 py-2 font-semibold">{fr ?"Delta actions" :"Action delta"}</th>
 <th className="px-3 py-2 font-semibold">{fr ?"Kg (N)" :"Kg (N)"}</th>
 <th className="px-3 py-2 font-semibold">{fr ?"Delta kg" :"Kg delta"}</th>
 <th className="px-3 py-2 font-semibold">{fr ?"Score" :"Score"}</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {(data?.zones ?? []).map((zone) => (
 <tr key={zone.area} className="cmm-text-secondary hover:bg-slate-50">
 <td className="px-3 py-2 font-semibold">{zone.area}</td>
 <td className="px-3 py-2 uppercase">{zone.urgency}</td>
 <td className="px-3 py-2">{zone.currentActions}</td>
 <td className="px-3 py-2">
 {signedValue(zone.deltaActionsAbsolute)} | {signedPercent(zone.deltaActionsPercent)}
 </td>
 <td className="px-3 py-2">{zone.currentKg.toFixed(1)}</td>
 <td className="px-3 py-2">
 {signedValue(zone.deltaKgAbsolute,"kg")} | {signedPercent(zone.deltaKgPercent)}
 </td>
 <td className="px-3 py-2 font-medium">{zone.normalizedScore.toFixed(1)}</td>
 </tr>
 ))}
 {!isLoading && !error && (data?.zones ?? []).length === 0 ? (
 <tr className="cmm-text-secondary">
 <td className="px-3 py-3 text-center" colSpan={7}>
 {fr ?"Aucune zone détectée." :"No zone detected."}
 </td>
 </tr>
 ) : null}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </div>
 );
}

export { ElusSection };
