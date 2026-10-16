import { useState } from "react";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { CreatorInboxCopy, CreatorInboxLocale } from "./creator-inbox-copy";

type FeedbackQualificationDecision =
  | "pending"
  | "needs_info"
  | "accepted"
  | "duplicate"
  | "rejected";

type FeedbackQualificationControlsProps = {
  item: CreatorInboxItem;
  feedbackOptions: CreatorInboxItem[];
  locale: CreatorInboxLocale;
  copy: CreatorInboxCopy;
  busy: boolean;
  onQualify: (params: {
    decision: FeedbackQualificationDecision;
    reason: string;
    duplicateFeedbackId: string | null;
  }) => void;
};

const DECISION_LABELS = {
  pending: { fr: "En attente", en: "Pending" },
  needs_info: { fr: "Demander des précisions", en: "Request more information" },
  accepted: { fr: "Pertinent", en: "Relevant" },
  duplicate: { fr: "Doublon", en: "Duplicate" },
  rejected: { fr: "Non retenu", en: "Not retained" },
} as const;

function formatQualificationDate(value: string | null, locale: CreatorInboxLocale): string {
  if (!value) return locale === "fr" ? "Jamais qualifié" : "Not qualified yet";
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function FeedbackQualificationControls({
  item,
  feedbackOptions,
  locale,
  copy,
  busy,
  onQualify,
}: FeedbackQualificationControlsProps) {
  const [decision, setDecision] = useState<FeedbackQualificationDecision>(
    item.qualification?.status ?? "pending",
  );
  const [reason, setReason] = useState(item.qualification?.reason ?? "");
  const [duplicateFeedbackId, setDuplicateFeedbackId] = useState(
    item.qualification?.duplicateFeedbackId ?? "",
  );
  const [confirming, setConfirming] = useState(false);
  const fr = locale === "fr";
  const reasonRequired = ["needs_info", "duplicate", "rejected"].includes(decision);
  const selectedDuplicate = feedbackOptions.find(
    (option) => option.sourceRecordId === duplicateFeedbackId,
  );

  function prepareConfirmation() {
    if (reasonRequired && reason.trim().length < 5) return;
    if (decision === "duplicate" && !duplicateFeedbackId) return;
    setConfirming(true);
  }

  return (
    <fieldset className="mt-4 basis-full rounded-xl border border-amber-200 bg-amber-50/70 p-3">
      <legend className="px-1 text-sm font-bold text-amber-900">
        {fr ? "Qualification max" : "Max qualification"}
      </legend>
      <p className="mt-1 text-xs text-amber-900/80">
        {fr
          ? `Dernière décision : ${DECISION_LABELS[item.qualification?.status ?? "pending"][locale]} · ${formatQualificationDate(item.qualification?.decidedAt ?? null, locale)}`
          : `Last decision: ${DECISION_LABELS[item.qualification?.status ?? "pending"][locale]} · ${formatQualificationDate(item.qualification?.decidedAt ?? null, locale)}`}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">
            {fr ? "Décision" : "Decision"}
          </span>
          <select
            value={decision}
            onChange={(event) => {
              setDecision(event.target.value as FeedbackQualificationDecision);
              setConfirming(false);
            }}
            disabled={busy}
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
          >
            {(Object.keys(DECISION_LABELS) as FeedbackQualificationDecision[]).map((value) => (
              <option key={value} value={value}>
                {DECISION_LABELS[value][locale]}
              </option>
            ))}
          </select>
        </label>
        {decision === "duplicate" ? (
          <label className="space-y-1">
            <span className="cmm-text-caption font-semibold cmm-text-secondary">
              {fr ? "Retour doublon" : "Duplicate feedback"}
            </span>
            <select
              value={duplicateFeedbackId}
              onChange={(event) => {
                setDuplicateFeedbackId(event.target.value);
                setConfirming(false);
              }}
              disabled={busy}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
            >
              <option value="">{fr ? "Sélectionner une référence" : "Select a reference"}</option>
              {feedbackOptions
                .filter((option) => option.sourceRecordId !== item.sourceRecordId)
                .map((option) => (
                  <option key={option.sourceRecordId} value={option.sourceRecordId}>
                    {option.title} · {option.sourceRecordId}
                  </option>
                ))}
            </select>
            {selectedDuplicate ? (
              <span className="block text-xs text-amber-900/80">{selectedDuplicate.title}</span>
            ) : null}
          </label>
        ) : null}
      </div>
      <label className="mt-3 block space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">
          {fr ? "Motif public" : "Public reason"}
          {reasonRequired ? " *" : ""}
        </span>
        <textarea
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setConfirming(false);
          }}
          minLength={reasonRequired ? 5 : undefined}
          maxLength={500}
          required={reasonRequired}
          rows={2}
          disabled={busy}
          placeholder={fr ? "Expliquez la décision..." : "Explain the decision..."}
          className="w-full resize-y rounded-lg border border-amber-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
        />
        <span className="cmm-text-caption cmm-text-muted">{reason.length}/500</span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {!confirming ? (
          <button
            type="button"
            disabled={
              busy ||
              (reasonRequired && reason.trim().length < 5) ||
              (decision === "duplicate" && !duplicateFeedbackId)
            }
            onClick={prepareConfirmation}
            className="rounded-lg bg-amber-700 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {fr ? "Qualifier" : "Qualify"}
          </button>
        ) : (
          <>
            <span className="self-center text-sm font-semibold text-amber-950">
              {fr ? "Confirmer cette décision ?" : "Confirm this decision?"}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onQualify({
                  decision,
                  reason: reason.trim(),
                  duplicateFeedbackId: decision === "duplicate" ? duplicateFeedbackId : null,
                });
                setConfirming(false);
              }}
              className="rounded-lg bg-amber-700 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? copy.states.processing : fr ? "Confirmer" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-2 cmm-text-caption font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {fr ? "Annuler" : "Cancel"}
            </button>
          </>
        )}
      </div>
    </fieldset>
  );
}
