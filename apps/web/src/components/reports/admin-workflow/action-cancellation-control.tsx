"use client";

import { useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { CmmField, CmmInput, CmmSelect } from "@/components/ui/cmm-field";
import {
  ACTION_CANCELLATION_CONFIRMATION,
  ACTION_CANCELLATION_REASONS,
  type ActionCancellationReason,
} from "@/lib/actions/cancellation";
import { isFutureActionCancellationEligible } from "@/lib/actions/temporal";
import type { ActionListItem } from "@/lib/actions/types";

const REASON_LABELS: Record<ActionCancellationReason, string> = {
  weather: "Météo",
  organizer_unavailable: "Indisponibilité de l'organisateur",
  authorization_logistics: "Autorisation / logistique",
  insufficient_participants: "Nombre insuffisant de participants",
  moved: "Action déplacée",
  other: "Autre",
};

function isCancellablePreviewItem(item: ActionListItem): boolean {
  const actionPhase = item.contract?.metadata.actionPhase ?? null;
  return isFutureActionCancellationEligible({
    action_date: item.action_date,
    event_start_time: item.contract?.dates.eventStartTime ?? null,
    action_phase: actionPhase ?? "post_action_complete",
    status: item.status,
    published_at: item.published_at ?? null,
  });
}

export function ActionCancellationControl({
  item,
  onCancelled,
}: {
  item: ActionListItem;
  onCancelled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [reason, setReason] = useState<ActionCancellationReason | "">("");
  const [state, setState] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isCancellablePreviewItem(item)) {
    return null;
  }

  const close = () => {
    if (state !== "pending") {
      setOpen(false);
      setConfirmationText("");
      setReason("");
      setError(null);
      setState("idle");
    }
  };

  const cancel = async () => {
    if (confirmationText.trim().toUpperCase() !== ACTION_CANCELLATION_CONFIRMATION) {
      setError(`Saisissez exactement : ${ACTION_CANCELLATION_CONFIRMATION}`);
      setState("error");
      return;
    }

    setState("pending");
    setError(null);
    try {
      const response = await fetch(`/api/actions/${item.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmPhrase: confirmationText,
          reason: reason || null,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "L'annulation a échoué.");
      }
      setOpen(false);
      setConfirmationText("");
      setReason("");
      setError(null);
      setState("idle");
      onCancelled();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "L'annulation a échoué.");
      setState("error");
    }
  };

  return (
    <>
      <CmmButton
        type="button"
        tone="destructive"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Annuler l&apos;action
      </CmmButton>
      <CmmDialog
        open={open}
        onClose={close}
        ariaLabel="Confirmer l'annulation de l'action"
        size="sm"
      >
        <div className="space-y-4 p-5">
          <div>
            <h2 className="text-lg font-black text-slate-950">Annuler l&apos;action</h2>
            <p className="cmm-text-body mt-2">
              Cette action ne sera plus rejoignable ni affichée parmi les actions futures.
              Les participants, messages et références existants seront conservés.
            </p>
          </div>
          <CmmField label="Motif (facultatif)">
            <CmmSelect
              value={reason}
              onChange={(event) => setReason(event.target.value as ActionCancellationReason | "")}
            >
              <option value="">Ne pas préciser</option>
              {ACTION_CANCELLATION_REASONS.map((value) => (
                <option key={value} value={value}>{REASON_LABELS[value]}</option>
              ))}
            </CmmSelect>
          </CmmField>
          <CmmField
            label="Confirmation forte"
            required
            hint={`Saisissez exactement : ${ACTION_CANCELLATION_CONFIRMATION}`}
            error={error}
          >
            <CmmInput
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              autoComplete="off"
            />
          </CmmField>
          <div className="flex flex-wrap justify-end gap-2">
            <CmmButton type="button" tone="secondary" onClick={close} disabled={state === "pending"}>
              Conserver l&apos;action
            </CmmButton>
            <CmmButton
              type="button"
              tone="destructive"
              onClick={() => void cancel()}
              loading={state === "pending"}
              disabled={confirmationText.trim().toUpperCase() !== ACTION_CANCELLATION_CONFIRMATION}
            >
              Confirmer l&apos;annulation
            </CmmButton>
          </div>
        </div>
      </CmmDialog>
    </>
  );
}
