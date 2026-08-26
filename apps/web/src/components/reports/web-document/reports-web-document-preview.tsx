"use client";

import { useEffect, type RefObject } from "react";
import {
  Eye,
  Leaf,
  Map as MapIcon,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { ReportCover } from "./report-cover";
import {
  GenerationStageCard,
  getEnabledReportModules,
  getVisibleReportChapterIds,
  type ModuleState,
} from "./reports-web-document.shared";
import type { ReportsWebDocumentExportStatus } from "./reports-web-document-delivery";
import type { ReportModel } from "@/lib/reports/report-model/types";

export type ReportsWebDocumentPreviewProps = {
  report: ReportModel;
  activeScopeLabel: string;
  weatherAdvice: string;
  showPreview: boolean;
  previewRef: RefObject<HTMLDivElement | null>;
  onTogglePreview: () => void;
  periodDisplayLabel: string;
  detailDisplayLabel: string;
  modules: ModuleState;
  historyCoverageLabel: string;
  historyGuaranteeLabel: string;
  coverageRangeLabel: string;
  detailCoverageLabel: string;
  exportStatus: Pick<ReportsWebDocumentExportStatus, "label" | "tone">;
};

export function ReportsWebDocumentPreview({
  report,
  activeScopeLabel,
  weatherAdvice,
  showPreview,
  previewRef,
  onTogglePreview,
  periodDisplayLabel,
  detailDisplayLabel,
  modules,
  historyCoverageLabel,
  historyGuaranteeLabel,
  coverageRangeLabel,
  detailCoverageLabel,
  exportStatus,
}: ReportsWebDocumentPreviewProps) {
  useEffect(() => {
    if (!showPreview) {
      return;
    }

    window.setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [previewRef, showPreview]);

  const sectionCards = [
    {
      id: "synthese-executive",
      title: "Synthèse exécutive",
      subtitle: "Lecture globale, chiffres clés et conclusions.",
    },
    {
      id: "perimetre-rapport",
      title: "Périmètre du rapport",
      subtitle: "Période, territoire couvert et sources.",
    },
    {
      id: "resultats-terrain",
      title: "Résultats terrain",
      subtitle: "Actions, déchets, bénévoles et zones traitées.",
    },
    {
      id: "recommandations-operationnelles",
      title: "Recommandations opérationnelles",
      subtitle: "Priorités et suites proposées à partir des résultats.",
    },
    ...getEnabledReportModules(modules).map((module) => ({
      id: module.id,
      title: module.label,
      subtitle: module.description,
    })),
  ];
  const visibleChapterCount = getVisibleReportChapterIds(modules).size;

  return (
    <GenerationStageCard
      tone="preview"
      step="2"
      title="Voir ce qui sortira"
      description="Regardez ce que l'utilisateur verra dans le PDF avant de l'exporter."
      action={
        <button
          type="button"
          onClick={onTogglePreview}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-2.5 text-sm font-black text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-50"
        >
          <Eye size={16} />
          {showPreview ? "Masquer l'aperçu" : "Voir l'aperçu"}
        </button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50/60 p-4 shadow-[0_12px_28px_-24px_rgba(8,145,178,0.35)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
              Ce que l&apos;utilisateur verra
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">
              Première page du PDF
            </h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Synthèse exécutive, chiffres clés et sommaire cliquable dans le rendu final.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                A4 portrait
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                Sommaire cliquable
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {visibleChapterCount} chapitres
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {detailDisplayLabel}
              </span>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {sectionCards.map((section, index) => {
                const Icon =
                  index === 0
                    ? ShoppingBag
                    : index === 1
                      ? Leaf
                      : index === 2
                        ? MapIcon
                        : ShieldCheck;
                return (
                  <div
                    key={section.id}
                    className="flex items-start gap-3 rounded-2xl border border-cyan-100/60 bg-white/90 px-3 py-2"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                      <p className="mt-0.5 text-xs leading-4 text-slate-500">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-4 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                  Ce qui sortira dans le PDF
                </p>
                <h4 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                  Fiche du livrable
                </h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Une sortie prête à partager, structurée comme le PDF officiel.
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${exportStatus.tone}`}>
                {exportStatus.label}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {historyCoverageLabel}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {periodDisplayLabel}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                {detailDisplayLabel}
              </span>
            </div>
            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white/80 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Garanties d&apos;export
              </p>
              <div className="space-y-1.5 text-sm leading-6 text-slate-700">
                <p>{historyGuaranteeLabel}</p>
                <p>Période réelle: {coverageRangeLabel}.</p>
                <p>Niveau inclus: {detailCoverageLabel}</p>
              </div>
            </div>
          </div>
        </div>

        {showPreview ? (
          <div ref={previewRef} className="space-y-4 rounded-[1.5rem] border border-cyan-100 bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-700">
                  Ce que l&apos;utilisateur verra
                </p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-slate-950">
                  Aperçu du PDF
                </h3>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  L&apos;aperçu reprend le rendu final, alimenté par les données du
                  territoire sélectionné.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  {detailDisplayLabel}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                  {periodDisplayLabel}
                </span>
              </div>
            </div>
            <ReportCover
              id="synthese-executive"
              report={report}
              activeScopeLabel={activeScopeLabel}
              weatherAdvice={weatherAdvice}
            />
          </div>
        ) : null}
      </div>
    </GenerationStageCard>
  );
}
