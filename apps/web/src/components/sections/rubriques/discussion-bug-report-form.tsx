"use client";

import { useMemo, useState, type FormEvent } from"react";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";

type SubmitState ="idle" |"submitting" |"success" |"error";

export function DiscussionBugReportForm() {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 const [reportType, setReportType] = useState<"bug" |"idea">("bug");
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [submitState, setSubmitState] = useState<SubmitState>("idle");
 const [errorMessage, setErrorMessage] = useState<string | null>(null);

 const pagePath = useMemo(() => {
 if (typeof window ==="undefined") {
 return"/sections/annuaire";
 }
 return window.location.pathname;
 }, []);

 const canSubmit =
 title.trim().length >= 4 &&
 description.trim().length >= 10 &&
 submitState !=="submitting";

 async function handleSubmit(event: FormEvent<HTMLFormElement>) {
 event.preventDefault();
 if (!canSubmit) {
 return;
 }

 setSubmitState("submitting");
 setErrorMessage(null);
 try {
 const response = await fetch("/api/community/bug-reports", {
 method:"POST",
 headers: {"content-type":"application/json" },
 body: JSON.stringify({
 reportType,
 title: title.trim(),
 description: description.trim(),
 pagePath,
 }),
 });

 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as
 | { error?: string }
 | null;
 throw new Error(body?.error ??"Impossible d'envoyer la demande.");
 }

 setSubmitState("success");
 setTitle("");
 setDescription("");
 } catch (error) {
 setSubmitState("error");
 setErrorMessage(
 error instanceof Error ? error.message :"Erreur inattendue.",
 );
 }
 }

 return (
 <section
 id="discussion-bug-report-form"
 className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
 >
 <h3 className="cmm-text-small font-semibold text-amber-900">
 {fr ?"Remonter un bug ou une idée produit" :"Report a bug or product idea"}
 </h3>
 <p className="mt-1 cmm-text-caption text-amber-900">
 {fr
 ?"Les bugs et idées de développement ne passent pas par le canal commun: utilisez ce formulaire dédié."
 :"Bugs and development ideas do not go through the common channel: use this dedicated form."}
 </p>

 <form onSubmit={handleSubmit} className="mt-3 space-y-3">
 <label className="block space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Type</span>
 <select
 value={reportType}
 onChange={(event) => setReportType(event.target.value as"bug" |"idea")}
 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-amber-500 focus:outline-none"
 >
 <option value="bug">{fr ?"Bug" :"Bug"}</option>
 <option value="idea">{fr ?"Idée de développement" :"Development idea"}</option>
 </select>
 </label>

 <label className="block space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ?"Sujet" :"Subject"}</span>
 <input
 value={title}
 onChange={(event) => setTitle(event.target.value)}
 placeholder={fr ?"Ex: Carte qui ne charge pas sur mobile" :"E.g. Map does not load on mobile"}
 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-amber-500 focus:outline-none"
 maxLength={160}
 />
 </label>

 <label className="block space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ?"Description" :"Description"}</span>
 <textarea
 value={description}
 onChange={(event) => setDescription(event.target.value)}
 placeholder={fr ?"Contexte, étapes, résultat observé, résultat attendu." :"Context, steps, observed result, expected result."}
 className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-amber-500 focus:outline-none"
 maxLength={3000}
 />
 </label>

 <div className="flex items-center justify-between gap-2">
 <p className="cmm-text-caption cmm-text-secondary">
 {fr ?"Page concernée" :"Affected page"}: <span className="font-semibold">{pagePath}</span>
 </p>
 <button
 type="submit"
 disabled={!canSubmit}
 className="rounded-lg bg-amber-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {submitState ==="submitting" ? (fr ?"Envoi..." :"Sending...") : (fr ?"Envoyer" :"Send")}
 </button>
 </div>

 {submitState ==="success" ? (
 <p className="cmm-text-caption font-medium text-emerald-700">
 {fr ?"Merci, ta remontée a bien été envoyée." :"Thanks, your report has been sent."}
 </p>
 ) : null}
 {submitState ==="error" ? (
 <p className="cmm-text-caption font-medium text-rose-700">
 {errorMessage ?? (fr ?"Impossible d'envoyer la demande." :"Unable to send the request.")}
 </p>
 ) : null}
 </form>
 </section>
 );
}
