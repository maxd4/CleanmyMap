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
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {submissionState === "pending"
            ? "Envoi en cours..."
            : isQuickMode
              ? "Envoyer rapidement"
              : "Partager mon action"}
        </button>

        {submissionState === "success" && createdId ? (
          <p className="text-sm font-medium text-emerald-700">
            Action enregistree. Reference: <span className="font-mono">{createdId}</span>
          </p>
        ) : null}

        {submissionState === "error" && errorMessage ? (
          <p className="text-sm font-medium text-rose-700">{errorMessage}</p>
        ) : null}
      </div>

      {hasAttemptedSubmit && validationIssues.length > 0 ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p className="font-semibold">Correction requise avant envoi:</p>
          <ul className="mt-1 list-disc pl-5">
            {validationIssues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {optimisticLabel ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Declaration en preparation pour{" "}
          <span className="font-semibold">{optimisticLabel}</span>...
        </div>
      ) : null}

      {submissionState === "success" ? (
        <div className="md:col-span-2 mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          Cette declaration est en attente de validation admin. Elle apparaitra
          dans la vue carte par defaut une fois le statut passe a{" "}
          <span className="font-semibold">approved</span>.
        </div>
      ) : null}

      {submissionState === "success" && retentionLoop ? (
        <div className="md:col-span-2 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Resume automatique</p>
          <p className="mt-1">{retentionLoop.summary}</p>
          <p className="mt-2">
            Badge du moment: <span className="font-semibold">{retentionLoop.badge}</span>
          </p>
          <p className="mt-2 text-emerald-800">
            Prochaine action suggeree: {retentionLoop.nextActionSuggestion}
          </p>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            Partager mon impact
          </button>
        </div>
      ) : null}
    </>
  );
}
