"use client";

import { BarChart3, FileText, ShieldCheck, Target, TriangleAlert } from"lucide-react";
import { MetricCard, InsightBox, ReportTable } from"./ui";
import type { ReportModel } from"./types";
import { buildExecutiveNarrative, toFrInt, toFrNumber } from"./analytics";

type ReportCoverProps = {
 report: ReportModel;
 activeScopeLabel: string;
 weatherAdvice: string;
};

export function ReportCover({
 report,
 activeScopeLabel,
 weatherAdvice,
}: ReportCoverProps) {
 const narrative = buildExecutiveNarrative(report);
 const topArea = report.areas[0];

 return (
 <section className="break-after-page rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.65)] overflow-hidden">
 <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
 <div className="bg-gradient-to-br from-[#0f4c5c] via-[#1f5d7f] to-[#23426c] p-[1.15cm] text-white">
 <div className="flex flex-wrap items-center gap-2 cmm-text-caption font-semibold uppercase tracking-[0.2em] text-white/70">
 <ShieldCheck size={14} />
 Rapport d'impact institutionnel
 </div>
 <h1 className="mt-3 text-3xl font-semibold leading-tight lg:text-4xl">
 Une lecture budgétaire, territoriale et méthodologique prête à présenter.
 </h1>
 <p className="mt-3 max-w-2xl cmm-text-small leading-6 text-white/88">
 {narrative.summary}
 </p>
 <div className="mt-5 flex flex-wrap gap-2">
 <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 cmm-text-caption font-semibold">
 {narrative.readinessLabel}
 </span>
 <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 cmm-text-caption font-semibold">
 Périmètre: {activeScopeLabel}
 </span>
 <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 cmm-text-caption font-semibold">
 Généré le {report.generatedAt}
 </span>
 </div>
 <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
 <MetricCard
 label="Actions validées"
 value={toFrInt(report.totals.actions)}
 hint="Fenêtre consolidée"
 />
 <MetricCard
 label="Volume collecte"
 value={`${toFrNumber(report.totals.kg)} kg`}
 tone="accent"
 />
 <MetricCard
 label="Crédibilité data"
 value={`${toFrNumber(narrative.readinessScore)} / 100`}
 hint="Synthèse qualité + modération"
 />
 <MetricCard
 label="Géolocalisation"
 value={`${toFrNumber(report.map.geoCoverage)}%`}
 tone="accent"
 />
 </div>
 </div>

 <div className="space-y-4 bg-slate-50 p-[1.15cm]">
 <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
 Pourquoi ce document compte
 </p>
 <h2 className="mt-2 text-lg font-semibold cmm-text-primary">
 Une base de discussion pour les élus et les financeurs.
 </h2>
 <ul className="mt-3 space-y-2 cmm-text-small cmm-text-secondary">
 {narrative.budgetUseCases.map((line) => (
 <li key={line} className="flex gap-2">
 <Target size={16} className="mt-0.5 shrink-0 text-emerald-600" />
 <span>{line}</span>
 </li>
 ))}
 </ul>
 </div>

 <InsightBox
 title="Lecture rapide"
 lines={[
 `Zone la plus sensible: ${topArea ? `${topArea.area} (${toFrInt(topArea.actions)} actions)` :"n/a"}.`,
 `Qualité de données: ${toFrNumber(report.quality.completenessScore)}% complétude, ${toFrNumber(report.quality.coherenceScore)}% cohérence.`,
 weatherAdvice,
 ]}
 />

 <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
 <div className="flex items-center gap-2 text-amber-900">
 <TriangleAlert size={16} />
 <p className="cmm-text-small font-semibold">Point de vigilance</p>
 </div>
 <p className="mt-2 cmm-text-small text-amber-900/90">
 Les métriques d&apos;impact restent des proxies de décision. La
 méthodologie jointe explicite les hypothèses, marges d&apos;erreur
 et limites de lecture.
 </p>
 </div>

 <ReportTable
 headers={["Évidence","Valeur"]}
 rows={narrative.evidence.map((item) => [
 item,
 item.includes("%") ?"voir le détail" :"mesure consolidée",
 ])}
 />

 <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
 <div className="flex items-center gap-2 cmm-text-primary">
 <FileText size={16} className="cmm-text-muted" />
 <p className="cmm-text-small font-semibold">Version à diffuser</p>
 </div>
 <p className="mt-2 cmm-text-small cmm-text-secondary">
 La version web imprime une lecture exhaustive, structurée pour
 l&apos;archivage, la réunion budgétaire et la présentation
 institutionnelle.
 </p>
 <div className="mt-3 flex items-center gap-2 cmm-text-caption cmm-text-muted">
 <BarChart3 size={14} />
 <span>Couverture: pilotage, terrain, contexte, communauté, gouvernance.</span>
 </div>
 </div>
 </div>
 </div>
 </section>
 );
}
