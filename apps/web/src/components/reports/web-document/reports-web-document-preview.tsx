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
  modulesLabel: string;
  dataStatusLabel: string;
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
  modulesLabel,
  dataStatusLabel,
}: ReportsWebDocumentPreviewProps) {
  useEffect(() => {
    if (!showPreview) {
      return;
    }

    window.setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, [previewRef, showPreview]);

  const actionCount = report.totals.actions;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-red-600">Lecture rapide</p>
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
          className="shrink-0"
        >
          <Eye size={16} aria-hidden="true" />
          {showPreview
            ? "Masquer l’aperçu de la première page"
            : "Voir l’aperçu de la première page"}
        </CmmButton>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <SummaryValue label="Périmètre actif" value={activeScopeLabel} />
        <SummaryValue label="Période" value={periodDisplayLabel} />
        <SummaryValue
          label="Actions incluses"
          value={`${actionCount} ${actionCount === 1 ? "action" : "actions"}`}
        />
        <SummaryValue
          label="Couverture"
          value={isTruncated ? "Couverture partielle" : "Couverture complète"}
        />
        <SummaryValue label="Plage réelle" value={coverageRangeLabel} />
        <SummaryValue label="Modules inclus" value={modulesLabel} />
        <SummaryValue label="État des données" value={dataStatusLabel} />
      </dl>

      {showPreview ? (
        <div
          ref={previewRef}
          className="space-y-4 rounded-xl border border-red-100 bg-red-50/40 p-4"
        >
          <div>
            <p className="text-xs font-semibold text-red-600">Aperçu</p>
            <h4 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
              Première page du PDF
            </h4>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Synthèse exécutive, chiffres clés et sommaire cliquable.
            </p>
          </div>
          <ReportCover
            id="synthese-executive"
            report={report}
            activeScopeLabel={activeScopeLabel}
          />
        </div>
      ) : null}
    </div>
  );
}
