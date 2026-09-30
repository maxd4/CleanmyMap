import { ArrowRight, Loader2 } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { CmmPill } from "@/components/ui/cmm-pill";
import type { ActionEditorRecord } from "@/lib/actions/http";
import type { FormState } from "../model";
import { buildPublicationSummary } from "./model";
import { ChatActionShareDialog } from "@/components/chat/chat-action-share-dialog";
import { buildJoinActionHref } from "@/lib/sections/join-action-routes";
import { AdministrativeRequirementsStatus } from "../../administrative-requirements-status";

function publicationVisibilityLabel(isPublished: boolean): string { return isPublished ? "Publié" : "Privé"; }
function publicationStatusLabel(isPublished: boolean): string { return isPublished ? "Action prête et publiée" : "Pré-action prête à publier"; }
function publicationReviewTitle(isPublished: boolean): string { return isPublished ? "Action prête et publiée" : "Vérifier avant publication"; }

function GuidedPreActionSummary({
  createdId,
  readiness,
  summary,
}: {
  createdId: string | null;
  readiness?: "unknown" | "ready" | "blocked";
  summary: ReturnType<typeof buildPublicationSummary>;
}) {
  const isReady = readiness === "ready";
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
      <div className="cmm-page-width">
        <CmmCard tone={isReady ? "emerald" : "amber"} variant="glass" size="lg">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2"><CmmPill tone={isReady ? "emerald" : "amber"} size="sm">{isReady ? "Prêt à publier" : "À revoir"}</CmmPill><span className="text-sm font-semibold text-emerald-950">{isReady ? "Préformulaire prêt à publier" : "Pré-action enregistrée"}</span></div>
            <h2 className="text-3xl font-black tracking-tight text-emerald-950">{isReady ? "Préformulaire prêt à publier" : "Pré-action enregistrée — vérification à terminer"}</h2>
            <p className="cmm-text-body cmm-text-primary max-w-2xl">{isReady ? "Les éléments obligatoires du contrat administratif sont traités. La publication reste une action explicite, hors de ce parcours." : "La même action peut être reprise. Revenez à l’étape Formalités locales pour qualifier les formalités réellement applicables avant toute publication."}</p>
            {createdId ? <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p> : null}
            <dl className="grid gap-3 sm:grid-cols-2" data-testid="guided-pre-action-summary">{summary.map((item) => <div key={item.label} className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3"><dt className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{item.label}</dt><dd className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-950">{item.value}</dd></div>)}</dl>
          </div>
        </CmmCard>
      </div>
    </div>
  );
}

export function ActionBeforeHydrationView() {
  return <div className="px-4 py-10 md:px-6 lg:px-8"><CmmCard tone="emerald" variant="glass" size="lg" className="mx-auto w-full max-w-2xl"><p className="text-sm font-semibold text-emerald-950" role="status">Reprise de l&apos;action en cours…</p></CmmCard></div>;
}

export function ActionBeforeTerminalView({ status, createdId }: { status: "rejected" | "cancelled"; createdId: string | null }) {
  const isCancelled = status === "cancelled";
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8"><div className="mx-auto w-full max-w-3xl"><CmmCard tone="amber" variant="glass" size="lg"><div className="space-y-4"><CmmPill tone="amber" size="sm">État terminal</CmmPill><h1 className="text-3xl font-black tracking-tight text-emerald-950">{isCancelled ? "Action annulée" : "Pré-action rejetée"}</h1><p className="text-sm leading-6 text-emerald-900/70">{isCancelled ? "Cette action est conservée dans l'historique et ne peut plus être reprise ni publiée." : "Cette pré-action a été rejetée et ne peut plus être reprise ni publiée."}</p>{createdId ? <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p> : null}</div></CmmCard></div></div>
  );
}

export function ActionBeforePublicationView({
  form,
  publishedAction,
  createdId,
  publishedAt,
  publicationState,
  publicationError,
  publicationConfirmationOpen,
  guidedWorkflow,
  guidedReadiness,
  shareActionId,
  onRequestPublish,
  onCancelPublication,
  onConfirmPublish,
  onContinueComplete,
  onShare,
}: {
  form: FormState;
  publishedAction: ActionEditorRecord | null;
  createdId: string | null;
  publishedAt: string | null;
  publicationState: "idle" | "pending" | "success" | "error";
  publicationError: string | null;
  publicationConfirmationOpen: boolean;
  guidedWorkflow: boolean;
  guidedReadiness: "unknown" | "ready" | "blocked";
  shareActionId: string | null;
  onRequestPublish: () => void;
  onCancelPublication: () => void;
  onConfirmPublish: () => void | Promise<void>;
  onContinueComplete: () => void;
  onShare: (actionId: string | null) => void;
}) {
  const isPublished = Boolean(publishedAt);
  const publicationSummary = buildPublicationSummary(publishedAction ?? form);
  if (guidedWorkflow) return <GuidedPreActionSummary createdId={createdId} readiness={guidedReadiness} summary={publicationSummary} />;
  return (
    <div className="space-y-6 px-4 py-6 md:px-6 lg:px-8">
      <div className="cmm-page-width"><CmmCard tone="emerald" variant="glass" size="lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3"><div className="flex flex-wrap items-center gap-2"><CmmPill tone="emerald" size="sm">{publicationVisibilityLabel(isPublished)}</CmmPill><span className="text-sm font-semibold text-emerald-950">{publicationStatusLabel(isPublished)}</span></div><h2 className="text-3xl font-black tracking-tight text-emerald-950">{publicationReviewTitle(isPublished)}</h2><p className="max-w-2xl text-sm leading-6 text-emerald-900/68">{isPublished ? "Cette action future est publique. Les bénévoles peuvent la consulter et la rejoindre depuis le parcours canonique." : "La pré-action reste privée tant que vous n'avez pas confirmé sa publication."}</p>{createdId ? <p className="text-xs font-mono text-emerald-900/60">Référence: {createdId}</p> : null}{publicationError ? <p className="text-sm font-semibold text-rose-700">{publicationError}</p> : null}</div>
          <div className="flex flex-col gap-2">{!isPublished ? <CmmButton tone="primary" variant="pill" size="md" onClick={onRequestPublish} disabled={publicationState === "pending"}>{publicationState === "pending" ? <Loader2 size={14} className="animate-spin" /> : null}{publicationState === "pending" ? "Publication…" : "Publier cette action"}</CmmButton> : null}{isPublished ? <><CmmButton tone="primary" variant="pill" size="md" href={`/actions/map?actionId=${encodeURIComponent(createdId ?? "")}`}>Voir l&apos;action</CmmButton><CmmButton tone="secondary" variant="pill" size="md" onClick={() => onShare(createdId)}>Partager dans la messagerie</CmmButton><CmmButton tone="secondary" variant="pill" size="md" href={buildJoinActionHref(createdId)}>Rejoindre une action</CmmButton></> : null}<AdministrativeRequirementsStatus actionId={createdId} initialAction={publishedAction} surface="summary" /><CmmButton tone="tertiary" variant="pill" size="md" onClick={onContinueComplete}>Passer au formulaire complet<ArrowRight size={14} /></CmmButton>{isPublished ? <CmmButton tone="tertiary" variant="pill" size="md" href="/sections/rejoindre-une-action">Voir les actions futures</CmmButton> : null}</div>
        </div>
        <div className="mt-6 border-t border-emerald-200/70 pt-5" data-testid="action-publication-summary"><h3 className="text-lg font-black text-emerald-950">{isPublished ? "Synthèse de l'action publiée" : "Récapitulatif avant publication"}</h3><dl className="mt-4 grid gap-3 sm:grid-cols-2">{publicationSummary.map((item) => <div key={item.label} className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3"><dt className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{item.label}</dt><dd className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-950">{item.value}</dd></div>)}</dl></div>
      </CmmCard></div>
      {publicationConfirmationOpen ? <CmmDialog open ariaLabelledBy="publish-action-title" ariaDescribedBy="publish-action-description" onClose={onCancelPublication} size="lg" panelClassName="border border-emerald-200/80 bg-white p-5 shadow-2xl"><div className="space-y-5"><div><h2 id="publish-action-title" className="mt-1 text-2xl font-black text-emerald-950">Confirmer la publication</h2><p id="publish-action-description" className="mt-2 text-sm leading-6 text-emerald-900/70">La publication rend cette même action visible dans les parcours publics. Elle ne crée aucune action, participation ou conversation.</p></div><dl className="grid gap-3 sm:grid-cols-2">{publicationSummary.map((item) => <div key={item.label} className="rounded-2xl border border-emerald-200/70 bg-[#F3FBF6] px-4 py-3"><dt className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">{item.label}</dt><dd className="mt-1 whitespace-pre-line text-sm leading-6 text-emerald-950">{item.value}</dd></div>)}</dl><div className="flex flex-wrap justify-end gap-2"><CmmButton tone="tertiary" variant="pill" size="md" onClick={onCancelPublication}>Annuler</CmmButton><CmmButton tone="primary" variant="pill" size="md" onClick={() => void onConfirmPublish()}>Confirmer et publier</CmmButton></div></div></CmmDialog> : null}
      {shareActionId ? <ChatActionShareDialog actionId={shareActionId} onClose={() => onShare(null)} /> : null}
    </div>
  );
}
