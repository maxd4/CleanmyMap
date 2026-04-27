"use client";

import { useState } from"react";
import { useRouter } from"next/navigation";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import type { PublishedPartnerAnnuaireEntry } from"@/lib/partners/published-annuaire-entries-store";

type PublishedAnnuaireReviewPanelProps = {
 items: PublishedPartnerAnnuaireEntry[];
};

const REVIEW_CONFIRM_PHRASE ="CONFIRMER PARTENAIRE";

function statusLabel(
 status: PublishedPartnerAnnuaireEntry["publicationStatus"],
 fr: boolean,
): string {
 if (status ==="accepted") {
 return fr ?"Acceptée" :"Accepted";
 }
 if (status ==="rejected") {
 return fr ?"Rejetée" :"Rejected";
 }
 return fr ?"En revue" :"Under review";
}

function statusTone(
 status: PublishedPartnerAnnuaireEntry["publicationStatus"],
): string {
 if (status ==="accepted") {
 return"bg-emerald-100 text-emerald-800 border-emerald-200";
 }
 if (status ==="rejected") {
 return"bg-rose-100 text-rose-800 border-rose-200";
 }
 return"bg-amber-100 text-amber-800 border-amber-200";
}

export function PublishedAnnuaireReviewPanel({
 items,
}: PublishedAnnuaireReviewPanelProps) {
 const router = useRouter();
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 const [confirmPhrase, setConfirmPhrase] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [submittingId, setSubmittingId] = useState<string | null>(null);

 const reviewEntry = (
 entryId: string,
 publicationStatus: PublishedPartnerAnnuaireEntry["publicationStatus"],
 ) => {
 if (confirmPhrase.trim().toUpperCase() !== REVIEW_CONFIRM_PHRASE) {
 setError(
 fr
  ? `Renseignez exactement "${REVIEW_CONFIRM_PHRASE}" pour valider la revue.`
 : `Type exactly"${REVIEW_CONFIRM_PHRASE}" to confirm the review.`,
 );
 return;
 }

 setError(null);
 setSubmittingId(entryId);
 void (async () => {
 try {
 const response = await fetch("/api/admin/partners/published-directory", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({
 id: entryId,
 publicationStatus,
 confirmPhrase,
 }),
 });

 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as
 | { hint?: string; message?: string }
 | null;
 throw new Error(
 body?.hint || body?.message || (fr ?"Revue impossible." :"Review failed."),
 );
 }

 router.refresh();
 } catch (mutationError) {
 setError(
 mutationError instanceof Error
 ? mutationError.message
 : fr
 ?"Revue impossible."
 :"Review failed.",
 );
 } finally {
 setSubmittingId(null);
 }
 })();
 };

 return (
 <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
 <div className="flex flex-wrap items-center justify-between gap-3">
 <div>
 <h2 className="cmm-text-small font-semibold cmm-text-primary">
 {fr ?"Revue admin des fiches publiées" :"Admin review of published records"}
 </h2>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 {fr
 ?"Les fiches d&apos;onboarding restent en attente tant qu&apos;elles ne sont pas acceptées."
 :"Onboarding records stay pending until they are accepted."}
 </p>
 </div>
 <label className="space-y-1 cmm-text-caption font-semibold cmm-text-secondary">
 <span>{fr ?"Phrase de confirmation" :"Confirmation phrase"}</span>
 <input
 value={confirmPhrase}
 onChange={(event) => setConfirmPhrase(event.target.value)}
 placeholder={REVIEW_CONFIRM_PHRASE}
 className="block min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 cmm-text-small cmm-text-primary focus:border-emerald-500 focus:outline-none"
 />
 </label>
 </div>

 {error ? (
 <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 cmm-text-caption text-rose-800">
 {error}
 </p>
 ) : null}

 <div className="mt-4 space-y-3">
 {items.map((entry) => (
 <article
 key={entry.id}
 className="rounded-xl border border-slate-200 bg-slate-50 p-4"
 >
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div>
 <h3 className="cmm-text-small font-semibold cmm-text-primary">{entry.name}</h3>
 <p className="mt-1 cmm-text-caption cmm-text-secondary">
 {entry.legalIdentity} · {entry.source}
 </p>
 </div>
 <span
 className={`rounded-full border px-2 py-1 cmm-text-caption font-semibold ${statusTone(entry.publicationStatus)}`}
 >
 {statusLabel(entry.publicationStatus, fr)}
 </span>
 </div>

 <p className="mt-2 cmm-text-caption cmm-text-secondary">
 {fr ?"Zone" :"Area"}: {entry.location} · {fr ?"MAJ" :"Updated"}{""}
 {entry.lastUpdatedAt}
 </p>

 <div className="mt-3 flex flex-wrap gap-2">
 <button
 type="button"
 disabled={submittingId === entry.id}
 onClick={() => reviewEntry(entry.id,"accepted")}
 className="rounded-lg bg-emerald-600 px-3 py-2 cmm-text-caption font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {fr ?"Accepter" :"Accept"}
 </button>
 <button
 type="button"
 disabled={submittingId === entry.id}
 onClick={() => reviewEntry(entry.id,"rejected")}
 className="rounded-lg border border-rose-200 bg-white px-3 py-2 cmm-text-caption font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
 >
 {fr ?"Rejeter" :"Reject"}
 </button>
 </div>
 </article>
 ))}
 </div>
 </section>
 );
}
