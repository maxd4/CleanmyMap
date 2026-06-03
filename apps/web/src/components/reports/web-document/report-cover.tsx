"use client";

import { BarChart3, FileText, ShieldCheck, Target, TriangleAlert } from "lucide-react";
import { MetricCard, ReportTable } from "./ui";
import type { ReportModel } from "./types";
import { buildExecutiveNarrative, toFrInt, toFrNumber } from "./analytics";
import { reportPdfColors } from "@/lib/pdf-export/report-pdf-theme";

type ReportCoverProps = {
  id?: string;
  report: ReportModel;
  activeScopeLabel: string;
  weatherAdvice: string;
};

export function ReportCover({
  id = "synthese-executive",
  report,
  activeScopeLabel,
  weatherAdvice,
}: ReportCoverProps) {
  const narrative = buildExecutiveNarrative(report);
  const topArea = report.areas[0];

  return (
    <section
      id={id}
      className="break-after-page overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.65)]"
    >
      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div
          className="p-[1.15cm] text-white"
          style={{
            background: `linear-gradient(135deg, ${reportPdfColors.teal}, ${reportPdfColors.navy})`,
          }}
        >
          <div className="flex flex-wrap items-center gap-2 cmm-text-caption font-semibold uppercase tracking-[0.18em] text-white/70">
            <ShieldCheck size={14} />
            Synthèse exécutive
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
          <article
            id="executive-overview"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
              Vue d’ensemble du rapport
            </p>
            <p className="mt-2 cmm-text-small cmm-text-secondary">{narrative.summary}</p>
          </article>

          <div className="grid gap-3 md:grid-cols-2">
            <article
              id="executive-key-figures"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                Chiffres clés
              </p>
              <ul className="mt-2 space-y-1.5 cmm-text-small cmm-text-secondary">
                <li>Actions validées: {toFrInt(report.totals.actions)}</li>
                <li>Masse collectée: {toFrNumber(report.totals.kg)} kg</li>
                <li>Bénévoles mobilisés: {toFrInt(report.totals.volunteers)}</li>
                <li>Couverture géographique: {toFrNumber(report.map.geoCoverage)}%</li>
              </ul>
            </article>

            <article
              id="executive-conclusions"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
                Principales conclusions
              </p>
              <ul className="mt-2 space-y-1.5 cmm-text-small cmm-text-secondary">
                {narrative.watchouts.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Target size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <article
            id="executive-recommendations"
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 cmm-text-primary">
              <FileText size={16} className="cmm-text-muted" />
              <p className="cmm-text-small font-semibold">Recommandations prioritaires</p>
            </div>
            <ul className="mt-3 space-y-2 cmm-text-small cmm-text-secondary">
              {narrative.budgetUseCases.map((line) => (
                <li key={line} className="flex gap-2">
                  <BarChart3 size={16} className="mt-0.5 shrink-0 text-sky-600" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </article>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-amber-900">
              <TriangleAlert size={16} />
              <p className="cmm-text-small font-semibold">Point de vigilance</p>
            </div>
            <p className="mt-2 cmm-text-small text-amber-900/90">
              Les métriques d’impact restent des proxies de décision. La méthodologie jointe
              explicite les hypothèses, marges d’erreur et limites de lecture.
            </p>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] cmm-text-muted">
              Lecture rapide
            </p>
            <p className="mt-2 cmm-text-small cmm-text-secondary">
              Zone la plus sensible:{" "}
              {topArea ? `${topArea.area} (${toFrInt(topArea.actions)} actions)` : "n/a"}.
            </p>
            <p className="mt-2 cmm-text-small cmm-text-secondary">
              Qualité de données: {toFrNumber(report.quality.completenessScore)}% complétude,{" "}
              {toFrNumber(report.quality.coherenceScore)}% cohérence.
            </p>
            <p className="mt-2 cmm-text-small cmm-text-secondary">{weatherAdvice}</p>
          </article>

          <ReportTable
            headers={["Évidence", "Valeur"]}
            rows={narrative.evidence.map((item) => [
              item,
              item.includes("%") ? "voir le détail" : "mesure consolidée",
            ])}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 cmm-text-primary">
              <FileText size={16} className="cmm-text-muted" />
              <p className="cmm-text-small font-semibold">Version à diffuser</p>
            </div>
            <p className="mt-2 cmm-text-small cmm-text-secondary">
              La version web imprime une lecture exhaustive, structurée pour l’archivage, la réunion
              budgétaire et la présentation institutionnelle.
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
