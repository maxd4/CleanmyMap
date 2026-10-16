import { useState } from "react";
import type {
  FeedbackTrackingStatus,
} from "@/lib/community/bug-reports-store";
import type { CreatorInboxItem } from "@/lib/community/creator-inbox";
import type { CreatorInboxLocale } from "./creator-inbox-copy";

type FeedbackTrackingControlsProps = {
  item: CreatorInboxItem;
  locale: CreatorInboxLocale;
  busy: boolean;
  onUpdate: (params: {
    status: FeedbackTrackingStatus;
    publicSummary: string | null;
    reference: string | null;
    shippedOn: string | null;
  }) => void;
};

const STATUS_LABELS: Record<FeedbackTrackingStatus, { fr: string; en: string }> = {
  not_planned: { fr: "Aucune réalisation décidée", en: "No delivery decided" },
  under_study: { fr: "À étudier", en: "Under study" },
  planned: { fr: "Planifié", en: "Planned" },
  in_progress: { fr: "En cours", en: "In progress" },
  shipped: { fr: "Livré", en: "Shipped" },
};

export function FeedbackTrackingControls({
  item,
  locale,
  busy,
  onUpdate,
}: FeedbackTrackingControlsProps) {
  const tracking = item.tracking;
  const [status, setStatus] = useState<FeedbackTrackingStatus>(tracking?.status ?? "not_planned");
  const [summary, setSummary] = useState(tracking?.publicSummary ?? "");
  const [reference, setReference] = useState(tracking?.reference ?? "");
  const [shippedOn, setShippedOn] = useState(tracking?.shippedOn ?? "");
  const fr = locale === "fr";

  const shippedNeedsFields = status === "shipped" && (summary.trim().length < 5 || !shippedOn);

  return (
    <fieldset className="mt-4 basis-full rounded-xl border border-cyan-200/60 bg-cyan-50/70 p-3">
      <legend className="px-1 text-sm font-bold text-cyan-950">
        {fr ? "Suivi de réalisation" : "Product follow-up"}
      </legend>
      <p className="mt-1 text-xs text-cyan-950/80">
        {fr
          ? "Ce suivi est indépendant de la pertinence et ne modifie pas les XP."
          : "This tracking state is independent from relevance and does not change XP."}
      </p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ? "État" : "Status"}</span>
          <select
            value={status}
            disabled={busy}
            onChange={(event) => setStatus(event.target.value as FeedbackTrackingStatus)}
            className="w-full rounded-lg border border-cyan-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
          >
            {(Object.keys(STATUS_LABELS) as FeedbackTrackingStatus[]).map((value) => (
              <option key={value} value={value}>{STATUS_LABELS[value][locale]}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ? "Livré le" : "Delivered on"}</span>
          <input
            type="date"
            value={shippedOn}
            disabled={busy}
            onChange={(event) => setShippedOn(event.target.value)}
            className="w-full rounded-lg border border-cyan-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
          />
        </label>
      </div>
      <label className="mt-3 block space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ? "Résumé public" : "Public summary"}</span>
        <textarea
          value={summary}
          maxLength={1000}
          rows={2}
          disabled={busy}
          onChange={(event) => setSummary(event.target.value)}
          className="w-full resize-y rounded-lg border border-cyan-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
        />
      </label>
      <label className="mt-3 block space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ? "Référence réelle (facultative)" : "Real reference (optional)"}</span>
        <input
          value={reference}
          maxLength={240}
          disabled={busy}
          onChange={(event) => setReference(event.target.value)}
          placeholder={fr ? "Version, publication ou commit" : "Version, release or commit"}
          className="w-full rounded-lg border border-cyan-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
        />
      </label>
      {shippedNeedsFields ? (
        <p className="mt-2 text-xs font-semibold text-cyan-950" role="status">
          {fr ? "Un résumé et une date confirmée sont requis pour déclarer la livraison." : "A summary and confirmed date are required to mark delivery."}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy || shippedNeedsFields}
        onClick={() => onUpdate({
          status,
          publicSummary: summary.trim() || null,
          reference: reference.trim() || null,
          shippedOn: shippedOn || null,
        })}
        className="mt-3 rounded-lg bg-cyan-800 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (fr ? "Enregistrement..." : "Saving...") : (fr ? "Enregistrer le suivi" : "Save follow-up")}
      </button>
    </fieldset>
  );
}
