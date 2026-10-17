import { AlertCircle } from "lucide-react";
import type {
  PostActionRetentionLoop,
  SubmissionState,
  ValidationIssue,
} from "../model";
import type { ActionEditorRecord } from "@/lib/actions/http";
import { ActionDeclarationFormFeedbackSuccess } from "./action-declaration-form-feedback-success";
import type { ActionMediaUploadState } from "../hooks/use-action-declaration-submission";

type ActionDeclarationFormFeedbackProps = {
  submissionState: SubmissionState;
  createdId: string | null;
  errorMessage: string | null;
  hasAttemptedSubmit: boolean;
  validationIssues: ValidationIssue[];
  retentionLoop: PostActionRetentionLoop | null;
  recordedAction?: ActionEditorRecord | null;
  groupJoinHref?: string | null;
  showGroupInvite?: boolean;
  onReset?: () => void;
  actionMediaUpload?: ActionMediaUploadState;
  onRetryActionMedia?: () => void;
};

export function ActionDeclarationFormFeedback({
  submissionState,
  createdId,
  errorMessage,
  hasAttemptedSubmit,
  validationIssues,
  retentionLoop,
  recordedAction = null,
  groupJoinHref,
  showGroupInvite,
  onReset,
  actionMediaUpload,
  onRetryActionMedia,
}: ActionDeclarationFormFeedbackProps) {
  return (
    <div className="space-y-3">
      {hasAttemptedSubmit && validationIssues.length > 0 && (
        <div className="rounded-2xl border border-rose-200/70 bg-[#FFF7F8] p-4 space-y-1 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-500 shrink-0" />
            <p className="text-sm font-semibold text-rose-950">Champs requis manquants</p>
          </div>
          <ul className="pl-5 space-y-0.5">
            {validationIssues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`} className="text-xs text-rose-800/78 list-disc">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submissionState === "error" && errorMessage && (
        <div className="rounded-2xl border border-rose-200/70 bg-[#FFF7F8] p-4 flex items-start gap-3 backdrop-blur-xl">
          <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-950">Envoi impossible</p>
            <p className="text-xs text-rose-800/78 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {submissionState === "success" && (
        <ActionDeclarationFormFeedbackSuccess
          createdId={createdId}
          retentionLoop={retentionLoop}
          recordedAction={recordedAction}
          groupJoinHref={groupJoinHref}
          showGroupInvite={showGroupInvite}
          onReset={onReset}
        />
      )}

      {submissionState === "success" && actionMediaUpload && actionMediaUpload.status !== "idle" ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            actionMediaUpload.status === "partial"
              ? "border-amber-200 bg-amber-50 text-amber-950"
              : "border-emerald-200 bg-emerald-50 text-emerald-950"
          }`}
          role="status"
          aria-live="polite"
        >
          <p className="font-semibold">
            {actionMediaUpload.status === "uploading"
              ? "Transmission des photos de bilan…"
              : actionMediaUpload.status === "partial"
                ? `${actionMediaUpload.uploadedCount} photo(s) conservée(s), ${actionMediaUpload.failed.length} à réessayer.`
                : `${actionMediaUpload.uploadedCount} photo(s) de bilan conservée(s).`}
          </p>
          {actionMediaUpload.failed.length > 0 ? (
            <>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                {actionMediaUpload.failed.map(({ asset, message }) => (
                  <li key={asset.id}>{asset.name}: {message}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onRetryActionMedia}
                disabled={actionMediaUpload.status === "uploading"}
                className="mt-3 rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-bold text-amber-900 disabled:opacity-50"
              >
                {actionMediaUpload.status === "uploading" ? "Nouvel essai…" : "Réessayer les photos"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
