import { useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, ExternalLink, RotateCcw, Share2 } from "lucide-react";
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
    if (!retentionLoop) return "";
    if (typeof window === "undefined") return retentionLoop.share.url;
    return new URL(retentionLoop.share.url, window.location.origin).toString();
  }, [retentionLoop]);

  async function handleShare() {
    if (!retentionLoop) return;
    const text = `${retentionLoop.share.text} ${shareUrl}`.trim();
    try {
      if (navigator.share) {
        await navigator.share({ text: retentionLoop.share.text, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(text);
    } catch {
      // best-effort
    }
  }

  return (
    <div className="space-y-3">
      {/* Validation inline */}
      {hasAttemptedSubmit && validationIssues.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-500 shrink-0" />
            <p className="text-sm font-semibold text-rose-700">Champs requis manquants</p>
          </div>
          <ul className="pl-5 space-y-0.5">
            {validationIssues.map((issue) => (
              <li key={`${issue.field}-${issue.message}`} className="text-xs text-rose-600 list-disc">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Erreur réseau/backend */}
      {submissionState === "error" && errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
          <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-700">Envoi impossible</p>
            <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Succès */}
      {submissionState === "success" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Déclaration envoyée</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                En attente de validation par un administrateur.
              </p>
              {createdId && (
                <p className="text-[10px] text-emerald-600 font-mono mt-1">Réf : {createdId}</p>
              )}
            </div>
          </div>

          {retentionLoop && (
            <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">🌿 {retentionLoop.summary}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                  {retentionLoop.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500">💡 {retentionLoop.nextActionSuggestion}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {createdId && (
              <Link
                href={`/actions/${createdId}`}
                prefetch
                className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 transition"
              >
                <ExternalLink size={13} />
                Voir ma déclaration
              </Link>
            )}
            {retentionLoop && (
              <button
                type="button"
                onClick={() => void handleShare()}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <Share2 size={13} />
                Partager
              </button>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <RotateCcw size={13} />
                Nouvelle déclaration
              </button>
            )}
            <Link
              href="/actions/history"
              prefetch
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Historique
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
