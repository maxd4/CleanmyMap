import type { SubmissionState, ValidationIssue } from "./action-declaration-form.model";

type ActionDeclarationFormFeedbackProps = {
  submissionState: SubmissionState;
  createdId: string | null;
  errorMessage: string | null;
  isQuickMode: boolean;
  hasAttemptedSubmit: boolean;
  validationIssues: ValidationIssue[];
  optimisticLabel: string | null;
};

export function ActionDeclarationFormFeedback({
  submissionState,
  createdId,
  errorMessage,
  isQuickMode,
  hasAttemptedSubmit,
  validationIssues,
  optimisticLabel,
}: ActionDeclarationFormFeedbackProps) {
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
    </>
  );
}
