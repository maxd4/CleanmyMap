import { AlertCircle } from "lucide-react";
import type {
  PostActionRetentionLoop,
  SubmissionState,
  ValidationIssue,
} from "../model";
import type { ActionEditorRecord } from "@/lib/actions/http";
import { ActionDeclarationFormFeedbackSuccess } from "./action-declaration-form-feedback-success";

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
    </div>
  );
}
