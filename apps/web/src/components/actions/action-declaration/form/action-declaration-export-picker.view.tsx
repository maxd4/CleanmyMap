import {
  Copy,
  Download,
  FileText,
  Image,
  Link2,
  Megaphone,
  Send,
  Share2,
  X,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { buildActionDeclarationExportLabel } from "@/lib/actions/exports/export-form-media";
import { cn } from "@/lib/utils";
import type { FormState } from "./model";
import {
  getSelectedTargetLabel,
  getTargetTone,
} from "./action-declaration-export-picker.model";
import type { ActionDeclarationExportPickerController } from "./action-declaration-export-picker.controller";

const targetIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  png: Image,
  "story-instagram": Share2,
  "publication-facebook": Send,
  "publication-x": Megaphone,
};

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
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">
              Export du formulaire
            </p>
            <h2
              id="action-declaration-export-title"
              className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl"
            >
              Choisissez le format de sortie
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {buildActionDeclarationExportLabel(form)} · {form.actionDate}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Fermer le sélecteur d'export"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:space-y-5 sm:px-6">
          <div className="-mx-1 flex snap-x flex-nowrap gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {orderedBundles.map((bundle) => {
              const isActive = bundle.id === activeBundle.id;

              return (
                <button
                  key={bundle.id}
                  type="button"
                  onClick={() => onSelectBundle(bundle.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] transition",
                    isActive
                      ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  {bundle.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-50">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    Prévisualisation
                  </p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
                    {selectedTarget?.label ?? "Format sélectionné"}
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    {selectedTarget?.description}
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                  {selectedTarget ? getSelectedTargetLabel(selectedTarget) : "Aucun"}
                </span>
              </div>

              <div className="p-4">
                {selectedTarget?.id === "pdf" ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                          A4 imprimable
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {buildActionDeclarationExportLabel(form)}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-right">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">
                          Date
                        </p>
                        <p className="mt-1 text-sm font-bold text-emerald-950">{form.actionDate}</p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="font-semibold text-slate-500">Organisation</dt>
                        <dd className="font-bold text-slate-900">{form.associationName || "Non renseignée"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="font-semibold text-slate-500">Lieu</dt>
                        <dd className="font-bold text-slate-900">
                          {form.locationLabel || form.departureLocationLabel || "Non renseigné"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="font-semibold text-slate-500">Volume</dt>
                        <dd className="font-bold text-slate-900">{form.wasteKg || "0"} kg</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
                        <dt className="font-semibold text-slate-500">Bénévoles</dt>
                        <dd className="font-bold text-slate-900">{form.volunteersCount || "1"}</dd>
                      </div>
                    </dl>
                  </div>
                ) : previewSrc ? (
                  <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-950 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewSrc}
                      alt={`Prévisualisation ${selectedTarget?.label ?? ""}`}
                      className="block h-auto w-full"
                    />
                  </div>
                ) : null}
              </div>
            </section>

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

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">
                      Partage direct
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 sm:pr-2">
                      Copier le lien, partager nativement ou récupérer un texte prêt à publier
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                    Texte
                  </span>
                </div>

                <div className="mt-3">
                  {isCompactViewport ? (
                    <div className="grid grid-cols-3 gap-2">
                      <CmmButton
                        type="button"
                        tone="secondary"
                        size="sm"
                        variant="ghost"
                        className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-slate-700"
                        onClick={() => void handleNativeShare()}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Share2 size={14} />
                          Natif
                        </span>
                      </CmmButton>
                      <CmmButton
                        type="button"
                        tone="secondary"
                        size="sm"
                        variant="ghost"
                        className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-slate-700"
                        onClick={() => void handleCopyLink()}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Link2 size={14} />
                          Lien
                        </span>
                      </CmmButton>
                      <CmmButton
                        type="button"
                        tone="secondary"
                        size="sm"
                        variant="ghost"
                        className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold leading-tight text-slate-700"
                        onClick={() => void handleShareText()}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Copy size={14} />
                          Texte
                        </span>
                      </CmmButton>
                    </div>
                  ) : (
                    <>
                      <textarea
                        readOnly
                        value={shareText}
                        className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700 outline-none sm:min-h-40"
                      />

                      <div className="mt-3 flex flex-wrap gap-2">
                        <CmmButton type="button" tone="secondary" size="sm" onClick={() => void handleNativeShare()}>
                          Partager natif
                        </CmmButton>
                        <CmmButton type="button" tone="secondary" size="sm" onClick={() => void handleCopyLink()}>
                          Copier le lien
                        </CmmButton>
                        <CmmButton type="button" tone="secondary" size="sm" onClick={() => void handleShareText()}>
                          Copier le texte
                        </CmmButton>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <details
                className="rounded-[1.5rem] border border-slate-200 bg-white p-3"
                open={!isCompactViewport}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                      Historique des exports
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      Retéléchargez rapidement un fichier déjà produit
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
                    {history.length}
                  </span>
                </summary>

                {history.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {history.slice(0, isCompactViewport ? 2 : 4).map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-2.5 py-2.5 sm:px-3 sm:py-3"
                      >
                        <div className="flex items-start justify-between gap-2 sm:gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {entry.label}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500 sm:text-xs">
                              {entry.filename}
                            </p>
                            <p className="mt-1 hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">
                              {entry.sourceLabel}
                            </p>
                          </div>

                          <CmmButton
                            type="button"
                            tone="secondary"
                            size="sm"
                            className="shrink-0"
                            onClick={() => void handleReplayHistoryEntry(entry)}
                          >
                            Retélécharger
                          </CmmButton>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">
                    Aucun export n’a encore été généré dans cette session.
                  </p>
                )}
              </details>

              <div className="grid gap-3">
                {orderedTargets.map((target) => {
                  const Icon = targetIcons[target.id] ?? Download;
                  const isActive = target.id === selectedTarget?.id;
                  const isRecommended = activeBundle.targetIds.includes(target.id);

                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => onSelectTarget(target.id)}
                      className={cn(
                        "group flex items-start gap-3 rounded-[1.4rem] border p-4 text-left shadow-sm transition hover:translate-y-[-1px]",
                        isActive
                          ? "border-emerald-500 bg-emerald-50 shadow-md"
                          : getTargetTone(target),
                      )}
                    >
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/80 shadow-sm ring-1 ring-black/5">
                        <Icon size={18} className="text-current" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-black tracking-tight">{target.label}</p>
                          {isRecommended ? (
                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-800">
                              Conseillé
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-current/60">
                          {getSelectedTargetLabel(target)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-current/72">{target.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

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
              {activeBundleImageTargets.length > 1 ? (
                <CmmButton
                  type="button"
                  tone="secondary"
                  size="sm"
                  disabled={status !== "idle"}
                  onClick={() => void handleDownloadBundle()}
                >
                  {status === "exporting-bundle"
                    ? "Téléchargement en cours..."
                    : `Télécharger les ${activeBundleImageTargets.length} fichiers PNG`}
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
