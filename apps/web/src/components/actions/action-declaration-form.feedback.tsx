import { useMemo } from "react";
import Link from "next/link";
import type {
  PostActionRetentionLoop,
  SubmissionState,
  ValidationIssue,
} from "./action-declaration-form.model";

type ActionDeclarationFormFeedbackProps = {
  submissionState: SubmissionState;
  createdId: string | null;
  errorMessage: string | null;
  hasAttemptedSubmit: boolean;
  validationIssues: ValidationIssue[];
  retentionLoop: PostActionRetentionLoop | null;
  /** Called when user chooses to declare a new action in-place (no navigation). */
  onReset?: () => void;
};

export function ActionDeclarationFormFeedback({
  submissionState,
  createdId,
  errorMessage,
  hasAttemptedSubmit,
  validationIssues,
  retentionLoop,
  onReset,
}: ActionDeclarationFormFeedbackProps) {
  const shareUrl = useMemo(() => {
    if (!retentionLoop) {
      return "";
    }
    if (typeof window === "undefined") {
      return retentionLoop.share.url;
    }
    return new URL(retentionLoop.share.url, window.location.origin).toString();
  }, [retentionLoop]);

  async function handleShare() {
    if (!retentionLoop) {
      return;
    }
    const text = `${retentionLoop.share.text} ${shareUrl}`.trim();
    try {
      if (navigator.share) {
        await navigator.share({
          text: retentionLoop.share.text,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      // Best-effort UX
    }
  }

  return (
    <>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submissionState === "pending"}
          className="rounded-lg bg-emerald-600 px-6 py-3 cmm-text-small font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-400"
        >
          {submissionState === "pending" ? "Envoi..." : "Envoyer"}
        </button>

        {submissionState === "success" && createdId && (
          <p className="cmm-text-small font-medium text-emerald-700">
            Enregistrée · {createdId}
          </p>
        )}

        {submissionState === "error" && errorMessage && (
          <p className="cmm-text-small font-medium text-rose-700">{errorMessage}</p>
        )}
      </div>

      {hasAttemptedSubmit && validationIssues.length > 0 && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 cmm-text-small text-rose-700">
          <p className="font-semibold">Erreurs:</p>
          <ul className="mt-1 list-disc pl-5">
            {validationIssues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      {submissionState === "success" && (
        <div className="md:col-span-2 mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 cmm-text-small text-sky-900">
          <p className="font-semibold">Envoyé</p>
          <p className="mt-1">En attente de validation admin.</p>
        </div>
      )}

      {submissionState === "success" && retentionLoop && (
        <div className="md:col-span-2 mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 cmm-text-small text-emerald-900">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="font-semibold text-base">Bravo ! 🌿</p>
            <span className="rounded-full bg-emerald-100 px-2 py-1 cmm-text-caption font-bold text-emerald-800">
              {retentionLoop.badge}
            </span>
          </div>

          <p className="mt-1">{retentionLoop.summary}</p>

          <p className="mt-2 text-emerald-800">
            💡 {retentionLoop.nextActionSuggestion}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 cmm-text-small font-semibold text-emerald-800 hover:bg-emerald-100 transition"
            >
              Partager
            </button>

            {/* In-place reset — stays on the form page */}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 cmm-text-small font-semibold text-emerald-900 hover:bg-emerald-100 transition"
              >
                ↺ Nouvelle déclaration
              </button>
            )}

            {/* Client-side nav — no full page reload */}
            <Link
              href="/actions/history"
              prefetch
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cmm-text-small font-semibold cmm-text-secondary hover:bg-slate-100 transition"
            >
              Historique
            </Link>
            <Link
              href="/actions/map"
              prefetch
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 cmm-text-small font-semibold cmm-text-secondary hover:bg-slate-100 transition"
            >
              Carte
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
