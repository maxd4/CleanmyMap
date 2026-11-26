"use client";

import { useEffect, type RefObject } from "react";
import { Eye } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { ReportCover } from "./report-cover";
import type { ReportModel } from "@/lib/reports/report-model/types";

export type ReportsWebDocumentPreviewProps = {
  report: ReportModel;
  activeScopeLabel: string;
  showPreview: boolean;
  previewRef: RefObject<HTMLDivElement | null>;
  onTogglePreview: () => void;
  periodDisplayLabel: string;
  coverageRangeLabel: string;
  isTruncated: boolean;
  hasPartialSources?: boolean;
  isSelectionValid?: boolean;
  modulesLabel: string;
  dataStatusLabel: string;
  chapterCount: number;
};

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-bold leading-5 text-slate-950">{value}</dd>
    </div>
  );
}

export function ReportsWebDocumentPreview({
  report,
  activeScopeLabel,
  showPreview,
  previewRef,
  onTogglePreview,
  periodDisplayLabel,
  coverageRangeLabel,
  isTruncated,
  hasPartialSources = false,
  isSelectionValid = true,
  modulesLabel,
  dataStatusLabel,
  chapterCount,
}: ReportsWebDocumentPreviewProps) {
  useEffect(() => {
    if (!showPreview) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
      previewRef.current?.scrollIntoView({ behavior, block: "start" });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [previewRef, showPreview]);

  const actionCount = report.totals.actions;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="cmm-text-caption font-semibold text-rose-700">Étape 2 · Vérification</p>
          <h3 id="reports-summary-title" className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Résumé du rapport
          </h3>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Vérifiez le périmètre et les données avant de générer le PDF.
          </p>
        </div>
        <CmmButton
          onClick={onTogglePreview}
          tone="secondary"
          size="md"
          ariaExpanded={showPreview}
          ariaControls="reports-first-page-preview"
          className="max-w-full"
        >
          <Eye size={16} aria-hidden="true" />
          {showPreview
            ? "Masquer l’aperçu de la première page"
            : "Voir l’aperçu de la première page"}
        </CmmButton>
      </div>

      <div aria-live="polite" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <p className="cmm-text-caption font-semibold text-rose-900">Actions incluses</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-rose-950">{isSelectionValid ? `${actionCount} ${actionCount === 1 ? "action" : "actions"}` : "Non disponible"}</p>
        <p className="mt-1 cmm-text-small text-rose-900">{!isSelectionValid ? "Vérifiez les paramètres ou attendez le chargement." : actionCount === 0 ? "Aucune action dans la sélection courante. Les indicateurs sans mesure restent non renseignés." : "Le serveur vérifie à nouveau l’admissibilité des actions à la génération."}</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        <SummaryValue label="Périmètre actif" value={activeScopeLabel} />
        <SummaryValue label="Période" value={periodDisplayLabel} />
        <SummaryValue
          label="Couverture du chargement"
          value={!isSelectionValid ? "Indisponible" : isTruncated || hasPartialSources ? "Couverture partielle" : "Aucune limite de chargement signalée"}
        />
        <SummaryValue label="Plage réelle" value={isSelectionValid ? coverageRangeLabel : "Indisponible"} />
        <SummaryValue label="Modules inclus" value={modulesLabel} />
        <SummaryValue label="État des données" value={isSelectionValid && actionCount === 0 && !isTruncated && !hasPartialSources ? "Sélection vide" : dataStatusLabel} />
      </dl>

      {showPreview ? (
        <div
          id="reports-first-page-preview"
          ref={previewRef}
          className="space-y-4 rounded-xl border border-red-100 bg-red-50/40 p-4"
        >
          <div>
            <p className="text-xs font-semibold text-red-600">Aperçu</p>
            <h4 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
              Première page du PDF
            </h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Aperçu partiel de la première page uniquement ; ce n&apos;est pas le PDF complet.
            </p>
          </div>
          <ReportCover
            id="synthese-executive"
            report={report}
            activeScopeLabel={activeScopeLabel}
            chapterCount={chapterCount}
          />
        </div>
      ) : null}
    </div>
  );
}
