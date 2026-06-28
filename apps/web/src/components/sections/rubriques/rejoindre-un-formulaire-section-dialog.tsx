"use client";

import { useEffect, useRef } from "react";
import type { JoinableActionItem } from "@/lib/actions/group-participation";
import { formatCount, formatDate } from "./rejoindre-un-formulaire-section.format";

type JoinFormConfirmationDialogProps = {
  fr: boolean;
  pendingJoinAction: JoinableActionItem | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function JoinFormConfirmationDialog({
  fr,
  pendingJoinAction,
  onClose,
  onConfirm,
}: JoinFormConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!pendingJoinAction) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const previouslyFocusedElement = document.activeElement;
    if (previouslyFocusedElement instanceof HTMLElement) {
      previouslyFocusedElementRef.current = previouslyFocusedElement;
    }
    document.body.style.overflow = "hidden";

    const focusableSelector = [
      "button:not([disabled])",
      "[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialogElement = dialogRef.current;
      if (!dialogElement) {
        return;
      }

      const focusableElements = Array.from(
        dialogElement.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => !element.hasAttribute("disabled"));

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !dialogElement.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    window.setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedElementRef.current?.focus();
    };
  }, [onClose, pendingJoinAction?.id]);

  if (!pendingJoinAction) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-dialog-title"
        aria-describedby="join-dialog-description"
        className="w-full max-w-lg rounded-[2rem] border border-emerald-200 bg-white p-6 text-slate-900 shadow-[0_30px_80px_-32px_rgba(15,23,42,0.55)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700/70">
              {fr ? "Confirmation" : "Confirmation"}
            </p>
            <h2 id="join-dialog-title" className="text-xl font-black tracking-tight">
              {fr ? "Confirmer cette participation ?" : "Confirm this participation?"}
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
          <p>{fr ? "Votre demande apparaît dans la file publique." : "Your request appears in the public queue."}</p>
          <p>
            {fr
              ? "Le créateur du formulaire ou un admin peut l'accepter ou la refuser."
              : "The form creator or an admin can accept or reject it."}
          </p>
          <p>{fr ? "La demande n'est pas modifiable depuis cette page." : "Requests cannot be edited here."}</p>
          <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 px-4 py-3 text-slate-800">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/70">
              {fr ? "Action ciblée" : "Selected action"}
            </p>
            <p className="mt-1 font-semibold">{pendingJoinAction.location_label}</p>
            <p className="text-sm text-slate-600">
              {formatDate(pendingJoinAction.action_date, fr ? "fr" : "en")} · {formatCount(pendingJoinAction.participantsCount)}{" "}
              {fr ? "participant(s)" : "participant(s)"}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          >
            {fr ? "Annuler" : "Cancel"}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[color:var(--cmm-button-primary-border)] bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-start)_0%,var(--cmm-button-primary-bg-end)_100%)] px-5 text-sm font-semibold text-[var(--cmm-button-primary-text)] shadow-[0_14px_28px_-18px_rgba(15,23,42,0.20)] transition-all duration-200 hover:border-[color:var(--cmm-button-primary-border-hover)] hover:bg-[linear-gradient(135deg,var(--cmm-button-primary-bg-hover-start)_0%,var(--cmm-button-primary-bg-hover-end)_100%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--cmm-button-primary-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fr ? "Envoyer la demande" : "Send request"}
          </button>
        </div>
      </div>
    </div>
  );
}
