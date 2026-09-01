"use client";

import { useRef } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import type { JoinableActionItem } from "@/lib/actions/participation/group-participation";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";

type JoinFormConfirmationDialogProps = {
  fr: boolean;
  mode: "join" | "leave";
  pendingAction: JoinableActionItem | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function JoinFormConfirmationDialog({
  fr,
  mode,
  pendingAction,
  onClose,
  onConfirm,
}: JoinFormConfirmationDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  if (!pendingAction) {
    return (
      <CmmDialog
        open={Boolean(pendingAction)}
        onClose={onClose}
        ariaLabelledBy="join-dialog-title"
        ariaDescribedBy="join-dialog-description"
        size="md"
        initialFocusRef={confirmButtonRef}
      >
        {null}
      </CmmDialog>
    );
  }

  const isLeaveFlow = mode === "leave";
  const dialogTitle = isLeaveFlow
    ? pendingAction.awaitingApproval
      ? fr
        ? "Annuler cette demande ?"
        : "Cancel this request?"
      : fr
        ? "Quitter ce formulaire ?"
        : "Leave this form?"
    : fr
      ? "Confirmer cette participation ?"
      : "Confirm this participation?";
  const confirmLabel = isLeaveFlow
    ? pendingAction.awaitingApproval
      ? fr
        ? "Annuler la demande"
        : "Cancel request"
      : fr
        ? "Quitter le formulaire"
        : "Leave the form"
    : fr
      ? "Envoyer la demande"
      : "Send request";
  const dialogDescription = isLeaveFlow
    ? pendingAction.awaitingApproval
      ? fr
        ? "Votre demande disparaîtra de la file publique et pourra être refaite plus tard."
        : "Your request will disappear from the public queue and can be submitted again later."
      : fr
        ? "Votre participation sera retirée du formulaire, tout en restant tracée dans votre historique."
        : "Your participation will be removed from the form while remaining traceable in your history."
    : fr
      ? "Votre demande apparaît dans la file publique."
      : "Your request appears in the public queue.";

  return (
    <CmmDialog
      open={Boolean(pendingAction)}
      onClose={onClose}
      ariaLabelledBy="join-dialog-title"
      ariaDescribedBy="join-dialog-description"
      size="md"
      initialFocusRef={confirmButtonRef}
      panelClassName="rounded-[2rem] border border-emerald-200 bg-white p-6 text-slate-900 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.55)]"
    >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
              {fr ? "Confirmation" : "Confirmation"}
            </p>
            <h2 id="join-dialog-title" className="text-xl font-black tracking-tight">
              {dialogTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
            aria-label={fr ? "Fermer la confirmation" : "Close confirmation"}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div id="join-dialog-description" className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
          {isLeaveFlow ? (
            <>
              <p>
                {pendingAction.awaitingApproval
                  ? fr
                    ? "Cette demande sera retirée de la file publique."
                    : "This request will be removed from the public queue."
                  : fr
                    ? "Cette participation sera retirée du formulaire."
                    : "This participation will be removed from the form."}
              </p>
              <p>
                {fr
                  ? "L'historique conservera la trace de cette modification."
                  : "Your history will keep a trace of this change."}
              </p>
            </>
          ) : (
            <>
              <p>{dialogDescription}</p>
              <p>
                {fr
                  ? "Le créateur du formulaire ou un admin peut l'accepter ou la refuser."
                  : "The form creator or an admin can accept or reject it."}
              </p>
            </>
          )}
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-slate-800">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
              {fr ? "Action ciblée" : "Selected action"}
            </p>
            <p className="mt-1 font-semibold">{pendingAction.location_label}</p>
            <p className="text-sm text-slate-600">
              {formatDate(pendingAction.action_date, fr ? "fr" : "en")} · {formatCount(pendingAction.participantsCount)}{" "}
              {fr ? "participant(s)" : "participant(s)"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <CmmButton
            onClick={onClose}
            tone="secondary"
            variant="pill"
            size="md"
          >
            {fr ? "Annuler" : "Cancel"}
          </CmmButton>
          <CmmButton
            ref={confirmButtonRef}
            onClick={onConfirm}
            tone={isLeaveFlow ? "destructive" : "primary"}
            variant="pill"
            size="md"
          >
            {confirmLabel}
          </CmmButton>
        </div>
    </CmmDialog>
  );
}
