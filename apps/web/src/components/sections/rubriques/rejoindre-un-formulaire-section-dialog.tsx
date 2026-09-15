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
        ? "Annuler cette inscription ?"
        : "Cancel this registration?"
    : fr
      ? "Confirmer cette inscription ?"
      : "Confirm this registration?";
  const confirmLabel = isLeaveFlow
    ? pendingAction.awaitingApproval
      ? fr
        ? "Annuler la demande"
        : "Cancel request"
      : fr
        ? "Annuler l'inscription"
        : "Cancel registration"
    : fr
      ? "Envoyer la demande"
      : "Send request";
  const dialogDescription = isLeaveFlow
    ? pendingAction.awaitingApproval
      ? fr
        ? "Votre demande disparaîtra de la file publique et pourra être refaite plus tard."
        : "Your request will disappear from the public queue and can be submitted again later."
      : fr
        ? "Votre inscription sera annulée, tout en restant tracée dans votre historique."
        : "Your registration will be cancelled while remaining traceable in your history."
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
                    ? "Cette inscription sera annulée pour cette action."
                    : "This registration will be cancelled for this action."}
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
                  ? "L'organisateur de l'action ou un admin peut l'accepter ou la refuser. Une inscription acceptée ne confirme pas une présence sur le terrain."
                  : "The form creator or an admin can accept or reject it. An accepted registration does not confirm field presence."}
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
              {fr ? "inscription(s)" : "registration(s)"}
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
