import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertCircle,
  ClipboardCopy,
  ExternalLink,
  Link2,
  RotateCcw,
  Share2,
} from "lucide-react";
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
  groupJoinHref?: string | null;
  showGroupInvite?: boolean;
  isAutoApprovedSubmission?: boolean;
  onReset?: () => void;
};

export function ActionDeclarationFormFeedback({
  submissionState,
  createdId,
  errorMessage,
  hasAttemptedSubmit,
  validationIssues,
  retentionLoop,
  groupJoinHref,
  showGroupInvite,
  isAutoApprovedSubmission = false,
  onReset,
}: ActionDeclarationFormFeedbackProps) {
  const shareUrl = useMemo(() => {
    if (!retentionLoop) return "";
    if (typeof window === "undefined") return retentionLoop.share.url;
    return new URL(retentionLoop.share.url, window.location.origin).toString();
  }, [retentionLoop]);
  const resolvedGroupJoinHref = useMemo(() => {
    if (!showGroupInvite || !groupJoinHref) {
      return "";
    }

    if (typeof window === "undefined") {
      return groupJoinHref;
    }

    return new URL(groupJoinHref, window.location.origin).toString();
  }, [groupJoinHref, showGroupInvite]);
  const [groupLinkCopied, setGroupLinkCopied] = useState(false);

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

  async function handleGroupInviteShare() {
    if (!resolvedGroupJoinHref) {
      return;
    }

    const text = isAutoApprovedSubmission
      ? `Partager le formulaire public: ${resolvedGroupJoinHref}`
      : `Créer un formulaire après validation: ${resolvedGroupJoinHref}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: isAutoApprovedSubmission
            ? "Formulaire public CleanMyMap"
            : "Créer un formulaire CleanMyMap",
          text,
          url: resolvedGroupJoinHref,
        });
        return;
      }

      await navigator.clipboard.writeText(text);
      setGroupLinkCopied(true);
      window.setTimeout(() => setGroupLinkCopied(false), 2500);
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
                {isAutoApprovedSubmission
                  ? "Publiée immédiatement. Elle est déjà visible dans les formulaires de groupe, mais les nouvelles participations restent soumises à validation."
                  : "En attente de validation par un administrateur."}
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

          {showGroupInvite && createdId && resolvedGroupJoinHref && (
            <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
                    {isAutoApprovedSubmission ? "Formulaire publié" : "Créer un formulaire"}
                  </p>
                  <p className="text-sm font-semibold text-sky-950">
                    {isAutoApprovedSubmission
                      ? "Cette action est déjà visible dans les formulaires de groupe."
                      : "Cette action pourra être rejointe après validation."}
                  </p>
                  <p className="text-xs leading-relaxed text-sky-900/70">
                    {isAutoApprovedSubmission
                      ? "L'organisateur principal et les coorganisateurs peuvent partager ce lien dès maintenant. Les bénévoles passeront ensuite par la file d'attente avant validation."
                      : "L'organisateur principal et les coorganisateurs peuvent partager ce lien. Il devient actif après validation."}
                  </p>
                </div>
                <div className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-sky-800">
                  {isAutoApprovedSubmission ? "Visible maintenant" : "Prêt à partager"}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={resolvedGroupJoinHref}
                  prefetch
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-100 transition"
                >
                  <Link2 size={13} />
                  Créer le formulaire
                </Link>
                <button
                  type="button"
                  onClick={() => void handleGroupInviteShare()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-50 transition"
                >
                  <ClipboardCopy size={13} />
                  {groupLinkCopied ? "Lien copié" : "Copier le lien"}
                </button>
              </div>
            </div>
          )}

          {showGroupInvite && (
            <div className="rounded-2xl border border-emerald-200/70 bg-[#F6FBF7] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                  {isAutoApprovedSubmission ? "Cycle public" : "Après publication"}
                </p>
                <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-800">
                  Cycle groupe
                </span>
              </div>
              <ul className="space-y-2 text-xs leading-relaxed text-emerald-950/80">
                <li>
                  Le bénévole rejoint un formulaire déjà validé, sans créer une nouvelle action.
                </li>
                <li>Sa demande passe en file d&apos;attente et doit être acceptée par le créateur ou un admin.</li>
                <li>La participation alimente la progression collective et les badges après jonction.</li>
                <li>L&apos;organisateur voit le compteur, l&apos;historique et le statut ouvert ou fermé.</li>
                <li>La participation n&apos;est pas éditable côté bénévole depuis cette page.</li>
                <li>Vous pouvez fermer ou rouvrir les inscriptions plus tard depuis l&apos;historique des actions.</li>
              </ul>
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
