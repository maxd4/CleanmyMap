"use client";

import { FileText, type LucideIcon } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import {
  SystemStateLayout,
  SystemStateTitle,
} from "@/components/ui/system-state";
import type { ReportGenerationHistoryRow } from "@/lib/reports/report-generation-history-contract";
import type { ReportExportAvailability } from "@/lib/reports/report-export-quota-contract";
import type { ReportGenerationRequest } from "@/lib/reports/report-generation-request";
import { AiMarkdownExportConfirmation } from "@/components/reports/ai-markdown-export-confirmation";
import type { ReportsWebDocumentDeliveryHistoryProps } from "./reports-history-contract";
import { ReportsHistoryRows } from "./reports-history-rows";

export type {
  ReportGenerationHistoryActionState,
  ReportsWebDocumentDeliveryHistoryProps,
} from "./reports-history-contract";
export type ReportsWebDocumentExportStatus = {
  icon: LucideIcon;
  label: string;
  description: string;
  tone: string;
  iconTone: string;
};

export type { ReportGenerationHistoryRow as ReportsWebDocumentHistoryRow };

export type ReportsWebDocumentDeliveryProps = {
  state: "idle" | "pending" | "success" | "error";
  message: string | null;
  pendingLabel: string;
  isDisabled: boolean;
  exportStatus: ReportsWebDocumentExportStatus;
  historyWarning: string | null;
  dailyExportAvailability: ReportExportAvailability;
  aiExportRequest: ReportGenerationRequest;
  aiExportFallbackFilename: string;
  isAiExportDisabled: boolean;
  onGenerate: () => void;
};

export function ReportsWebDocumentDelivery({
  state,
  message,
  pendingLabel,
  isDisabled,
  exportStatus,
  historyWarning,
  dailyExportAvailability,
  aiExportRequest,
  aiExportFallbackFilename,
  isAiExportDisabled,
  onGenerate,
}: ReportsWebDocumentDeliveryProps) {
  const ExportStatusIcon = exportStatus.icon;
  const feedbackTone =
    state === "error" ? "error" : state === "success" ? "success" : "info";
  return (
    <div className="space-y-4 border-t border-slate-200 pt-5">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <h4 className="font-bold cmm-text-primary">Étape 3 · Générer et exporter</h4>
          <p className="mt-1 cmm-text-small cmm-text-secondary">Le PDF natif et le brief Markdown sont deux livrables différents.</p>
          <CmmFeedback
            tone={feedbackTone}
            title={exportStatus.label}
            className="mt-2"
          >
            <span className="inline-flex items-start gap-2">
              <ExportStatusIcon size={18} aria-hidden="true" />
              {exportStatus.description}
            </span>
          </CmmFeedback>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <CmmButton
            onClick={onGenerate}
            disabled={isDisabled}
            loading={state === "pending"}
            tone="primary"
            size="lg"
            width="auto"
            className="shrink-0"
          >
            <FileText size={18} aria-hidden="true" />
            {state === "pending" ? pendingLabel : "Générer le PDF"}
          </CmmButton>
          <AiMarkdownExportConfirmation
            request={aiExportRequest}
            fallbackFilename={aiExportFallbackFilename}
            triggerLabel="Exporter pour une IA"
            disabled={isAiExportDisabled}
            tone="secondary"
            className="min-h-11"
          />
        </div>
      </div>
      <p
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700"
        role="status"
      >
        <strong>Quota PDF :</strong> 1 export détaillé par jour civil ·
        Europe/Paris.{" "}
        {dailyExportAvailability === "available"
          ? "Disponible aujourd'hui."
          : dailyExportAvailability === "used"
            ? "Déjà utilisé aujourd'hui ; prochain créneau le jour civil suivant."
            : "Disponibilité temporairement indisponible ; réessayez plus tard."}
        {" "}Le brief Markdown pour IA reste indépendant de ce quota.
      </p>
      {message && state !== "success" ? (
        <CmmFeedback tone={state === "error" ? "error" : "info"}>
          {message}
        </CmmFeedback>
      ) : null}
      {historyWarning ? (
        <CmmFeedback tone="warning">{historyWarning}</CmmFeedback>
      ) : null}
    </div>
  );
}

export function ReportsWebDocumentDeliveryHistory({
  recentRows,
  theme = "impact",
  historyAvailability = "available",
  actionStateById = {},
  onView,
  onReexport,
  onPrint = () => undefined,
  onDerive = () => undefined,
  onCopyReference = () => undefined,
  onExportJson = () => undefined,
  onExportCsv = () => undefined,
  onResume = () => undefined,
  publicationPreviewById = {},
  onPublish = () => undefined,
  onConfirmPublication = () => undefined,
  onCancelPublication = () => undefined,
  onRevokePublication = () => undefined,
}: ReportsWebDocumentDeliveryHistoryProps) {
  return (
    <section
      id="reports-history"
      aria-labelledby="reports-history-title"
      className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.22)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3
            id="reports-history-title"
            className="text-lg font-semibold text-slate-950"
          >
            Mes fichiers
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tous vos rapports générés et leurs métadonnées.
          </p>
        </div>
      </div>
      {historyAvailability === "unavailable" ? (
        <CmmFeedback tone="warning" className="mt-4">
          Historique temporairement indisponible
        </CmmFeedback>
      ) : recentRows.length === 0 ? (
        <SystemStateLayout variant="empty" className="mt-4">
          <SystemStateTitle variant="empty">
            Aucun rapport généré
          </SystemStateTitle>
        </SystemStateLayout>
      ) : (
        <div className="mt-4">
          <ReportsHistoryRows
            recentRows={recentRows}
            theme={theme}
            actionStateById={actionStateById}
            onView={onView}
            onReexport={onReexport}
            onPrint={onPrint}
            onDerive={onDerive}
            onCopyReference={onCopyReference}
            onExportJson={onExportJson}
            onExportCsv={onExportCsv}
            onResume={onResume}
            publicationPreviewById={publicationPreviewById}
            onPublish={onPublish}
            onConfirmPublication={onConfirmPublication}
            onCancelPublication={onCancelPublication}
            onRevokePublication={onRevokePublication}
          />
        </div>
      )}
    </section>
  );
}
