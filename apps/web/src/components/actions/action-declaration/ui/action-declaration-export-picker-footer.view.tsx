import { CmmButton } from "@/components/ui/cmm-button";
import type { ActionDeclarationExportTarget } from "@/lib/actions/exports/export-form-media";
import type { ActionDeclarationExportPickerController } from "./action-declaration-export-picker.controller";

type ActionDeclarationExportPickerFooterProps = {
  status: ActionDeclarationExportPickerController["status"];
  shareMessage: string | null;
  imageTargetCount: number;
  selectedTarget: ActionDeclarationExportTarget | undefined;
  onClose: () => void;
  handleShareText: () => Promise<void>;
  handleDownloadBundle: () => Promise<void>;
  handleExport: (target: ActionDeclarationExportTarget) => Promise<void>;
};

export function ActionDeclarationExportPickerFooter({
  status,
  shareMessage,
  imageTargetCount,
  selectedTarget,
  onClose,
  handleShareText,
  handleDownloadBundle,
  handleExport,
}: ActionDeclarationExportPickerFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-600">
          Le format choisi s’ouvre ou se télécharge seulement après validation du bouton d’export.
        </p>
        {shareMessage ? (
          <p className="text-xs font-semibold text-emerald-700">{shareMessage}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CmmButton
          type="button"
          tone="secondary"
          size="sm"
          onClick={onClose}
        >
          Fermer
        </CmmButton>
        <CmmButton
          type="button"
          tone="secondary"
          size="sm"
          onClick={() => void handleShareText()}
        >
          Copier la légende
        </CmmButton>
        {imageTargetCount > 1 ? (
          <CmmButton
            type="button"
            tone="secondary"
            size="sm"
            disabled={status !== "idle"}
            onClick={() => void handleDownloadBundle()}
          >
            {status === "exporting-bundle"
              ? "Téléchargement en cours..."
              : `Télécharger les ${imageTargetCount} fichiers PNG`}
          </CmmButton>
        ) : null}
        <CmmButton
          type="button"
          tone="primary"
          size="sm"
          disabled={status !== "idle" || !selectedTarget}
          onClick={() => {
            if (selectedTarget) {
              void handleExport(selectedTarget);
            }
          }}
          className="shrink-0"
        >
          {status === "exporting-single"
            ? "Export en cours..."
            : selectedTarget?.id === "pdf"
              ? "Ouvrir le PDF"
              : "Télécharger l'image"}
        </CmmButton>
      </div>
    </div>
  );
}
