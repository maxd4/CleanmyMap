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

      {/* Erreur réseau/backend */}
      {submissionState === "error" && errorMessage && (
        <div className="rounded-2xl border border-rose-200/70 bg-[#FFF7F8] p-4 flex items-start gap-3 backdrop-blur-xl">
          <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-950">Envoi impossible</p>
            <p className="text-xs text-rose-800/78 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Succès */}
      {submissionState === "success" && (
        <div className="rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] p-5 space-y-4 shadow-[0_20px_44px_-30px_rgba(34,197,94,0.18)] backdrop-blur-3xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-950">Déclaration envoyée</p>
              <p className="text-xs text-emerald-900/70 mt-0.5">
                En attente de validation par un administrateur.
              </p>
              {createdId && (
                <p className="text-[10px] text-emerald-800/80 font-mono mt-1">Réf : {createdId}</p>
              )}
            </div>
          </div>

          {retentionLoop && (
            <div className="rounded-2xl border border-emerald-200/70 bg-[#ECF8EF] p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-emerald-950">🌿 {retentionLoop.summary}</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-900 shrink-0">
                  {retentionLoop.badge}
                </span>
              </div>
              <p className="text-xs text-emerald-900/80">{retentionLoop.thanksMessage}</p>
              <p className="text-xs text-emerald-900/70">💡 {retentionLoop.nextActionSuggestion}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {createdId && (
              <Link
                href={`/actions/history?declaration=${encodeURIComponent(createdId)}`}
                prefetch
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-[#ECF8EF] px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-[#E0F4E6] transition"
              >
                <ExternalLink size={13} />
                Voir ma déclaration
              </Link>
            )}
            {retentionLoop && (
              <button
                type="button"
                onClick={() => void handleShare()}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-[#ECF8EF] transition"
              >
                <Share2 size={13} />
                Partager
              </button>
            )}
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-white/70 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-[#ECF8EF] transition"
              >
                <RotateCcw size={13} />
                Nouvelle déclaration
              </button>
            )}
            <Link
              href="/actions/history"
              prefetch
              className="rounded-lg border border-emerald-200/70 bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-200 transition"
            >
              Historique
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
