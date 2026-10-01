"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { PendingGamificationReconciliation } from "@/lib/gamification/gamification-reconciliation-notice";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";
import { buildReconciliationNoticeCopy, type ReconciliationNoticeCopy } from "./gamification-reconciliation-notice.model";
import { GamificationReconciliationDetail } from "./gamification-reconciliation-detail";
import { buildReconciliationDetailCopy } from "./gamification-reconciliation-detail.model";
import { navigateToGamificationTarget } from "./gamification-focus";

type NoticeDirection = "up" | "down" | "same";

function getNoticeDirection(delta: number): NoticeDirection {
  return delta > 0 ? "up" : delta < 0 ? "down" : "same";
}

function useReconciliationAcknowledgement(
  notificationId: string,
  fr: boolean,
  onAcknowledged: () => Promise<void> | void,
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/gamification/me/acknowledge-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!response.ok) throw new Error(fr ? "Impossible d’enregistrer l’acquittement." : "Unable to save acknowledgement.");
      await onAcknowledged();
      window.setTimeout(() => document.getElementById("gamification-level-progress")?.focus(), 0);
    } catch (acknowledgementError) {
      setError(acknowledgementError instanceof Error ? acknowledgementError.message : (fr ? "Erreur inattendue." : "Unexpected error."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { acknowledge, error, isSubmitting };
}

function ReconciliationSummary({
  copy,
  deltaDirection,
  fr,
}: {
  copy: ReconciliationNoticeCopy;
  deltaDirection: NoticeDirection;
  fr: boolean;
}) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-label={fr ? "Résumé de la réconciliation" : "Reconciliation summary"}>
      <article className="rounded-[1.5rem] border border-[#f1d9d3] bg-[#fff7f5] p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#b53a33]">XP</p>
        <p className="mt-2 text-xl font-black text-[#281413]">{copy.xpBeforeAfter}</p>
        <p className="mt-1 flex items-center gap-1 text-sm font-bold text-[#7d625d]">
          {deltaDirection === "up" ? <ArrowUp size={16} aria-hidden="true" /> : deltaDirection === "down" ? <ArrowDown size={16} aria-hidden="true" /> : null}
          <span>{copy.xpDelta ?? (fr ? "XP inchangée" : "XP unchanged")}</span>
        </p>
      </article>
      <article className="rounded-[1.5rem] border border-[#eadfd9] bg-white p-4">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b7069]">{fr ? "Niveau" : "Level"}</p>
        <p className="mt-2 text-xl font-black text-[#281413]">{copy.level}</p>
        <p className="mt-1 text-sm text-[#7d625d]">{fr ? "Le niveau suit les règles CURRENT." : "The level follows the CURRENT rules."}</p>
      </article>
    </div>
  );
}

function ReconciliationActions({
  copy,
  fr,
  isSubmitting,
  onAcknowledge,
  onOpenDetails,
}: {
  copy: ReconciliationNoticeCopy;
  fr: boolean;
  isSubmitting: boolean;
  onAcknowledge: () => void;
  onOpenDetails: () => void;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <CmmButton type="button" tone="important" variant="pill" size="sm" onClick={onOpenDetails}>
        {fr ? "Voir le détail" : "View details"}
      </CmmButton>
      {copy.hasProgressionChanges ? (
        <CmmButton href={`#${copy.firstProgressionTarget}`} tone="secondary" variant="pill" size="sm">
          {fr ? "Voir mes nouvelles progressions" : "View my new progressions"}
        </CmmButton>
      ) : null}
      {copy.hasNewMilestonesOrBadges ? (
        <CmmButton href={`#${copy.firstMilestoneTarget}`} tone="secondary" variant="pill" size="sm">
          {fr ? "Voir mes nouveaux jalons" : "View my new milestones"}
        </CmmButton>
      ) : null}
      <CmmButton type="button" tone="primary" variant="pill" size="sm" loading={isSubmitting} onClick={onAcknowledge}>
        {fr ? "Compris" : "Got it"}
      </CmmButton>
    </div>
  );
}

export function GamificationReconciliationNotice({
  reconciliation,
  progression,
  locale,
  onAcknowledged,
}: {
  reconciliation: PendingGamificationReconciliation | null | undefined;
  progression: UserProgressionResponse | undefined;
  locale: string;
  onAcknowledged: () => Promise<void> | void;
}) {
  const fr = locale === "fr";
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { acknowledge, error, isSubmitting } = useReconciliationAcknowledgement(
    reconciliation?.notificationId ?? "",
    fr,
    onAcknowledged,
  );
  if (!reconciliation || !progression) return null;

  const copy = buildReconciliationNoticeCopy(reconciliation.receipt, progression, locale);
  const detailCopy = buildReconciliationDetailCopy(reconciliation.receipt, progression, locale);

  function focusTarget(targetId: string) {
    setIsDetailOpen(false);
    window.setTimeout(() => navigateToGamificationTarget(targetId), 0);
  }

  return (
    <section
      id="gamification-reconciliation-notice"
      className="rounded-[2.25rem] border border-[#efc7c1] bg-white p-6 shadow-[0_18px_60px_rgba(126,31,20,0.08)] lg:p-7"
      aria-labelledby="gamification-reconciliation-title"
      aria-live="polite"
      aria-atomic="false"
      role="status"
      data-testid="gamification-reconciliation-notice"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fff0ee] text-[#c51f1f]" aria-hidden="true">
          <RefreshCw size={21} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#b4362e]">
            {fr ? "Réconciliation" : "Reconciliation"}
          </p>
          <h2 id="gamification-reconciliation-title" className="mt-1 text-xl font-black text-[#2c1a17]">
            {fr ? "Votre progression a été recalculée" : "Your progress was recalculated"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#765f59]">
            {fr
              ? "Les règles de gamification ou les données prises en compte ont évolué. Votre progression a été recalculée à partir de vos contributions réelles."
              : "The gamification rules or the data considered have changed. Your progress was recalculated from your actual contributions."}
          </p>
        </div>
      </div>

      <ReconciliationSummary copy={copy} deltaDirection={getNoticeDirection(reconciliation.receipt.xp.delta)} fr={fr} />

      <ul id="gamification-reconciliation-changes" tabIndex={-1} className="mt-5 space-y-2" aria-label={fr ? "Détails des changements" : "Change details"}>
        {copy.changes.map((change, index) => (
          <li key={`${change}-${index}`} className="rounded-2xl border border-[#f0e3de] bg-[#fffaf9] px-4 py-3 text-sm font-semibold text-[#5f4843]">
            {change}
          </li>
        ))}
      </ul>

      <ReconciliationActions copy={copy} fr={fr} isSubmitting={isSubmitting} onAcknowledge={acknowledge} onOpenDetails={() => setIsDetailOpen(true)} />
      <GamificationReconciliationDetail
        open={isDetailOpen}
        copy={detailCopy}
        locale={locale}
        onClose={() => setIsDetailOpen(false)}
        onFocusTarget={focusTarget}
      />
      {error ? <p className="mt-3 text-sm font-semibold text-[#b4362e]" role="alert">{error}</p> : null}
    </section>
  );
}
