import { useMemo } from "react";
import type {
  PostActionRetentionLoop,
  SubmissionState,
  ValidationIssue,
} from "./action-declaration-form.model";

type ActionDeclarationFormFeedbackProps = {
  submissionState: SubmissionState;
  createdId: string | null;
  errorMessage: string | null;
  isQuickMode: boolean;
  hasAttemptedSubmit: boolean;
  validationIssues: ValidationIssue[];
  optimisticLabel: string | null;
  retentionLoop: PostActionRetentionLoop | null;
};

export function ActionDeclarationFormFeedback({
  submissionState,
  createdId,
  errorMessage,
  isQuickMode,
  hasAttemptedSubmit,
  validationIssues,
  optimisticLabel,
  retentionLoop,
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
      // Best-effort UX: share availability depends on browser permissions.
    }
  }

  return (
    <>
      <div className="md:col-span-2 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submissionState === "pending"}
          aria-live="polite"
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
        >
          {submissionState === "pending"
            ? "Envoi en cours..."
            : isQuickMode
              ? "Envoyer"
              : "Envoyer l'action"}
        </button>

        {submissionState === "success" && createdId ? (
          <p aria-live="polite" className="text-sm font-medium text-emerald-700">
            Enregistrée · Réf.{" "}
            <span className="font-mono">{createdId}</span>
          </p>
        ) : null}

        {submissionState === "error" && errorMessage ? (
          <p aria-live="polite" className="text-sm font-medium text-rose-700">
            {errorMessage}
          </p>
        ) : null}
      </div>

      {hasAttemptedSubmit && validationIssues.length > 0 ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <p className="font-semibold">Corrige avant envoi:</p>
          <ul className="mt-1 list-disc pl-5">
            {validationIssues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {optimisticLabel ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          En preparation pour{" "}
          <span className="font-semibold">{optimisticLabel}</span>...
        </div>
      ) : null}

      {submissionState === "success" ? (
        <div
          aria-live="polite"
          className="md:col-span-2 mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900"
        >
          <p className="font-semibold">Envoye</p>
          <p className="mt-1">
            En attente de validation admin. Visible en carte apres{" "}
            <span className="font-semibold">approved</span>.
          </p>
        </div>
      ) : null}

      {submissionState === "success" && retentionLoop ? (
        <div
          aria-live="polite"
          className="md:col-span-2 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="font-semibold text-lg">Bravo pour ton action ! 🌿</p>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 uppercase tracking-wide">
              {retentionLoop.badge}
            </span>
          </div>
          
          <p className="mt-1 leading-relaxed">{retentionLoop.summary}</p>
          
          <p className="mt-3 text-emerald-800 font-medium">
            💡 Prochaine étape : {retentionLoop.nextActionSuggestion}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 shadow-sm"
            >
              Partager mon impact
            </button>
            <a
              href="/actions/history"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 shadow-sm"
            >
              Voir mon historique
            </a>
            <a
              href="/actions/map"
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 shadow-sm"
            >
              Consulter la carte
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
