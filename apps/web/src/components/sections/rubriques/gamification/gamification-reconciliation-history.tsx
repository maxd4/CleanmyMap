"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { History } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { CmmButton } from "@/components/ui/cmm-button";
import { navigateToGamificationTarget } from "./gamification-focus";
import { GamificationReconciliationDetail } from "./gamification-reconciliation-detail";
import { buildReconciliationDetailCopy } from "./gamification-reconciliation-detail.model";
import type { GamificationReconciliationHistoryEntry } from "@/lib/gamification/gamification-reconciliation-notice";
import type { UserProgressionResponse } from "@/lib/gamification/progression-types";

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatNumber(value: number | null, locale: string): string {
  return value === null ? "—" : new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US").format(value);
}

function formatXpDelta(value: number, locale: string): string {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${formatNumber(Math.abs(value), locale)} XP`;
}

function changeCounts(entry: GamificationReconciliationHistoryEntry): {
  badges: number;
  progressions: number;
  milestones: number;
} {
  const { receipt } = entry;
  return {
    badges: receipt.badges.unlocked.length + receipt.badges.removed.length + receipt.badges.upgraded.length + receipt.badges.downgraded.length,
    progressions: receipt.progressions.added.length + receipt.progressions.removed.length + receipt.progressions.changed.length,
    milestones: receipt.milestones.unlocked.length + receipt.milestones.removed.length,
  };
}

function findTargetedEntry(
  entries: GamificationReconciliationHistoryEntry[],
  serverTarget: GamificationReconciliationHistoryEntry | null | undefined,
  receiptId: string | null,
  dismissedReceiptId: string | null,
): GamificationReconciliationHistoryEntry | null {
  if (!receiptId || receiptId === dismissedReceiptId) return null;
  if (serverTarget?.notificationId === receiptId) return serverTarget;
  return entries.find((entry) => entry.notificationId === receiptId) ?? null;
}

function HistoryEntry({
  entry,
  locale,
  onOpen,
}: {
  entry: GamificationReconciliationHistoryEntry;
  locale: string;
  onOpen: () => void;
}) {
  const fr = locale === "fr";
  const counts = changeCounts(entry);
  return (
    <li className="rounded-2xl border border-[#ead8d2] bg-white p-4 shadow-[0_8px_24px_rgba(126,31,20,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <time dateTime={entry.createdAt} className="text-sm font-black text-[#2c1a17]">
            {formatDate(entry.createdAt, locale)}
          </time>
          <p className="mt-1 text-xs font-semibold text-[#806b65]">
            {fr ? "Règles CURRENT" : "CURRENT rules"} : {entry.receipt.currentRulesVersion}
          </p>
        </div>
        <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={onOpen}>
          {fr ? "Voir le détail" : "View details"}
        </CmmButton>
      </div>
      <dl className="mt-4 grid gap-3 text-xs text-[#765f59] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-[#a48d86]">XP</dt>
          <dd className="mt-1 font-bold">{formatXpDelta(entry.receipt.xp.delta, locale)}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-[#a48d86]">{fr ? "Niveau" : "Level"}</dt>
          <dd className="mt-1 font-bold">{formatNumber(entry.receipt.level.before, locale)} → {formatNumber(entry.receipt.level.after, locale)}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-[#a48d86]">{fr ? "Progressions" : "Progressions"}</dt>
          <dd className="mt-1 font-bold">{counts.progressions}</dd>
        </div>
        <div>
          <dt className="font-black uppercase tracking-[0.14em] text-[#a48d86]">{fr ? "Badges · jalons" : "Badges · milestones"}</dt>
          <dd className="mt-1 font-bold">{counts.badges} · {counts.milestones}</dd>
        </div>
      </dl>
    </li>
  );
}

function HistoryContent({
  entries,
  error,
  locale,
  onOpen,
}: {
  entries: GamificationReconciliationHistoryEntry[];
  error: unknown;
  locale: string;
  onOpen: (entry: GamificationReconciliationHistoryEntry) => void;
}) {
  const fr = locale === "fr";
  return (
    <div className="mt-5 border-t border-[#f1dfd8] pt-5">
      {error ? (
        <p className="text-sm font-semibold text-[#b4362e]" role="alert">{fr ? "L’historique est momentanément indisponible." : "History is temporarily unavailable."}</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[#806b65]">{fr ? "Aucune mise à jour de progression enregistrée." : "No progress update recorded."}</p>
      ) : (
        <ol className="space-y-3" aria-label={fr ? "Reçus de réconciliation, du plus récent au plus ancien" : "Reconciliation receipts, newest first"}>
          {entries.map((entry) => (
            <HistoryEntry key={entry.notificationId} entry={entry} locale={locale} onOpen={() => onOpen(entry)} />
          ))}
        </ol>
      )}
    </div>
  );
}

export function GamificationReconciliationHistory({
  history,
  progression,
  loading,
  error,
  locale,
  targetedEntry: serverTarget,
}: {
  history: GamificationReconciliationHistoryEntry[] | undefined;
  progression: UserProgressionResponse | undefined;
  loading: boolean;
  error: unknown;
  locale: string;
  targetedEntry?: GamificationReconciliationHistoryEntry | null;
}) {
  const fr = locale === "fr";
  const searchParams = useSearchParams();
  const receiptId = searchParams?.get("receipt") ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<GamificationReconciliationHistoryEntry | null>(null);
  const [dismissedReceiptId, setDismissedReceiptId] = useState<string | null>(null);
  const entries = useMemo(() => history ?? [], [history]);
  const hash = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("hashchange", onStoreChange);
      return () => window.removeEventListener("hashchange", onStoreChange);
    },
    () => window.location.hash,
    () => "",
  );
  const targetedEntry = useMemo(
    () => findTargetedEntry(entries, serverTarget, receiptId, dismissedReceiptId),
    [dismissedReceiptId, entries, receiptId, serverTarget],
  );
  const activeEntry = selectedEntry ?? targetedEntry;
  const selectedDetailCopy = useMemo(
    () => activeEntry && progression
      ? buildReconciliationDetailCopy(activeEntry.receipt, progression, locale)
      : null,
    [activeEntry, locale, progression],
  );

  function closeDetail() {
    setSelectedEntry(null);
    if (targetedEntry) setDismissedReceiptId(targetedEntry.notificationId);
  }

  function focusTarget(targetId: string) {
    closeDetail();
    window.setTimeout(() => navigateToGamificationTarget(targetId), 0);
  }

  return (
    <section id="gamification-reconciliation-history" className="scroll-mt-8 rounded-[2.25rem] border border-[#ead8d2] bg-white p-5 shadow-[0_12px_40px_rgba(126,31,20,0.05)] sm:p-6">
      <details
        open={isOpen || hash === "#gamification-reconciliation-history" || Boolean(targetedEntry)}
        onToggle={(event) => setIsOpen(event.currentTarget.open)}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c51f1f]/40">
          <span className="flex min-w-0 items-center gap-3">
            <History size={18} className="shrink-0 text-[#c51f1f]" aria-hidden="true" />
            <span>
              <span className="block text-base font-black text-[#2c1a17]">{fr ? "Historique des mises à jour de progression" : "Progress update history"}</span>
              <span className="mt-1 block text-xs text-[#806b65]">
                {loading
                  ? (fr ? "Chargement…" : "Loading…")
                  : fr
                    ? `${entries.length} reçu${entries.length === 1 ? "" : "s"} conservé${entries.length === 1 ? "" : "s"}`
                    : `${entries.length} receipt${entries.length === 1 ? "" : "s"} retained`}
              </span>
            </span>
          </span>
          <span className="shrink-0 text-xs font-black uppercase tracking-[0.14em] text-[#b4362e]">{isOpen ? (fr ? "Réduire" : "Collapse") : (fr ? "Afficher" : "Show")}</span>
        </summary>

        <HistoryContent entries={entries} error={error} locale={locale} onOpen={setSelectedEntry} />
      </details>

      {selectedDetailCopy ? (
        <GamificationReconciliationDetail
          open
          copy={selectedDetailCopy}
          locale={locale}
          onClose={closeDetail}
          onFocusTarget={focusTarget}
        />
      ) : null}
    </section>
  );
}
