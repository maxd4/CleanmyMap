"use client";

import { CmmButton } from "@/components/ui/cmm-button";
import { CmmFeedback } from "@/components/ui/cmm-feedback";
import type { ReportGenerationHistoryRow } from "@/lib/reports/report-generation-history-contract";
import { ReportsWebDocumentHistorySharing } from "../reports-web-document-history-sharing";
import type {
  ReportGenerationHistoryActionState,
} from "./reports-history-contract";
import type { ReportPdfTheme } from "./reports-web-document.shared";

export type HistoryActionButtonsProps = {
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
};

function HistoryActionPrimaryButtons({
  row,
  rowId,
  actionState,
  onView,
  onReexport,
  onPrint,
  onDerive,
  onCopyReference,
  onExportJson,
  onExportCsv,
  onResume,
  onPublish,
  onRevokePublication,
}: HistoryActionButtonsProps) {
  const isPending = actionState?.state === "pending";
  return (
    <>
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
    </>
  );
}

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
}: HistoryActionButtonsProps) {
  const isPending = actionState?.state === "pending";
  const resolvedTheme = row.theme ?? theme;
  return (
    <div className="flex flex-wrap gap-2">
      <HistoryActionPrimaryButtons
        row={row}
        theme={theme}
        rowId={rowId}
        actionState={actionState}
        onView={onView}
        onReexport={onReexport}
        onPrint={onPrint}
        onDerive={onDerive}
        onCopyReference={onCopyReference}
        onExportJson={onExportJson}
        onExportCsv={onExportCsv}
        onResume={onResume}
        onPublish={onPublish}
        onConfirmPublication={onConfirmPublication}
        onCancelPublication={onCancelPublication}
        onRevokePublication={onRevokePublication}
      />
      <HistoryPublicationFeedback
        rowId={rowId}
        isPending={isPending}
        publicationPreview={publicationPreview}
        onConfirmPublication={onConfirmPublication}
        onCancelPublication={onCancelPublication}
      />
      <ReportsWebDocumentHistorySharing row={row} theme={resolvedTheme} />
    </div>
  );
}

export function HistoryActionFeedback({
  actionState,
}: {
  actionState?: ReportGenerationHistoryActionState;
}) {
  if (!actionState) return null;
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

function HistoryPublicationFeedback({
  rowId,
  isPending,
  publicationPreview,
  onConfirmPublication,
  onCancelPublication,
}: Pick<
  HistoryActionButtonsProps,
  | "rowId"
  | "publicationPreview"
  | "onConfirmPublication"
  | "onCancelPublication"
> & { isPending: boolean }) {
  if (!publicationPreview) return null;
  return (
    <CmmFeedback
      tone="warning"
      title={<>Confirmer la publication de « {publicationPreview.title} »</>}
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
        {publicationPreview.theme === "scientific" ? "Scientifique" : "Impact"}
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
  );
}
