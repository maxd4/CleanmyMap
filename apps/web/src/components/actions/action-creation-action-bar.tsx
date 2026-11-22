"use client";

import { ArrowLeft, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDialog } from "@/components/ui/cmm-dialog";

export type ActionCreationActionBarConfig = {
  actionId: string | null;
  onConfirmDiscard?: () => boolean;
  onPrevious: () => void;
  previousDisabled: boolean;
  onNext?: () => void;
  isFinalStep: boolean;
  isAuthenticated: boolean;
  signInHref?: string;
  signUpHref?: string;
};

export function ActionCreationActionBar({
  config,
  submissionPending = false,
  fr = true,
}: {
  config: ActionCreationActionBarConfig;
  submissionPending?: boolean;
  fr?: boolean;
}) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const hasServerAction = Boolean(config.actionId);
  const canDiscard = Boolean(config.onConfirmDiscard);
  const discardLabel = hasServerAction
    ? fr ? "Abandonner les modifications locales" : "Discard local changes"
    : fr ? "Supprimer le brouillon" : "Delete draft";

  const closeConfirmation = () => {
    setConfirmationOpen(false);
    setDiscardError(null);
  };

  const confirmDiscard = () => {
    if (!config.onConfirmDiscard?.()) {
      setDiscardError(fr
        ? "La lecture ou la suppression du stockage local a échoué. Rien n’a été réinitialisé. Réessayez ou annulez."
        : "Local storage could not be read or cleared. Nothing was reset. Try again or cancel.");
      return;
    }
    closeConfirmation();
  };

  return (
    <>
      <div
        className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-white/90 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        data-testid="action-creation-action-bar"
      >
        {canDiscard ? <CmmButton
          type="button"
          tone="destructive"
          variant="pill"
          size="sm"
          disabled={submissionPending}
          onClick={() => setConfirmationOpen(true)}
        >
          <Trash2 size={14} aria-hidden="true" />
          {discardLabel}
        </CmmButton> : null}
        <div className="flex flex-wrap justify-end gap-2">
          {config.isFinalStep && !config.isAuthenticated ? <>
            {config.signInHref ? <CmmButton href={config.signInHref} tone="primary" variant="pill" size="sm">{fr ? "Se connecter et reprendre" : "Sign in and resume"}</CmmButton> : null}
            {config.signUpHref ? <CmmButton href={config.signUpHref} tone="secondary" variant="pill" size="sm">{fr ? "Créer un compte" : "Create an account"}</CmmButton> : null}
          </> : null}
          <CmmButton
            type="button"
            tone="tertiary"
            variant="pill"
            size="sm"
            disabled={config.previousDisabled || submissionPending}
            onClick={config.onPrevious}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            {fr ? "Étape précédente" : "Previous step"}
          </CmmButton>
          {config.isFinalStep ? (
            <CmmButton type="submit" tone="primary" variant="pill" size="sm" disabled={submissionPending}>
              {submissionPending ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}
              {submissionPending ? fr ? "Enregistrement…" : "Saving…" : fr ? "Enregistrer la préparation" : "Save preparation"}
            </CmmButton>
          ) : (
            <CmmButton type="button" tone="primary" variant="pill" size="sm" disabled={submissionPending || !config.onNext} onClick={config.onNext}>
              {fr ? "Suivant" : "Next"}
              <ArrowRight size={14} aria-hidden="true" />
            </CmmButton>
          )}
        </div>
      </div>

      <CmmDialog
        open={confirmationOpen && canDiscard}
        ariaLabelledBy="action-creation-discard-title"
        ariaDescribedBy="action-creation-discard-description"
        onClose={closeConfirmation}
        size="sm"
        panelClassName="border border-rose-200 bg-white p-5 shadow-2xl"
      >
        <div className="space-y-4">
          <div>
            <h2 id="action-creation-discard-title" className="text-lg font-black text-slate-950">
              {hasServerAction ? (fr ? "Abandonner les modifications locales ?" : "Discard local changes?") : (fr ? "Supprimer le brouillon local ?" : "Delete the local draft?")}
            </h2>
            <p id="action-creation-discard-description" className="mt-2 cmm-text-body leading-6 text-slate-800">
              {hasServerAction
                ? (fr ? "Seules les modifications conservées dans ce navigateur seront abandonnées. L’action enregistrée sur le serveur et son identifiant seront conservés." : "Only changes stored in this browser will be discarded. The server action and its identifier will be preserved.")
                : (fr ? "Le brouillon de ce navigateur sera supprimé et le formulaire réinitialisé. Aucune action ne sera créée ni publiée." : "This browser’s draft will be deleted and the form reset. No action will be created or published.")}
            </p>
          </div>
          {discardError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{discardError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <CmmButton type="button" tone="tertiary" variant="pill" size="sm" onClick={closeConfirmation}>{fr ? "Annuler" : "Cancel"}</CmmButton>
            <CmmButton type="button" tone="destructive" variant="pill" size="sm" onClick={confirmDiscard}>
              {hasServerAction ? (fr ? "Abandonner mes modifications" : "Discard my changes") : (fr ? "Supprimer le brouillon" : "Delete draft")}
            </CmmButton>
          </div>
        </div>
      </CmmDialog>
    </>
  );
}
