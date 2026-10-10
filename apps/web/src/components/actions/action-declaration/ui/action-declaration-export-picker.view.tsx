import { CmmDialog } from "@/components/ui/cmm-dialog";
import type { FormState } from "../model";
import type { ActionDeclarationExportPickerController } from "./action-declaration-export-picker.controller";
import { ActionDeclarationExportPickerBundleSelection } from "./action-declaration-export-picker-bundle-selection.view";
import { ActionDeclarationExportPickerFooter } from "./action-declaration-export-picker-footer.view";
import { ActionDeclarationExportPickerHeader } from "./action-declaration-export-picker-header.view";
import { ActionDeclarationExportPickerHistory } from "./action-declaration-export-picker-history.view";
import { ActionDeclarationExportPickerPreview } from "./action-declaration-export-picker-preview.view";
import { ActionDeclarationExportPickerSharing } from "./action-declaration-export-picker-sharing.view";
import { ActionDeclarationExportPickerTargets } from "./action-declaration-export-picker-targets.view";

export type ActionDeclarationExportPickerViewProps = {
  isOpen: boolean;
  onClose: () => void;
  form: FormState;
  controller: ActionDeclarationExportPickerController;
};

export function ActionDeclarationExportPickerView({
  isOpen,
  onClose,
  form,
  controller,
}: ActionDeclarationExportPickerViewProps) {
  const {
    isCompactViewport,
    status,
    errorMessage,
    shareMessage,
    history,
    activeBundle,
    activeBundleImageTargets,
    orderedBundles,
    orderedTargets,
    selectedTarget,
    previewSrc,
    shareText,
    onSelectBundle,
    onSelectTarget,
    handleExport,
    handleDownloadBundle,
    handleShareText,
    handleCopyLink,
    handleNativeShare,
    handleReplayHistoryEntry,
  } = controller;

  return (
    <CmmDialog
      open={isOpen}
      onClose={onClose}
      ariaLabelledBy="action-declaration-export-title"
      size="xl"
      panelClassName="max-h-[calc(100dvh-1.25rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
    >
      <section className="flex min-h-0 flex-1 flex-col">
        <ActionDeclarationExportPickerHeader form={form} onClose={onClose} />

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:px-6">
          <ActionDeclarationExportPickerBundleSelection
            orderedBundles={orderedBundles}
            activeBundle={activeBundle}
            onSelectBundle={onSelectBundle}
          />

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <ActionDeclarationExportPickerPreview
              form={form}
              selectedTarget={selectedTarget}
              previewSrc={previewSrc}
            />

            <section className="space-y-3">
              <details
                className="rounded-[1.5rem] border border-slate-200 bg-white p-3"
                open={!isCompactViewport}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Preset recommandé
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{activeBundle.label}</p>
                    <p className="mt-1 hidden text-sm text-slate-600 sm:block">{activeBundle.description}</p>
                  </div>
                  {activeBundleImageTargets.length > 1 ? (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                      {activeBundleImageTargets.length}
                    </span>
                  ) : null}
                </summary>
                {activeBundleImageTargets.length > 1 ? (
                  <p className="mt-2 text-xs font-semibold text-emerald-700">
                    {activeBundleImageTargets.length} fichiers PNG seront téléchargés séparément.
                  </p>
                ) : null}
              </details>

              <ActionDeclarationExportPickerSharing
                isCompactViewport={isCompactViewport}
                shareText={shareText}
                handleShareText={handleShareText}
                handleCopyLink={handleCopyLink}
                handleNativeShare={handleNativeShare}
              />

              <ActionDeclarationExportPickerHistory
                isCompactViewport={isCompactViewport}
                history={history}
                handleReplayHistoryEntry={handleReplayHistoryEntry}
              />

              <ActionDeclarationExportPickerTargets
                orderedTargets={orderedTargets}
                activeBundleTargetIds={activeBundle.targetIds}
                selectedTarget={selectedTarget}
                onSelectTarget={onSelectTarget}
              />
            </section>
          </div>

          <ActionDeclarationExportPickerFooter
            status={status}
            shareMessage={shareMessage}
            imageTargetCount={activeBundleImageTargets.length}
            selectedTarget={selectedTarget}
            onClose={onClose}
            handleShareText={handleShareText}
            handleDownloadBundle={handleDownloadBundle}
            handleExport={handleExport}
          />

          {errorMessage ? (
            <div className="border-t border-rose-100 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-800 sm:px-6">
              {errorMessage}
            </div>
          ) : null}
        </div>
      </section>
    </CmmDialog>
  );
}
