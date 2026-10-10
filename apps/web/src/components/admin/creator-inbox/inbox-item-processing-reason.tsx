import type { CreatorInboxLocale } from "./creator-inbox-copy";

type InboxItemProcessingReasonProps = {
  locale: CreatorInboxLocale;
  actionReason: string;
  onActionReasonChange: (reason: string) => void;
};

export function InboxItemProcessingReason({
  locale,
  actionReason,
  onActionReasonChange,
}: InboxItemProcessingReasonProps) {
  return (
    <label className="mt-2 basis-full space-y-1">
      <span className="cmm-text-caption font-semibold cmm-text-secondary">
        {locale === "fr" ? "Motif de traitement" : "Processing reason"}
      </span>
      <textarea
        value={actionReason}
        onChange={(event) => onActionReasonChange(event.target.value)}
        minLength={5}
        maxLength={500}
        rows={2}
        placeholder={
          locale === "fr"
            ? "Expliquez le traitement (5 à 500 caractères)..."
            : "Explain the processing (5 to 500 characters)..."
        }
        className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
      />
      <span className="cmm-text-caption cmm-text-muted">
        {actionReason.trim().length}/500
      </span>
    </label>
  );
}
