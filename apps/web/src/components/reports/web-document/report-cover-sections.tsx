"use client";

import { BarChart3, ShieldCheck, Target, TriangleAlert } from "lucide-react";
import { MetricCard } from "./ui";
import type { ReportModel } from "@/lib/reports/report-model/types";
import { formatScorePercent } from "@/lib/formatters/score";
import { toFrInt, toFrNumber } from "@/lib/reports/report-model/formatters";

export function ReportCoverHero(props: { report: ReportModel; activeScopeLabel: string; narrative: ReturnType<(typeof import("@/lib/reports/report-model/builders"))["buildExecutiveNarrative"]>; wasteLabel: string }) {
  const { narrative, report } = props;
  return <div className="p-[0.95cm] text-white" style={{ background: "linear-gradient(135deg, #dc2626, #991b1b)" }}>
    <div className="flex flex-wrap items-center gap-2 cmm-text-caption font-semibold uppercase tracking-[0.18em] text-white"><ShieldCheck size={14} />Synthèse exécutive</div>
    <h1 className="mt-3 text-2xl font-semibold leading-tight lg:text-[2.15rem]">Une lecture visuelle unique pour prévisualiser le livrable officiel.</h1>
    <p className="mt-3 max-w-2xl cmm-text-small leading-6 text-white">{narrative.summary}</p>
    <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 cmm-text-caption font-semibold">{narrative.readinessLabel}</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 cmm-text-caption font-semibold">Périmètre: {props.activeScopeLabel}</span><span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 cmm-text-caption font-semibold">Généré le {report.generatedAt}</span></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2"><MetricCard label="Actions validées" value={toFrInt(report.totals.actions)} hint="Fenêtre consolidée" /><MetricCard label="Volume collecte" value={props.wasteLabel} tone="accent" /><MetricCard label="Crédibilité data" value={formatScorePercent(narrative.readinessScore)} hint="Synthèse qualité + modération" /><MetricCard label="Géolocalisation" value={`${toFrNumber(report.map.geoCoverage)}%`} tone="accent" /></div>
  </div>;
}

export function ReportCoverDetails(props: { report: ReportModel; narrative: ReturnType<(typeof import("@/lib/reports/report-model/builders"))["buildExecutiveNarrative"]>; chapterCount?: number }) {
  const { narrative, report } = props;
  const keyFigures = [`Actions validées: ${toFrInt(report.totals.actions)}`, `Masse impact (calculée): ${report.totals.knownWasteActions === undefined || report.totals.knownWasteActions > 0 ? `${toFrNumber(report.totals.kg)} kg` : "Non renseignée"}`, `Bénévoles mobilisés: ${report.totals.volunteersKnownActions === 0 ? "n/a" : toFrInt(report.totals.volunteers)}`, `Couverture géographique: ${toFrNumber(report.map.geoCoverage)}%`];
  const conclusions = narrative.watchouts.slice(0, 3);
  const topArea = report.areas[0];
  return <div className="space-y-3 bg-slate-50 p-[0.95cm]">
    <article id="executive-overview" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">Vue d’ensemble du rapport</p><p className="mt-2 cmm-text-small cmm-text-secondary">{narrative.summary}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 cmm-text-caption font-semibold cmm-text-secondary">{props.chapterCount === undefined ? "Structure sélectionnée" : `${props.chapterCount} sections détaillées`}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 cmm-text-caption font-semibold cmm-text-secondary">Sommaire cliquable</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 cmm-text-caption font-semibold cmm-text-secondary">Export A4 prêt à imprimer</span></div></article>
    <div className="grid gap-3 md:grid-cols-2"><article id="executive-key-figures" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 cmm-text-primary"><BarChart3 size={16} className="cmm-text-muted" /><p className="cmm-text-small font-semibold">Chiffres clés</p></div><ul className="mt-3 space-y-1.5 cmm-text-small cmm-text-secondary">{keyFigures.map((item) => <li key={item}>{item}</li>)}</ul></article><article id="executive-conclusions" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2 cmm-text-primary"><Target size={16} className="text-red-600" /><p className="cmm-text-small font-semibold">Principales conclusions</p></div><ul className="mt-3 space-y-2 cmm-text-small cmm-text-secondary">{conclusions.map((line) => <li key={line} className="flex gap-2"><Target size={16} className="mt-0.5 shrink-0 text-red-600" /><span>{line}</span></li>)}</ul></article></div>
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4"><div className="flex items-center gap-2 text-cyan-900"><TriangleAlert size={16} /><p className="cmm-text-small font-semibold">Point de vigilance</p></div><p className="mt-2 cmm-text-small text-cyan-900/90">Les métriques d’impact restent des proxies de décision. La méthodologie jointe explicite les hypothèses, marges d’erreur et limites de lecture.</p></div>
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">Lecture rapide</p><p className="mt-2 cmm-text-small cmm-text-secondary">Zone la plus sensible: {topArea ? `${topArea.area} (${toFrInt(topArea.actions)} actions)` : "n/a"}.</p><p className="mt-2 cmm-text-small cmm-text-secondary">Qualité de données: {toFrNumber(report.quality.completenessScore)}% complétude, {toFrNumber(report.quality.coherenceScore)}% cohérence.</p></article>
  </div>;
}
