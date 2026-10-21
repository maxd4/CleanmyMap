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
import { ReportsWebDocumentHistorySharing } from "../reports-web-document-history-sharing";
import { ReportsHistoryRows } from "./reports-history-rows";
import type { ReportPdfTheme } from "./reports-web-document.shared";

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
  onGenerate: () => void;
};

export type ReportsWebDocumentDeliveryHistoryProps = {
  recentRows: ReportGenerationHistoryRow[];
  theme?: ReportPdfTheme;
  historyAvailability?: "available" | "unavailable";
  actionStateById?: Record<string, ReportGenerationHistoryActionState>;
  onView: (id: string) => void;
  onReexport: (id: string) => void;
  onPrint?: (id: string) => void;
  onDerive?: (id: string) => void;
  onCopyReference?: (id: string) => void;
  onExportJson?: (id: string) => void;
  onExportCsv?: (id: string) => void;
  onResume?: (id: string) => void;
  publicationPreviewById?: Record<
    string,
    {
      title: string;
      period: string;
      scope: string;
      theme: ReportPdfTheme;
      artifactReady: boolean;
      documentUrl: string;
      communicatedContent: string;
    }
  >;
  onPublish?: (id: string) => void;
  onConfirmPublication?: (id: string) => void;
  onCancelPublication?: (id: string) => void;
  onRevokePublication?: (id: string) => void;
};

export type ReportGenerationHistoryActionState = {
  action:
    "view" | "reexport" | "print" | "derive" | "reference" | "json" | "csv";
  state: "pending" | "success" | "error";
  message: string;
};

export function HistoryActionButtons({
  row,
  theme,
  rowId,
  actionState,
  onView,
  onReexport,
  onPrint,
  onDerive = () => undefined,
  onCopyReference = () => undefined,
  onExportJson = () => undefined,
  onExportCsv = () => undefined,
  onResume = () => undefined,
  publicationPreview,
  onPublish = () => undefined,
  onConfirmPublication = () => undefined,
  onCancelPublication = () => undefined,
  onRevokePublication = () => undefined,
}: {
  row: ReportGenerationHistoryRow;
  theme: ReportPdfTheme;
  rowId: string;
  actionState?: ReportGenerationHistoryActionState;
  onView: (id: string) => void;
  onReexport: (id: string) => void;
  onPrint: (id: string) => void;
  onDerive: (id: string) => void;
  onCopyReference: (id: string) => void;
  onExportJson: (id: string) => void;
  onExportCsv: (id: string) => void;
  onResume: (id: string) => void;
  publicationPreview?: {
    title: string;
    period: string;
    scope: string;
    theme: ReportPdfTheme;
    artifactReady: boolean;
    documentUrl: string;
    communicatedContent: string;
  };
  onPublish: (id: string) => void;
  onConfirmPublication: (id: string) => void;
  onCancelPublication: (id: string) => void;
  onRevokePublication: (id: string) => void;
}) {
  const isPending = actionState?.state === "pending";
  const resolvedTheme = row.theme ?? theme;

  return (
    <div className="flex flex-wrap gap-2">
      <CmmButton
        disabled={isPending}
        onClick={() => onView(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        Voir
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() => onReexport(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        <span className="md:hidden">Partager le PDF</span>
        <span className="hidden md:inline">Télécharger PDF</span>
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() => onResume(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        Reprendre la configuration
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() => onPrint(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="hidden min-h-11 md:inline-flex"
      >
        Imprimer
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() => onDerive(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        Créer une nouvelle version
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() => onCopyReference(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        Copier la référence
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() => onExportJson(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        Exporter JSON
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() => onExportCsv(rowId)}
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        Exporter CSV
      </CmmButton>
      <CmmButton
        disabled={isPending}
        onClick={() =>
          row.publicationStatus === "published"
            ? onRevokePublication(rowId)
            : onPublish(rowId)
        }
        title={
          row.publicationStatus === "published"
            ? "Retirer le document de la bibliothèque publique"
            : "Préparer la publication publique"
        }
        tone="tertiary"
        variant="ghost"
        size="md"
        className="min-h-11"
      >
        {row.publicationStatus === "published"
          ? "Retirer de la bibliothèque"
          : "Publier dans « Tous les fichiers »"}
      </CmmButton>
      {publicationPreview ? (
        <CmmFeedback
          tone="warning"
          title={
            <>Confirmer la publication de « {publicationPreview.title} »</>
          }
          className="basis-full"
          action={
            <div className="flex gap-2">
              <CmmButton
                disabled={!publicationPreview.artifactReady || isPending}
                onClick={() => onConfirmPublication(rowId)}
                tone="primary"
                size="sm"
              >
                Confirmer
              </CmmButton>
              <CmmButton
                disabled={isPending}
                onClick={() => onCancelPublication(rowId)}
                tone="secondary"
                size="sm"
              >
                Annuler
              </CmmButton>
            </div>
          }
        >
          <p>
            Période : {publicationPreview.period} · Périmètre :{" "}
            {publicationPreview.scope} · Thème :{" "}
            {publicationPreview.theme === "scientific"
              ? "Scientifique"
              : "Impact"}
          </p>
          <p className="mt-1">{publicationPreview.communicatedContent}</p>
          <a
            className="mt-2 inline-block font-semibold underline"
            href={publicationPreview.documentUrl}
            target="_blank"
            rel="noreferrer"
          >
            Consulter le document réellement accessible
          </a>
        </CmmFeedback>
      ) : null}
      <ReportsWebDocumentHistorySharing row={row} theme={resolvedTheme} />
    </div>
  );
}

export function HistoryActionFeedback({
  actionState,
}: {
  actionState?: ReportGenerationHistoryActionState;
}) {
  if (!actionState) {
    return null;
  }

  return (
    <CmmFeedback
      tone={
        actionState.state === "error"
          ? "error"
          : actionState.state === "pending"
            ? "info"
            : "success"
      }
      className="mt-2"
    >
      {actionState.message}
    </CmmFeedback>
  );
}

export function ReportsWebDocumentDelivery({
  state,
  message,
  pendingLabel,
  isDisabled,
  exportStatus,
  historyWarning,
  dailyExportAvailability,
  onGenerate,
}: ReportsWebDocumentDeliveryProps) {
  const ExportStatusIcon = exportStatus.icon;
  const feedbackTone =
    state === "error" ? "error" : state === "success" ? "success" : "info";

  return (
    <div className="space-y-4 border-t border-slate-200 pt-5">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">
            État de l&apos;export
          </p>
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

        <CmmButton
          onClick={onGenerate}
          disabled={isDisabled}
          loading={state === "pending"}
          tone="primary"
          size="lg"
          width="wide"
          className="shrink-0"
        >
          <FileText size={18} aria-hidden="true" />
          {state === "pending" ? pendingLabel : "Générer le rapport"}
        </CmmButton>
      </div>

      <p
        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700"
        role="status"
      >
        <strong>Quota :</strong> 1 export détaillé par jour civil ·
        Europe/Paris.{" "}
        {dailyExportAvailability === "available"
          ? "Disponible aujourd'hui."
          : dailyExportAvailability === "used"
            ? "Déjà utilisé aujourd'hui ; prochain créneau le jour civil suivant."
            : "Disponibilité temporairement indisponible ; réessayez plus tard."}
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
