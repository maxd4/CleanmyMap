import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  Link2,
  RotateCcw,
  Share2,
} from "lucide-react";
import type { ActionEditorRecord } from "@/lib/actions/http";
import { buildPostActionSummary } from "@/lib/actions/post-action-summary";
import type { PostActionRetentionLoop } from "../model";
import { ActionDeclarationFormFeedbackRecordedSummary } from "./action-declaration-form-feedback-recorded-summary";

type ActionDeclarationFormFeedbackSuccessProps = {
  createdId: string | null;
  retentionLoop: PostActionRetentionLoop | null;
  recordedAction?: ActionEditorRecord | null;
  groupJoinHref?: string | null;
  showGroupInvite?: boolean;
  onReset?: () => void;
};

function RetentionLoopFeedback({
  retentionLoop,
}: {
  retentionLoop: PostActionRetentionLoop;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-[#ECF8EF] p-3 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-emerald-950">🌿 {retentionLoop.summary}</p>
        {retentionLoop.badge ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 cmm-text-caption font-bold text-emerald-900 shrink-0">
            Badge attribué: {retentionLoop.badge}
          </span>
        ) : null}
      </div>
      <p className="text-xs text-emerald-900/80">{retentionLoop.thanksMessage}</p>
      <p className="text-xs text-emerald-900/70">💡 {retentionLoop.nextActionSuggestion}</p>
      {retentionLoop.xpAwarded > 0 ? (
        <p className="text-xs font-bold text-emerald-800">+{retentionLoop.xpAwarded} XP attribué</p>
      ) : (
        <p className="text-xs text-emerald-900/70">Aucun XP attribué à ce stade: il sera calculé après validation.</p>
      )}
    </div>
  );
}

function GroupInviteFeedback({
  resolvedGroupJoinHref,
}: {
  resolvedGroupJoinHref: string;
}) {
  const [groupLinkCopied, setGroupLinkCopied] = useState(false);

  async function handleGroupInviteShare() {
    const text = `Partager le formulaire après validation: ${resolvedGroupJoinHref}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Créer un formulaire CleanMyMap",
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
    <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-sky-700">Créer un formulaire</p>
          <p className="text-sm font-semibold text-sky-950">Cette action pourra être rejointe après validation.</p>
          <p className="text-xs leading-relaxed text-sky-950/80">
            L&apos;organisateur / référant principal et les coorganisateurs peuvent partager ce lien. Il devient actif après validation.
          </p>
        </div>
        <div className="rounded-full border border-sky-200 bg-white px-2.5 py-1 cmm-text-caption font-bold uppercase tracking-[0.16em] text-sky-800">
          Prêt à partager
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={resolvedGroupJoinHref}
          prefetch={false}
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
  );
}

function GroupCycleFeedback() {
  return (
    <div className="rounded-2xl border border-emerald-200/70 bg-[#F6FBF7] p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="cmm-text-caption font-black uppercase tracking-[0.18em] text-emerald-700">Après publication</p>
        <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 cmm-text-caption font-bold uppercase tracking-[0.16em] text-emerald-800">Cycle groupe</span>
      </div>
      <ul className="space-y-2 text-xs leading-relaxed text-emerald-950/80">
        <li>Le bénévole rejoint un formulaire déjà validé, sans créer une nouvelle action.</li>
        <li>Sa demande passe en file d&apos;attente et doit être acceptée par le créateur ou un admin.</li>
        <li>La participation alimente la progression collective et les badges après jonction.</li>
        <li>L&apos;organisateur / référant voit le compteur, l&apos;historique et le statut ouvert ou fermé.</li>
        <li>La participation n&apos;est pas éditable côté bénévole depuis cette page.</li>
        <li>Vous pouvez fermer ou rouvrir les inscriptions plus tard depuis l&apos;historique des actions.</li>
      </ul>
    </div>
  );
}

function SuccessFeedbackActions({
  createdId,
  retentionLoop,
  onShare,
  onReset,
}: {
  createdId: string | null;
  retentionLoop: PostActionRetentionLoop | null;
  onShare: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {createdId && (
        <Link
          href={`/actions/history?declaration=${encodeURIComponent(createdId)}`}
          prefetch={false}
          className="flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-[#ECF8EF] px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-[#E0F4E6] transition"
        >
          <ExternalLink size={13} />
          Voir ma déclaration
        </Link>
      )}
      {retentionLoop && (
        <button
          type="button"
          onClick={onShare}
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
      <Link href="/actions/map" prefetch={false} className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-950 hover:bg-sky-100 transition">Voir la carte</Link>
      <Link href="/reports" prefetch={false} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-950 hover:bg-rose-100 transition">Ouvrir le rapport</Link>
      <Link href="/actions/new" prefetch={false} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 transition">Prochaine action</Link>
      <Link href="/actions/history" prefetch={false} className="rounded-lg border border-emerald-200/70 bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-950 hover:bg-emerald-200 transition">Historique</Link>
    </div>
  );
}

export function ActionDeclarationFormFeedbackSuccess({
  createdId,
  retentionLoop,
  recordedAction = null,
  groupJoinHref,
  showGroupInvite,
  onReset,
}: ActionDeclarationFormFeedbackSuccessProps) {
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
  const postActionSummary = recordedAction
    ? buildPostActionSummary(recordedAction)
    : null;

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
    <div
      data-testid="post-action-confirmation"
      className="rounded-3xl border border-emerald-200/70 bg-[#F3FBF6] p-5 space-y-4 shadow-[0_20px_44px_-30px_rgba(34,197,94,0.18)] backdrop-blur-3xl"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-950">Action enregistrée</p>
          <p className="text-xs text-emerald-900/70 mt-0.5">
            En attente de validation par un administrateur.
          </p>
          {createdId && (
            <p className="cmm-text-caption text-emerald-800/80 font-mono mt-1">Réf : {createdId}</p>
          )}
        </div>
      </div>

      {postActionSummary ? (
        <ActionDeclarationFormFeedbackRecordedSummary summary={postActionSummary} />
      ) : (
        <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-xs leading-5 text-amber-950">
          La référence est enregistrée, mais les données détaillées n&apos;ont pas pu être relues. Aucun impact ou bonus n&apos;est affiché sans preuve enregistrée.
        </div>
      )}

      {retentionLoop && <RetentionLoopFeedback retentionLoop={retentionLoop} />}

      {showGroupInvite && createdId && resolvedGroupJoinHref && (
        <GroupInviteFeedback resolvedGroupJoinHref={resolvedGroupJoinHref} />
      )}

      {showGroupInvite && <GroupCycleFeedback />}

      <SuccessFeedbackActions
        createdId={createdId}
        retentionLoop={retentionLoop}
        onShare={() => void handleShare()}
        onReset={onReset}
      />
    </div>
  );
}
