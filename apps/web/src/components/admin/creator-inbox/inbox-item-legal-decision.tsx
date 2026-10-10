"use client";

import { useState } from "react";
import type { CreatorInboxItem, CreatorInboxSource } from "@/lib/community/creator-inbox";
import type {
  LegalContentReportDecisionAction,
  LegalContentReportDecisionOrigin,
} from "@/lib/legal-content-report/legal-content-report";
import type { LegalDecisionParams } from "./inbox-item-card.types";

type InboxItemLegalDecisionProps = {
  item: CreatorInboxItem;
  actionBusy: (source: CreatorInboxSource, id: string, action: string) => boolean;
  onLegalDecision: (params: LegalDecisionParams) => void;
};

export function InboxItemLegalDecision({
  item,
  actionBusy,
  onLegalDecision,
}: InboxItemLegalDecisionProps) {
  const [legalAction, setLegalAction] = useState<LegalContentReportDecisionAction>("reviewing");
  const [legalOrigin, setLegalOrigin] = useState<LegalContentReportDecisionOrigin>("received_notification");
  const [legalReason, setLegalReason] = useState("");
  const [legalBasis, setLegalBasis] = useState("");
  const [termsBasis, setTermsBasis] = useState("");
  const [automatedMeansUsed, setAutomatedMeansUsed] = useState(false);
  const requiresBasis = legalAction === "content_restricted" || legalAction === "content_removed";
  const hasOneBasis = Boolean(legalBasis.trim()) !== Boolean(termsBasis.trim());

  return (
    <div className="basis-full grid w-full gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="cmm-text-small font-semibold cmm-text-primary">
        Décision administrative tracée
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">Action</span>
          <select
            value={legalAction}
            onChange={(event) => setLegalAction(event.target.value as LegalContentReportDecisionAction)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
          >
            <option value="reviewing">Mise en examen</option>
            <option value="no_action">Aucune action</option>
            <option value="content_restricted">Restreindre le contenu</option>
            <option value="content_removed">Retirer le contenu</option>
            <option value="closed">Clôturer</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">Origine</span>
          <select
            value={legalOrigin}
            onChange={(event) => setLegalOrigin(event.target.value as LegalContentReportDecisionOrigin)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
          >
            <option value="received_notification">Notification reçue</option>
            <option value="internal_initiative">Initiative interne</option>
          </select>
        </label>
      </div>
      <label className="space-y-1">
        <span className="cmm-text-caption font-semibold cmm-text-secondary">Motif de la décision</span>
        <textarea
          value={legalReason}
          onChange={(event) => setLegalReason(event.target.value)}
          minLength={5}
          maxLength={2000}
          rows={2}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">Fondement légal (si applicable)</span>
          <textarea
            value={legalBasis}
            onChange={(event) => setLegalBasis(event.target.value)}
            maxLength={1000}
            rows={2}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
          />
        </label>
        <label className="space-y-1">
          <span className="cmm-text-caption font-semibold cmm-text-secondary">Fondement CGU (si applicable)</span>
          <textarea
            value={termsBasis}
            onChange={(event) => setTermsBasis(event.target.value)}
            maxLength={1000}
            rows={2}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 cmm-text-caption cmm-text-secondary">
        <input
          type="checkbox"
          checked={automatedMeansUsed}
          onChange={(event) => setAutomatedMeansUsed(event.target.checked)}
        />
        Des moyens automatisés ont-ils été utilisés ?
      </label>
      <button
        type="button"
        disabled={
          actionBusy(item.source, item.sourceRecordId, legalAction) ||
          legalReason.trim().length < 5 ||
          (requiresBasis && !hasOneBasis) ||
          (Boolean(legalBasis.trim()) && Boolean(termsBasis.trim()))
        }
        onClick={() =>
          onLegalDecision({
            item,
            action: legalAction,
            origin: legalOrigin,
            reason: legalReason,
            automatedMeansUsed,
            legalBasis: legalBasis.trim() || undefined,
            termsBasis: termsBasis.trim() || undefined,
          })
        }
        className="w-fit rounded-lg bg-slate-900 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {actionBusy(item.source, item.sourceRecordId, legalAction) ? "Enregistrement..." : "Enregistrer la décision"}
      </button>
    </div>
  );
}
